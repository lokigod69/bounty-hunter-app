// This file was updated to define and export the TaskStatus and ProofType types.

/**
 * Represents the possible statuses of a task.
 */
export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled';

/**
 * Represents the type of proof that can be submitted.
 */
export type ProofType = 'image' | 'video';
// Type for the result of the 'complete_task_instance' RPC function
export interface CompleteTaskInstanceResult {
  success: boolean;
  message: string;
  awarded_credits?: number;
  // Add any other properties returned by the RPC's 'j' object
}
