import { useSearchParams } from 'react-router-dom';
// src/pages/IssuedPage.tsx
// This component serves as the "MISSIONS" view, displaying contracts (missions) created BY the user.
// - Uses `useIssuedContracts` hook for data fetching.
// - Sorts contracts by status and keeps sent-back work visible between review and completed.
// - Creator actions are RPC-authoritative; create/update form ownership remains isolated below.
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

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase'; // Import supabase client (still used for create/delete)
import { useIssuedContracts } from '../hooks/useIssuedContracts'; // To be confirmed/created if not existing
import TaskCard from '../components/TaskCard';
import TaskForm, { type NewTaskData as TaskFormData, type Task as TaskFormTask } from '../components/TaskForm';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
// Types imported from hooks or defined locally
import type { IssuedContract } from '../hooks/useIssuedContracts';
// import type { AssignedContract } from '../hooks/useAssignedContracts'; // Removed as it's unused after refactor

// Define TaskStatus locally based on known statuses
export type TaskStatus = 'pending' | 'review' | 'completed' | 'archived' | 'rejected' | 'active'; // Added 'active' as a common one, adjust as needed
import { Plus } from 'lucide-react'; // Removed ListChecks as AlertTriangle is now used for Pending // Added ListChecks for new summary cards, removed ScrollText
import PullToRefresh from 'react-simple-pull-to-refresh';
import { feedback } from '../utils/feedback';
import { fireSeal } from '../components/visual/sealEvents';
import { useUI } from '../context/UIContext';
import { PageContainer } from '../components/layout/PageContainer';
import { MissionsHeader } from '../components/layout/MissionsHeader';
import { PageBody } from '../components/layout/PageBody';
import { AppButton, EmptyState, PageState, SectionHeader, ConfirmModal } from '../components/ui';
import { ModalShell } from '../components/ui/ModalShell';
import { CharacterCounter } from '../components/ui/CharacterCounter';
import { TEXT_LIMITS } from '../config/textLimits';
import {
  approveMission,
  archiveMission,
  createTaskViaRpc,
  rejectMission,
  requireTaskLifecycleRpcSuccess,
  TaskLifecycleRpcError,
  updateTaskViaRpc,
} from '../domain/missions';
import type { TaskLifecycleRpcResult } from '../types/custom';
import { translateTaskLifecycleErrorObject } from '../i18n/taskLifecycleErrors';
import { useThemeStrings } from '../hooks/useThemeStrings';
import emptyIssued from '../assets/generated/empty-issued.webp';

export default function IssuedPage() {
  const { activeLayer } = useUI();
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialAssignee, setInitialAssignee] = useState<string | undefined>();
  const { strings } = useThemeStrings();
  const { t } = useTranslation();
  // Phase 2.1: capitalized mode noun (Mission / Chore / Request) for interpolated toasts and dialogs
  const noun = strings.missionSingular.charAt(0).toUpperCase() + strings.missionSingular.slice(1);
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
  // Phase 2.3: reject-with-reason modal state
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false); // Renamed and initialized to false
  const [editingTask, setEditingTask] = useState<TaskFormTask | null>(null);

  // Ref guards for synchronous double-click prevention (state updates are async)
  const isApprovingRef = useRef(false);
  const isRejectingRef = useRef(false);

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
      // Storage cleanup MUST happen before the row delete: the bounty-proofs
      // delete policy requires the tasks row to still exist, so post-delete
      // removal always fails RLS and orphans the file.
      if (typeof selectedContract.proof_url === 'string' && selectedContract.proof_url.trim() !== '') {
        try {
          const filePath = new URL(selectedContract.proof_url).pathname.split('/bounty-proofs/')[1];
          if (!filePath) {
            throw new Error(t('contracts.proofCleanupFailed'));
          }
          const { error: storageError } = await supabase.storage.from('bounty-proofs').remove([filePath]);
          if (storageError) {
            throw storageError;
          }
        } catch {
          throw new Error(t('contracts.proofCleanupFailed'));
        }
      }

      const { data, error: deleteError } = await supabase.rpc('delete_task', {
        p_task_id: selectedContract.id,
      });

      if (deleteError) {
        throw new Error(deleteError.message || t('contracts.deleteFailed'));
      }

      const rpcResult = data as TaskLifecycleRpcResult | null;
      if (rpcResult?.success === false) {
        if (rpcResult.error === 'not_authenticated') {
          throw new Error(t('contracts.mustBeLoggedIn'));
        }
        if (rpcResult.error === 'task_not_found') {
          throw new Error(t('contracts.taskNotFound'));
        }
        if (rpcResult.error === 'not_creator') {
          throw new Error(t('contracts.taskNotFoundOrNotCreator'));
        }
      }

      requireTaskLifecycleRpcSuccess(data, 'delete');

      feedback.warning('delete');
      toast.success(t('contracts.deleteSuccess', { title: selectedContract.title }));
      await refetchIssuedContracts(); // Refresh the list
    } catch (error: unknown) {
      // A lifecycle refusal carries a code, so it can be stated in the user's
      // language; anything else falls through to the raw message as before.
      const localized = translateTaskLifecycleErrorObject(error, t);
      if (localized) {
        toast.error(localized);
      } else if (error && typeof error === 'object' && 'message' in error) {
        const supabaseError = error as { message: string; code?: string; details?: string };
        toast.error(t('contracts.deleteFailedMessage', { message: supabaseError.message }));
      } else {
        toast.error(t('contracts.deleteFailedUnknown'));
      }
    }
    setIsDeleting(false);
    handleCloseDeleteModal();
  };

  const handleProofUpload = async (file: File | null, taskId: string): Promise<string | null> => {
    void taskId;
    if (!file) {
      toast.error(t('contracts.proofUploadDisabled'));
      return null;
    }
    toast.error(t('contracts.proofUploadDisabled'));
    return null;
  };

  const handleApprove = async (taskId: string, anchor?: Element | null) => {
    if (!user) {
      toast.error(t('contracts.mustBeLoggedIn'));
      return;
    }

    // Synchronous ref guard - prevents race condition from rapid clicks/touches
    if (isApprovingRef.current) {
      return;
    }
    isApprovingRef.current = true;

    // Also check state (belt and suspenders)
    if (approvingTaskId === taskId) {
      isApprovingRef.current = false;
      return;
    }

    setApprovingTaskId(taskId);
    const toastId = `approve-${taskId}`;
    toast.loading(t('contracts.approvingProof'), { id: toastId });

    try {
      const outcome = await approveMission({
        missionId: taskId,
        issuerId: user.id,
      });

      fireSeal('approve', anchor);

      // 013: a self-assigned contract completes but pays nothing. Say so —
      // a silent non-payment that reads as a successful payout is the one way
      // this rule becomes a support ticket instead of a rule.
      toast.success(
        outcome.credited
          ? t('contracts.approveSuccess')
          : t('contracts.approveSuccessNoCredit'),
        { id: toastId },
      );
      await refetchIssuedContracts();

    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'message' in error
        ? (error as { message: string }).message
        : t('contracts.approvalFailedUnknown');
      toast.error(errorMessage, { id: toastId });
    } finally {
      setApprovingTaskId(null);
      isApprovingRef.current = false;
    }
  };

  // Phase 2.3: opening the reject flow now asks for an optional reason first.
  const handleReject = (taskId: string) => {
    setRejectReason('');
    setRejectTargetId(taskId);
  };

  const handleCloseRejectModal = () => {
    // Don't allow closing mid-request.
    if (isRejectingRef.current) return;
    setRejectTargetId(null);
    setRejectReason('');
  };

  const handleConfirmReject = async (anchor?: Element | null) => {
    const taskId = rejectTargetId;
    if (!taskId) return;

    if (!user) {
      toast.error(t('contracts.mustBeLoggedIn'));
      return;
    }

    // Synchronous ref guard - prevents race condition from rapid clicks/touches
    if (isRejectingRef.current) {
      return;
    }
    isRejectingRef.current = true;

    // Also check state (belt and suspenders)
    if (rejectingTaskId === taskId) {
      isRejectingRef.current = false;
      return;
    }

    setRejectingTaskId(taskId);
    const toastId = `reject-${taskId}`;
    toast.loading(t('contracts.rejectingProof'), { id: toastId });

    try {
      await rejectMission({
        missionId: taskId,
        issuerId: user.id,
        reason: rejectReason,
      });

      fireSeal('sent-back', anchor);
      toast.success(t('contracts.rejectSuccess'), { id: toastId });
      setRejectTargetId(null);
      setRejectReason('');
      await refetchIssuedContracts();

    } catch (error: unknown) {
      // reject_task is RPC-authoritative, so the refusal arrives as a code with
      // only a generic fallback on `.message` — localize from the code first.
      const errorMessage = translateTaskLifecycleErrorObject(error, t)
        ?? (error && typeof error === 'object' && 'message' in error
          ? (error as { message: string }).message
          : t('contracts.rejectionFailedUnknown'));
      toast.error(errorMessage, { id: toastId });
    } finally {
      setRejectingTaskId(null);
      isRejectingRef.current = false;
    }
  };

  // Archive handler for completed tasks
  const handleArchive = async (taskId: string): Promise<void> => {
    if (!user) {
      toast.error(t('contracts.mustBeLoggedIn'));
      throw new Error(t('contracts.mustBeLoggedIn'));
    }

    const toastId = `archive-${taskId}`;
    toast.loading(t('contracts.archivingMission'), { id: toastId });

    try {
      await archiveMission({
        missionId: taskId,
        userId: user.id,
      });

      toast.success(t('contracts.archiveSuccess'), { id: toastId });
      await refetchIssuedContracts();
    } catch (error: unknown) {
      const errorMessage = translateTaskLifecycleErrorObject(error, t)
        ?? (error && typeof error === 'object' && 'message' in error
          ? (error as { message: string }).message
          : t('contracts.archiveFailed'));
      toast.error(errorMessage, { id: toastId });
      throw error instanceof Error ? error : new Error(errorMessage);
    }
  };

  // Sort issued contracts by status
  const [sortedIssuedContracts, setSortedIssuedContracts] = useState<IssuedContract[]>([]);

  useEffect(() => {
    const sortedContracts = [...(issuedContracts || [])].sort((a, b) => {
      const order = { pending: 0, in_progress: 0, review: 1, rejected: 2, completed: 3 } as const;
      // Handle potential null or undefined status if data is not clean
      const statusA = a.status && Object.prototype.hasOwnProperty.call(order, a.status) ? a.status : 'pending'; 
      const statusB = b.status && Object.prototype.hasOwnProperty.call(order, b.status) ? b.status : 'pending';
      return order[statusA as keyof typeof order] - order[statusB as keyof typeof order];
    });
    setSortedIssuedContracts(sortedContracts);
  }, [issuedContracts]);


  const handleSubmitContract = async (taskData: TaskFormData, taskId?: string) => {
    if (!user) {
      throw new Error(t('contracts.createFailedLoggedIn'));
    }

    try {
      if (taskId) {
        const updatePayload = {
          title: taskData.title,
          description: taskData.description,
          assigned_to: taskData.assigned_to,
          deadline: taskData.deadline,
          reward_type: taskData.reward_type,
          reward_text: taskData.reward_text,
          // R31d: Ensure proof_required is explicitly boolean, never undefined
          proof_required: taskData.proof_required === true,
          is_daily: taskData.is_daily,
        };

        await updateTaskViaRpc(taskId, updatePayload);

        await refetchIssuedContracts();
        toast.success(t('contracts.updateSuccess', { noun }));
        setEditingTask(null);
        return;
      }

      await createTaskViaRpc({
        p_title: taskData.title,
        // null → undefined: both marshal to SQL NULL (see useTasks.ts).
        p_description: taskData.description ?? undefined,
        p_assigned_to: taskData.assigned_to ?? undefined,
        p_deadline: taskData.deadline || undefined,
        p_reward_type: taskData.reward_type,
        p_reward_text: taskData.reward_text,
        // R31d: Ensure proof_required is explicitly boolean, never undefined
        p_proof_required: taskData.proof_required === true,
        p_is_daily: taskData.is_daily,
      });

      await refetchIssuedContracts();
      toast.success(t('contracts.createSuccess', { noun }));
    } catch (error: unknown) {
      // A lifecycle RPC error already carries a machine-readable code; wrapping
      // it in a new Error would throw that code away, and TaskForm needs it to
      // localize the 013 message. Re-throw those untouched.
      if (error instanceof TaskLifecycleRpcError) {
        throw error;
      }
      // Type guard to check if it's a Supabase-like error object (PostgrestError)
      if (error && typeof error === 'object' && 'message' in error) {
        const supabaseError = error as { message: string; code?: string; details?: string };
        throw new Error(t('contracts.createFailedMessage', { message: supabaseError.message }));
      } else {
        throw new Error(t('contracts.createFailedUnknown'));
      }
    }
  };

  useEffect(() => {
    if (searchParams.get('create') !== '1') return;
    setInitialAssignee(searchParams.get('to') || undefined);
    setEditingTask(null);
    setIsTaskFormOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleCreateNewContract = () => {
    setEditingTask(null);
    setInitialAssignee(undefined);
    setIsTaskFormOpen(true);
  };

  const handleEditTaskRequest = (task: TaskFormTask) => {
    setEditingTask(task);
    setIsTaskFormOpen(true);
  };

  if (loading && issuedContracts.length === 0) {
    return (
      <PageContainer>
        <MissionsHeader onCreate={handleCreateNewContract} />
        <PageBody>
          <PageState state="loading" message={t('contracts.loadingMissions')} />
        </PageBody>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <MissionsHeader onCreate={handleCreateNewContract} />
        <PageBody>
          <PageState state="error" message={error} onRetry={refetchIssuedContracts} />
        </PageBody>
      </PageContainer>
    );
  }

  const handleRefresh = async () => {
    if (refetchIssuedContracts) {
      await refetchIssuedContracts();
    }
  };


  // Section filtering for grouped display
  const pendingMissions = sortedIssuedContracts.filter(task => task.status === 'pending' || task.status === 'in_progress');
  const reviewMissions = sortedIssuedContracts.filter(task => task.status === 'review');
  const rejectedMissions = sortedIssuedContracts.filter(task => task.status === 'rejected');
  const completedMissions = sortedIssuedContracts.filter(task => task.status === 'completed');


  return (
    <>
      {/* Phase 7: TaskForm rendered outside PullToRefresh to prevent gesture interference */}
      {/* Since TaskForm portals to overlay-root, its DOM position doesn't matter */}
      {isTaskFormOpen && user && (
        <TaskForm
          userId={user.id}
          initialAssignee={initialAssignee}
          onClose={() => {
            setIsTaskFormOpen(false);
            setEditingTask(null);
          }}
          onSubmit={handleSubmitContract}
          editingTask={editingTask}
        />
      )}

      {/* R8 FIX: Single render path - no conditional tree swap based on activeLayer */}
      <PullToRefresh onRefresh={handleRefresh} isPullable={activeLayer !== 'modal'}>
        <PageContainer>
          {/* R21: Use theme strings directly for page title and subtitle */}
          <MissionsHeader onCreate={handleCreateNewContract} />

          <PageBody>
            {sortedIssuedContracts.length === 0 && !loading ? (
              /* R21: Simplified empty state - uses theme strings */
              <EmptyState
                illustration={emptyIssued}
                title={t('contracts.noMissionsYet')}
                body={t('contracts.createOneForCrew', { crewLabel: strings.crewLabel })}
              >
                <AppButton
                  variant="cta"
                  onClick={handleCreateNewContract}
                  icon={<Plus size={20} />}
                  data-testid="missions-empty-cta"
                  aria-label={t('contracts.createNewMission')}
                >
                  {t('contracts.createNewMission')}
                </AppButton>
              </EmptyState>
            ) : (
              <>
                {[
                  { title: t('contracts.inReview'), tasks: reviewMissions, accent: 'warning' as const },
                  { title: t('contracts.open'), tasks: pendingMissions, accent: 'default' as const },
                  { title: t('contracts.sentBack'), tasks: rejectedMissions, accent: 'warning' as const },
                  { title: t('contracts.completed'), tasks: completedMissions, accent: 'success' as const },
                ].filter(section => section.tasks.length > 0).map(section => <section key={section.title} className="space-y-4">
                  <SectionHeader title={section.title} count={section.tasks.length} accent={section.accent} />
                  <div className="grid grid-cols-1 md:grid-cols-2 spacing-grid">
                    {section.tasks.map(task => <TaskCard key={task.id} task={task} isCreatorView={true}
                      onStatusUpdate={() => {}} onApprove={handleApprove} onReject={() => handleReject(task.id)}
                      onProofUpload={handleProofUpload} uploadProgress={0} onDeleteTaskRequest={handleDeleteTaskRequest}
                      actionLoading={approvingTaskId === task.id || rejectingTaskId === task.id}
                      onEditTaskRequest={handleEditTaskRequest} refetchTasks={refetchIssuedContracts}
                      onArchive={task.status === 'completed' ? handleArchive : undefined} />)}
                  </div>
                </section>)}
              </>
            )}
          </PageBody>

          <ConfirmModal
            isOpen={isDeleteModalOpen}
            onClose={handleCloseDeleteModal}
            onConfirm={handleConfirmDeleteTask}
            title={t('contracts.confirmDeleteContract', { noun })}
            message={t('contracts.confirmDeletionMessage', { title: selectedContract?.title || '' })}
            confirmLabel={t('common.delete')}
            loadingLabel={t('common.deleting')}
            variant="danger"
            loading={isDeleting}
          />

          {/* Phase 2.3: reject-with-reason modal */}
          <ModalShell
            isOpen={rejectTargetId !== null}
            onClose={handleCloseRejectModal}
            name="RejectMissionModal"
            labelledBy="reject-mission-title"
          >
            <div className="flex flex-col">
              <div className="p-4 sm:p-5 border-b border-gray-700/50">
                <h2 id="reject-mission-title" className="text-lg sm:text-xl font-bold text-white pr-10">
                  {t('contracts.reject.title', { noun })}
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  {t('contracts.reject.subtitle')}
                </p>
              </div>

              <div className="p-4 sm:p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="reject-reason" className="text-sm font-medium text-white/70">
                    {t('contracts.reject.reasonLabel')}
                  </label>
                  <CharacterCounter current={rejectReason.length} max={TEXT_LIMITS.rejectionReason} />
                </div>
                <textarea
                  id="reject-reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  maxLength={TEXT_LIMITS.rejectionReason}
                  placeholder={t('contracts.reject.reasonPlaceholder')}
                  rows={4}
                  className="w-full p-3 bg-gray-800/80 border border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition h-24 text-base resize-none"
                />
              </div>

              <div className="p-4 sm:p-5 border-t border-gray-700/50 flex flex-col sm:flex-row justify-end gap-3 safe-bottom">
                <AppButton
                  type="button"
                  variant="ghost"
                  onClick={handleCloseRejectModal}
                  className="w-full sm:w-auto min-h-[48px] sm:min-h-[44px]"
                  disabled={!!rejectTargetId && rejectingTaskId === rejectTargetId}
                >
                  {t('common.cancel')}
                </AppButton>
                <AppButton
                  type="button"
                  variant="danger"
                  onClick={(event) => handleConfirmReject(event.currentTarget)}
                  loading={!!rejectTargetId && rejectingTaskId === rejectTargetId}
                  className="w-full sm:w-auto min-h-[48px] sm:min-h-[44px]"
                >
                  {t('contracts.reject.confirm')}
                </AppButton>
              </div>
            </div>
          </ModalShell>
        </PageContainer>
      </PullToRefresh>
    </>
  );
}
