// src/core/credits/credits.domain.ts
// Phase 3: Pure domain functions for credit awarding rules.
// P5: Added streak-based bonus for daily missions.
// No React, no Supabase - just business logic.

/**
 * P5: Streak bonus configuration
 */
const STREAK_BONUS_PER_DAY = 0.1; // +10% per streak day
const STREAK_BONUS_MAX_MULTIPLIER = 2.0; // cap at 2x

/**
 * Context for deciding credit awards.
 */
export interface CreditAwardContext {
  /** Contract ID (for logging/tracking) */
  contractId: string;
  /** User ID to award credits to */
  assigneeId: string;
  /** Base reward amount from contract */
  baseReward: number;
  /** Optional bonus multiplier */
  bonusMultiplier?: number;
  /** P5: Whether this is a daily mission */
  isDaily?: boolean;
  /** P5: Current streak count for daily missions */
  streakCount?: number;
}

/**
 * Decision about credit awarding.
 */
export interface CreditAwardDecision {
  /** Amount of credits to award */
  amount: number;
  /** Reason for the award */
  reason: 'task_approved' | 'bonus' | 'purchase_refund' | string;
}

/**
 * P5: Applies streak-based bonus to base reward for daily missions.
 * 
 * Rules:
 * - +10% per streak day (starting from day 2)
 * - Capped at 2x multiplier
 * - Only applies if streakCount > 1
 */
export function applyStreakBonus(baseReward: number, streakCount?: number): number {
  if (!streakCount || streakCount <= 1) {
    return baseReward;
  }

  const bonusMultiplier = Math.min(
    1 + STREAK_BONUS_PER_DAY * (streakCount - 1),
    STREAK_BONUS_MAX_MULTIPLIER
  );

  return Math.round(baseReward * bonusMultiplier);
}

/**
 * Decides how many credits to award for an approved contract.
 * 
 * Rules:
 * - Awards the base reward amount from the contract
 * - Applies bonus multiplier if provided
 * - P5: Applies streak bonus for daily missions if streakCount is provided
 * - Returns 0 if baseReward is invalid
 */
export function decideCreditsForApprovedContract(ctx: CreditAwardContext): CreditAwardDecision {
  const { baseReward, bonusMultiplier = 1, isDaily, streakCount } = ctx;

  // Validate base reward
  if (!baseReward || baseReward <= 0 || isNaN(baseReward)) {
    return {
      amount: 0,
      reason: 'task_approved',
    };
  }

  // P5: Apply streak bonus for daily missions
  let finalReward = baseReward;
  if (isDaily && streakCount) {
    finalReward = applyStreakBonus(baseReward, streakCount);
  }

  // Apply manual bonus multiplier if provided
  const amount = Math.floor(finalReward * bonusMultiplier);

  // Determine reason
  let reason: string = 'task_approved';
  if (bonusMultiplier > 1) {
    reason = 'bonus';
  } else if (isDaily && streakCount && streakCount > 1) {
    reason = 'streak_bonus';
  }

  return {
    amount,
    reason,
  };
}

/**
 * Validates if credits can be awarded for a contract.
 */
export function canAwardCredits(ctx: CreditAwardContext): boolean {
  const decision = decideCreditsForApprovedContract(ctx);
  return decision.amount > 0;
}

