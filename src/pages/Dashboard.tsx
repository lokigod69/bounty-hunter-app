// src/pages/Dashboard.tsx
// Refactored Dashboard to "My Contracts" view.
// - Displays only contracts ASSIGNED TO the current user.
// - Removes legacy tabbed UI and multi-view logic.
// - Uses `useAssignedContracts` hook for data fetching.
// - Sorts contracts by status: pending (top), review (middle), completed (bottom).
// - TaskCard interactions (status updates, proof uploads, deletions) are effectively DISABLED
//   as `useAssignedContracts` hook (v1) only returns read-only data.
//   Handler functions are provided to TaskCard to satisfy prop requirements but will be no-ops.
// - Lint fixes applied for hasOwnProperty, error message access, unused parameter warnings, and dailyQuote property access.
// - Renamed 'Action Needed' status to 'OPEN' in the summary card.
// - Removed unused 'user' variable.
// - Implemented handleStatusUpdate to update task status in Supabase (now skips 'review' for non-proof tasks).
// - Implemented handleProofUpload to upload proof to Supabase Storage (bucket name corrected to 'bounty-proofs') and update task, now including proof_type detection (image/video).
// - Updated summary card icons: 'OPEN' uses ScrollText (red), 'In Review' uses Clock (yellow).
// - Redesigned summary cards to a minimalist icon-based flex layout.
// - Removed unused FileText import.

import { useState } from 'react';
import { useAuth } from '../hooks/useAuth'; // Added for user context
import { supabase } from '../lib/supabase'; // Added for Supabase client
import { useAssignedContracts } from '../hooks/useAssignedContracts'; // Renamed from useTasks
import TaskCard from '../components/TaskCard';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import TaskCardSkeleton from '../components/TaskCardSkeleton';
import { Clock, AlertTriangle, CheckCircle, ScrollText, DatabaseZap } from 'lucide-react';
import { useDailyQuote } from '../hooks/useDailyQuote';
import { toast } from 'react-hot-toast';
import type { Task, TaskStatus } from '../types/database'; // Added TaskStatus

export default function Dashboard() {
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const { user } = useAuth(); // Get current user
  const {
    contracts: assignedContracts, // Renamed from tasks
    loading,
    error,
    refetch: refetchAssignedContracts, // Assuming refetch function is provided by the hook
  } = useAssignedContracts();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const dailyQuote = useDailyQuote();

  const handleDeleteTaskRequest = (taskId: string) => {
    const task = assignedContracts.find((t: Task) => t.id === taskId);
    if (task) {
      setTaskToDelete(task);
      setIsDeleteModalOpen(true); // Modal will show, but confirm action is disabled.
    } else {
      console.error('Task not found for deletion:', taskId);
      toast.error('Could not find task to delete.');
    }
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setTaskToDelete(null);
    setIsDeleting(false);
  };

  const handleConfirmDeleteTask = async () => {
    console.warn('handleConfirmDeleteTask called, but deleteTask is not available from useAssignedContracts.');
    toast.error('Delete functionality is currently disabled.');
  };

  const handleProofUpload = async (file: File, taskId: string): Promise<string | null> => {
    if (!user) {
      toast.error('You must be logged in to upload proof.');
      return null;
    }
    try {
      // Upload to Supabase Storage
      const fileName = `proofs/${taskId}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('bounty-proofs') // Corrected bucket name
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Determine proof_type based on file MIME type
      let proofType: 'image' | 'video' | null = null;
      if (file.type.startsWith('image/')) {
        proofType = 'image';
      } else if (file.type.startsWith('video/')) {
        proofType = 'video';
      } else {
        // Fallback or error handling for unknown types if necessary
        // For now, we'll allow null if not image/video, or default to image
        // console.warn(`Unknown proof file type: ${file.type}. Defaulting to 'image'.`);
        // proofType = 'image'; // Or handle as an error/allow null
        // For this implementation, let's default to image if type is not explicitly video
        // to maintain previous behavior for non-standard image types not caught by 'image/*'
        // but if it's not video, we'll treat it as an image for display purposes.
        // A more robust solution might involve more specific MIME type checks or server-side validation.
        proofType = file.type.startsWith('video/') ? 'video' : 'image'; 
      }

      // Update task with proof URL, proof_type, and set status to 'review'
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          proof_url: uploadData.path,
          status: 'review' as TaskStatus,
          proof_type: proofType,
        })
        .eq('id', taskId)
        .eq('assigned_to', user.id); // Security: only assigned user can submit proof

      if (updateError) throw updateError;

      toast.success('Proof uploaded successfully and task is now in review.');
      if (refetchAssignedContracts) refetchAssignedContracts();
      return uploadData.path;
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

  const handleStatusUpdate = async (taskId: string, status: TaskStatus) => {
    if (!user) {
      toast.error('You must be logged in to update status.');
      return;
    }
    try {
      // First get the task to check if proof is required
      const { data: task, error: fetchError } = await supabase
        .from('tasks')
        .select('proof_required, reward_type, reward_text')
        .eq('id', taskId)
        .eq('assigned_to', user.id) // Ensure we are only fetching tasks assigned to the user
        .single();

      if (fetchError) throw fetchError;
      if (!task) {
        toast.error('Task not found or not assigned to you.');
        return;
      }

      // If no proof required and trying to complete (which TaskCard sends as 'review'), go straight to completed
      const finalStatus = (!task.proof_required && status === 'review')
        ? 'completed' as TaskStatus
        : status;

      const { error: updateError } = await supabase
        .from('tasks')
        .update({ status: finalStatus })
        .eq('id', taskId)
        .eq('assigned_to', user.id); // Double check assignment on update

      if (updateError) throw updateError;

      toast.success(finalStatus === 'completed' ? 'Task completed!' : 'Status updated');
      if (refetchAssignedContracts) refetchAssignedContracts(); // Refresh the list

    // Credit awarding is now handled by the backend trigger 'award_credits_on_completion'
    // when a task's status is updated to 'completed'.
    } catch (error: unknown) {
      console.error('Status update failed:', error);
      let message = 'Failed to update status.';
      if (error instanceof Error) {
        message = error.message;
      }
      toast.error(message);
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
      <div className="max-w-4xl mx-auto p-4 md:p-6 animate-pulse">
        <div className="h-9 bg-slate-700 rounded w-1/2 sm:w-1/3 mb-6"></div> {/* Title placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
            <div className="h-6 bg-slate-700 rounded w-3/5 mb-4"></div>
            <div className="h-4 bg-slate-700 rounded w-4/5"></div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
            <div className="h-6 bg-slate-700 rounded w-3/5 mb-4"></div>
            <div className="h-4 bg-slate-700 rounded w-4/5"></div>
          </div>
        </div>
        <div className="space-y-4">
          <TaskCardSkeleton />
          <TaskCardSkeleton />
          <TaskCardSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 text-center">
          <AlertTriangle size={48} className="mx-auto mb-4 text-red-400" />
          <h3 className="text-lg font-semibold mb-2 text-red-400">A Problem Occurred</h3>
          <p className="text-white/70 mb-4">
            {typeof error === 'string' ? error : 'An unexpected error occurred while loading your contracts.'}
          </p>
          <p className="mt-3 text-sm text-red-400/80">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  const pendingCount = assignedContracts.filter((t: Task) => t.status === 'pending' || t.status === 'in_progress' || t.status === 'rejected' || t.status === 'overdue' || !t.status).length;
  const reviewCount = assignedContracts.filter((t: Task) => t.status === 'review').length;
  const completedCount = assignedContracts.filter((t: Task) => t.status === 'completed').length;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-bold text-teal-400 mb-8">My Contracts</h1>

      {/* New Minimalist Stats Icons */}
      <div className="flex flex-wrap justify-around items-center mb-8 py-4 gap-4 sm:gap-8 md:gap-12">
        {/* Open/Pending */}
        <div className="text-center flex flex-col items-center">
          <div className="text-red-400 mb-2">
            <ScrollText size={32} /> {/* Using ScrollText as per previous Dashboard preference */}
          </div>
          <div className="text-3xl font-bold text-slate-100">{pendingCount}</div>
          <div className="text-xs text-slate-400">Open</div>
        </div>
        
        {/* In Review */}
        <div className="text-center flex flex-col items-center">
          <div className="text-yellow-400 mb-2">
            <Clock size={32} />
          </div>
          <div className="text-3xl font-bold text-slate-100">{reviewCount}</div>
          <div className="text-xs text-slate-400">Review</div>
        </div>
        
        {/* Completed */}
        <div className="text-center flex flex-col items-center">
          <div className="text-green-400 mb-2">
            <CheckCircle size={32} />
          </div>
          <div className="text-3xl font-bold text-slate-100">{completedCount}</div>
          <div className="text-xs text-slate-400">Done</div>
        </div>
      </div>

      {/* Assigned Contracts List */}
      {sortedAssignedContracts.length === 0 && !loading && (
        <div className="text-center py-10 bg-gray-800/30 rounded-lg">
          <DatabaseZap size={48} className="mx-auto mb-4 text-teal-400" />
          <h3 className="text-xl font-semibold text-white/90">No Contracts Assigned</h3>
          <p className="text-white/70">You currently have no active contracts. Check back later!</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedAssignedContracts.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            isCreatorView={false} // This is "My Contracts" (assigned to me)
            onStatusUpdate={handleStatusUpdate}
            onProofUpload={handleProofUpload}
            uploadProgress={0} // Pass default value as prop is mandatory
            onDeleteTaskRequest={handleDeleteTaskRequest}
            refetchTasks={refetchAssignedContracts}
          />
        ))}
      </div>

      {isDeleteModalOpen && taskToDelete && (
        <ConfirmDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={handleCloseDeleteModal}
          onConfirm={handleConfirmDeleteTask}
          title="Confirm Deletion"
          message={`Are you sure you want to delete the contract "${taskToDelete.title || 'this task'}"? This action cannot be undone.`}
          isConfirming={isDeleting} // Ensure this prop matches the modal's expected prop name
        />
      )}

      {/* Hunter's Creed Card */}
      {dailyQuote && (
        <div className="mt-8 mb-8 p-6 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg hover:border-gray-600 transition-all">
          <div className="flex items-center text-purple-400 mb-2">
            <ScrollText size={20} className="mr-2" />
            <h3 className="text-lg font-semibold">Hunter's Creed</h3>
          </div>
          <p className="text-white/80 italic">"{dailyQuote.text}"</p>
          {dailyQuote.author && <p className="text-sm text-white/60 mt-1 text-right">- {dailyQuote.author}</p>}
        </div>
      )}
    </div>
  );
}
