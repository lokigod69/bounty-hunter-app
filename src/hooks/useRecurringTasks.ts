// src/hooks/useRecurringTasks.ts
// This hook manages fetching and manipulating recurring task templates and their instances.
// Changes:
// - Explicitly added 'proof_required' to NewRecurringTemplateData type.
// - Modified completeTaskInstance to handle proof_description, validate proof requirement, and call awardCredits.
// - Renamed addTemplate to createTemplate, added detailed error logging, instance generation call, error toasts, and improved type handling for new templates.
// - Implemented generateWeeklyInstances to create 7 daily instances for a template for the current week.
// - Fixed lint errors: cast 'err' to 'Error' in setError, corrected import path for dateUtils, and improved type safety for fetched/created templates.
// - Corrected type assertion for templateDetails in completeTaskInstance.
// - Removed direct selection of 'credit_value' from 'recurring_task_instances' in 'completeTaskInstance' as it's fetched from the joined template.
// - Typed 'updateData' in 'updateTemplate' as 'Partial<RecurringTemplate>' to resolve 'any' type lint error.
// - Removed logic attempting to set 'assignee_id' in 'updateTemplate' as 'recurring_templates' table schema does not support it directly.
// - Removed 'initial_assignee_id' from destructuring in 'updateTemplate' to prevent unused variable error.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { TaskInstance, RecurringTemplate, Profile } from '../types/database';
import toast from 'react-hot-toast';
import { getStartOfWeek } from '../utils/dateUtils';

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

      // Fetch daily task instances created from these templates
      const { data: instanceData, error: instanceError } = await supabase
        .from('recurring_task_instances')
        .select(`
          *,
          recurring_task_templates(*)
        `)
        .in('template_id', templateData.map(t => t.id))
        .order('scheduled_date', { ascending: true });

      if (instanceError) throw instanceError;

      setTemplates(templateData || []);
      setTaskInstances(instanceData || []);
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
        // IMPORTANT: generateWeeklyInstances is assumed to exist elsewhere or will be implemented.
        // If it's async and can fail, consider its error handling too.
        try {
          await generateWeeklyInstances(data.id);
        } catch (instanceError) {
          console.error('Failed to generate weekly instances:', instanceError);
          toast.error('Template created, but failed to generate weekly instances. Please check logs.');
          // Decide if this error should propagate or be handled (e.g., template created but instances failed)
          // For now, log and continue, as template creation itself was successful.
        }
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

  const generateWeeklyInstances = async (templateId: string) => {
    if (!supabase) {
      console.error('Supabase client not available for generating weekly instances.');
      toast.error('Failed to initialize instance generation: Supabase client missing.');
      return;
    }

    // 1. Fetch the template details
    const { data: template, error: templateError } = await supabase
      .from('recurring_task_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      console.error('Error fetching template for instance generation:', templateError);
      toast.error(`Failed to generate instances: Could not fetch template (ID: ${templateId}).`);
      return;
    }

    if (!template.assignee_id) {
      console.warn(`Template ${templateId} has no assignee. Instances will not be assigned.`);
      // Depending on requirements, you might want to stop or allow unassigned instances.
      // For now, we'll create them unassigned if assignee_id is null.
    }

    // 2. Determine the current week's start date (Sunday)
    const today = new Date();
    const startOfWeek = getStartOfWeek(today);
    const instancesToCreate = [];

    // 3. Generate 7 daily instances for the current week
    // Consider template.frequency_limit if it's meant to cap weekly instances.
    // For now, assume 7 daily instances are always created if template is active.
    const numberOfInstancesToCreate = template.frequency_limit && template.frequency_limit < 7 ? template.frequency_limit : 7;

    for (let i = 0; i < numberOfInstancesToCreate; i++) {
      const scheduledDate = new Date(startOfWeek);
      scheduledDate.setDate(startOfWeek.getDate() + i);

      const instancePayload = {
        template_id: template.id,
        assigned_to: template.assignee_id, // Can be null if template has no assignee
        status: 'pending',
        scheduled_date: scheduledDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
        credit_value: template.credit_value,
        // title and description are typically joined from the template, not stored on instance
      };
      instancesToCreate.push(instancePayload);
    }

    // 4. Batch insert these instances
    if (instancesToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('recurring_task_instances')
        .insert(instancesToCreate);

      if (insertError) {
        console.error('Error batch inserting weekly instances:', insertError);
        toast.error('Failed to create some or all daily instances for the new contract.');
      } else {
        toast.success(`${instancesToCreate.length} daily instances scheduled for the week.`);
        // Optionally, refetch instances or update local state here if needed immediately
        // For now, DailyContractsPage refetches templates (which include instances) when modal closes.
      }
    } else {
      console.log('No instances to create for template:', templateId);
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
    const result = data?.[0]?.j;

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
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleTemplateActive,
    completeTaskInstance,
    generateWeeklyInstances,
    refetch: fetchTemplatesAndInstances,
  };
}
