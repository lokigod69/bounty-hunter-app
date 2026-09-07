import { connect } from "node:http2";
import { createPrivateKey, sign } from "node:crypto";

export type Outcome = "accepted" | "retry" | "invalid_token" | "discard";
export interface SendResult {
  outcome: Outcome;
  invalidatedAt?: string;
}
export interface Delivery {
  id: string;
  token: string;
  environment: "production" | "development";
  recipient_id: string;
  kind: string;
  resource_id: string;
  expires_at: string;
}
export interface AppleConfig {
  team: string;
  keyId: string;
  privateKey: string;
  environment: Delivery["environment"];
}
const messages: Record<string, string> = {
  mission_assigned: "You have a new mission.",
  mission_submitted: "A mission is ready for review.",
  mission_approved: "Your mission was approved.",
  mission_rejected: "A mission needs another look.",
  reward_collected: "Someone collected your reward.",
  connection_requested: "You have a connection request.",
  connection_accepted: "Your connection request was accepted.",
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function notificationPayload(delivery: Delivery) {
  if (
    !uuid.test(delivery.id) ||
    !uuid.test(delivery.recipient_id) ||
    !uuid.test(delivery.resource_id) ||
    !Object.hasOwn(messages, delivery.kind)
  )
    throw new Error("Invalid delivery metadata");
  // No user-authored content, names, images or deep-link URLs leave the database.
  return {
    aps: {
      alert: { title: "Bounty Hunter", body: messages[delivery.kind] },
      sound: "default",
    },
    recipient: delivery.recipient_id,
    kind: delivery.kind,
    resource: delivery.resource_id,
  };
}
export function providerToken(config: AppleConfig, now = Date.now()): string {
  if (
    !/^[A-Z0-9]{10}$/.test(config.team) ||
    !/^[A-Z0-9]{10}$/.test(config.keyId)
  )
    throw new Error("Invalid Apple identifiers");
  const key = createPrivateKey(config.privateKey.replaceAll("\\n", "\n"));
  if (
    key.asymmetricKeyType !== "ec" ||
    key.asymmetricKeyDetails?.namedCurve !== "prime256v1"
  )
    throw new Error("Apple requires a P-256 key");
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "ES256", kid: config.keyId })}.${encode({ iss: config.team, iat: Math.floor(now / 1000) })}`;
  return `${unsigned}.${sign("sha256", Buffer.from(unsigned), { key, dsaEncoding: "ieee-p1363" }).toString("base64url")}`;
}
export function classifyAppleResponse(
  status: number,
  reason?: string,
): Outcome {
  if (status === 200) return "accepted"; // Provider acceptance is not device delivery.
  if (status === 410 && reason === "Unregistered") return "invalid_token";
  // Credential/environment failures require operator repair, not repeated sends.
  // Preserve the registration; only timestamped Unregistered can remove it.
  if (status === 429 || status >= 500) return "retry";
  return "discard";
}
export async function sendApple(
  delivery: Delivery,
  authorization: string,
  environment: Delivery["environment"],
): Promise<SendResult> {
  if (
    delivery.environment !== environment ||
    !/^[0-9a-f]{64,512}$/.test(delivery.token)
  )
    return { outcome: "discard" };
  const expiry = Math.floor(Date.parse(delivery.expires_at) / 1000);
  if (!Number.isFinite(expiry) || expiry <= Date.now() / 1000)
    return { outcome: "discard" };
  const payload = JSON.stringify(notificationPayload(delivery));
  return new Promise((resolve) => {
    const client = connect(
      environment === "production"
        ? "https://api.push.apple.com"
        : "https://api.sandbox.push.apple.com",
    );
    let done = false;
    const finish = (outcome: Outcome, invalidatedAt?: string) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      client.destroy();
      resolve({ outcome, invalidatedAt });
    };
    const timer = setTimeout(() => finish("retry"), 8000);
    client.once("error", () => finish("retry"));
    client.once("connect", () => {
      const request = client.request({
        ":method": "POST",
        ":path": `/3/device/${delivery.token}`,
        authorization: `bearer ${authorization}`,
        "apns-topic": "com.bountyhunter.app",
        "apns-push-type": "alert",
        "apns-priority": "10",
        "apns-expiration": String(expiry),
        "apns-collapse-id": delivery.id,
        "content-type": "application/json",
      });
      let status = 0,
        body = "";
      request.on("response", (headers) => {
        status = Number(headers[":status"]);
      });
      request.on("data", (chunk) => {
        body += chunk.toString();
        if (body.length > 4096) finish("retry");
      });
      request.once("error", () => finish("retry"));
      request.once("end", () => {
        let reason: string | undefined;
        let invalidatedAt: string | undefined;
        try {
          const parsed = JSON.parse(body);
          reason = parsed.reason;
          if (
            typeof parsed.timestamp === "number" &&
            Number.isFinite(parsed.timestamp) &&
            parsed.timestamp > 0 &&
            parsed.timestamp <= Date.now()
          )
            invalidatedAt = new Date(parsed.timestamp).toISOString();
        } catch {
          /* Empty successful response. */
        }
        finish(classifyAppleResponse(status, reason), invalidatedAt);
      });
      request.end(payload);
    });
  });
}
