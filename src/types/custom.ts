// src/types/custom.ts
// This file contains custom type definitions and aliases built upon the auto-generated database types.
// This keeps manual type definitions separate from the auto-generated file, preventing them from being overwritten.

import type { Database } from './database';

// Base table types
export type Task = Database['public']['Tables']['tasks']['Row'] & {
  updated_at?: string | null;
};
// R25: Extended Profile type to include partner_user_id (added to DB by backend)
// Phase 2.6: theme + onboarding_completed persisted on profiles
// (migration 20260708120000). Optional so pre-migration rows/reads stay valid.
export type Profile = Database['public']['Tables']['profiles']['Row'] & {
  partner_user_id?: string | null;
  theme?: string | null;
  onboarding_completed?: boolean | null;
};
export type NewTaskData = Database['public']['Tables']['tasks']['Insert'];
export type UpdateTaskData = Database['public']['Tables']['tasks']['Update'];

// Type for a task that includes joined profile data for creator and assignee
export type TaskWithProfiles = Task & {
  profiles: Profile | null; // This alias is based on the join in useTasks
  creator_profile: Profile | null; // This alias is based on the join in useTasks
};

// Phase 2.8: collected_rewards.redeemed_at (migration 20260708120100).
// Overlay because the generated types predate the column.
export type CollectedRewardRow =
  Database['public']['Tables']['collected_rewards']['Row'] & {
    redeemed_at?: string | null;
  };

// Phase 2.5: shareable friend-invite links (migration 20260708120200).
// The `invites` table is not in the generated database types yet.
export type Invite = {
  id: string;
  token: string;
  inviter_id: string;
  created_at: string;
  revoked: boolean;
};

// Manually define Enums as they are not in the generated types
export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'completed' | 'archived' | 'pending_proof' | 'rejected';
// 'video' and 'document' (PDF) reflect what src/domain/missions.ts uploadProof()
// actually writes to tasks.proof_type based on the uploaded file's MIME type.
export type ProofType = 'text' | 'url' | 'image' | 'video' | 'document';
