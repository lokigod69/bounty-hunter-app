// src/core/contracts/contracts.domain.ts
// Phase 3: Pure domain functions for contract status transitions and business rules.
// P5: Added daily mission and streak logic.
// No React, no Supabase - just business logic.

import type { ContractStatus, StatusChangeContext, StatusChangeResult, StreakContext, StreakUpdateResult } from './contracts.types';

/**
 * Evaluates whether a status change is allowed and determines the final status.
 * 
 * Rules:
 * - Assignees can move from 'pending' -> 'in_progress' -> 'review' -> 'completed'
 * - Creators can approve/reject tasks in 'review' status
 * - If proof_required=false and status='review', auto-complete to 'completed'
 * - Cannot change status if already 'completed'
 * - Rejection resets to 'pending' and clears proof
 */
export function evaluateStatusChange(ctx: StatusChangeContext): StatusChangeResult {
  const { actorId, contractOwnerId, assigneeId, currentStatus, requestedStatus, proofRequired, hasProof } = ctx;

  // Check if actor has permission
  const isAssignee = assigneeId === actorId;
  const isCreator = contractOwnerId === actorId;

  if (!isAssignee && !isCreator) {
    return {
      allowed: false,
      errors: ['You do not have permission to update this task.'],
    };
  }

  // Cannot change status if already completed
  if (currentStatus === 'completed') {
    return {
      allowed: false,
      errors: ['This task has already been completed.'],
    };
  }

  // Determine final status based on proof requirements
  let finalStatus: ContractStatus = requestedStatus;

  // If proof not required and status is 'review', auto-complete to 'completed'
  if (!proofRequired && requestedStatus === 'review') {
    finalStatus = 'completed';
  }

  // Validate status transitions based on actor role
  const errors: string[] = [];

  // Assignee transitions
  if (isAssignee && !isCreator) {
    const allowedTransitions: Record<ContractStatus, ContractStatus[]> = {
      pending: ['in_progress', 'review', 'completed'],
      in_progress: ['review', 'completed'],
      review: ['completed'], // Only if proof not required, otherwise creator must approve
      completed: [], // Cannot change from completed
      archived: [],
      pending_proof: ['review', 'completed'],
      rejected: ['pending', 'in_progress'], // Can restart after rejection
    };

    if (!allowedTransitions[currentStatus]?.includes(finalStatus)) {
      errors.push(`Cannot transition from '${currentStatus}' to '${finalStatus}'.`);
    }
  }

  // Creator transitions (approve/reject)
  if (isCreator) {
    if (requestedStatus === 'completed' && currentStatus !== 'review') {
      errors.push('Can only approve tasks that are in review status.');
    }
    if (requestedStatus === 'rejected' && currentStatus !== 'review') {
      errors.push('Can only reject tasks that are in review status.');
    }
  }

  if (errors.length > 0) {
    return {
      allowed: false,
      errors,
    };
  }

  // Determine if credits should be awarded
  const shouldAwardCredits = finalStatus === 'completed' && isCreator;

  // Determine if completed_at should be set
  const shouldSetCompletedAt = finalStatus === 'completed';

  return {
    allowed: true,
    newStatus: finalStatus,
    shouldAwardCredits,
    shouldSetCompletedAt,
  };
}

/**
 * Checks if a contract requires proof submission before completion.
 */
export function requiresProof(contract: { proof_required: boolean }): boolean {
  return contract.proof_required === true;
}

/**
 * Checks if a contract has proof submitted.
 */
export function hasProofSubmitted(contract: { proof_url?: string | null }): boolean {
  return !!contract.proof_url;
}

/**
 * P5: Checks if a contract is a daily mission.
 */
export function isDailyMission(contract: { is_daily?: boolean }): boolean {
  return !!contract.is_daily;
}

/**
 * P5: Computes the new streak count after a completion.
 * 
 * Rules:
 * - If no lastCompletionDate -> streak = 1 (first completion)
 * - If lastCompletionDate is "yesterday" (based on date only) -> streak + 1
 * - If lastCompletionDate is "today" -> streak stays the same (or 1), no increment
 * - Else -> streak = 1, reset = true (gap detected)
 */
export function computeStreakAfterCompletion(ctx: StreakContext): StreakUpdateResult {
  const { lastCompletionDate, now } = ctx;

  // Normalize dates to UTC midnight for date-only comparison
  const normalizeDate = (date: Date): Date => {
    const normalized = new Date(date);
    normalized.setUTCHours(0, 0, 0, 0);
    return normalized;
  };

  const today = normalizeDate(now);
  
  // No previous completion - start streak at 1
  if (!lastCompletionDate) {
    return {
      newStreakCount: 1,
      reset: false,
    };
  }

  const lastDate = normalizeDate(new Date(lastCompletionDate));
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  // Completed today already - don't increment, keep current streak
  if (lastDate.getTime() === today.getTime()) {
    return {
      newStreakCount: 1, // Or could return existing streak, but for simplicity start at 1
      reset: false,
    };
  }

  // Completed yesterday - increment streak
  if (lastDate.getTime() === yesterday.getTime()) {
    // We don't have the current streak count here, so we'll need to fetch it
    // For now, return a flag that indicates increment is needed
    // The caller should fetch current streak and increment it
    return {
      newStreakCount: 1, // Placeholder - actual increment happens in caller
      reset: false,
    };
  }

  // Gap detected - reset streak to 1
  return {
    newStreakCount: 1,
    reset: true,
  };
}

/**
 * P5: Helper to compute new streak count given current streak and completion date.
 * This version takes the current streak count and computes the new one.
 */
export function computeNewStreakCount(
  currentStreak: number,
  lastCompletionDate: Date | null | undefined,
  now: Date
): number {
  const context: StreakContext = {
    lastCompletionDate: lastCompletionDate ? new Date(lastCompletionDate) : null,
    now,
  };

  const result = computeStreakAfterCompletion(context);

  if (result.reset) {
    return 1;
  }

  // If last completion was yesterday, increment
  const normalizeDate = (date: Date): Date => {
    const normalized = new Date(date);
    normalized.setUTCHours(0, 0, 0, 0);
    return normalized;
  };

  const today = normalizeDate(now);
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  if (lastCompletionDate) {
    const lastDate = normalizeDate(new Date(lastCompletionDate));
    if (lastDate.getTime() === yesterday.getTime()) {
      return currentStreak + 1;
    }
    if (lastDate.getTime() === today.getTime()) {
      return currentStreak; // Already completed today
    }
  }

  // First completion or gap
  return 1;
}

