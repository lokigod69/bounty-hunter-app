// src/types/custom.ts
// This file contains custom type definitions and aliases built upon the auto-generated database types.
// This keeps manual type definitions separate from the auto-generated file, preventing them from being overwritten.

import type { Database } from './database';

// Base table types
export type Task = Database['public']['Tables']['tasks']['Row'] & {
  updated_at?: string | null;
};
// R25: Extended Profile type to include partner_user_id (added to DB by backend)
export type Profile = Database['public']['Tables']['profiles']['Row'] & {
  partner_user_id?: string | null;
};
export type NewTaskData = Database['public']['Tables']['tasks']['Insert'];
export type UpdateTaskData = Database['public']['Tables']['tasks']['Update'];

// Type for a task that includes joined profile data for creator and assignee
export type TaskWithProfiles = Task & {
  profiles: Profile | null; // This alias is based on the join in useTasks
  creator_profile: Profile | null; // This alias is based on the join in useTasks
};

// Manually define Enums as they are not in the generated types
export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'completed' | 'archived' | 'pending_proof' | 'rejected';
export type ProofType = 'text' | 'url' | 'image';
