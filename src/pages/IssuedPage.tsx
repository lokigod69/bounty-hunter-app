// src/pages/IssuedPage.tsx
// This component serves as the "MISSIONS" view, displaying contracts (missions) created BY the user.
// - Uses `useIssuedContracts` hook for data fetching.
// - Sorts contracts by status: pending (top), review (middle), completed (bottom).
// - TaskCard interactions (status updates, proof uploads, deletions) are effectively DISABLED
//   as `useIssuedContracts` hook (assumed v1) likely only returns read-only data.
//   Handler functions are provided to TaskCard to satisfy prop requirements but will be no-ops.
// - Lint fixes applied for hasOwnProperty, error message access (now correctly displaying string error), unused parameter warnings, and dailyQuote property access.
// - Integrated TaskForm to allow contract creation, triggered by location state. Corrected TaskForm props (onSubmit, userId).
// - Implemented list refresh using refetch() after contract creation and ensured success toast.
// - Addressed lint error for 'any' type in handleCreateContract catch block.
// - Implemented actual Supabase insert logic for new contract creation.
// - Added extensive logging to handleCreateContract to debug insert failures.
// - Enhanced error logging to show full Supabase error details (code, message, details).
// - Implemented contract deletion functionality in handleConfirmDeleteTask with Supabase client.
// - Implemented Approve/Reject logic for contracts in review, including credit rewards.
// - Reordered summary cards: Total Issued (red icon, left), Pending/In Review (middle), Completed (right).
// - Redesigned summary cards to a minimalist icon-based flex layout.

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase'; // Import supabase client
import { useIssuedContracts } from '../hooks/useIssuedContracts'; // To be confirmed/created if not existing
import TaskCard from '../components/TaskCard';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import TaskForm from '../components/TaskForm';
import { toast } from 'react-hot-toast';
// Types imported from hooks or defined locally
import type { IssuedContract } from '../hooks/useIssuedContracts';
// import type { AssignedContract } from '../hooks/useAssignedContracts'; // Removed as it's unused after refactor

// Define TaskStatus locally based on known statuses
export type TaskStatus = 'pending' | 'review' | 'completed' | 'archived' | 'rejected' | 'active'; // Added 'active' as a common one, adjust as needed

// Define NewTaskData based on the fields required for creating a new task
// This should align with what TaskForm expects and what supabase insert needs for 'tasks'
export interface NewTaskData {
  title: string;
  description: string | null;
  reward_text?: string; // Optional, can be undefined
  status: TaskStatus; // Ensure this is 'pending' on creation
  created_by: string;
  assigned_to?: string | null; // Optional
  deadline?: string | null; // Optional
  // Add other fields as necessary from tasks.Insert, e.g., proof_required, proof_type etc.
}
import { Clock, AlertTriangle, CheckCircle, DatabaseZap, PlusCircle } from 'lucide-react'; // Removed ListChecks as AlertTriangle is now used for Pending // Added ListChecks for new summary cards, removed ScrollText // Added PlusCircle for FAB
import { useDailyQuote } from '../hooks/useDailyQuote';

export default function IssuedPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user } = useAuth(); // user is implicitly used by useIssuedContracts hook
  // const location = useLocation(); // Removed as unused
  // const navigate = useNavigate(); // Removed as unused
  const {
    contracts: issuedContracts, // Assuming hook returns 'contracts'
    loading,
    error,
    refetch: refetchIssuedContracts, // Added refetch
  } = useIssuedContracts();

  const [selectedContract, setSelectedContract] = useState<IssuedContract | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false); // Enabled for delete functionality
  const dailyQuote = useDailyQuote();
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false); // Renamed and initialized to false

  const handleDeleteTaskRequest = (taskId: string) => {
    const task = issuedContracts.find((t: IssuedContract) => t.id === taskId);
    if (task) {
      setSelectedContract(task);
      setIsDeleteModalOpen(true);
    } else {
      toast.error('Task not found.');
    }
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedContract(null);
  };

  const handleConfirmDeleteTask = async () => {
    if (!selectedContract || !user) {
      toast.error('No task selected or user not found.');
      handleCloseDeleteModal();
      return;
    }

    setIsDeleting(true);
    try {
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .match({ id: selectedContract.id, created_by: user.id });

      if (deleteError) {
        throw deleteError;
      }

      toast.success(`Contract "${selectedContract.title}" deleted successfully.`);
      await refetchIssuedContracts(); // Refresh the list
    } catch (error: unknown) {
      console.error('Failed to delete contract:', error);
      if (error && typeof error === 'object' && 'message' in error) {
        const supabaseError = error as { message: string; code?: string; details?: string };
        toast.error(`Failed: ${supabaseError.message}`);
      } else {
        toast.error('Failed to delete contract due to an unknown error.');
      }
    }
    setIsDeleting(false);
    handleCloseDeleteModal();
  };

  const handleProofUpload = async (file: File, taskId: string): Promise<string | null> => {
    console.warn('handleProofUpload called for task:', taskId, 'with file:', file.name, 'but uploadProof is not available for issued contracts view.');
    toast.error('Proof upload functionality is not applicable here or disabled.');
    return null;
  };

  const handleApprove = async (taskId: string) => {
    if (!user) {
      toast.error('You must be logged in.');
      return;
    }

    try {
      // 1. Fetch task details to get reward info
      const { data: task, error: fetchError } = await supabase
        .from('tasks')
        .select('assigned_to, reward_type, reward_text')
        .eq('id', taskId)
        .eq('created_by', user.id) // Security check
        .single();

      if (fetchError || !task) {
        throw fetchError || new Error('Task not found or you are not the creator.');
      }

      // 2. Update task status to 'completed'
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', taskId);

      if (updateError) {
        throw updateError;
      }

      // 3. If it's a credit task, award credits via RPC
      if (task.reward_type === 'credit' && task.reward_text && task.assigned_to) {
        const creditAmount = parseInt(task.reward_text, 10);
        if (!isNaN(creditAmount) && creditAmount > 0) {
          const { error: rpcError } = await supabase.rpc('increment_user_credits', {
            user_id_param: task.assigned_to, // Corrected parameter name
            amount_param: creditAmount,      // Corrected parameter name
          });

          if (rpcError) {
            console.error('Failed to award credits via RPC:', rpcError);
            toast.error(`Task approved, but failed to award ${creditAmount} credits.`);
          } else {
            toast.success(`${creditAmount} credits awarded to assignee!`);
          }
        }
      }

      toast.success('Contract approved and completed!');
      await refetchIssuedContracts();

    } catch (error: unknown) {
      console.error('Failed to approve contract:', error);
      if (error && typeof error === 'object' && 'message' in error) {
        const supabaseError = error as { message: string; code?: string; details?: string };
        toast.error(`Approval failed: ${(supabaseError as { message: string }).message}`);
      } else {
        toast.error('Approval failed due to an unknown error.');
      }
    }
  };

  const handleReject = async (taskId: string) => {
    if (!user) {
      toast.error('You must be logged in.');
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'rejected' })
        .eq('id', taskId)
        .eq('created_by', user.id); // Security check

      if (error) {
        throw error;
      }

      toast.success('Contract has been rejected.');
      await refetchIssuedContracts();

    } catch (error: unknown) {
      console.error('Failed to reject contract:', error);
      if (error && typeof error === 'object' && 'message' in error) {
        const supabaseError = error as { message: string; code?: string; details?: string };
        toast.error(`Rejection failed: ${(supabaseError as { message: string }).message}`);
      } else {
        toast.error('Rejection failed due to an unknown error.');
      }
    }
  };

  // Sort issued contracts by status
  const [sortedIssuedContracts, setSortedIssuedContracts] = useState<IssuedContract[]>([]);

  useEffect(() => {
    const sortedContracts = [...(issuedContracts || [])].sort((a, b) => {
      const order = { pending: 0, review: 1, completed: 2 } as const;
      // Handle potential null or undefined status if data is not clean
      const statusA = a.status && Object.prototype.hasOwnProperty.call(order, a.status) ? a.status : 'pending'; 
      const statusB = b.status && Object.prototype.hasOwnProperty.call(order, b.status) ? b.status : 'pending';
      return order[statusA as keyof typeof order] - order[statusB as keyof typeof order];
    });
    setSortedIssuedContracts(sortedContracts);
  }, [issuedContracts]);


  const handleCreateContract = async (taskData: NewTaskData) => {
    if (!user) {
      toast.error('You must be logged in to create a contract.');
      return;
    }

    try {
      const newContract = {
        ...taskData,
        created_by: user.id,
        status: 'pending' as TaskStatus, // Set initial status
      };

      console.log('User ID:', user.id);
      console.log('Task data being sent:', newContract);

      const { data, error: createError } = await supabase
        .from('tasks')
        .insert([newContract])
        .select()
        .single();

      console.log('Supabase response:', { data, error: createError });

      if (createError) {
        throw createError;
      }

      await refetchIssuedContracts(); // Refresh the list
      toast.success('Contract created successfully!'); // Show success toast
      setIsTaskFormOpen(false); // Close the modal
      // navigate('/issued'); // Navigation might not be needed if staying on the page
    } catch (error: unknown) {
      // Log the full error details as requested
      console.error('Full Supabase error:', error);

      // Type guard to check if it's a Supabase-like error object (PostgrestError)
      if (error && typeof error === 'object' && 'message' in error) {
        const supabaseError = error as { message: string; code?: string; details?: string };
        console.error('Error code:', supabaseError.code);
        console.error('Error message:', supabaseError.message);
        console.error('Error details:', supabaseError.details);
        toast.error(`Failed: ${supabaseError.message}`);
      } else {
        toast.error('Failed to create contract due to an unknown error.');
      }
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-900 to-gray-900 text-white flex flex-col items-center justify-center">
        <DatabaseZap size={48} className="text-teal-400 animate-pulse mb-4" />
        <p className="text-xl text-slate-300">Loading Your MISSIONS...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-900 to-gray-900 text-white flex flex-col items-center justify-center">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <p className="text-xl text-red-400">Error loading contracts: {error}</p>
        <p className="text-sm text-slate-400">Please try refreshing the page. If the problem persists, contact support.</p>
      </div>
    );
  }

  const stats = {
    pending: sortedIssuedContracts.filter(task => task.status === 'pending').length,
    review: sortedIssuedContracts.filter(task => task.status === 'review').length,
    completed: sortedIssuedContracts.filter(task => task.status === 'completed').length,
  };

  return (
    <div className="p-4 md:p-6 min-h-screen bg-gradient-to-br from-slate-900 to-gray-900 text-white">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">MISSIONS</h1>
        <p className="text-sm text-slate-400">Missions you have created for others to complete.</p>
        {dailyQuote && (
          <p className="mt-2 text-xs italic text-slate-500 border-l-2 border-teal-500 pl-2">
            &ldquo;{dailyQuote.text}&rdquo; - {dailyQuote.author}
          </p>
        )}
      </header>

      {/* New Contract Form Modal triggered by FAB */}
      {isTaskFormOpen && user && (
        <TaskForm
          userId={user.id} // Pass userId
          onClose={() => setIsTaskFormOpen(false)}
          onSubmit={handleCreateContract} // Pass the actual submit handler
          // editingTask can be omitted for new task creation
        />
      )}

      {/* Floating Action Button for New Contract */}
      {!isTaskFormOpen && (
        <button
          onClick={() => setIsTaskFormOpen(true)}
          className="fixed bottom-6 right-6 bg-teal-500 hover:bg-teal-600 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110 z-50 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-opacity-75"
          aria-label="Create New Contract"
          title="Create New Contract"
        >
          <PlusCircle size={28} />
        </button>
      )}


      {/* New Minimalist Stats Icons for Issued Page */}
      <div className="flex flex-wrap justify-around items-center mb-8 py-4 gap-4 sm:gap-8 md:gap-12">
        {/* Pending Contracts */}
        <div className="text-center flex flex-col items-center">
          <div className="text-orange-400 mb-2"> {/* Changed to orange for Pending, kept icon */} 
            <AlertTriangle size={32} /> {/* Changed icon to AlertTriangle for Pending */} 
          </div>
          <div className="text-3xl font-bold text-slate-100">{stats.pending}</div>
          <div className="text-xs text-slate-400">OPEN</div>
        </div>
        
        {/* Pending / In Review */}
        <div className="text-center flex flex-col items-center">
          <div className="text-yellow-400 mb-2">
            <Clock size={32} />
          </div>
          <div className="text-3xl font-bold text-slate-100">{stats.review}</div>
          <div className="text-xs text-slate-400">Review</div>
        </div>
        
        {/* Completed */}
        <div className="text-center flex flex-col items-center">
          <div className="text-green-400 mb-2">
            <CheckCircle size={32} />
          </div>
          <div className="text-3xl font-bold text-slate-100">{stats.completed}</div>
          <div className="text-xs text-slate-400">Completed</div>
        </div>
      </div>

      {sortedIssuedContracts.length === 0 && !loading ? (
        <div className="text-center py-10">
          <DatabaseZap size={48} className="text-teal-400 mx-auto mb-4" />
          <p className="text-xl text-slate-300">You haven't created any missions yet.</p>
          {/* TODO: Add a button/link to create a new contract here */}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedIssuedContracts.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              isCreatorView={true}
              onStatusUpdate={() => {}} // No-op; handled by approve/reject
              onApprove={() => handleApprove(task.id)}
              onReject={() => handleReject(task.id)}
              onProofUpload={handleProofUpload}
              uploadProgress={0}
              onDeleteTaskRequest={handleDeleteTaskRequest}
            />
          ))}
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDeleteTask}
        title="Confirm Delete Contract"
        message={`Are you sure you want to delete the contract "${selectedContract?.title || ''}"? This action cannot be undone.`}
        isConfirming={isDeleting} // Enabled for delete functionality
      />
    </div>
  );
}
