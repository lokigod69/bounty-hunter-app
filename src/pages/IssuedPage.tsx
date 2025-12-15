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
// PHASE 1 FIX: Enhanced state coordination between TaskForm modal and mobile menu to prevent UI conflicts.

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase'; // Import supabase client (still used for create/delete)
import { useIssuedContracts } from '../hooks/useIssuedContracts'; // To be confirmed/created if not existing
import TaskCard from '../components/TaskCard';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import TaskForm from '../components/TaskForm';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
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
import { PageQuote } from '../components/layout/PageQuote';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { soundManager } from '../utils/soundManager';
import { useUI } from '../context/UIContext';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { PageBody } from '../components/layout/PageBody';
import { StatsRow } from '../components/layout/StatsRow';
import { BaseCard } from '../components/ui/BaseCard';
import { approveMission, rejectMission, archiveMission } from '../domain/missions';
import { useTheme } from '../context/ThemeContext';

export default function IssuedPage() {
  const { isMobileMenuOpen, forceCloseMobileMenu, activeLayer } = useUI();
  const { theme } = useTheme();
  const { t } = useTranslation();
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
  const [approvingTaskId, setApprovingTaskId] = useState<string | null>(null);
  const [rejectingTaskId, setRejectingTaskId] = useState<string | null>(null);
  const dailyQuote = useDailyQuote();
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false); // Renamed and initialized to false

  const handleDeleteTaskRequest = (taskId: string) => {
    const task = issuedContracts.find((t: IssuedContract) => t.id === taskId);
    if (task) {
      setSelectedContract(task);
      setIsDeleteModalOpen(true);
    } else {
      toast.error(t('contracts.taskNotFound'));
    }
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedContract(null);
  };

  const handleConfirmDeleteTask = async () => {
    if (!selectedContract || !user) {
      toast.error(t('contracts.noTaskSelected'));
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

      soundManager.play('delete');
      toast.success(t('contracts.deleteSuccess', { title: selectedContract.title }));
      await refetchIssuedContracts(); // Refresh the list
    } catch (error: unknown) {
      console.error('Failed to delete contract:', error);
      if (error && typeof error === 'object' && 'message' in error) {
        const supabaseError = error as { message: string; code?: string; details?: string };
        toast.error(t('contracts.deleteFailedMessage', { message: supabaseError.message }));
      } else {
        toast.error(t('contracts.deleteFailedUnknown'));
      }
    }
    setIsDeleting(false);
    handleCloseDeleteModal();
  };

  const handleProofUpload = async (file: File, taskId: string): Promise<string | null> => {
    console.warn('handleProofUpload called for task:', taskId, 'with file:', file.name, 'but uploadProof is not available for issued contracts view.');
    toast.error(t('contracts.proofUploadDisabled'));
    return null;
  };

  const handleApprove = async (taskId: string) => {
    if (!user) {
      toast.error(t('contracts.mustBeLoggedIn'));
      return;
    }

    // Prevent double-submission
    if (approvingTaskId === taskId) {
      return;
    }

    setApprovingTaskId(taskId);
    const toastId = `approve-${taskId}`;
    toast.loading('Approving proof...', { id: toastId });

    try {
      const result = await approveMission({
        missionId: taskId,
        issuerId: user.id,
      });

      soundManager.play('approveProof');
      soundManager.play('success');
      soundManager.play('coin');

      const successMessage = result.streakCount && result.streakCount > 1
        ? t('contracts.approveSuccess') + ` (${result.streakCount}-day streak bonus!)`
        : t('contracts.approveSuccess');
      
      toast.success(successMessage, { id: toastId });
      await refetchIssuedContracts();

    } catch (error: unknown) {
      console.error('Failed to approve contract:', error);
      const errorMessage = error && typeof error === 'object' && 'message' in error
        ? (error as { message: string }).message
        : t('contracts.approvalFailedUnknown');
      toast.error(errorMessage, { id: toastId });
    } finally {
      setApprovingTaskId(null);
    }
  };

  const handleReject = async (taskId: string) => {
    if (!user) {
      toast.error(t('contracts.mustBeLoggedIn'));
      return;
    }

    // Prevent double-submission
    if (rejectingTaskId === taskId) {
      return;
    }

    setRejectingTaskId(taskId);
    const toastId = `reject-${taskId}`;
    toast.loading('Rejecting proof...', { id: toastId });

    try {
      await rejectMission({
        missionId: taskId,
        issuerId: user.id,
      });

      toast.success(t('contracts.rejectSuccess'), { id: toastId });
      await refetchIssuedContracts();

    } catch (error: unknown) {
      console.error('Failed to reject contract:', error);
      const errorMessage = error && typeof error === 'object' && 'message' in error
        ? (error as { message: string }).message
        : t('contracts.rejectionFailedUnknown');
      toast.error(errorMessage, { id: toastId });
    } finally {
      setRejectingTaskId(null);
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
      toast.error(t('contracts.createFailedLoggedIn'));
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
      toast.success(t('contracts.createSuccess')); // Show success toast
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
        toast.error(t('contracts.createFailedMessage', { message: supabaseError.message }));
      } else {
        toast.error(t('contracts.createFailedUnknown'));
      }
    }
  };

  // Enhanced FAB click handler with mobile menu state coordination
  const handleCreateNewContract = () => {
    // If mobile menu is open, close it first
    if (isMobileMenuOpen) {
      console.log("[IssuedPage] handleCreateNewContract - closing mobile menu first");
      forceCloseMobileMenu();
      // Add a small delay to ensure state propagation before opening modal
      setTimeout(() => {
        setIsTaskFormOpen(true);
      }, 50); // 50ms is enough for React state update
    } else {
      // Mobile menu is already closed, open modal immediately
      setIsTaskFormOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-900 to-gray-900 text-white flex flex-col items-center justify-center">
        <DatabaseZap size={48} className="text-teal-400 animate-pulse mb-4" />
        <p className="text-xl text-slate-300">{t('contracts.loadingMissions')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-900 to-gray-900 text-white flex flex-col items-center justify-center">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <p className="text-xl text-red-400">{t('contracts.errorLoadingMissions', { error })}</p>
        <p className="text-sm text-slate-400">{t('contracts.errorLoadingSuggestion')}</p>
      </div>
    );
  }

  const handleRefresh = async () => {
    if (refetchIssuedContracts) {
      await refetchIssuedContracts();
    }
  };

  const hasMissions = sortedIssuedContracts.length > 0;

  const stats = {
    pending: sortedIssuedContracts.filter(task => task.status === 'pending').length,
    review: sortedIssuedContracts.filter(task => task.status === 'review').length,
    completed: sortedIssuedContracts.filter(task => task.status === 'completed').length,
  };

  return (
    <>
      {/* Phase 7: TaskForm rendered outside PullToRefresh to prevent gesture interference */}
      {/* Since TaskForm portals to overlay-root, its DOM position doesn't matter */}
      {isTaskFormOpen && user && (
        <TaskForm
          userId={user.id}
          onClose={() => {
            console.log("[IssuedPage] TaskForm onClose - checking mobile menu state");
            setIsTaskFormOpen(false);
            // Ensure mobile menu can be opened after modal closes
            if (isMobileMenuOpen) {
              console.log("[IssuedPage] TaskForm onClose - closing mobile menu");
              forceCloseMobileMenu();
            }
          }}
          onSubmit={handleCreateContract}
        />
      )}

      {/* R8 FIX: Single render path - no conditional tree swap based on activeLayer */}
      <PullToRefresh onRefresh={handleRefresh} isPullable={activeLayer !== 'modal'}>
        <PageContainer>
          {/* R21: Use theme strings directly for page title and subtitle */}
          <PageHeader
            title={theme.strings.issuedPageTitle}
            subtitle={theme.strings.issuedPageSubtitle}
          />

          {/* R11: Moved quote to bottom of page for consistency */}

          {/* R14: FAB - mobile: bottom-right, desktop: centered bottom */}
          {hasMissions && !isTaskFormOpen && !isMobileMenuOpen && (
            <button
              onClick={handleCreateNewContract}
              className="fixed z-fab rounded-full shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-opacity-75 bg-teal-500 hover:bg-teal-600 text-white p-4 min-w-[56px] min-h-[56px] flex items-center justify-center bottom-4 right-4 sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto"
              aria-label="Create new mission"
              title="Create new mission"
              data-testid="missions-fab"
            >
              <PlusCircle size={28} />
            </button>
          )}

          <StatsRow
            stats={[
              {
                icon: <AlertTriangle size={32} />,
                value: stats.pending,
                label: t('contracts.open'),
                iconColor: 'text-orange-400',
              },
              {
                icon: <Clock size={32} />,
                value: stats.review,
                label: t('contracts.review'),
                iconColor: 'text-yellow-400',
              },
              {
                icon: <CheckCircle size={32} />,
                value: stats.completed,
                label: t('contracts.completed'),
                iconColor: 'text-green-400',
              },
            ]}
          />

          <PageBody>
            {sortedIssuedContracts.length === 0 && !loading ? (
              <div className="text-center py-10">
                <DatabaseZap size={48} className="text-teal-400 mx-auto mb-4" />
                {/* R21: Simplified empty state - uses theme strings */}
                <p className="text-subtitle text-slate-300 mb-6">
                  No missions yet. Create one for your {theme.strings.crewLabel}!
                </p>
                <button
                  onClick={handleCreateNewContract}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-opacity-75"
                  data-testid="missions-empty-cta"
                  aria-label="Create new mission"
                >
                  <PlusCircle size={20} />
                  Create new mission
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 spacing-grid">
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
                    actionLoading={approvingTaskId === task.id || rejectingTaskId === task.id}
                  />
                ))}
              </div>
            )}

            {/* R11: Unified quote placement at bottom */}
            {dailyQuote && (
              <PageQuote text={dailyQuote.text} author={dailyQuote.author} />
            )}
          </PageBody>

          <ConfirmDeleteModal
            isOpen={isDeleteModalOpen}
            onClose={handleCloseDeleteModal}
            onConfirm={handleConfirmDeleteTask}
            title="Confirm Delete Contract"
            message={`Are you sure you want to delete the contract "${selectedContract?.title || ''}"? This action cannot be undone.`}
            isConfirming={isDeleting}
          />
        </PageContainer>
      </PullToRefresh>
    </>
  );
}
