// src/core/credits/credits.domain.ts
// Phase 3: Pure domain functions for credit awarding rules.
// No React, no Supabase - just business logic.

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
 * Decides how many credits to award for an approved contract.
 * 
 * Rules:
 * - Awards the base reward amount from the contract
 * - Applies bonus multiplier if provided
 * - Returns 0 if baseReward is invalid
 */
export function decideCreditsForApprovedContract(ctx: CreditAwardContext): CreditAwardDecision {
  const { baseReward, bonusMultiplier = 1 } = ctx;

  // Validate base reward
  if (!baseReward || baseReward <= 0 || isNaN(baseReward)) {
    return {
      amount: 0,
      reason: 'task_approved',
    };
  }

  // Calculate final amount
  const amount = Math.floor(baseReward * bonusMultiplier);

  return {
    amount,
    reason: bonusMultiplier > 1 ? 'bonus' : 'task_approved',
  };
}

/**
 * Validates if credits can be awarded for a contract.
 */
export function canAwardCredits(ctx: CreditAwardContext): boolean {
  const decision = decideCreditsForApprovedContract(ctx);
  return decision.amount > 0;
}

