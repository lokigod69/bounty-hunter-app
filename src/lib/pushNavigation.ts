const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Notification metadata is a hint, never a URL or authorization grant. */
export function pushDestination(data: unknown, userId: string): string | null {
  if (!data || typeof data !== "object") return null;
  const { recipient, kind, resource } = data as Record<string, unknown>;
  if (
    recipient !== userId ||
    typeof resource !== "string" ||
    !uuid.test(resource)
  )
    return null;
  switch (kind) {
    case "mission_assigned":
    case "mission_rejected":
    case "mission_approved":
      return `/?mission=${resource}`;
    case "mission_submitted":
      return `/issued?mission=${resource}`;
    case "reward_collected":
      return "/rewards-store?tab=created";
    case "connection_requested":
    case "connection_accepted":
      return "/friends";
    default:
      return null;
  }
}
