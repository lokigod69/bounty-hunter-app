// src/domain/missions.ts
// Domain functions for mission/task operations.
// Encapsulates Supabase calls and business logic for mission lifecycle.

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { evaluateStatusChange } from '../core/contracts/contracts.domain';
import type { StatusChangeContext } from '../core/contracts/contracts.types';
import type { Database } from '../types/database';
import type {
  TaskLifecycleRpcErrorCode,
  TaskLifecycleRpcResult,
  TaskStatus,
} from '../types/custom';

export type MissionId = string;
type TaskLifecycleClient = SupabaseClient<Database>;
type TaskLifecycleOperation = 'archive' | 'delete' | 'reject' | 'status' | 'submit';

const operationFallbacks: Record<TaskLifecycleOperation, string> = {
  archive: 'Failed to archive task.',
  delete: 'Failed to delete task.',
  reject: 'Failed to reject task.',
  status: 'Failed to update task status.',
  submit: 'Failed to submit task for review.',
};

export function getTaskLifecycleRpcErrorMessage(
  code: TaskLifecycleRpcErrorCode | string | undefined,
  operation: TaskLifecycleOperation,
): string {
  switch (code) {
    case 'not_authenticated':
      return `You must be logged in to ${operation} this task.`;
    case 'task_not_found':
      return 'Task not found or has been deleted.';
    case 'not_assignee':
      return 'You are not assigned to this task.';
    case 'not_creator':
      return operation === 'reject'
        ? 'Only the task creator can reject this task.'
        : 'You can only delete tasks that you created.';
    case 'not_participant':
      return 'Only the creator or assignee can archive this task.';
    case 'wrong_status':
      return 'This task is not in the correct status for that action.';
    case 'proof_required':
      return 'This task requires proof. Please upload proof to complete.';
    case 'invalid_proof_type':
      return 'Invalid proof type. Use an image, video, PDF, or text proof.';
    case 'status_not_allowed':
      return 'This status change is not allowed.';
    default:
      return operationFallbacks[operation];
  }
}

export function requireTaskLifecycleRpcSuccess(
  data: unknown,
  operation: TaskLifecycleOperation,
): TaskLifecycleRpcResult {
  const result = data as TaskLifecycleRpcResult | null;

  if (result?.success === false) {
    throw new Error(getTaskLifecycleRpcErrorMessage(result.error, operation));
  }

  if (result?.success !== true) {
    throw new Error(operationFallbacks[operation]);
  }

  return result;
}

export interface ApproveMissionParams {
  missionId: MissionId;
  issuerId: string;
  supabaseClient?: SupabaseClient;
}

export interface RejectMissionParams {
  missionId: MissionId;
  issuerId: string;
  /** Optional free-text reason shown to the assignee (Phase 2.3). */
  reason?: string;
  supabaseClient?: TaskLifecycleClient;
}

export interface UpdateMissionStatusParams {
  missionId: MissionId;
  status: TaskStatus;
  userId: string;
  supabaseClient?: TaskLifecycleClient;
}

export interface UploadProofParams {
  missionId: MissionId;
  file?: File | null;
  textDescription?: string;
  userId: string;
  supabaseClient?: TaskLifecycleClient;
}

export interface ArchiveMissionParams {
  missionId: MissionId;
  userId: string;
  supabaseClient?: TaskLifecycleClient;
}

export interface SubmitForReviewParams {
  missionId: MissionId;
  userId: string;
  supabaseClient?: TaskLifecycleClient;
}

/**
 * Approves a mission that is in 'review' status.
 *
 * Uses the approve_task RPC which handles everything server-side:
 * - Task status update (review -> completed)
 * - Credit awarding
 *
 * This avoids RLS issues where creator tries to write to assignee's records.
 */
export async function approveMission(params: ApproveMissionParams): Promise<void> {
  const { missionId, supabaseClient = supabase } = params;

  const { error } = await supabaseClient.rpc('approve_task', {
    p_task_id: missionId,
  });

  if (error) {
    // Map PostgreSQL exceptions to user-friendly messages
    if (error.message?.includes('Not authenticated')) {
      throw new Error('You must be logged in to approve tasks.');
    }
    if (error.message?.includes('Not authorized')) {
      throw new Error('Only the task creator can approve this task.');
    }
    if (error.message?.includes('Task not found')) {
      throw new Error('Task not found.');
    }
    if (error.message?.includes('must be in review status')) {
      throw new Error('This task is not ready for approval.');
    }

    throw new Error(error.message || 'Failed to approve task.');
  }
}

/**
 * Rejects a mission that is in 'review' status.
 *
 * Flow:
 * 1. Fetch task (validate issuer is creator)
 * 2. Evaluate status change using domain logic
 * 3. Update task status to 'rejected', clear proof, and store an optional reason
 *
 * Phase 2.3: the task is persisted in the 'rejected' state (not reset to
 * 'pending') so the assignee sees the rejection and can resubmit.
 */
export async function rejectMission(params: RejectMissionParams): Promise<void> {
  const { missionId, issuerId, reason, supabaseClient = supabase } = params;

  // Fetch task to get context
  const { data: task, error: fetchError } = await supabaseClient
    .from('tasks')
    .select('assigned_to, created_by, status')
    .eq('id', missionId)
    .eq('created_by', issuerId)
    .single();

  if (fetchError || !task) {
    throw fetchError || new Error('Task not found or you are not the creator.');
  }

  // Evaluate status change using domain logic
  const statusChangeContext: StatusChangeContext = {
    actorId: issuerId,
    contractOwnerId: issuerId,
    assigneeId: task.assigned_to,
    currentStatus: task.status as TaskStatus,
    requestedStatus: 'rejected',
    proofRequired: false,
  };

  const statusChangeResult = evaluateStatusChange(statusChangeContext);

  if (!statusChangeResult.allowed) {
    const errorMsg = statusChangeResult.errors?.join(' ') || 'Cannot reject this task.';
    throw new Error(errorMsg);
  }

  const trimmedReason = reason?.trim();
  const { data, error } = await supabaseClient.rpc('reject_task', {
    p_task_id: missionId,
    p_rejection_reason: trimmedReason || undefined,
  });

  if (error) {
    throw new Error(error.message || 'Failed to reject task.');
  }

  requireTaskLifecycleRpcSuccess(data, 'reject');
}

/**
 * Updates a mission's status (for assignee actions like starting, completing, etc.).
 * 
 * Flow:
 * 1. Fetch task details
 * 2. Evaluate status change using domain logic
 * 3. Update task status
 */
export async function updateMissionStatus(params: UpdateMissionStatusParams): Promise<void> {
  const { missionId, status, userId, supabaseClient = supabase } = params;

  // Step 1: Fetch task without restrictive filters - let RLS handle permissions
  const { data: task, error: fetchError } = await supabaseClient
    .from('tasks')
    .select('proof_required, reward_type, reward_text, assigned_to, created_by, status, proof_url')
    .eq('id', missionId)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  if (!task) {
    throw new Error('Task not found or you do not have permission to access it.');
  }

  // Step 2: Evaluate status change using domain logic
  if (!task.created_by) {
    throw new Error('Task is missing creator information.');
  }

  const statusChangeContext: StatusChangeContext = {
    actorId: userId,
    contractOwnerId: task.created_by,
    assigneeId: task.assigned_to ?? undefined,
    currentStatus: (task.status || 'pending') as TaskStatus,
    requestedStatus: status,
    proofRequired: task.proof_required ?? false,
    hasProof: !!task.proof_url,
  };

  const statusChangeResult = evaluateStatusChange(statusChangeContext);

  if (!statusChangeResult.allowed) {
    const errorMsg = statusChangeResult.errors?.join(' ') || 'Status change not allowed.';
    throw new Error(errorMsg);
  }

  const finalStatus = statusChangeResult.newStatus!;

  if (finalStatus !== 'pending' && finalStatus !== 'in_progress') {
    throw new Error('This status change must use its dedicated task action.');
  }

  const { data, error: updateError } = await supabaseClient.rpc('set_task_status', {
    p_task_id: missionId,
    p_status: finalStatus,
  });

  if (updateError) {
    throw new Error(updateError.message || 'Failed to update task status.');
  }

  requireTaskLifecycleRpcSuccess(data, 'status');
}

/**
 * Uploads proof for a mission.
 * 
 * Flow:
 * 1. Upload file to Supabase storage (if provided)
 * 2. Update task with proof_url (if file) or proof_description (if text), and set status to 'review'
 */
export async function uploadProof(params: UploadProofParams): Promise<string> {
  const { missionId, file, textDescription, supabaseClient = supabase } = params;

  if (!file && !textDescription) {
    throw new Error('Please provide either a file or text description.');
  }

  let proofUrl: string | null = null;
  let proofType: string | null = null;

  // Handle file upload if provided
  if (file) {
    // Enhanced file validation
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('File is too large. Maximum size is 10MB.');
    }

    if (
      !file.type.startsWith('image/') &&
      !file.type.startsWith('video/') &&
      file.type !== 'application/pdf'
    ) {
      throw new Error('Invalid file type. Only images, videos, and PDFs are allowed.');
    }

    // Determine proof_type based on file MIME type
    proofType = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
      ? 'video'
      : 'document';

    // Upload to Supabase Storage
    const fileName = `proofs/${missionId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabaseClient.storage
      .from('bounty-proofs')
      .upload(fileName, file);

    if (uploadError) {
      throw uploadError;
    }

    // Get the public URL for the uploaded file
    const { data: publicUrlData } = supabaseClient.storage
      .from('bounty-proofs')
      .getPublicUrl(fileName);

    if (!publicUrlData) {
      throw new Error('Could not get public URL for the uploaded proof.');
    }

    proofUrl = publicUrlData.publicUrl;
  }

  if (textDescription && !proofType) {
    proofType = 'text';
  }

  const { data, error: updateError } = await supabaseClient.rpc('submit_proof', {
    p_task_id: missionId,
    p_proof_url: proofUrl ?? undefined,
    p_proof_type: proofType ?? undefined,
    p_proof_description: textDescription || undefined,
  });

  if (updateError) {
    throw new Error(updateError.message || 'Failed to submit task for review.');
  }

  requireTaskLifecycleRpcSuccess(data, 'submit');
  return proofUrl || 'text-proof';
}

/**
 * Archives a mission.
 * Sets is_archived = true (not status = 'archived') so History tab query works.
 * Both creator and assignee can archive (it's a global archive for the task).
 */
export async function archiveMission(params: ArchiveMissionParams): Promise<void> {
  const { missionId, userId, supabaseClient = supabase } = params;

  // First, verify the user is either the creator or assignee
  const { data: task, error: fetchError } = await supabaseClient
    .from('tasks')
    .select('created_by, assigned_to')
    .eq('id', missionId)
    .single();

  if (fetchError || !task) {
    throw new Error('Task not found.');
  }

  if (task.created_by !== userId && task.assigned_to !== userId) {
    throw new Error('Only the creator or assignee can archive this task.');
  }

  const { data, error } = await supabaseClient.rpc('archive_task', {
    p_task_id: missionId,
  });

  if (error) {
    throw new Error(error.message || 'Failed to archive task.');
  }

  requireTaskLifecycleRpcSuccess(data, 'archive');
}

/**
 * R31: Submits a task for review WITHOUT proof.
 * Used when proof_required=false - assignee can complete without uploading proof.
 *
 * Flow:
 * 1. Verify task exists and user is assigned
 * 2. Verify proof is NOT required for this task
 * 3. Update task status to 'review'
 */
export async function submitForReviewNoProof(params: SubmitForReviewParams): Promise<void> {
  const { missionId, userId, supabaseClient = supabase } = params;

  // Step 1: Fetch task to verify assignment and proof_required
  const { data: task, error: fetchError } = await supabaseClient
    .from('tasks')
    .select('assigned_to, proof_required, status')
    .eq('id', missionId)
    .single();

  if (fetchError) {
    throw new Error('Task not found.');
  }

  if (!task) {
    throw new Error('Task not found.');
  }

  // Step 2: Verify user is assigned to this task
  if (task.assigned_to !== userId) {
    throw new Error('You are not assigned to this task.');
  }

  // Step 3: Verify proof is NOT required (safety check)
  if (task.proof_required === true) {
    throw new Error('This task requires proof. Please upload proof to complete.');
  }

  // Step 4: Verify task is in a completable state
  const completableStatuses = ['pending', 'in_progress', 'rejected'];
  if (!completableStatuses.includes(task.status || 'pending')) {
    throw new Error(`Cannot complete task with status '${task.status}'.`);
  }

  const { data, error: updateError } = await supabaseClient.rpc('submit_proof', {
    p_task_id: missionId,
  });

  if (updateError) {
    throw new Error(updateError.message || 'Failed to submit task for review. Please try again.');
  }

  requireTaskLifecycleRpcSuccess(data, 'submit');
}

