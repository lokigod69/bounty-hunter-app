// src/hooks/useRecurringTasks.ts
// This hook manages fetching and manipulating recurring task templates and their instances.
// Changes:
// - FIX: Corrected Supabase query to use a standard join (`recurring_task_templates(*)`) instead of an inner join.
//   The `!inner` syntax was failing, but a standard join will work as the data relationships are valid.
//   This fixes a critical bug where the 'Assigned to Me' section showed generic data.
// - Added fetching for `completedInstancesThisWeek` assigned to the current user.
// - Refactored instance generation from weekly batch to single daily instance creation.
//   - Replaced `generateWeeklyInstances` with `generateSingleInstanceForToday`.
//   - Added `ensureTodaysInstancesAreGenerated` to check and create daily tasks on demand.
//   - Updated `createTemplate` to call the new single-instance generation logic.
// - In `fetchTemplatesAndInstances`, corrected the query for `taskInstances` (pending/in-progress) to filter by `assigned_to: user.id`.
// - Explicitly added 'proof_required' to NewRecurringTemplateData type.
// - Modified completeTaskInstance to handle proof_description, validate proof requirement, and call awardCredits.
// - Renamed addTemplate to createTemplate, added detailed error logging, instance generation call, error toasts, and improved type handling for new templates.
// - Corrected type assertion for templateDetails in completeTaskInstance.
// - Removed direct selection of 'credit_value' from 'recurring_task_instances' in 'completeTaskInstance' as it's fetched from the joined template.
// - Typed 'updateData' in 'updateTemplate' as 'Partial<RecurringTemplate>' to resolve 'any' type lint error.
// - Updated type imports to use app-specific-types.ts for Profile, RecurringTemplate, TaskInstance.
// - In `completeTaskInstance`, cast RPC result to `unknown` then to `CompleteTaskInstanceResult` for safer type assertion.
// - Enhanced error logging for instance insertion failures.
// - Removed erroneous call to refetchAssignedInstances; data refetch handled by page components.
// - Removed unused 'getStartOfWeek' import and added null check for 'template.frequency_counter'.;
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { Profile, RecurringTemplate, TaskInstance, CompleteTaskInstanceResult } from '../types/app-specific-types'; // Updated import path
import toast from 'react-hot-toast';
import { getStartOfWeek } from '../utils/dateUtils'; // Re-added for completed tasks filtering

// Enhanced type that includes task instances and the assignee's profile
export type RecurringTemplateWithInstances = RecurringTemplate & {
  instances: TaskInstance[];
  assignee: Profile | null; // Assignee can be null
};

// Type for creating/updating a recurring template.
// It omits DB-generated fields and includes the form-specific 'initial_assignee_id'.
export type NewRecurringTemplateData = Omit<RecurringTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'assignee_id'> & {
    initial_assignee_id?: string;
    proof_required?: boolean; // Added to ensure it's recognized by forms
};

// Type for task instances that also includes the parent template data
export type TaskInstanceWithTemplate = TaskInstance & {
  recurring_task_templates: RecurringTemplate | null;
};

const TEMPLATE_SELECT_QUERY = `
  *,
  instances: recurring_task_instances(*),
  assignee: profiles!assignee_id(*)
`;

export default function useRecurringTasks() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<RecurringTemplateWithInstances[]>([]);
  const [taskInstances, setTaskInstances] = useState<TaskInstanceWithTemplate[]>([]);
  const [completedInstancesThisWeek, setCompletedInstancesThisWeek] = useState<TaskInstanceWithTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTemplatesAndInstances = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch recurring templates and join the assignee's profile data
      const { data: templateData, error: templateError } = await supabase
        .from('recurring_task_templates')
        .select(TEMPLATE_SELECT_QUERY)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (templateError) throw templateError;

      // Fetch daily task instances ASSIGNED TO THE CURRENT USER
      const { data: instanceData, error: instanceError } = await supabase
        .from('recurring_task_instances')
        .select(`
          *,
          recurring_task_templates(*)
        `)
        .eq('assigned_to', user.id) // <-- THE FIX: Only get instances assigned to me.
        .order('scheduled_date', { ascending: true });

      if (instanceError) throw instanceError;

      setTemplates(templateData || []);
      setTaskInstances(instanceData || []);

      // Fetch completed instances for the current user for this week
      const today = new Date();
      const startOfWeekDate = getStartOfWeek(today);
      const { data: completedData, error: completedError } = await supabase
        .from('recurring_task_instances')
        .select('*, recurring_task_templates(*)') // Ensure template data is joined
        .eq('assigned_to', user.id)
        .in('status', ['completed', 'review'])
        .gte('completed_at', startOfWeekDate.toISOString())
        .order('completed_at', { ascending: false });

      if (completedError) {
        console.error('[useRecurringTasks] Error fetching completed instances:', completedError);
        // Don't throw, allow other data to load
      } else {
        setCompletedInstancesThisWeek(completedData || []);
      }
    } catch (err) {
      setError(err as Error);
      toast.error('Failed to fetch recurring contracts.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTemplatesAndInstances();
  }, [fetchTemplatesAndInstances]);

  const createTemplate = async (templateData: NewRecurringTemplateData) => {
    if (!user) {
      console.error('createTemplate failed: User not authenticated');
      toast.error('You must be logged in to create a template.');
      throw new Error('User not authenticated');
    }

    try {
      const { initial_assignee_id, ...restOfTemplateData } = templateData;
      
      // Prepare the data for Supabase insert.
      // `templateData` from the form already includes fields like title, description, credit_value,
      // frequency_limit, proof_required, frequency_counter, period_reset_date, and is_active.
      const insertPayload = {
        ...restOfTemplateData,
        assignee_id: initial_assignee_id, // Map form field to DB column
        created_by: user.id,
        // is_active is part of templateData and should be true by default from the form
      };

      const { data, error } = await supabase
        .from('recurring_task_templates')
        .insert(insertPayload) // Insert a single object
        .select() // Select all columns from the inserted row
        .single();

      if (error) {
        console.error('Supabase error during template creation:', error);
        toast.error(`Failed to create template: ${error.message}`);
        throw new Error(`Database error: ${error.message}`);
      }

      // Generate instances after successful creation
      if (data && data.id) {
        console.log('[useRecurringTasks] New template created:', data);
        console.log('[useRecurringTasks] Attempting to generate single instance for today for template ID:', data.id);
        await generateSingleInstanceForToday(data.id);
        console.log('[useRecurringTasks] Finished generateSingleInstanceForToday call for template ID:', data.id);
      }
      
      // Update local state
      if (data) {
        // The 'data' from a simple .select() after insert won't include nested 'instances' or 'assignee' profile.
        // We construct a RecurringTemplateWithInstances object manually.
        const newTemplateWithDetails: RecurringTemplateWithInstances = {
          ...(data as RecurringTemplate), // Base template data
          instances: [], // New templates have no instances yet
          assignee: null, // Assignee profile not fetched here, could be fetched separately if needed immediately
                          // Or rely on the main fetchTemplatesAndInstances to populate it fully later.
        };
        setTemplates(prev => [newTemplateWithDetails, ...prev]);
      }
      
      return data as RecurringTemplate; // Returns the base template data
    } catch (error) {
      console.error('createTemplate failed:', error);
      // Generic fallback toast if not caught by more specific handlers above
      if (!(error instanceof Error && error.message.startsWith('Database error:')) && !(error instanceof Error && error.message === 'User not authenticated')) {
        toast.error('An unexpected error occurred while creating the template.');
      }
      throw error;
    }
  };

  const generateSingleInstanceForToday = async (templateId: string) => {
    console.log('[useRecurringTasks] generateSingleInstanceForToday called for templateId:', templateId);

    // Fetch the template directly to ensure fresh data
    const { data: template, error: fetchError } = await supabase
      .from('recurring_task_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (fetchError || !template) {
      console.error(`[useRecurringTasks] Error fetching template ${templateId} for instance generation:`, fetchError);
      toast.error(`Failed to generate instance: Could not fetch template details (ID: ${templateId}).`);
      return;
    }

    // 1. Check if template is active
    if (!template.is_active) {
      console.log(`[useRecurringTasks] Template ${templateId} is inactive. Skipping instance generation.`);
      return;
    }

    // 2. Check if assignee exists
    if (!template.assignee_id) {
      console.warn(`[useRecurringTasks] Template ${templateId} has no assignee_id. Skipping instance generation.`);
      return;
    }

    // 3. Check weekly quota (frequency_counter vs frequency_limit)
    // Note: We assume the counter is reset weekly by another process. This check prevents over-generation within the week.
    if ((template.frequency_counter ?? 0) >= template.frequency_limit) {
        console.log(`[useRecurringTasks] Weekly quota reached for template ${templateId}. Skipping instance generation.`);
        return;
    }

    // 4. Check if an instance for today already exists
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset*60*1000));
    const todayString = localToday.toISOString().split('T')[0]; // YYYY-MM-DD

    const { data: existingInstance, error: existingInstanceError } = await supabase
        .from('recurring_task_instances')
        .select('id')
        .eq('template_id', templateId)
        .eq('scheduled_date', todayString)
        .maybeSingle();

    if (existingInstanceError) {
        console.error(`[useRecurringTasks] Error checking for existing instance:`, existingInstanceError);
        toast.error('Could not verify existing tasks. Please try again.');
        return;
    }

    if (existingInstance) {
        console.log(`[useRecurringTasks] Instance for template ${templateId} already exists for today (${todayString}). Skipping.`);
        return;
    }

    // 5. All checks passed, create a single instance for today
    const instancePayload = {
      template_id: template.id,
      assigned_to: String(template.assignee_id),
      status: 'pending' as const,
      scheduled_date: todayString,
      credit_value: template.credit_value,
      proof_required: template.proof_required,
    };

    console.log('[useRecurringTasks] Attempting to insert single instance:', JSON.stringify(instancePayload, null, 2));

    const { data: insertedData, error: insertError } = await supabase
      .from('recurring_task_instances')
      .insert(instancePayload)
      .select()
      .single();

    if (insertError) {
      console.error('[useRecurringTasks] Error generating single instance. Full error object:', JSON.stringify(insertError, null, 2));
      toast.error(`Failed to schedule task: ${insertError.message}`);
    } else {
      console.log(`[useRecurringTasks] Single instance created for template ${templateId}. Inserted data:`, insertedData);
      // Manually add the new instance to the local state to update the UI immediately
      if (insertedData) {
          const newInstanceWithTemplate: TaskInstanceWithTemplate = {
              ...(insertedData as TaskInstance),
              recurring_task_templates: template,
          };
          setTaskInstances(prev => [...prev, newInstanceWithTemplate]);
      }
    }
  };

  const updateTemplate = async (id: string, updates: Partial<NewRecurringTemplateData>) => {
    const { ...rest } = updates; // initial_assignee_id is not used for direct template update
    const updateData: Partial<RecurringTemplate> = { ...rest };
    // initial_assignee_id is part of NewRecurringTemplateData for form handling (e.g., creating initial instances),
    // but recurring_task_templates table itself doesn't have an assignee_id. Assignees are per-instance.

    const { data, error } = await supabase
      .from('recurring_task_templates')
      .update(updateData)
      .eq('id', id)
      .select(TEMPLATE_SELECT_QUERY)
      .single();

    if (error) throw error;
    if (data) {
      setTemplates(prev => prev.map(t => t.id === id ? data as RecurringTemplateWithInstances : t));
    }
    return data as RecurringTemplateWithInstances;
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from('recurring_task_templates').delete().eq('id', id);
    if (error) throw error;
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const toggleTemplateActive = async (id: string, isActive: boolean) => {
    const { data, error } = await supabase
      .from('recurring_task_templates')
      .update({ is_active: isActive })
      .eq('id', id)
      .select(TEMPLATE_SELECT_QUERY)
      .single();

    if (error) throw error;
    if (data) {
      setTemplates(prev => prev.map(t => (t.id === id ? data as RecurringTemplateWithInstances : t)));
    }
  };

  const ensureTodaysInstancesAreGenerated = async () => {
    if (!user) return;
    console.log('[useRecurringTasks] Ensuring today\'s instances are generated...');

    // Fetch all active templates assigned to the current user
    const { data: assignedTemplates, error } = await supabase
      .from('recurring_task_templates')
      .select('*')
      .eq('assignee_id', user.id)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching assigned templates for instance generation:', error);
      toast.error('Could not check for new daily tasks.');
      return;
    }

    if (!assignedTemplates || assignedTemplates.length === 0) {
      console.log('[useRecurringTasks] No active, assigned templates found for user. Nothing to generate.');
      return;
    }

    // For each template, try to generate an instance for today.
    // The generation function itself contains the logic to prevent duplicates.
    await Promise.all(assignedTemplates.map(t => generateSingleInstanceForToday(t.id)));

    // Refetch all data to ensure UI is consistent after potential creations
    await fetchTemplatesAndInstances();
    console.log('[useRecurringTasks] Finished ensuring today\'s instances.');
  };

  const completeTaskInstance = async (instanceId: string, proofDescription?: string) => {
    if (!user) {
      toast.error('You must be logged in to complete a task.');
      throw new Error('User not authenticated for completing task.');
    }

    const { data, error } = await supabase.rpc('complete_task_instance', {
      instance_id_param: instanceId,
      user_id_param: user.id,
      proof_description_param: proofDescription,
    });

    if (error) {
      console.error('Error completing task instance:', error);
      toast.error(`Failed to complete contract: ${error.message}`);
      throw new Error(`Failed to complete task: ${error.message}`);
    }

    // The RPC returns an array with a single JSONB object
    const result = data?.[0]?.j as unknown as CompleteTaskInstanceResult | undefined;

    if (!result || !result.success) {
      const message = result?.message || 'An unknown error occurred.';
      toast.error(message);
      throw new Error(message);
    }

    toast.success(result.message);

    // Refetch data to update the UI with the new status
    await fetchTemplatesAndInstances();

    // Since the RPC handles the logic and we refetch, we don't need to return the instance
    return;
  };

  return {
    templates,
    taskInstances,
    completedInstancesThisWeek,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleTemplateActive,
    completeTaskInstance,
    generateSingleInstanceForToday, // Kept for direct use if needed
    ensureTodaysInstancesAreGenerated, // New orchestrator function
    refetch: fetchTemplatesAndInstances,
  };
}
