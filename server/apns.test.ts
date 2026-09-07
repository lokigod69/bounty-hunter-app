import { describe, it, expect, vi, afterEach } from "vitest";
import { generateKeyPairSync, verify } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  classifyAppleResponse,
  notificationPayload,
  providerToken,
  type Delivery,
} from "./apns";
import handler from "../api/dispatch-push";

const delivery: Delivery = {
  id: "10000000-0000-4000-8000-000000000001",
  recipient_id: "20000000-0000-4000-8000-000000000001",
  resource_id: "30000000-0000-4000-8000-000000000001",
  token: "a".repeat(64),
  environment: "production",
  kind: "mission_assigned",
  expires_at: "2099-01-01T00:00:00Z",
};
afterEach(() => vi.unstubAllEnvs());
describe("APNs boundary", () => {
  it("creates a valid ES256 token with P1363 signature", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", {
      namedCurve: "prime256v1",
    });
    const token = providerToken(
      {
        team: "ABCDEFGHIJ",
        keyId: "0123456789",
        environment: "production",
        privateKey: privateKey
          .export({ format: "pem", type: "pkcs8" })
          .toString(),
      },
      1700000000000,
    );
    const [header, payload, signature] = token.split(".");
    expect(JSON.parse(Buffer.from(header, "base64url").toString())).toEqual({
      alg: "ES256",
      kid: "0123456789",
    });
    expect(JSON.parse(Buffer.from(payload, "base64url").toString())).toEqual({
      iss: "ABCDEFGHIJ",
      iat: 1700000000,
    });
    expect(
      verify(
        "sha256",
        Buffer.from(`${header}.${payload}`),
        { key: publicKey, dsaEncoding: "ieee-p1363" },
        Buffer.from(signature, "base64url"),
      ),
    ).toBe(true);
  });
  it("rejects keys with the wrong curve", () => {
    const { privateKey } = generateKeyPairSync("ec", {
      namedCurve: "secp384r1",
    });
    expect(() =>
      providerToken({
        team: "ABCDEFGHIJ",
        keyId: "0123456789",
        environment: "production",
        privateKey: privateKey
          .export({ format: "pem", type: "pkcs8" })
          .toString(),
      }),
    ).toThrow("P-256");
  });
  it("never carries user-authored text or arbitrary navigation URLs", () => {
    const payload = notificationPayload({
      ...delivery,
      title: "secret chore",
      url: "https://evil.invalid",
    } as Delivery);
    expect(Object.keys(payload).sort()).toEqual([
      "aps",
      "kind",
      "recipient",
      "resource",
    ]);
    expect(JSON.stringify(payload)).not.toContain("secret");
    expect(JSON.stringify(payload)).not.toContain("evil");
    expect(() =>
      notificationPayload({ ...delivery, kind: "__proto__" }),
    ).toThrow();
    expect(() =>
      notificationPayload({ ...delivery, resource_id: "../../profile" }),
    ).toThrow();
  });
  it.each([
    [200, "", "accepted"],
    [410, "Unregistered", "invalid_token"],
    [400, "BadDeviceToken", "discard"],
    [403, "ExpiredProviderToken", "discard"],
    [429, "TooManyRequests", "retry"],
    [503, "Shutdown", "retry"],
    [400, "PayloadEmpty", "discard"],
  ])("classifies %i %s as %s", (status, reason, outcome) => {
    expect(classifyAppleResponse(Number(status), String(reason))).toBe(outcome);
  });
});
describe("dispatcher HTTP entry", () => {
  async function invoke(method: string, authorization?: string) {
    let body = "";
    const headers: Record<string, string> = {};
    const res = {
      statusCode: 0,
      setHeader: (k: string, v: string) => {
        headers[k] = v;
      },
      end: (v: string) => {
        body = v;
      },
    };
    await handler(
      { method, headers: { authorization } } as IncomingMessage,
      res as unknown as ServerResponse,
    );
    return { status: res.statusCode, body: JSON.parse(body), headers };
  }
  it("rejects GET and sets no-store", async () => {
    const result = await invoke("GET");
    expect(result.status).toBe(405);
    expect(result.headers["Cache-Control"]).toBe("no-store");
  });
  it("rejects missing/mismatched/short server credentials", async () => {
    vi.stubEnv("PUSH_DISPATCH_SECRET", "x".repeat(40));
    expect((await invoke("POST")).status).toBe(401);
    expect((await invoke("POST", "Bearer wrong")).status).toBe(401);
    vi.stubEnv("PUSH_DISPATCH_SECRET", "short");
    expect((await invoke("POST", "Bearer short")).status).toBe(401);
  });
  it("does not contact any provider when disabled", async () => {
    vi.stubEnv("PUSH_DISPATCH_SECRET", "x".repeat(40));
    vi.stubEnv("APNS_ENABLED", "false");
    expect(await invoke("POST", `Bearer ${"x".repeat(40)}`)).toMatchObject({
      status: 503,
      body: { error: "push_disabled" },
    });
  });
});
