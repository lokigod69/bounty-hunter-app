import { useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAssignedContracts } from '../hooks/useAssignedContracts';
import { useTranslation } from 'react-i18next';
import { useThemeStrings } from '../hooks/useThemeStrings';
import { toast } from 'react-hot-toast';
import { Users } from 'lucide-react';
import type { TaskStatus } from '../types/custom';
import TaskCard from '../components/TaskCard';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { feedback } from '../utils/feedback';
import { PageContainer } from '../components/layout/PageContainer';
import { MissionsHeader } from '../components/layout/MissionsHeader';
import { PageBody } from '../components/layout/PageBody';
import { useUI } from '../context/UIContext';
import { AppButton, EmptyState, PageState, SectionHeader } from '../components/ui';
import { updateMissionStatus, uploadProof, submitForReviewNoProof, archiveMission } from '../domain/missions';
import { translateTaskLifecycleErrorObject } from '../i18n/taskLifecycleErrors';
import { useNavigate,useSearchParams } from 'react-router-dom';
import emptyMissions from '../assets/generated/empty-missions.webp';

export default function Dashboard() {
  const { user } = useAuth();
  const { activeLayer } = useUI();
  const { contracts: assignedContracts, loading, error, refetch: refetchAssignedContracts } = useAssignedContracts();
  const { t } = useTranslation();
  const { strings } = useThemeStrings();
  const navigate = useNavigate();
  const [searchParams]=useSearchParams();
  const requestedMission=searchParams.get('mission');

  const handleDeleteTaskRequest = () => {
    // Assignees should not be able to delete tasks created by others
    // This prevents confusing UX where modal opens but confirm is disabled
    toast.error('You cannot delete tasks assigned to you. Contact the task creator if needed.');
  };

  const handleProofUpload = async (file: File | null, taskId: string, textDescription?: string): Promise<string | null> => {
    if (!user) {
      toast.error('You must be logged in to upload proof.');
      return null;
    }

    try {
      feedback.tap('upload');
      const proofUrl = await uploadProof({
        missionId: taskId,
        file: file || undefined,
        textDescription,
        userId: user.id,
      });

      toast.success('Proof submitted successfully. Task is now waiting for approval.');
      if (refetchAssignedContracts) refetchAssignedContracts();
      return proofUrl;
    } catch (error: unknown) {
      let message = 'Couldn\'t submit proof, please try again.';
      // A lifecycle refusal carries a machine-readable code and only a generic
      // fallback on `.message`, so it is localized from the code. Anything else
      // keeps its own message exactly as before.
      const localized = translateTaskLifecycleErrorObject(error, t);
      if (localized) {
        message = localized;
      } else if (error instanceof Error) {
        message = error.message || message;
      }
      toast.error(message);
      return null;
    }
  };

  // R31: Direct completion for tasks that don't require proof
  const handleDirectComplete = async (taskId: string): Promise<boolean> => {
    if (!user) {
      toast.error('You must be logged in to complete tasks.');
      return false;
    }

    const toastId = `direct-complete-${taskId}`;
    toast.loading('Submitting for review...', { id: toastId });

    try {
      await submitForReviewNoProof({
        missionId: taskId,
        userId: user.id,
      });

      toast.success('Task submitted for review!', { id: toastId });
      if (refetchAssignedContracts) refetchAssignedContracts();
      return true;
    } catch (error: unknown) {
      let message = 'Failed to submit task. Please try again.';
      const localized = translateTaskLifecycleErrorObject(error, t);
      if (localized) {
        message = localized;
      } else if (error instanceof Error) {
        message = error.message || message;
      }
      toast.error(message, { id: toastId });
      return false;
    }
  };

  // Archive handler for completed tasks
  const handleArchive = async (taskId: string): Promise<void> => {
    if (!user) {
      toast.error('You must be logged in to archive tasks.');
      throw new Error('You must be logged in to archive tasks.');
    }

    const toastId = `archive-${taskId}`;
    toast.loading('Moving to History...', { id: toastId });

    try {
      await archiveMission({
        missionId: taskId,
        userId: user.id,
      });

      toast.success('Task moved to History!', { id: toastId });
      if (refetchAssignedContracts) refetchAssignedContracts();
    } catch (error: unknown) {
      let message = 'Failed to archive task. Please try again.';
      const localized = translateTaskLifecycleErrorObject(error, t);
      if (localized) {
        message = localized;
      } else if (error instanceof Error) {
        message = error.message || message;
      }
      toast.error(message, { id: toastId });
      throw error instanceof Error ? error : new Error(message);
    }
  };

  const handleStatusUpdate = async (
    taskId: string,
    status: string,
  ): Promise<boolean> => {
    if (!user) {
      toast.error('You must be logged in to update status.');
      return false;
    }
    
    // Add loading state for mobile feedback
    const toastId = `status-update-${taskId}`;
    toast.loading('Updating task status...', { id: toastId });
    
    try {
      await updateMissionStatus({
        missionId: taskId,
        status: status as TaskStatus,
        userId: user.id,
      });
      
      if (status === 'completed') {
        toast.success('🎉 Task completed successfully!', { id: toastId, duration: 4000 });
        feedback.success();
      } else if (status === 'review') {
        toast.success('Task submitted for review!', { id: toastId });
      } else {
        toast.success('Task status updated!', { id: toastId });
      }
      
      // Refresh data with error handling
      if (refetchAssignedContracts) {
        try {
          await refetchAssignedContracts();
        } catch {
          // Don't show error to user as the main operation succeeded
        }
      }
      return true;

    } catch (error: unknown) {
      let message = 'Failed to update task status.';
      const localized = translateTaskLifecycleErrorObject(error, t);
      if (localized) {
        message = localized;
      } else if (error instanceof Error) {
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
      return false;
    }
  };

  // P3: Filter and sort contracts into Mission Inbox sections
  const { doNowMissions, waitingApprovalMissions, completedMissions, completedMissionCount } = useMemo(() => {
    const activeStatuses: (TaskStatus | null)[] = ['pending', 'in_progress', 'rejected', null];
    const doNow = assignedContracts
      .filter((task) => {
        const status = (task.status || 'pending') as TaskStatus | null;
        return activeStatuses.includes(status);
      })
      .sort((a, b) => {
        // Sort by deadline: overdue first, then soonest deadline, then by creation date
        const deadlineA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const deadlineB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        const now = Date.now();
        
        // Overdue tasks first
        const aOverdue = deadlineA < now ? -1 : 0;
        const bOverdue = deadlineB < now ? -1 : 0;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
        
        // Then by deadline (soonest first)
        if (deadlineA !== deadlineB) return deadlineA - deadlineB;
        
        // Finally by creation date (newest first)
        const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return createdB - createdA;
      });

    const waitingApproval = assignedContracts.filter(
      (task) => task.status === 'review'
    );

    const allCompleted = assignedContracts
      .filter((task) => task.status === 'completed')
      .sort((a, b) => {
        // Sort by completion date (most recent first)
        const completedA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
        const completedB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
        return completedB - completedA;
      });
    const completed = allCompleted.filter((task,index)=>index<10 || task.id===requestedMission);

    return {
      doNowMissions: doNow,
      waitingApprovalMissions: waitingApproval,
      completedMissions: completed,
      completedMissionCount: allCompleted.length,
    };
  }, [assignedContracts,requestedMission]);

  if (loading && assignedContracts.length === 0) {
    return (
      <PageContainer>
        <MissionsHeader />
        <PageBody>
          <PageState state="loading" message={t('common.loadingContracts')} />
        </PageBody>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <MissionsHeader />
        <PageBody>
          <PageState
            state="error"
            message={error}
            onRetry={() => refetchAssignedContracts?.()}
          />
        </PageBody>
      </PageContainer>
    );
  }

  const handleRefresh = async () => {
    if (refetchAssignedContracts) {
      await refetchAssignedContracts();
    }
  };

  // R8 FIX: Single render path - no conditional tree swap based on activeLayer
  // The old pattern caused TaskCard to unmount/remount, losing isExpanded state (double-click bug)
  // Now we just disable PullToRefresh gesture when modal is open, keeping the tree stable
  const isPullToRefreshDisabled = activeLayer === 'modal';

  return (
    <PullToRefresh onRefresh={handleRefresh} isPullable={!isPullToRefreshDisabled}>
      <PageContainer>
        <MissionsHeader />

        <PageBody>
          {doNowMissions.length === 0 && <EmptyState illustration={emptyMissions}
            title={t('workflow.inboxEmpty')} body={t('workflow.inboxEmptyBody')}>
            <AppButton variant="secondary" icon={<Users size={18} />} onClick={() => navigate('/friends')}>{t('workflow.openPeople')}</AppButton>
          </EmptyState>}
          {[
            { title: strings.sectionDoNowTitle, tasks: doNowMissions, count: doNowMissions.length, accent: 'default' as const },
            { title: strings.sectionWaitingApprovalTitle, tasks: waitingApprovalMissions, count: waitingApprovalMissions.length, accent: 'warning' as const },
            { title: strings.sectionCompletedTitle, tasks: completedMissions, count: completedMissionCount, accent: 'success' as const },
          ].filter(section => section.tasks.length > 0).map(section => <section key={section.title} className="space-y-4">
            <SectionHeader title={section.title} count={section.count} accent={section.accent} />
            <div className="grid grid-cols-1 md:grid-cols-2 spacing-grid">
              {section.tasks.map(task => <TaskCard key={task.id} task={task} isCreatorView={false}
                onStatusUpdate={handleStatusUpdate} onProofUpload={handleProofUpload} onDirectComplete={handleDirectComplete}
                uploadProgress={0} onDeleteTaskRequest={handleDeleteTaskRequest} refetchTasks={refetchAssignedContracts}
                onArchive={task.status === 'completed' ? handleArchive : undefined} />)}
            </div>
          </section>)}
        </PageBody>
      </PageContainer>
    </PullToRefresh>
  );
}
