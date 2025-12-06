// src/pages/Dashboard.tsx
// MAJOR REFACTOR: Completely rewrote task status update logic to fix Android/non-admin user issues
// - Removed restrictive database filters that conflicted with RLS policies
// - Let RLS handle permissions exclusively instead of double permission checking
// - Enhanced error handling with specific error codes and Android optimizations
// - TaskCard interactions (status updates, proof uploads) are now ENABLED with proper error handling
// - Delete functionality is disabled for assignees (they should not delete tasks created by others)
//   Handler functions provide clear error messages explaining why delete is not available.
// P1: Updated page header title to use theme strings.
// P3: Refactored into Mission Inbox with sections: "Do this now", "Waiting for approval", "Recently completed"

import { useMemo, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAssignedContracts } from '../hooks/useAssignedContracts';
import { useIssuedContracts } from '../hooks/useIssuedContracts';
import { useUserCredits } from '../hooks/useUserCredits';
import { fetchStreaksForContracts } from '../hooks/useDailyMissionStreak';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'react-hot-toast';
import { AlertTriangle, CheckCircle, CheckCircle2, Clock, Clock3, DatabaseZap, ScrollText, PlusCircle, ShoppingCart, ArrowRight } from 'lucide-react';
import type { TaskStatus } from '../types/custom';
import TaskCard from '../components/TaskCard';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { PageQuote } from '../components/layout/PageQuote';
import { useDailyQuote } from '../hooks/useDailyQuote';
import { soundManager as sm } from '../utils/soundManager';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { PageBody } from '../components/layout/PageBody';
import { useUI } from '../context/UIContext';
import { StatsRow } from '../components/layout/StatsRow';
import { BaseCard } from '../components/ui/BaseCard';
import { updateMissionStatus, uploadProof } from '../domain/missions';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const { activeLayer } = useUI();
  const { contracts: assignedContracts, loading, error, refetch: refetchAssignedContracts } = useAssignedContracts();
  const { contracts: issuedContracts } = useIssuedContracts();
  const { credits: userCredits } = useUserCredits();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const dailyQuote = useDailyQuote();

  const handleDeleteTaskRequest = () => {
    // Assignees should not be able to delete tasks created by others
    // This prevents confusing UX where modal opens but confirm is disabled
    console.warn('Delete functionality is not available for assigned contracts');
    toast.error('You cannot delete tasks assigned to you. Contact the task creator if needed.');
  };

  const handleProofUpload = async (file: File | null, taskId: string, textDescription?: string): Promise<string | null> => {
    if (!user) {
      toast.error('You must be logged in to upload proof.');
      return null;
    }

    try {
      sm.play('upload');
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
      console.error('Proof upload failed:', error);
      let message = 'Couldn\'t submit proof, please try again.';
      if (error instanceof Error) {
        message = error.message || message;
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
      
      await updateMissionStatus({
        missionId: taskId,
        status: status as TaskStatus,
        userId: user.id,
      });

      console.log('[Dashboard] Task status updated successfully:', { taskId, status });
      
      if (status === 'completed') {
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

  // P3: Filter and sort contracts into Mission Inbox sections
  const { doNowMissions, waitingApprovalMissions, completedMissions } = useMemo(() => {
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

    const completed = assignedContracts
      .filter((task) => task.status === 'completed')
      .sort((a, b) => {
        // Sort by completion date (most recent first)
        const completedA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
        const completedB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
        return completedB - completedA;
      })
      .slice(0, 10); // Limit to last 10 completed missions

    return {
      doNowMissions: doNow,
      waitingApprovalMissions: waitingApproval,
      completedMissions: completed,
    };
  }, [assignedContracts]);

  // P3: Calculate issued missions summary stats
  const issuedStats = useMemo(() => {
    const awaitingProof = issuedContracts.filter(
      (task) => task.status === 'pending' || task.status === 'in_progress'
    ).length;
    const pendingApproval = issuedContracts.filter(
      (task) => task.status === 'review'
    ).length;
    return { awaitingProof, pendingApproval };
  }, [issuedContracts]);

  // P5: Fetch streaks for daily missions
  const [streaksMap, setStreaksMap] = useState<Record<string, { streak_count: number }>>({});
  
  useEffect(() => {
    if (!user?.id) return;

    const fetchStreaks = async () => {
      // Get all daily mission IDs assigned to current user
      const dailyMissionIds = assignedContracts
        .filter(task => task.is_daily)
        .map(task => task.id);

      if (dailyMissionIds.length === 0) {
        setStreaksMap({});
        return;
      }

      try {
        const streaks = await fetchStreaksForContracts(dailyMissionIds, user.id);
        // Convert to simpler format for TaskCard
        const simplified: Record<string, { streak_count: number }> = {};
        Object.entries(streaks).forEach(([contractId, streakData]) => {
          simplified[contractId] = { streak_count: streakData.streak_count };
        });
        setStreaksMap(simplified);
      } catch (error) {
        console.error('Error fetching streaks:', error);
      }
    };

    fetchStreaks();
  }, [assignedContracts, user?.id]);

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
      <PageContainer>
        <PageHeader title={theme.strings.inboxTitle} />
        <PageBody>
          <BaseCard className="bg-red-900/20 border-red-500/30">
            <div className="text-center py-8">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-subtitle text-white font-semibold mb-2">We're having trouble loading your missions</h3>
              <p className="text-body text-white/70 mb-4">{error}</p>
              <button
                onClick={() => refetchAssignedContracts?.()}
                className="btn-primary flex items-center justify-center gap-2 mx-auto"
              >
                <DatabaseZap size={20} />
                Retry
              </button>
            </div>
          </BaseCard>
        </PageBody>
      </PageContainer>
    );
  }

  // P3: Update stats to match Mission Inbox sections
  const pendingCount = doNowMissions.length;
  const reviewCount = waitingApprovalMissions.length;
  const completedCount = completedMissions.length;

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
        <PageHeader
          title={theme.strings.inboxTitle}
          subtitle={t('contracts.description')}
        />

        <StatsRow
          stats={[
            {
              icon: <ScrollText size={32} />,
              value: pendingCount,
              label: t('contracts.open'),
              iconColor: 'text-red-400',
            },
            {
              icon: <Clock size={32} />,
              value: reviewCount,
              label: t('contracts.review'),
              iconColor: 'text-yellow-400',
            },
            {
              icon: <CheckCircle size={32} />,
              value: completedCount,
              label: t('contracts.done'),
              iconColor: 'text-green-400',
            },
          ]}
        />

        <PageBody>
          {/* Section 1 - Do this now */}
          <div className="space-y-4">
            <h2 className="text-subtitle text-white font-semibold">{theme.strings.sectionDoNowTitle}</h2>
            {doNowMissions.length === 0 ? (
              <BaseCard>
                <div className="text-center py-8">
                  <DatabaseZap size={48} className="mx-auto mb-4 text-teal-400" />
                  {/* R14: Mode-aware empty state copy for inbox */}
                  <h3 className="text-subtitle text-white/90 mb-2">
                    {theme.id === 'guild' && 'No missions right now'}
                    {theme.id === 'family' && 'No chores assigned'}
                    {theme.id === 'couple' && 'No requests yet'}
                  </h3>
                  <p className="text-body text-white/60 mb-4">
                    {theme.id === 'guild' && 'Create a mission or check the store.'}
                    {theme.id === 'family' && 'You\'re all clear for now.'}
                    {theme.id === 'couple' && 'When your partner sends you a request, it will show up here.'}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
                    {/* R14: In couple mode, primary CTA is to create for partner */}
                    {theme.id === 'couple' ? (
                      <button
                        onClick={() => navigate('/issued')}
                        className="btn-secondary flex items-center justify-center gap-2"
                      >
                        <PlusCircle size={20} />
                        Create {theme.strings.missionSingular} for your {theme.strings.crewLabel}
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => navigate('/issued')}
                          className="btn-primary flex items-center justify-center gap-2"
                        >
                          <PlusCircle size={20} />
                          Create new {theme.strings.missionSingular}
                        </button>
                        <button
                          onClick={() => navigate('/rewards-store')}
                          className="btn-secondary flex items-center justify-center gap-2"
                        >
                          <ShoppingCart size={20} />
                          Visit {theme.strings.storeTitle}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </BaseCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 spacing-grid">
                {doNowMissions.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isCreatorView={false}
                    onStatusUpdate={handleStatusUpdate}
                    onProofUpload={handleProofUpload}
                    uploadProgress={0}
                    onDeleteTaskRequest={handleDeleteTaskRequest}
                    refetchTasks={refetchAssignedContracts}
                    streakCount={task.is_daily ? (streaksMap[task.id]?.streak_count || 0) : undefined}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Section 2 - Waiting for approval */}
          <div className="space-y-4">
            <h2 className="text-subtitle text-white font-semibold">{theme.strings.sectionWaitingApprovalTitle}</h2>
            {waitingApprovalMissions.length === 0 ? (
              <BaseCard className="border-yellow-500/20">
                <div className="text-center py-6">
                  <Clock3 size={40} className="mx-auto mb-3 text-yellow-400/60" />
                  <p className="text-body text-white/70">Nothing waiting for approval.</p>
                </div>
              </BaseCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 spacing-grid">
                {waitingApprovalMissions.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isCreatorView={false}
                    onStatusUpdate={handleStatusUpdate}
                    onProofUpload={handleProofUpload}
                    uploadProgress={0}
                    onDeleteTaskRequest={handleDeleteTaskRequest}
                    refetchTasks={refetchAssignedContracts}
                    streakCount={task.is_daily ? (streaksMap[task.id]?.streak_count || 0) : undefined}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Section 3 - Recently completed */}
          <div className="space-y-4">
            <h2 className="text-subtitle text-white font-semibold">{theme.strings.sectionCompletedTitle}</h2>
            {completedMissions.length === 0 ? (
              <BaseCard className="border-green-500/20">
                <div className="text-center py-6">
                  <CheckCircle2 size={40} className="mx-auto mb-3 text-green-400/60" />
                  <p className="text-body text-white/70">You haven't completed any {theme.strings.missionPlural} yet.</p>
                </div>
              </BaseCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 spacing-grid">
                {completedMissions.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isCreatorView={false}
                    onStatusUpdate={handleStatusUpdate}
                    onProofUpload={handleProofUpload}
                    uploadProgress={0}
                    onDeleteTaskRequest={handleDeleteTaskRequest}
                    refetchTasks={refetchAssignedContracts}
                    streakCount={task.is_daily ? (streaksMap[task.id]?.streak_count || 0) : undefined}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Section 4 - Issued missions summary */}
          {issuedContracts.length > 0 && (
            <div className="space-y-4">
              <BaseCard>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-subtitle text-white font-semibold mb-2">
                      {theme.strings.sectionIssuedSummaryTitle}
                    </h3>
                    <div className="flex flex-wrap gap-4 text-sm">
                      {issuedStats.awaitingProof > 0 && (
                        <span className="text-white/70">
                          {issuedStats.awaitingProof} {theme.strings.missionPlural} awaiting proof
                        </span>
                      )}
                      {issuedStats.pendingApproval > 0 && (
                        <span className="text-white/70">
                          {issuedStats.pendingApproval} {theme.strings.missionPlural} pending your approval
                        </span>
                      )}
                      {issuedStats.awaitingProof === 0 && issuedStats.pendingApproval === 0 && (
                        <span className="text-white/70">All {theme.strings.missionPlural} are up to date</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/issued')}
                    className="btn-secondary flex items-center gap-2 whitespace-nowrap"
                  >
                    Manage {theme.strings.missionsLabel}
                    <ArrowRight size={20} />
                  </button>
                </div>
              </BaseCard>
            </div>
          )}

          {/* Reward Store prompt - only show if user has credits */}
          {(userCredits ?? 0) > 0 && (
            <div className="space-y-4">
              <BaseCard className="bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border-teal-500/20">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-subtitle text-white font-semibold mb-1">
                      Visit {theme.strings.storeTitle}
                    </h3>
                    <p className="text-body text-white/70 text-sm">
                      You have {userCredits} {userCredits === 1 ? theme.strings.tokenSingular : theme.strings.tokenPlural} to spend. Check out available {theme.strings.rewardPlural}!
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/rewards-store')}
                    className="btn-primary flex items-center gap-2 whitespace-nowrap"
                  >
                    <ShoppingCart size={20} />
                    Go to {theme.strings.storeTitle}
                  </button>
                </div>
              </BaseCard>
            </div>
          )}

          {/* R11: Unified quote placement */}
          {dailyQuote && (
            <PageQuote text={dailyQuote.text} author={dailyQuote.author} />
          )}
        </PageBody>
      </PageContainer>
    </PullToRefresh>
  );
}
