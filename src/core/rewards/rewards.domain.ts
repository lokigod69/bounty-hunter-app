// src/core/rewards/rewards.domain.ts
// Phase 3: Pure domain functions for reward purchase/redemption rules.
// No React, no Supabase - just business logic.

/**
 * Context for evaluating a reward purchase.
 */
export interface PurchaseContext {
  /** Current user's credit balance */
  userCredits: number;
  /** Cost of the reward */
  rewardCost: number;
  /** Whether the reward is available/active */
  isAvailable: boolean;
  /** Whether the user is the creator of the reward */
  isCreator: boolean;
  /** Whether the reward has already been claimed by this user */
  isAlreadyClaimed: boolean;
}

/**
 * Decision about whether a purchase is allowed.
 */
export interface PurchaseDecision {
  /** Whether the purchase is allowed */
  allowed: boolean;
  /** Reason if not allowed */
  reason?: string;
  /** New credit balance after purchase */
  newCreditsBalance?: number;
}

/**
 * Evaluates whether a user can purchase a reward.
 * 
 * Rules:
 * - User must have sufficient credits
 * - Reward must be available/active
 * - User cannot purchase their own reward
 * - User cannot purchase if already claimed (if one-time claim)
 */
export function canPurchaseReward(ctx: PurchaseContext): PurchaseDecision {
  const { userCredits, rewardCost, isAvailable, isCreator, isAlreadyClaimed } = ctx;

  // Check if reward is available
  if (!isAvailable) {
    return {
      allowed: false,
      reason: 'This reward is not available.',
    };
  }

  // Check if user is the creator
  if (isCreator) {
    return {
      allowed: false,
      reason: 'You cannot purchase your own reward.',
    };
  }

  // Check if already claimed
  if (isAlreadyClaimed) {
    return {
      allowed: false,
      reason: 'You have already claimed this reward.',
    };
  }

  // Check if user has sufficient credits
  if (userCredits < rewardCost) {
    return {
      allowed: false,
      reason: `Insufficient credits. You have ${userCredits}, but need ${rewardCost}.`,
    };
  }

  // Calculate new balance
  const newCreditsBalance = userCredits - rewardCost;

  return {
    allowed: true,
    newCreditsBalance,
  };
}

