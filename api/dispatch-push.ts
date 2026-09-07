import type { IncomingMessage, ServerResponse } from "node:http";
import { createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { providerToken, sendApple, type Delivery } from "../server/apns.js";

export const config = { maxDuration: 30 };
const matches = (a: string, b: string) =>
  timingSafeEqual(
    createHash("sha256").update(a).digest(),
    createHash("sha256").update(b).digest(),
  );

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  res.setHeader("Cache-Control", "no-store");
  const reply = (status: number, body: unknown) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
  };
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    reply(405, { error: "method_not_allowed" });
    return;
  }
  const secret = process.env.PUSH_DISPATCH_SECRET;
  if (
    !secret ||
    secret.length < 32 ||
    !matches(req.headers.authorization ?? "", `Bearer ${secret}`)
  ) {
    reply(401, { error: "unauthorized" });
    return;
  }
  if (process.env.APNS_ENABLED !== "true") {
    reply(503, { error: "push_disabled" });
    return;
  }
  try {
    const environment = process.env.APNS_ENVIRONMENT;
    if (environment !== "production" && environment !== "development")
      throw new Error("Configuration required");
    const authorization = providerToken({
      team: process.env.APNS_TEAM_ID ?? "",
      keyId: process.env.APNS_KEY_ID ?? "",
      privateKey: process.env.APNS_PRIVATE_KEY ?? "",
      environment,
    });
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url !== "https://mvbmpcmexkgfairnthux.supabase.co" || !serviceKey)
      throw new Error("Configuration required");
    const db = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(5000) }),
      },
    });
    const { data, error } = await db.rpc("claim_push_deliveries");
    if (error || !Array.isArray(data) || data.length > 10)
      throw new Error("Queue unavailable");
    const results = await Promise.allSettled(
      data.map(async (claim: { id: string; lease: string }) => {
        // Recheck session, relationship, resource and feature gate immediately
        // before handing a generic alert to Apple. In-flight sends cannot be recalled.
        const { data: rows, error: prepareError } = await db.rpc(
          "prepare_push_delivery",
          { p_id: claim.id, p_lease: claim.lease },
        );
        if (prepareError) throw new Error("Preparation unavailable");
        const result =
          Array.isArray(rows) && rows.length === 1
            ? await sendApple(rows[0] as Delivery, authorization, environment)
            : { outcome: "discard" as const };
        const { error: finishError } = await db.rpc("finish_push_delivery", {
          p_id: claim.id,
          p_lease: claim.lease,
          p_outcome: result.outcome,
          p_invalidated_at: result.invalidatedAt ?? null,
        });
        if (finishError) throw new Error("Acknowledgement unavailable");
        return result.outcome;
      }),
    );
    // Aggregate operational result only: never log APNs tokens, IDs or credentials.
    reply(200, {
      processed: results.length,
      accepted: results.filter(
        (r) => r.status === "fulfilled" && r.value === "accepted",
      ).length,
      retry: results.filter(
        (r) => r.status === "rejected" || r.value === "retry",
      ).length,
      discarded: results.filter(
        (r) => r.status === "fulfilled" && r.value === "discard",
      ).length,
    });
  } catch {
    reply(503, { error: "push_unavailable" });
  }
}
