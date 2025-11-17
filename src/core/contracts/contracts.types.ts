// src/core/contracts/contracts.types.ts
// Phase 3: Domain types for contracts/tasks, decoupled from Supabase client types.

/**
 * Contract status values as defined in the domain.
 * These match the database enum but are defined here for domain independence.
 */
export type ContractStatus = 'pending' | 'in_progress' | 'review' | 'completed' | 'archived' | 'pending_proof' | 'rejected';

/**
 * Reward type for contracts.
 */
export type RewardType = 'credit' | 'other';

/**
 * Minimal contract domain type.
 * Contains only the fields needed for business logic decisions.
 */
export interface Contract {
  id: string;
  status: ContractStatus;
  proof_required: boolean;
  proof_url?: string | null;
  reward_type?: RewardType | null;
  reward_text?: string | null;
  assigned_to?: string | null;
  created_by: string;
}

/**
 * Context for evaluating a status change request.
 */
export interface StatusChangeContext {
  /** ID of the user attempting the change */
  actorId: string;
  /** ID of the contract owner (creator) */
  contractOwnerId: string;
  /** ID of the assignee (if any) */
  assigneeId?: string | null;
  /** Current status of the contract */
  currentStatus: ContractStatus;
  /** Requested new status */
  requestedStatus: ContractStatus;
  /** Whether the contract requires proof */
  proofRequired: boolean;
  /** Whether proof has been submitted (proof_url exists) */
  hasProof?: boolean;
}

/**
 * Result of evaluating a status change.
 */
export interface StatusChangeResult {
  /** Whether the change is allowed */
  allowed: boolean;
  /** The actual status to set (may differ from requested if auto-completing) */
  newStatus?: ContractStatus;
  /** Error messages if not allowed */
  errors?: string[];
  /** Whether credits should be awarded (for completed status) */
  shouldAwardCredits?: boolean;
  /** Whether to set completed_at timestamp */
  shouldSetCompletedAt?: boolean;
}

