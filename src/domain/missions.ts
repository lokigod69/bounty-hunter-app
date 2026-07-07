// src/domain/missions.ts
// Domain functions for mission/task operations.
// Encapsulates Supabase calls and business logic for mission lifecycle.

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { evaluateStatusChange, StatusChangeContext } from '../core/contracts/contracts.domain';
import type { TaskStatus } from '../types/custom';

export type MissionId = string;

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
  supabaseClient?: SupabaseClient;
}

/**
 * Postgres "undefined column" error code. supabase-js surfaces PostgREST/PG
 * errors as an object with a `.code` field; 42703 means the column referenced
 * in the statement does not exist yet (e.g. rejection_reason before the
 * migration is applied). We use it to degrade gracefully.
 */
const PG_UNDEFINED_COLUMN = '42703';

let warnedMissingRejectionReason = false;

function isUndefinedColumnError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: string }).code === PG_UNDEFINED_COLUMN
  );
}

export interface UpdateMissionStatusParams {
  missionId: MissionId;
  status: TaskStatus;
  userId: string;
  supabaseClient?: SupabaseClient;
}

export interface UploadProofParams {
  missionId: MissionId;
  file?: File | null;
  textDescription?: string;
  userId: string;
  supabaseClient?: SupabaseClient;
}

export interface ArchiveMissionParams {
  missionId: MissionId;
  userId: string;
  supabaseClient?: SupabaseClient;
}

export interface SubmitForReviewParams {
  missionId: MissionId;
  userId: string;
  supabaseClient?: SupabaseClient;
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
 * Phase 2.3: the task is now persisted in the 'rejected' state (not reset to
 * 'pending') so the assignee sees the rejection and can resubmit. If the
 * rejection_reason column is not present yet (Postgres 42703 — the migration
 * has not been applied), we retry the same update without it so status still
 * lands on 'rejected'.
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

  // Update task status - rejection persists the 'rejected' state and clears proof.
  const trimmedReason = reason?.trim();
  const baseUpdate = {
    status: 'rejected',
    proof_url: null,
    proof_type: null,
  } as const;

  const { error } = await supabaseClient
    .from('tasks')
    .update({ ...baseUpdate, rejection_reason: trimmedReason || null })
    .eq('id', missionId);

  if (error) {
    // Graceful degradation: rejection_reason column not deployed yet (42703).
    // Retry without it so the 'rejected' status still lands.
    if (isUndefinedColumnError(error)) {
      if (!warnedMissingRejectionReason) {
        console.warn(
          '[missions] rejection_reason column missing (42703); rejecting without storing a reason. Apply migration 20260707220000_add_rejection_reason.sql.'
        );
        warnedMissingRejectionReason = true;
      }
      const { error: retryError } = await supabaseClient
        .from('tasks')
        .update(baseUpdate)
        .eq('id', missionId);
      if (retryError) {
        throw retryError;
      }
      return;
    }
    throw error;
  }
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

  // Step 3: Update task
  const updateData: { status: string; completed_at?: string } = { status: finalStatus };
  
  // Set completion timestamp if domain logic says so
  if (statusChangeResult.shouldSetCompletedAt) {
    updateData.completed_at = new Date().toISOString();
  }

  const { error: updateError } = await supabaseClient
    .from('tasks')
    .update(updateData)
    .eq('id', missionId);

  if (updateError) {
    // Provide specific error messages for common issues
    let errorMessage = 'Failed to update task status.';
    if (updateError.message.includes('permission') || updateError.code === 'PGRST301') {
      errorMessage = 'You do not have permission to update this task.';
    } else if (updateError.message.includes('not found') || updateError.code === 'PGRST116') {
      errorMessage = 'Task not found or has been deleted.';
    } else if (updateError.message.includes('network') || updateError.code === 'PGRST000') {
      errorMessage = 'Network error. Please check your connection and try again.';
    }
    throw new Error(errorMessage);
  }
}

/**
 * Uploads proof for a mission.
 * 
 * Flow:
 * 1. Upload file to Supabase storage (if provided)
 * 2. Update task with proof_url (if file) or proof_description (if text), and set status to 'review'
 */
export async function uploadProof(params: UploadProofParams): Promise<string> {
  const { missionId, file, textDescription, userId, supabaseClient = supabase } = params;

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

  // Update task with proof data and set status to 'review'
  // Also set completed_at (submission timestamp) for streak calculation
  const updateData: {
    proof_url?: string | null;
    proof_description?: string | null;
    proof_type?: string | null;
    rejection_reason?: string | null;
    status: string;
    completed_at: string;
  } = {
    status: 'review',
    completed_at: new Date().toISOString(),
    // Phase 2.3: resubmitting clears any prior rejection reason.
    rejection_reason: null,
  };

  if (proofUrl) {
    updateData.proof_url = proofUrl;
    updateData.proof_type = proofType;
  }

  if (textDescription) {
    updateData.proof_description = textDescription;
    if (!proofType) {
      updateData.proof_type = 'text';
    }
  }

  const { error: updateError } = await supabaseClient
    .from('tasks')
    .update(updateData)
    .eq('id', missionId)
    .eq('assigned_to', userId); // Security: only assigned user can submit proof

  if (updateError) {
    // Graceful degradation: rejection_reason column not deployed yet (42703).
    // Retry without it so the resubmission (status -> 'review') still lands.
    if (isUndefinedColumnError(updateError)) {
      if (!warnedMissingRejectionReason) {
        console.warn(
          '[missions] rejection_reason column missing (42703); resubmitting without clearing a reason. Apply migration 20260707220000_add_rejection_reason.sql.'
        );
        warnedMissingRejectionReason = true;
      }
      const { rejection_reason: _omit, ...updateWithoutReason } = updateData;
      void _omit;
      const { error: retryError } = await supabaseClient
        .from('tasks')
        .update(updateWithoutReason)
        .eq('id', missionId)
        .eq('assigned_to', userId);
      if (retryError) {
        throw retryError;
      }
      return proofUrl || 'text-proof';
    }
    throw updateError;
  }

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

  // Archive the task
  const { error } = await supabaseClient
    .from('tasks')
    .update({ is_archived: true })
    .eq('id', missionId);

  if (error) {
    throw error;
  }
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

  // Step 5: Update task status to 'review' and set completed_at (submission timestamp)
  // This timestamp is used for streak calculation (not approval date)
  const { error: updateError } = await supabaseClient
    .from('tasks')
    .update({
      status: 'review',
      completed_at: new Date().toISOString(),
    })
    .eq('id', missionId)
    .eq('assigned_to', userId); // Security: only assigned user can update

  if (updateError) {
    throw new Error('Failed to submit task for review. Please try again.');
  }
}

