// src/domain/missions.ts
// Domain functions for mission/task operations.
// Encapsulates Supabase calls and business logic for mission lifecycle.

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { evaluateStatusChange, StatusChangeContext } from '../core/contracts/contracts.domain';
import { decideCreditsForApprovedContract } from '../core/credits/credits.domain';
import { updateStreakAfterCompletion } from './streaks';
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
  supabaseClient?: SupabaseClient;
}

export interface UpdateMissionStatusParams {
  missionId: MissionId;
  status: TaskStatus;
  userId: string;
  supabaseClient?: SupabaseClient;
}

export interface UploadProofParams {
  missionId: MissionId;
  file: File;
  userId: string;
  supabaseClient?: SupabaseClient;
}

export interface ArchiveMissionParams {
  missionId: MissionId;
  userId: string;
  supabaseClient?: SupabaseClient;
}

/**
 * Approves a mission that is in 'review' status.
 * 
 * Flow:
 * 1. Fetch task details (validate issuer is creator)
 * 2. Evaluate status change using domain logic
 * 3. Update task status to 'completed'
 * 4. Update streak if daily mission
 * 5. Award credits if applicable
 * 
 * Returns the new streak count if applicable.
 */
export async function approveMission(params: ApproveMissionParams): Promise<{ streakCount?: number }> {
  const { missionId, issuerId, supabaseClient = supabase } = params;

  // 1. Fetch task details to get reward info and is_daily flag
  const { data: task, error: fetchError } = await supabaseClient
    .from('tasks')
    .select('assigned_to, reward_type, reward_text, is_daily')
    .eq('id', missionId)
    .eq('created_by', issuerId) // Security check
    .single();

  if (fetchError || !task) {
    throw fetchError || new Error('Task not found or you are not the creator.');
  }

  // 2. Evaluate status change using domain logic
  const statusChangeContext: StatusChangeContext = {
    actorId: issuerId,
    contractOwnerId: issuerId, // Creator is approving
    assigneeId: task.assigned_to,
    currentStatus: 'review', // Approving from review status
    requestedStatus: 'completed',
    proofRequired: false, // Not needed for approval decision
    hasProof: true, // Assumed true if in review
  };

  const statusChangeResult = evaluateStatusChange(statusChangeContext);

  if (!statusChangeResult.allowed) {
    const errorMsg = statusChangeResult.errors?.join(' ') || 'Cannot approve this task.';
    throw new Error(errorMsg);
  }

  // 3. Update task status to 'completed'
  const updateData: { status: string; completed_at?: string } = { status: 'completed' };
  if (statusChangeResult.shouldSetCompletedAt) {
    updateData.completed_at = new Date().toISOString();
  }

  const { error: updateError } = await supabaseClient
    .from('tasks')
    .update(updateData)
    .eq('id', missionId);

  if (updateError) {
    throw updateError;
  }

  // 4. Update streak for daily missions before awarding credits
  let streakCount: number | undefined = undefined;
  if (task.is_daily && task.assigned_to) {
    try {
      streakCount = await updateStreakAfterCompletion(missionId, task.assigned_to);
    } catch (streakError) {
      console.error('Failed to update streak:', streakError);
      // Don't block approval if streak update fails, but log it
    }
  }

  // 5. Award credits if domain logic says so
  if (statusChangeResult.shouldAwardCredits && task.reward_type === 'credit' && task.reward_text && task.assigned_to) {
    const creditDecision = decideCreditsForApprovedContract({
      contractId: missionId,
      assigneeId: task.assigned_to,
      baseReward: parseInt(task.reward_text, 10),
      isDaily: task.is_daily || false,
      streakCount: streakCount,
    });

    if (creditDecision.amount > 0) {
      const { error: rpcError } = await supabaseClient.rpc('increment_user_credits', {
        user_id_param: task.assigned_to,
        amount_param: creditDecision.amount,
      });

      if (rpcError) {
        console.error('Failed to award credits via RPC:', rpcError);
        throw new Error(`Failed to award ${creditDecision.amount} credits.`);
      }
    }
  }

  return { streakCount };
}

/**
 * Rejects a mission that is in 'review' status.
 * 
 * Flow:
 * 1. Fetch task (validate issuer is creator)
 * 2. Evaluate status change using domain logic
 * 3. Update task status to 'pending' and clear proof
 */
export async function rejectMission(params: RejectMissionParams): Promise<void> {
  const { missionId, issuerId, supabaseClient = supabase } = params;

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

  // Update task status - rejection resets to pending and clears proof
  const { error } = await supabaseClient
    .from('tasks')
    .update({ 
      status: 'pending',
      proof_url: null,
      proof_type: null,
    })
    .eq('id', missionId);

  if (error) {
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
 * 1. Upload file to Supabase storage (bounty-proofs bucket)
 * 2. Update task with proof_url and set status to 'review'
 */
export async function uploadProof(params: UploadProofParams): Promise<string> {
  const { missionId, file, userId, supabaseClient = supabase } = params;

  // Enhanced file validation
  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    throw new Error('File is too large. Maximum size is 10MB.');
  }

  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
    throw new Error('Invalid file type. Only images and videos are allowed.');
  }

  // Determine proof_type based on file MIME type
  const proofType = file.type.startsWith('image/') ? 'image' : 'video';

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

  const proofUrl = publicUrlData.publicUrl;

  // Update task with proof URL, proof_type, and set status to 'review'
  const { error: updateError } = await supabaseClient
    .from('tasks')
    .update({
      proof_url: proofUrl,
      status: 'review',
      proof_type: proofType,
    })
    .eq('id', missionId)
    .eq('assigned_to', userId); // Security: only assigned user can submit proof

  if (updateError) {
    throw updateError;
  }

  return proofUrl;
}

/**
 * Archives a mission.
 */
export async function archiveMission(params: ArchiveMissionParams): Promise<void> {
  const { missionId, userId, supabaseClient = supabase } = params;

  const { error } = await supabaseClient
    .from('tasks')
    .update({ status: 'archived' })
    .eq('id', missionId)
    .eq('created_by', userId); // Only creator can archive

  if (error) {
    throw error;
  }
}

