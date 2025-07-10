// src/pages/Dashboard.tsx
// MAJOR REFACTOR: Completely rewrote task status update logic to fix Android/non-admin user issues
// - Removed restrictive database filters that conflicted with RLS policies
// - Let RLS handle permissions exclusively instead of double permission checking
// - Enhanced error handling with specific error codes and Android optimizations
// - TaskCard interactions (status updates, proof uploads) are now ENABLED with proper error handling
// - Delete functionality is disabled for assignees (they should not delete tasks created by others)
//   Handler functions provide clear error messages explaining why delete is not available.

import { useAuth } from '../hooks/useAuth';
import { useAssignedContracts } from '../hooks/useAssignedContracts';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { AlertTriangle, CheckCircle, Clock, DatabaseZap, ScrollText } from 'lucide-react';
import { TaskStatus } from '../types/custom';
import TaskCard from '../components/TaskCard';
import { Database } from '../types/database';
import PullToRefresh from 'react-simple-pull-to-refresh';
import HuntersCreed from '../components/HuntersCreed';
import { useDailyQuote } from '../hooks/useDailyQuote';
import { soundManager as sm } from '../utils/soundManager';

type Task = Database['public']['Tables']['tasks']['Row'];

export default function Dashboard() {
  const { user } = useAuth();
  const { contracts: assignedContracts, loading, error, refetch: refetchAssignedContracts } = useAssignedContracts();
  const { t } = useTranslation();

  const dailyQuote = useDailyQuote();

  const handleDeleteTaskRequest = () => {
    // Assignees should not be able to delete tasks created by others
    // This prevents confusing UX where modal opens but confirm is disabled
    console.warn('Delete functionality is not available for assigned contracts');
    toast.error('You cannot delete tasks assigned to you. Contact the task creator if needed.');
  };

  const handleProofUpload = async (file: File, taskId: string): Promise<string | null> => {
    if (!user) {
      toast.error('You must be logged in to upload proof.');
      return null;
    }

    // Enhanced file validation
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File is too large. Maximum size is 10MB.');
      return null;
    }

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast.error('Invalid file type. Only images and videos are allowed.');
      return null;
    }

    try {
      // Determine proof_type based on file MIME type (before upload)
      const proofType = file.type.startsWith('image/') ? 'image' : 'video';

      // Upload to Supabase Storage
      const fileName = `proofs/${taskId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('bounty-proofs') // Corrected bucket name
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      sm.play('upload');

      // Get the public URL for the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from('bounty-proofs')
        .getPublicUrl(fileName);

      if (!publicUrlData) {
        throw new Error('Could not get public URL for the uploaded proof.');
      }

      const proofUrl = publicUrlData.publicUrl;

      // Update task with proof URL, proof_type, and set status to 'review'
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          proof_url: proofUrl, // Use the full public URL
          status: 'review' as TaskStatus,
          proof_type: proofType,
        })
        .eq('id', taskId)
        .eq('assigned_to', user.id); // Security: only assigned user can submit proof

      if (updateError) throw updateError;

      toast.success('Proof uploaded successfully and task is now in review.');
      if (refetchAssignedContracts) refetchAssignedContracts();
      return proofUrl;
    } catch (error: unknown) {
      console.error('Proof upload failed:', error);
      let message = 'Failed to upload proof.';
      if (error instanceof Error) {
        message = error.message;
      }
      toast.error(message);
      return null;
    }
  };

  const handleStatusUpdate = async (
    taskId: string,
    status: string,
  ) => {
    if (!user) {
      toast.error('You must be logged in to update status.');
      return;
    }
    
    // Add loading state for mobile feedback
    const toastId = `status-update-${taskId}`;
    toast.loading('Updating task status...', { id: toastId });
    
    try {
      console.log('[Dashboard] handleStatusUpdate called:', { taskId, status, userId: user.id });
      
      // Step 1: Fetch task without restrictive filters - let RLS handle permissions
      const { data: task, error: fetchError } = await supabase
        .from('tasks')
        .select('proof_required, reward_type, reward_text, assigned_to, created_by, status')
        .eq('id', taskId)
        .single();

      console.log('[Dashboard] Task fetch result:', { task, fetchError });

      if (fetchError) {
        console.error('[Dashboard] Task fetch error:', fetchError);
        throw fetchError;
      }
      
      if (!task) {
        const errorMsg = 'Task not found or you do not have permission to access it.';
        console.error('[Dashboard] Task not found:', taskId);
        toast.error(errorMsg, { id: toastId });
        return;
      }

      // Step 2: Client-side validation for UI feedback
      const isAssignee = task.assigned_to === user.id;
      const isCreator = task.created_by === user.id;
      
      if (!isAssignee && !isCreator) {
        const errorMsg = 'You do not have permission to update this task.';
        console.error('[Dashboard] Permission denied:', { userId: user.id, assigned_to: task.assigned_to, created_by: task.created_by });
        toast.error(errorMsg, { id: toastId });
        return;
      }

      // Step 3: Validate status transition
      if (task.status === 'completed') {
        const errorMsg = 'This task has already been completed.';
        console.warn('[Dashboard] Task already completed:', taskId);
        toast.error(errorMsg, { id: toastId });
        return;
      }

      // Step 4: Determine final status based on proof requirements
      const finalStatus = ((!task.proof_required && status === 'review')
        ? 'completed'
        : status) as TaskStatus;

      console.log('[Dashboard] Status transition:', { currentStatus: task.status, requestedStatus: status, finalStatus });

      // Step 5: Update task - remove restrictive filter to let RLS handle permissions
      const updateData: { status: string; completed_at?: string } = { status: finalStatus };
      
      // Set completion timestamp for completed tasks
      if (finalStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

      console.log('[Dashboard] Update result:', { updateError });

      if (updateError) {
        console.error('[Dashboard] Task update error:', updateError);
        
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

      // Step 6: Success handling with enhanced feedback
      console.log('[Dashboard] Task status updated successfully:', { taskId, finalStatus });
      
      if (finalStatus === 'completed') {
        toast.success('🎉 Task completed successfully!', { id: toastId, duration: 4000 });
        // Enhanced sound feedback for mobile
        try {
          sm.play('acceptContract');
          sm.play('success');
        } catch (soundError) {
          console.warn('[Dashboard] Sound playback failed:', soundError);
        }
      } else if (status === 'review') {
        toast.success('Task submitted for review!', { id: toastId });
      } else {
        toast.success('Task status updated!', { id: toastId });
      }
      
      // Refresh data with error handling
      if (refetchAssignedContracts) {
        try {
          await refetchAssignedContracts();
        } catch (refreshError) {
          console.warn('[Dashboard] Failed to refresh contracts:', refreshError);
          // Don't show error to user as the main operation succeeded
        }
      }

    } catch (error: unknown) {
      console.error('[Dashboard] handleStatusUpdate error:', error);
      
      let message = 'Failed to update task status.';
      if (error instanceof Error) {
        message = error.message;
      }
      
      // Android-specific error handling for common network issues
      const userAgent = navigator.userAgent.toLowerCase();
      const isAndroid = userAgent.includes('android');
      
      if (isAndroid && message.includes('network')) {
        message += ' Try switching between WiFi and mobile data.';
      }
      
      toast.error(message, { 
        id: toastId, 
        duration: isAndroid ? 6000 : 4000 // Longer duration on Android for better UX
      });
    }
  };

  // Sort assigned contracts by status
  const sortedAssignedContracts = [...assignedContracts].sort((a, b) => {
    const order: Record<string, number> = {
      pending: 0,
      in_progress: 0, // Treat in_progress same as pending for sorting
      review: 1,
      completed: 2,
      rejected: 0, // Treat rejected same as pending
      overdue: 0, // Treat overdue same as pending
    };
    // Handle null or undefined status as 'pending'
    const statusA = a.status || 'pending';
    const statusB = b.status || 'pending';
    return order[statusA] - order[statusB];
  });

  if (loading) {
    return (
      <div className="text-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
        <p className="mt-4 text-white/50">{t('common.loadingContracts')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-white/70 bg-red-900/20 rounded-lg">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-lg font-semibold text-white">{t('contracts.errorTitle')}</h3>
        <p className="mt-1 text-sm">{t('contracts.errorMessage')}</p>
        <p className="mt-1 text-sm text-white/50">{t('contracts.errorSuggestion')}</p>
      </div>
    );
  }

  const pendingCount = assignedContracts.filter((t: Task) => t.status === 'pending' || t.status === 'in_progress' || t.status === 'rejected' || t.status === 'overdue' || !t.status).length;
  const reviewCount = assignedContracts.filter((t: Task) => t.status === 'review').length;
  const completedCount = assignedContracts.filter((t: Task) => t.status === 'completed').length;

  const handleRefresh = async () => {
    if (refetchAssignedContracts) {
      await refetchAssignedContracts();
    }
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold app-title">{t('contracts.title')}</h1>
          <p className="text-white/60 text-sm">{t('contracts.description')}</p>
        </div>

        {/* New Minimalist Stats Icons */}
        <div className="flex flex-wrap justify-around items-center mb-8 py-4 gap-4 sm:gap-8 md:gap-12">
          {/* Open/Pending */}
          <div className="text-center flex flex-col items-center">
            <div className="text-red-400 mb-2">
              <ScrollText size={32} />
            </div>
            <div className="text-3xl font-bold text-slate-100">{pendingCount}</div>
            <div className="text-xs text-slate-400">{t('contracts.open')}</div>
          </div>
          
          {/* In Review */}
          <div className="text-center flex flex-col items-center">
            <div className="text-yellow-400 mb-2">
              <Clock size={32} />
            </div>
            <div className="text-3xl font-bold text-slate-100">{reviewCount}</div>
            <div className="text-xs text-slate-400">{t('contracts.review')}</div>
          </div>
          
          {/* Completed */}
          <div className="text-center flex flex-col items-center">
            <div className="text-green-400 mb-2">
              <CheckCircle size={32} />
            </div>
            <div className="text-3xl font-bold text-slate-100">{completedCount}</div>
            <div className="text-xs text-slate-400">{t('contracts.done')}</div>
          </div>
        </div>

        {/* Assigned Contracts List */}
        {sortedAssignedContracts.length === 0 && !loading && (
          <div className="text-center py-10 bg-gray-800/30 rounded-lg">
            <DatabaseZap size={48} className="mx-auto mb-4 text-teal-400" />
            <h3 className="text-xl font-semibold text-white/90">{t('contracts.noContracts')}</h3>
            <p className="text-white/70">{t('contracts.noContractsMessage')}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedAssignedContracts.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              isCreatorView={false}
              onStatusUpdate={handleStatusUpdate}
              onProofUpload={handleProofUpload}
              uploadProgress={0}
              onDeleteTaskRequest={handleDeleteTaskRequest}
              refetchTasks={refetchAssignedContracts}
            />
          ))}
        </div>

        {/* Hunter's Creed Section */}
        <HuntersCreed quote={dailyQuote} />
      </div>
    </PullToRefresh>
  );
}
