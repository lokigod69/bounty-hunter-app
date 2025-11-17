// src/core/contracts/contracts.domain.ts
// Phase 3: Pure domain functions for contract status transitions and business rules.
// No React, no Supabase - just business logic.

import type { ContractStatus, StatusChangeContext, StatusChangeResult } from './contracts.types';

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

