// src/hooks/useTasks.ts
// Hook for managing tasks, including fetching, creating, updating status, and proof uploads with optimistic UI updates.
// Fully replaced to resolve corruption and implement stable proof upload and real-time features.
// Corrected Supabase client import path, type imports, fixed toast.warn, updated createTask, removed 'creator' field, changed to named export, derives assigned/createdTasks, simplified fetchTasks query, fixed lint errors (unused var, useCallback deps), updated uploadProof signature, refactored error handling with getErrorMessage utility (now more type-safe).
// Applied user-requested cast for 'completed' status comparison.
// Replaced 'username' with 'display_name' in profile queries.
// Phase 9A: Updated task fetching to join with profiles table for assignee's name.
// Phase 11: Ensure proof_required is included in createTask and updateTask database payloads.
// Phase 11.1: Handle null created_at in sorting and null proof_url in deleteTask to fix lint errors.
// Phase 11.2: Added explicit string check for proof_url in deleteTask.
// Phase 11.3: Used an explicitly typed string variable for proof_url in new URL() call in deleteTask.
// Phase 11.4: Handled null status in uploadProof's 'includes' check.
// Phase 11.5: Used nullish coalescing for optimisticTask.description to satisfy linter.
// Phase 11.6: Added explicit cast to (string | null) for optimisticTask.description due to persistent linter issue.
// Phase 11.7: Handled undefined for optimisticTask.assigned_to using nullish coalescing.
// Phase 11.8: Added missing nullable fields (frequency_limit, frequency_period, proof_description) to optimisticTask.
// Phase 12: Updated taskQueryString in fetchTasks to include creator_profile to align with Task type.
// Added deleteTask and updateTask functions with optimistic UI updates, proof file deletion (for delete), and robust error handling.
// Updated updateTaskStatus: if task is rejected, set status to 'pending' and clear proof_url.
// Calls increment_user_credits RPC when a credit task is marked as 'completed'. (Updated RPC params to common convention, user to verify).
// Added extensive console.logs for debugging updateTaskStatus flow.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';
import type { NewTaskData, Task, TaskStatus, ProofType, TaskWithProfiles } from '../types/custom';
import { toast } from 'react-hot-toast';
import { User, RealtimeChannel, RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js';

// Helper to reliably get an error message string
interface ErrorWithMessage {
  message: string;
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof (error as any).message === 'string'
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  return String(error);
}

// Helper to generate a unique file path for Supabase Storage
const generateProofFilePath = (taskId: string, file: File): string => {
  const fileExtension = file.name.split('.').pop();
  return `proofs/${taskId}/${Date.now()}.${fileExtension}`; // Store in proofs/taskId/filename
};

export function useTasks(user: User | null, client: SupabaseClient = supabase) {
  const [tasks, setTasks] = useState<TaskWithProfiles[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const currentUserId = user?.id;

  const fetchTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const currentUserId = user.id;

        try {
      const taskQueryString = `
        *,
        profiles:profiles!assigned_to (
          id,
          display_name,
          email
        ),
        creator_profile:profiles!created_by (
          id,
          display_name,
          email
        )
      `;

      // Simplified queries
      const { data: createdByMe, error: createdError } = await client
        .from('tasks')
        .select(taskQueryString)
        .eq('created_by', currentUserId);

      const { data: assignedToMe, error: assignedError } = await client
        .from('tasks')
        .select(taskQueryString)
        .eq('assigned_to', currentUserId);

      const { data: unassignedPending, error: unassignedError } = await client
        .from('tasks')
        .select(taskQueryString)
        .is('assigned_to', null)
        .eq('status', 'pending');

      if (createdError || assignedError || unassignedError) {
        const combinedError = [createdError, assignedError, unassignedError].filter(Boolean).map(e => e?.message).join('; ');
        throw new Error(combinedError || 'Error fetching tasks');
      }

      // Combine results and remove duplicates
      const allTasksMap = new Map<string, TaskWithProfiles>();
      [...(createdByMe || []), ...(assignedToMe || []), ...(unassignedPending || [])].forEach(task => {
        if (task) allTasksMap.set(task.id, task);
      });
      
      const data = Array.from(allTasksMap.values()).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setTasks(data as TaskWithProfiles[] || []);
    } catch (e) {
      const errorMessage = getErrorMessage(e);
      setError(errorMessage);
      toast.error(`Error fetching tasks: ${errorMessage}`);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [client, user]);

  useEffect(() => {
    if (!currentUserId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    fetchTasks();

    const tasksChannel: RealtimeChannel = client
      .channel(`tasks-channel-${currentUserId}-${Date.now()}`) // More unique channel name
      .on<RealtimePostgresChangesPayload<Task>>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          // RLS will ensure user only gets updates for tasks they can see.
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (_payload) => { // payload is typed via RealtimePostgresChangesPayload<Task>
          // console.log('Realtime: Task change received', payload);
          fetchTasks();
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          // console.log('Subscribed to tasks channel!');
        } else if (status === 'CHANNEL_ERROR' && err) {
          console.error('Tasks channel error:', err);
          toast.error(`Real-time connection error: ${err.message}`);
        } else if (status === 'TIMED_OUT') {
          toast('Real-time connection timed out.', { icon: '⚠️' }); // Changed from toast.warn
        } else if (err) { 
            console.error('Tasks subscription error:', err);
            toast.error(`Subscription issue: ${err.message}`);
        }
      });

    return () => {
      client.removeChannel(tasksChannel).catch(err => console.error("Failed to remove channel", err));
    };
  }, [currentUserId, fetchTasks, client]);

  const updateTask = async (taskId: string, taskData: Partial<NewTaskData>): Promise<boolean> => {
    if (!currentUserId) {
      toast.error('You must be logged in to update a task.');
      return false;
    }

    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) {
      toast.error('Task not found.');
      return false;
    }

    if (taskToUpdate.created_by !== currentUserId) {
      toast.error('You can only edit tasks that you created.');
      return false;
    }

    const originalTasks = [...tasks];
    // Optimistic UI update
        setTasks(prevTasks =>
      prevTasks.map(t => {
        if (t.id !== taskId) return t;
        // Reconstruct the task to ensure type safety, preserving existing profile data
        const updatedTask: TaskWithProfiles = {
          ...t,
          ...taskData,
          updated_at: new Date().toISOString(),
        };
        return updatedTask;
      })
    );

    const toastId = `updateTask-${taskId}`;
    toast.loading('Updating task...', { id: toastId });

    try {
      // Prepare data for Supabase, ensuring only allowed fields are sent
      const dataToUpdate: Partial<Database['public']['Tables']['tasks']['Update']> = {};
      if (taskData.title !== undefined) dataToUpdate.title = taskData.title;
      if (taskData.description !== undefined) dataToUpdate.description = taskData.description;
      if (taskData.reward_type !== undefined) dataToUpdate.reward_type = taskData.reward_type;
      if (taskData.reward_text !== undefined) dataToUpdate.reward_text = taskData.reward_text;
      if (taskData.assigned_to !== undefined) dataToUpdate.assigned_to = taskData.assigned_to;
      if (taskData.deadline !== undefined) dataToUpdate.deadline = taskData.deadline;
      if (taskData.proof_required !== undefined) dataToUpdate.proof_required = taskData.proof_required;
      // 'status' can also be updated, but typically through updateTaskStatus. If general edit includes status:
      // if (taskData.status !== undefined) dataToUpdate.status = taskData.status;

      const { data: updatedTask, error: updateError } = await client
        .from('tasks')
        .update(dataToUpdate)
        .eq('id', taskId)
        .eq('created_by', currentUserId) // Ensure creator is the one updating
        .select(`
          *,
          profiles:profiles!assigned_to ( id, display_name, email ),
          creator_profile:profiles!created_by ( id, display_name, email )
        `)
        .single();

      if (updateError) throw updateError;
      if (!updatedTask) throw new Error('Task update returned no data.');

      // Update local state with the actual returned task to ensure consistency
            setTasks(prevTasks => 
        prevTasks.map(t => 
          t.id === taskId ? { ...t, ...updatedTask } : t
        )
      );
      toast.success('Task updated successfully!', { id: toastId });
      return true;
    } catch (e) {
      const errorMessage = getErrorMessage(e);
      // Rollback optimistic update
      setTasks(originalTasks);
      toast.error(`Error updating task: ${errorMessage}`, { id: toastId });
      return false;
    }
  };

    const createTask = async (newTaskData: NewTaskData): Promise<TaskWithProfiles | null> => {
    if (!currentUserId) {
      toast.error('You must be logged in to create a task.');
      return null;
    }

    const tempId = `temp-${Date.now()}`;
        const optimisticTask: TaskWithProfiles = {
      // Base fields from newTaskData
      title: newTaskData.title,
      description: (newTaskData.description ?? null) as (string | null), // Explicit cast for persistent linter issue
      reward_text: newTaskData.reward_text || null,
      reward_type: newTaskData.reward_type || null,
      assigned_to: newTaskData.assigned_to ?? null, // Handle undefined from NewTaskData
      deadline: newTaskData.deadline || null,
      proof_required: newTaskData.proof_required === undefined ? false : newTaskData.proof_required,
      // Default/generated fields for optimistic update
      id: tempId,
      created_at: new Date().toISOString(),
      status: 'pending' as TaskStatus,
      created_by: currentUserId,
      proof_url: null,
      proof_type: null,
      completed_at: null,
      is_archived: false,
            profiles: null, // This is the assignee's profile
      creator_profile: null, // This is the creator's profile
      // Add potentially missing nullable fields from Task type
      frequency_limit: null,
      frequency_period: null,
      proof_description: null,
      
    };

    setTasks((prevTasks) => [optimisticTask, ...prevTasks]);
    const toastId = `createTask-${tempId}`;
    toast.loading('Creating task...', { id: toastId });

    try {
      const taskToInsert: Database['public']['Tables']['tasks']['Insert'] = {
        title: newTaskData.title,
        description: newTaskData.description || '',
        reward_type: newTaskData.reward_type,
        reward_text: newTaskData.reward_text,
        created_by: currentUserId,
        assigned_to: newTaskData.assigned_to,
        deadline: newTaskData.deadline || null,
        status: 'pending' as TaskStatus,
        proof_required: newTaskData.proof_required === undefined ? false : newTaskData.proof_required // Ensure it's part of the insert
      };

      const { data: createdTask, error: createError } = await client
        .from('tasks')
        .insert(taskToInsert)
        .select(`
          *,
          profiles:profiles!assigned_to ( id, display_name, email ),
          creator_profile:profiles!created_by ( id, display_name, email )
        `)
        .single();

      if (createError) throw createError;
      if (!createdTask) throw new Error('Task creation returned no data.');

      setTasks((prevTasks) =>
        prevTasks.map((task) => (task.id === tempId ? createdTask : task))
      );
      toast.success('Task created successfully!', { id: toastId });
            return createdTask as TaskWithProfiles;
    } catch (e) {
      const errorMessage = getErrorMessage(e);
      setError(errorMessage);
      toast.error(`Error creating task: ${errorMessage}`, { id: toastId });
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== tempId));
      return null;
    }
  };

  const updateTaskStatus = async (taskId: string, requestedStatus: TaskStatus): Promise<boolean> => {
    console.log('[useTasks] updateTaskStatus called. TaskID:', taskId, 'RequestedStatus:', requestedStatus);
    if (!currentUserId) {
      toast.error('Authentication error.');
      return false;
    }

    const originalTask = tasks.find(t => t.id === taskId);
    if (!originalTask) {
      toast.error('Task not found for status update.');
      return false;
    }

    const toastId = `updateStatus-${taskId}`;
    toast.loading('Updating task status...', { id: toastId });

    // Prepare the data for Supabase update and optimistic UI
    const updates: Partial<Database['public']['Tables']['tasks']['Update']> = {};

    if (requestedStatus === 'rejected') {
      updates.status = 'pending';
      updates.proof_url = null;
      updates.completed_at = null; // Ensure task is not marked as completed
    } else {
      updates.status = requestedStatus;
      const currentActualStatus = originalTask.status as TaskStatus;

      // If current task was 'completed' and requested status is different, it's no longer completed.
      if (currentActualStatus === 'completed' && requestedStatus !== 'completed') {
        updates.completed_at = null;
      } 
      // Else if requested status is 'completed', set its completion time.
      // This handles cases where currentActualStatus was not 'completed' or was 'completed' but requestedStatus is also 'completed' (no change to completed_at needed here, but handled by next condition if it's a fresh completion).
      else if (requestedStatus === 'completed') {
        updates.completed_at = new Date().toISOString();
      }
      // If neither of the above, completed_at remains as is (e.g. pending -> review, completed_at was null and stays null)
    }

    console.log('[useTasks] updateTaskStatus: Updates object for DB:', updates);

    // Optimistic UI update
    const updatedOptimisticTask = {
      ...originalTask,
      ...updates, // Apply all prepared changes
    };
    setTasks(prevTasks => prevTasks.map(t => (t.id === taskId ? updatedOptimisticTask : t)));

    try {
      const { data: updatedTaskResult, error: updateError } = await client
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select(`
          *,
          profiles:profiles!assigned_to ( id, display_name, email ),
          creator_profile:profiles!created_by ( id, display_name, email )
        `)
        .single();

      if (updateError) {
        console.error('[useTasks] updateTaskStatus: Error updating task status in DB:', updateError);
        throw updateError;
      }
      if (!updatedTaskResult) {
        console.error('[useTasks] updateTaskStatus: Task status update returned no data.');
        throw new Error('Task status update returned no data.');
      }
      console.log('[useTasks] updateTaskStatus: Successfully updated task status in DB. Result:', updatedTaskResult);

      // Award credits if task is completed and is a credit task
      if (requestedStatus === 'completed' && originalTask.reward_type === 'credit' && originalTask.assigned_to) {
        console.log('[useTasks] updateTaskStatus: Attempting to award credits. Task original reward_text:', originalTask.reward_text, 'Assigned to:', originalTask.assigned_to);
        const creditAmount = parseInt(originalTask.reward_text || '0', 10);
        if (creditAmount > 0) {
          console.log('[useTasks] updateTaskStatus: Calling increment_user_credits RPC for user:', originalTask.assigned_to, 'Amount:', creditAmount);
          const { error: creditError } = await client.rpc('increment_user_credits', {
            user_id_param: originalTask.assigned_to,
            amount_param: creditAmount,
          });
          if (creditError) {
            console.error('[useTasks] updateTaskStatus: Error calling increment_user_credits RPC:', creditError);
            toast.error(`Task completed, but failed to award credits: ${getErrorMessage(creditError)}`, { duration: 5000 });
            // Note: Task status is already updated. Consider if further rollback is needed here.
          } else {
            console.log('[useTasks] updateTaskStatus: Successfully called increment_user_credits RPC.');
            toast.success(`${creditAmount} credits awarded to ${updatedTaskResult.profiles?.display_name || 'assignee'}!`, { id: `creditAward-${taskId}`, duration: 4000 });
          }
        } else {
          console.log('[useTasks] updateTaskStatus: Credit amount is 0 or invalid, not calling increment_user_credits. Amount:', creditAmount);
        }
      }

      // Update local state with the actual returned task to ensure consistency
      setTasks(prevTasks => prevTasks.map(t => (t.id === taskId ? updatedTaskResult : t)));
      toast.success('Task status updated!', { id: toastId });
      return true;
    } catch (e) {
      const errorMessage = getErrorMessage(e);
      setError(errorMessage); // Assuming setError is defined in the hook's scope
      toast.error(`Error updating status: ${errorMessage}`, { id: toastId });
      console.error('[useTasks] updateTaskStatus: Catch block error:', errorMessage);
      // Rollback optimistic update
      setTasks(prevTasks => prevTasks.map(t => (t.id === taskId ? originalTask : t)));
      return false;
    }
  };

  const uploadProof = async ({ taskId, file, proofType }: { taskId: string; file: File; proofType: ProofType }): Promise<string | false> => {
    if (!currentUserId) {
      toast.error('You must be logged in to upload proof.');
      return false;
    }

    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) {
      toast.error('Task not found.');
      return false;
    }
    if (taskToUpdate.assigned_to !== currentUserId) {
      toast.error('You are not assigned to this task and cannot submit proof.');
      return false;
    }
    if (!taskToUpdate.status || !['pending', 'in_progress', 'review'].includes(taskToUpdate.status)) {
        toast.error(`Proof can only be submitted for tasks that are pending, in progress, or require revisions. Current status: ${taskToUpdate.status}`);
        return false;
    }

    const filePath = generateProofFilePath(taskId, file);
    const toastId = `uploadProof-${taskId}`;
    toast.loading('Uploading proof...', { id: toastId });
    setUploadProgress(0); 

    const originalTaskState = { ...taskToUpdate }; // For rollback
    // Optimistic UI update
    const optimisticTaskUpdate = {
      ...taskToUpdate,
      proof_type: proofType,
      status: 'review' as TaskStatus, 
    };
    setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? optimisticTaskUpdate : t));

    try {
      // Upload to Supabase Storage
      const { error: uploadError } = await client.storage
        .from('bounty-proofs') // Ensure this bucket exists and has correct policies
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, 
          contentType: file.type,
        });

      if (uploadError) throw new Error(`Storage error: ${uploadError.message}`);

      // Get public URL
      const { data: urlData } = client.storage
        .from('bounty-proofs')
        .getPublicUrl(filePath);

      if (!urlData || !urlData.publicUrl) {
        throw new Error('Could not retrieve public URL for proof.');
      }
      const proofUrl = urlData.publicUrl;

      // Update task record in database
      const { data: updatedTask, error: dbUpdateError } = await client
        .from('tasks')
        .update({
          proof_url: proofUrl,
          proof_type: proofType,
          status: 'review' as TaskStatus,
        })
        .eq('id', taskId)
        .eq('assigned_to', currentUserId) // Ensure only the assignee can update their proof
        .select(`
            *,
            assignee:profiles!tasks_assigned_to_fkey(display_name, avatar_url),
            creator:profiles!tasks_created_by_fkey(display_name, avatar_url)
        `)
        .single();

      if (dbUpdateError) throw dbUpdateError;
      if (!updatedTask) throw new Error('Failed to update task record with proof details.');

      // Final state update with data from DB
      setTasks(prevTasks => prevTasks.map(t => (t.id === taskId ? updatedTask : t)));
      toast.success('Proof uploaded successfully! Task is now in review.', { id: toastId });
      setUploadProgress(100);
      return proofUrl;

    } catch (e) {
      const errorMessage = getErrorMessage(e);
      setUploadProgress(0);
      setError(errorMessage);
      toast.error(`Failed to upload proof: ${errorMessage}`, { id: toastId });
      // Rollback optimistic update
      setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? originalTaskState : t));
      return false;
    }
  };

  const deleteTask = async (taskId: string): Promise<boolean> => {
    if (!currentUserId) {
      toast.error('You must be logged in to delete a task.');
      return false;
    }

    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) {
      toast.error('Task not found.');
      return false;
    }

    if (taskToDelete.created_by !== currentUserId) {
      toast.error('You can only delete tasks that you created.');
      return false;
    }

    // Optimistic UI update: remove the task immediately
    const originalTasks = [...tasks];
    setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
    const toastId = `deleteTask-${taskId}`;
    toast.loading('Deleting task...', { id: toastId });

    try {
      // If there's a proof_url, attempt to delete the associated file from storage
      if (typeof taskToDelete.proof_url === 'string' && taskToDelete.proof_url.trim() !== '') {
        const proofUrlString: string = taskToDelete.proof_url;
        try {
          const filePath = new URL(proofUrlString).pathname.split('/bounty-proofs/')[1];
          if (filePath) {
            await client.storage.from('bounty-proofs').remove([filePath]);
            // console.log('Proof file deleted from storage:', filePath);
          }
        } catch (storageError) {
          // Log error but don't block task deletion if file removal fails
          console.error('Failed to delete proof file from storage:', getErrorMessage(storageError));
          toast.error('Could not delete associated proof file, but will proceed with task deletion.', { duration: 5000 });
        }
      }

      const { error: deleteError } = await client
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('created_by', currentUserId); // Ensure only the creator can delete

      if (deleteError) throw deleteError;

      toast.success('Task deleted successfully!', { id: toastId });
      return true;
    } catch (e) {
      const errorMessage = getErrorMessage(e);
      setError(errorMessage);
      toast.error(`Error deleting task: ${errorMessage}`, { id: toastId });
      setTasks(originalTasks); // Rollback optimistic update
      return false;
    }
  };

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    updateTaskStatus,
    updateTask,
    uploadProof,
    uploadProgress,
    deleteTask,
    setTasks, // Expose setTasks if manual manipulation is needed by components, use with caution
    assignedTasks: useMemo(() => tasks.filter(task => task.assigned_to === user?.id) || [], [tasks, user?.id]),
    createdTasks: useMemo(() => tasks.filter(task => task.created_by === user?.id) || [], [tasks, user?.id])
  };
};
