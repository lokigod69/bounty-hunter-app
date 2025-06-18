// src/types/app-specific-types.ts
// This file contains app-specific type aliases derived from the auto-generated database.ts types.

import { Database } from './database';

// Profile type based on the 'profiles' table row
export type Profile = Database['public']['Tables']['profiles']['Row'];

// RecurringTemplate type based on the 'recurring_task_templates' table row
export type RecurringTemplate = Database['public']['Tables']['recurring_task_templates']['Row'];

// TaskInstance type based on the 'recurring_task_instances' table row
// Also adding 'proof_required' here as it's being added to the payload in useRecurringTasks.ts
// and should ideally be part of the instance's data model if it's stored/used.
export type TaskInstance = Database['public']['Tables']['recurring_task_instances']['Row'] & {
  proof_required?: boolean | null; // Reflects the flag copied from the template
};

// Type for the result of the 'complete_task_instance' RPC function
export interface CompleteTaskInstanceResult {
  success: boolean;
  message: string;
  awarded_credits?: number;
  // Add any other properties returned by the RPC's 'j' object
}
