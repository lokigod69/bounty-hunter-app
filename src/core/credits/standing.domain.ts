// src/core/credits/standing.domain.ts
// THE REGISTER §3.1 — Standing, the second number. Balance is what you can
// spend; standing is what you are. Standing derives from lifetime earned
// credits (user_credits.total_earned) and can never be spent down.
//
// Pure domain: no I/O, no React. The threshold table is calibrated to the
// guild rate the app actually offers: TaskForm's credit presets are 1/2/3/5/10
// and it calls 2 a "small chore", so a realistic average contract is ~3 credits
// (recalibrated 2026-07-29 by Michael's decision, from a table that assumed ~20
// and therefore put band 3 at ~667 contracts and band 4 at ~2,667 — unreachable).
// At ~3 credits a contract the bands land at roughly 10 / 50 / 200 / 667
// contracts. This table is the single place to recalibrate.

export const STANDING_THRESHOLDS = [0, 30, 150, 600, 2000] as const;

export type StandingBand = 0 | 1 | 2 | 3 | 4;

// Band → how many of the seven creed lines are unlocked (§4.9: the line at
// the foot of the board changes because *you* changed).
const CREED_LINES_BY_BAND = [1, 2, 4, 6, 7] as const;

// ThemeStrings keys carrying the rank word for each band. Kept as literals so
// this module stays dependency-free; ThemeStrings declares matching fields.
const RANK_KEYS = ['rankBand0', 'rankBand1', 'rankBand2', 'rankBand3', 'rankBand4'] as const;
export type StandingRankKey = (typeof RANK_KEYS)[number];

export interface Standing {
  band: StandingBand;
  /** Sanitized lifetime earned: non-finite, negative, or missing input is 0. */
  earned: number;
  /** Threshold of the current band. */
  currentThreshold: number;
  /** Threshold of the next band, or null at the top band. */
  nextThreshold: number | null;
  /** 0..1 progress from the current threshold to the next; 1 at the top band. */
  progress: number;
  /** How many of the seven creed lines this band unlocks. */
  unlockedCreedLines: number;
}

export function getStanding(totalEarned: number | null | undefined): Standing {
  const earned =
    typeof totalEarned === 'number' && Number.isFinite(totalEarned) && totalEarned > 0
      ? Math.floor(totalEarned)
      : 0;

  let band: StandingBand = 0;
  for (let i = STANDING_THRESHOLDS.length - 1; i >= 0; i--) {
    if (earned >= STANDING_THRESHOLDS[i]) {
      band = i as StandingBand;
      break;
    }
  }

  const currentThreshold = STANDING_THRESHOLDS[band];
  const nextThreshold = band < STANDING_THRESHOLDS.length - 1 ? STANDING_THRESHOLDS[band + 1] : null;
  const progress =
    nextThreshold === null
      ? 1
      : Math.min(1, Math.max(0, (earned - currentThreshold) / (nextThreshold - currentThreshold)));

  return {
    band,
    earned,
    currentThreshold,
    nextThreshold,
    progress,
    unlockedCreedLines: CREED_LINES_BY_BAND[band],
  };
}

export function standingRankKey(band: StandingBand): StandingRankKey {
  return RANK_KEYS[band];
}
