// src/types/custom.ts
// This file contains custom type definitions and aliases built upon the auto-generated database types.
// This keeps manual type definitions separate from the auto-generated file, preventing them from being overwritten.

import type { Database } from './database';

// Proposal 011: submit_proof/reject_task/set_task_status/archive_task/delete_task
// are live in src/types/database.ts (regenerated 2026-07-10 after the SQL apply) —
// no client-side overlay needed; SupabaseClient<Database> covers them natively.

export type TaskLifecycleRpcErrorCode =
  | 'not_authenticated'
  | 'task_not_found'
  | 'not_assignee'
  | 'not_creator'
  | 'not_participant'
  | 'wrong_status'
  | 'proof_required'
  | 'invalid_proof_type'
  | 'status_not_allowed';

export type TaskLifecycleRpcResult = {
  success?: boolean;
  error?: TaskLifecycleRpcErrorCode | string;
  proof_url?: string | null;
  already_submitted?: boolean;
  already_rejected?: boolean;
  already_archived?: boolean;
  already_deleted?: boolean;
  unchanged?: boolean;
};

// Base table types
export type Task = Database['public']['Tables']['tasks']['Row'] & {
  updated_at?: string | null;
};
// partner_user_id, theme and onboarding_completed are in the generated types
// since the 2026-07-08 regen (migrations applied to mvbmpcmexkgfairnthux).
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type NewTaskData = Database['public']['Tables']['tasks']['Insert'];
export type UpdateTaskData = Database['public']['Tables']['tasks']['Update'];

// Type for a task that includes joined profile data for creator and assignee
export type TaskWithProfiles = Task & {
  profiles: Profile | null; // This alias is based on the join in useTasks
  creator_profile: Profile | null; // This alias is based on the join in useTasks
};

export type CollectedRewardRow =
  Database['public']['Tables']['collected_rewards']['Row'];

export type Invite = Database['public']['Tables']['invites']['Row'];

// Manually define Enums as they are not in the generated types
export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'completed' | 'archived' | 'pending_proof' | 'rejected';
// 'video' and 'document' (PDF) reflect what src/domain/missions.ts uploadProof()
// actually writes to tasks.proof_type based on the uploaded file's MIME type.
export type ProofType = 'text' | 'image' | 'video' | 'document';
