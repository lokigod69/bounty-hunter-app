// src/config/textLimits.ts
// R19: Shared configuration for text input limits
// Used by create/edit modals to enforce character limits

export const TEXT_LIMITS = {
  /** Mission/contract title */
  missionTitle: 64,
  /** Mission/contract description */
  missionDescription: 500,
  /** Reward label/text for non-credit rewards */
  rewardLabel: 40,
  /** Store reward name */
  rewardName: 64,
  /** Store reward description */
  rewardDescription: 200,
  /** User display name */
  displayName: 50,
} as const;

// Type for the keys
export type TextLimitKey = keyof typeof TEXT_LIMITS;

/**
 * Helper to format character count display
 * @param current Current character count
 * @param max Maximum allowed characters
 * @returns Formatted string like "34 / 64"
 */
export function formatCharCount(current: number, max: number): string {
  return `${current} / ${max}`;
}

/**
 * Helper to get remaining characters
 * @param current Current character count
 * @param max Maximum allowed characters
 * @returns Number of remaining characters (can be negative if over limit)
 */
export function remainingChars(current: number, max: number): number {
  return max - current;
}

/**
 * Helper to check if text is within limit
 * @param text Text to check
 * @param limit Character limit
 * @returns true if within limit
 */
export function isWithinLimit(text: string | undefined | null, limit: number): boolean {
  return (text?.length ?? 0) <= limit;
}
