import { describe, it, expect } from "vitest";
import { pushDestination } from "./pushNavigation";
const recipient = "10000000-0000-4000-8000-000000000001",
  resource = "20000000-0000-4000-8000-000000000001";
describe("notification navigation", () => {
  it.each([
    "mission_assigned",
    "mission_submitted",
    "mission_approved",
    "mission_rejected",
    "reward_collected",
    "connection_requested",
    "connection_accepted",
  ])("routes %s to a fixed local destination", (kind) => {
    expect(
      pushDestination(
        { recipient, resource, kind, url: "https://attacker.invalid" },
        recipient,
      ),
    ).toMatch(/^\/(?:\?|archive|issued|rewards-store|friends)/);
  });
  it("discards wrong-account and malformed payloads", () => {
    for (const data of [
      null,
      "/",
      { recipient: "another-user", resource, kind: "mission_assigned" },
      { recipient, resource: "../../profile", kind: "mission_assigned" },
      { recipient, resource, kind: "constructor" },
      { recipient, resource, kind: "unknown" },
    ])
      expect(pushDestination(data, recipient)).toBeNull();
  });
});
