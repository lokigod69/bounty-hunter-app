// src/components/TaskCard.tsx
// REFACTOR: Implemented modal-based expansion system to fix layout bugs.
// Expanded card now renders as a fixed-position overlay, separate from grid/flex flow.
// Click collapsed card to open modal, click backdrop or 'Close' button to dismiss.
// FONT FIX: Applied Futura font (via inline styles) to card titles, descriptions, and status text.
// CRITICAL FIX: Uses React Portal (createPortal) for tooltips and modals.
// UI REFINEMENT: Consolidated status display at the bottom of the expanded card modal.
// DATA FIX: Uses task.creator.display_name and task.assignee.display_name.

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';

import { Archive, CheckCircle, Clock, Eye, Link, User } from 'lucide-react';
import { AssignedContract } from '../hooks/useAssignedContracts';
import { IssuedContract } from '../hooks/useIssuedContracts';
import { useTasks } from '../hooks/useTasks';
import { supabase } from '../lib/supabase';
import { createPortal } from 'react-dom';
import { useSwipeable } from 'react-swipeable';
import { getErrorMessage } from '../utils/getErrorMessage';
import { soundManager } from '../utils/soundManager';
import { TaskStatus } from '../types/custom';
import { useRewardShimmerDuration } from '../hooks/useShimmerDuration';
import DoubleCoinValue from './coin/DoubleCoinValue';
import { useUI } from '../context/UIContext';
import { getOverlayRoot } from '../lib/overlayRoot';
import { logOverlayRootState } from '../lib/overlayDebug';
import { BaseCard } from './ui/BaseCard';
import { useTheme } from '../context/ThemeContext'; // P5: Import useTheme for daily label
import { isValidUrl, safeUrlRender } from '../lib/proofConfig';

import ProofModal from './ProofModal';
import MissionModalShell from './modals/MissionModalShell';
import { mapTaskStatusToModalState, ModalRole } from '../theme/modalTheme';
import './TaskCard.css'; // Import custom CSS for TaskCard

interface TaskCardProps {
  refetchTasks?: () => void;
  task: AssignedContract;
  isCreatorView: boolean;
  onStatusUpdate: (taskId: string, status: TaskStatus, currentCredits?: number, rewardAmount?: number) => void;
  onProofUpload: (file: File | null, taskId: string, textDescription?: string) => Promise<string | null>;
  onDeleteTaskRequest: (taskId: string) => void;
  onApprove?: (taskId: string) => void;
  onReject?: (taskId: string) => void;
  uploadProgress: number;
  currentUserCredits?: number;
  isArchived?: boolean;
  streakCount?: number; // P5: Streak count for daily missions
}

const CountdownTimer: React.FC<{ deadline: string | null; baseColor?: string }> = ({ deadline, baseColor = 'text-slate-400' }) => {
  const calculateTimeLeft = () => {
    if (!deadline) return null;
    const difference = +new Date(deadline) - +new Date();
    let timeLeft: { days?: number; hours?: number; minutes?: number; seconds?: number } = {};
    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
      };
    }
    return timeLeft;
  };
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  useEffect(() => {
    if (!deadline) return;
    const timer = setTimeout(() => setTimeLeft(calculateTimeLeft()), 1000 * 60);
    return () => clearTimeout(timer);
  });
  if (!timeLeft || Object.keys(timeLeft).length === 0) {
    const pastDeadlineColor = baseColor === 'text-purple-400' ? 'text-purple-400 font-semibold' : 'text-slate-400';
    return <span className={`text-xs ${pastDeadlineColor}`}>x deadline</span>;
  }
  return (
    <span className={`text-xs ${baseColor} flex items-center`}>
      {timeLeft.days !== undefined && timeLeft.days > 0 && `${timeLeft.days}d `}
      {timeLeft.hours !== undefined && timeLeft.hours > 0 && `${timeLeft.hours}h `}
      {`${timeLeft.minutes}m`}
    </span>
  );
};

const RewardTextWithShimmer: React.FC<{ rewardText: string | null }> = ({ rewardText }) => {
  const shimmerText = rewardText || 'Reward';
  const { shimmerStyle, setElementRef } = useRewardShimmerDuration(shimmerText);
  
  return (
    <span 
      ref={setElementRef}
      className="animate-shimmer-premium bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-transparent"
      style={shimmerStyle}
      title={shimmerText}
    >
      {shimmerText}
    </span>
  );
};

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isCreatorView,
  onStatusUpdate,
  onProofUpload,
  onDeleteTaskRequest,
  onApprove,
  onReject,
  uploadProgress,
  currentUserCredits,
  refetchTasks,
  isArchived,
  streakCount,
}) => {
  const { user } = useAuth();
  const { openModal, clearLayer } = useUI();
  const { theme } = useTheme(); // P5: Get theme for daily label
  const [showProofModal, setShowProofModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const { t } = useTranslation();

  const [tooltipContent, setTooltipContent] = useState<React.ReactNode>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Phase 7: Removed duplicate scroll lock - UIContext handles scroll locking via activeLayer
  // Scroll lock is now managed exclusively by UIContext when openModal() is called

  const handleShowTooltip = (content: React.ReactNode, target: HTMLElement | null) => {
    if (target) {
      const rect = target.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
      setTooltipContent(content);
    }
  };

  const handleHideTooltip = () => {
    setTooltipContent(null);
  };

  // R9: Simplified handleClose - MissionModalShell handles its own animation
  const handleClose = () => {
    setIsExpanded(false);
    clearLayer();
  };

  // Phase 2: Sync expanded state with UIContext
  useEffect(() => {
    if (isExpanded) {
      openModal(); // Phase 2: Use UIContext to coordinate overlay layers
      // Phase 10: Debug logging
      if (import.meta.env.DEV) {
        logOverlayRootState('TaskCard expanded modal opened');
      }
    } else {
      // Phase 10: Debug logging
      if (import.meta.env.DEV) {
        logOverlayRootState('TaskCard expanded modal closed');
      }
    }
  }, [isExpanded, openModal]);

  const { id, title, description, assigned_to, deadline, reward_type, reward_text, status, proof_required, creator, assignee } = task;

  const actorName: string = isCreatorView ? (assignee?.display_name ?? 'N/A') : (creator?.display_name ?? 'N/A');
  const fromName: string = creator?.display_name ?? 'Unknown';

  const handleArchive = async () => {
    if (task.status !== 'completed' || task.is_archived) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ is_archived: true })
        .eq('id', task.id);

      if (error) {
        console.error('Error archiving task:', error);
      } else {
        if (refetchTasks) refetchTasks();
      }
    } catch (e) {
      console.error('Exception archiving task:', e);
    } finally {
      setActionLoading(false);
    }
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: handleArchive,
    // Removed trackMouse: true - was potentially intercepting click events on desktop
    preventScrollOnSwipe: true,
    // Ensure swipe doesn't block taps
    delta: 10, // Minimum swipe distance before triggering
    swipeDuration: 500, // Max duration for a swipe
  });

  const handleAction = async (newStatus: TaskStatus) => {
    console.log('[TaskCard] handleAction called:', { 
      taskId: id, 
      currentStatus: status, 
      newStatus,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });
    
    setActionLoading(true);
    
    // Android-specific optimizations
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroid = userAgent.includes('android');
    
    try {
      const rewardAmount = reward_type === 'credit' && reward_text ? parseInt(reward_text, 10) : undefined;
      
      // Enhanced logging for debugging
      console.log('[TaskCard] About to call onStatusUpdate:', {
        taskId: id,
        newStatus,
        currentUserCredits,
        rewardAmount,
        isAndroid
      });
      
      await onStatusUpdate(id, newStatus, currentUserCredits, rewardAmount);
      
      console.log('[TaskCard] onStatusUpdate completed successfully');
      
      // Android-specific success feedback
      if (isAndroid && 'vibrate' in navigator) {
        navigator.vibrate(newStatus === 'completed' ? [100, 50, 100] : 50);
      }
      
    } catch (e) {
      console.error('[TaskCard] Action failed:', e);
      
      // Enhanced error handling for Android
      if (isAndroid) {
        let errorMessage = 'Failed to update task';
        if (e instanceof Error) {
          errorMessage = e.message;
        }
        
        // Android-specific error suggestions
        if (errorMessage.includes('network')) {
          errorMessage += '. Try switching between WiFi and mobile data.';
        } else if (errorMessage.includes('permission')) {
          errorMessage += '. Please check your permissions and try again.';
        }
        
        console.error('[TaskCard] Android-specific error:', errorMessage);
        
        // Error haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(200);
        }
      }
      
      throw e; // Re-throw to maintain existing error handling
    } finally {
      setActionLoading(false);
    }
  };

  const renderProofLink = (url: string, className: string, withIcon: boolean = false) => {
    // Validate URL before rendering as link
    const { isValid, url: safeUrl } = safeUrlRender(url);
    if (!isValid || !safeUrl) {
      // Render as plain text if URL is invalid
      return (
        <span className={className}>
          {withIcon && <Link size={20} className="mr-2" />}
          Proof URL (invalid)
        </span>
      );
    }
    return (
      <a href={safeUrl} target="_blank" rel="noopener noreferrer" className={className}>
        {withIcon && <Link size={20} className="mr-2" />}
        View Submitted Proof
      </a>
    );
  };

  // R9: handleViewProof simplified - viewingProof state removed
  const handleViewProof = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[TaskCard] View proof clicked for task:', task.id);

    if (!task.proof_url) {
      console.error('[TaskCard] No proof URL available for task:', task.id);
      toast.error(t('errorViewing'), { duration: 4000 });
      return;
    }

    try {
      const proofUrl = task.proof_url;

      if (!isValidUrl(proofUrl)) {
        console.error('[TaskCard] Invalid proof URL format:', proofUrl);
        toast.error(t('errorViewing') + ' - Invalid proof URL', { duration: 6000 });
        return;
      }

      console.log('[TaskCard] Opening proof URL:', proofUrl);

      try {
        const response = await fetch(proofUrl, { method: 'HEAD' });
        if (!response.ok) {
          throw new Error(`Proof file not accessible: ${response.status} ${response.statusText}`);
        }

        window.open(proofUrl, '_blank', 'noopener,noreferrer');
        soundManager.play('click1');

      } catch (urlError) {
        console.error('[TaskCard] Proof URL not accessible:', proofUrl, urlError);
        toast.error(t('errorViewing') + ' - Proof file not accessible', { duration: 6000 });
      }

    } catch (error) {
      console.error('[TaskCard] Error viewing proof:', error);
      const errorMessage = getErrorMessage(error, 'proof-viewing');
      toast.error(errorMessage, { duration: 6000 });
    }
  }, [task.id, task.proof_url, t]);

  // R9: renderActionButtonsInModal removed - actions now handled by MissionModalShell

  // R11: Dark card backgrounds with subtle accent borders
  // Changed from bright tinted backgrounds (bg-red-500/10) to dark unified surface
  const collapsedCardBgColor = isArchived
    ? 'bg-slate-800/60 border-slate-600/40 hover:border-slate-500'
    : status === 'pending'
    ? 'bg-[#1a1625]/80 border-red-500/40 hover:border-red-400'
    : status === 'review'
    ? 'bg-[#1a1625]/80 border-yellow-500/40 hover:border-yellow-400'
    : 'bg-[#1a1625]/80 border-green-500/40 hover:border-green-400';

  // R9: Map task status to modal state for MissionModalShell
  const modalState = mapTaskStatusToModalState(status, isArchived, deadline);
  const modalRole: ModalRole = isCreatorView ? 'creator' : 'assignee';

  const titleColorClass = isArchived
    ? 'text-slate-500'
    : status === 'pending'
    ? 'text-red-400'
    : status === 'review'
    ? 'text-yellow-400'
    : status === 'completed'
    ? 'text-green-400'
    : 'text-slate-300';

  return (
    <>
      {tooltipContent && createPortal(
        <div
          style={{ top: `${tooltipPosition.top}px`, left: `${tooltipPosition.left}px` }}
          className="fixed z-tooltip px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg shadow-lg transition-opacity duration-300 -translate-y-full -translate-x-1/2 pointer-events-none"
        >
          {tooltipContent}
          <div
            className="absolute left-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900 tooltip-arrow"
          />
        </div>,
        getOverlayRoot() // Phase 2: Portal into overlay-root (tooltips can use overlay-root too)
      )}

      {/*
        R6 FIX: Simplified click handling
        - Removed swipeHandlers from click path - was interfering with touch/click events
        - Single click handler on BaseCard only
        - Swipe for archive is a nice-to-have, prioritizing core click functionality
      */}
      <BaseCard
        variant="glass"
        className={`relative cursor-pointer overflow-visible ${collapsedCardBgColor} p-4 sm:p-5`}
        hover={true}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('[TaskCard] BaseCard clicked, expanding task:', id, 'isExpanded:', isExpanded);
          if (!isExpanded) {
            setIsExpanded(true);
          }
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(true);
          }
        }}
        aria-label={`View details for task: ${title}`}
      >
        <div
          className="min-h-[60px] flex flex-col"
        >
          {/* Top row: Status chip + Title + Deadline */}
          <div className="flex justify-between items-start gap-2 mb-2">
            <div className="flex-1 min-w-0 flex items-start gap-2">
              {/* Status chip - mobile optimized */}
              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap flex-shrink-0 ${
                isArchived
                  ? 'bg-slate-600/30 text-slate-400 border border-slate-600/50'
                  : status === 'pending'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                  : status === 'review'
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                  : status === 'completed'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                  : 'bg-slate-600/30 text-slate-400 border border-slate-600/50'
              }`}>
                {isArchived ? 'Archived' : 
                 status === 'pending' ? 'Pending' :
                 status === 'review' ? 'In Review' :
                 status === 'completed' ? 'Done' :
                 status === 'rejected' ? 'Rejected' :
                 status}
              </span>
              <h3 className={`text-base sm:text-lg font-bold ${titleColorClass} min-w-0 line-clamp-2`} title={title}>
                {title}
              </h3>
            </div>
            <div className="flex-shrink-0 text-right">
              <CountdownTimer deadline={deadline} />
            </div>
          </div>

          {/* Daily badge and streak - mobile optimized */}
          {task.is_daily && (
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-teal-500/20 text-teal-400 border border-teal-500/30">
                {theme.strings.dailyLabel}
              </span>
              {streakCount !== undefined && streakCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-orange-400">
                  🔥 {streakCount}-day {theme.strings.streakLabel}
                </span>
              )}
            </div>
          )}

          {/* Bottom row: Actor + Status icons */}
          <div className="flex justify-between items-center mt-auto pt-2 border-t border-slate-700/30">
            <p className="text-sm text-slate-400 flex items-center min-w-0">
              <User size={14} className="mr-1.5 flex-shrink-0" />
              <span className="truncate">{actorName}</span>
            </p>
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
              {status === 'review' && <Eye size={16} className="text-yellow-400" />}
              {status === 'completed' && <CheckCircle size={16} className="text-green-400" />}
              {isArchived && <Archive size={16} className="text-slate-500" />}
            </div>
          </div>
        </div>
      </BaseCard>

      {/* R9: Use MissionModalShell for expanded view */}
      <MissionModalShell
        isOpen={isExpanded}
        onClose={handleClose}
        mode={theme.id}
        role={modalRole}
        state={modalState}
        title={title}
        description={description || 'No further details provided for this mission.'}
        fromUser={creator ? { name: creator.display_name || 'Unknown', avatar: creator.avatar_url || undefined } : undefined}
        toUser={assignee ? { name: assignee.display_name || 'Unknown', avatar: assignee.avatar_url || undefined } : undefined}
        reward={reward_text ? {
          type: reward_type === 'credit' ? 'credit' : task.image_url ? 'image' : 'text',
          value: reward_type === 'credit' ? parseInt(reward_text, 10) : reward_text,
          imageUrl: task.image_url || undefined,
        } : undefined}
        isDaily={task.is_daily}
        streakCount={streakCount}
        // Actions based on role and state
        primaryAction={
          // Assignee: Complete Task button (for pending/in_progress)
          !isCreatorView && (status === 'pending' || status === 'in_progress') && !isArchived
            ? {
                label: actionLoading ? 'Submitting...' : 'Complete Task',
                onClick: () => setShowProofModal(true),
                loading: actionLoading,
              }
            // Creator in review: Approve button
            : isCreatorView && status === 'review'
            ? {
                label: actionLoading ? 'Processing...' : 'Approve',
                onClick: () => onApprove && onApprove(id),
                loading: actionLoading,
                variant: 'success',
              }
            : undefined
        }
        secondaryAction={
          // Creator in review: Reject button
          isCreatorView && status === 'review'
            ? {
                label: actionLoading ? 'Processing...' : 'Reject',
                onClick: () => onReject && onReject(id),
                loading: actionLoading,
                variant: 'danger',
              }
            : undefined
        }
        deleteAction={
          isCreatorView && !isArchived
            ? {
                onClick: () => {
                  handleClose();
                  onDeleteTaskRequest(id);
                },
                loading: actionLoading,
              }
            : undefined
        }
      >
        {/* Proof section for assignee (viewing submitted proof) */}
        {task.proof_url && ['review', 'completed', 'archived'].includes(status) && !isCreatorView && (
          <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center text-white/60 mb-3 justify-center">
              <Eye size={16} className="mr-2 text-indigo-400" />
              <span className="text-xs font-semibold uppercase tracking-wide">Submitted Proof</span>
            </div>
            <div className="text-center">
              {renderProofLink(task.proof_url!, 'inline-flex items-center text-teal-400 hover:text-teal-300 underline text-sm font-medium')}
            </div>
          </div>
        )}

        {/* Proof section for creator (reviewing proof) */}
        {isCreatorView && status === 'review' && task.proof_url && (
          <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-center text-white/60 mb-3">
              <Eye size={16} className="mr-2 text-indigo-400" />
              <span className="text-xs font-semibold uppercase tracking-wide">Proof for Review</span>
            </div>
            <div className="text-center">
              {renderProofLink(task.proof_url!, 'inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 underline text-sm font-medium py-2 px-4 rounded-lg hover:bg-teal-500/10 transition-colors', true)}
            </div>
          </div>
        )}

        {/* Deadline info */}
        {deadline && (
          <div className="mt-4 flex items-center justify-center gap-2 text-white/50 text-sm">
            <Clock size={14} />
            <span>Deadline: </span>
            <CountdownTimer deadline={deadline} baseColor="text-white/70" />
          </div>
        )}
      </MissionModalShell>

      {showProofModal && createPortal(
        <ProofModal
          taskId={id}
          onClose={() => setShowProofModal(false)}
          onSubmit={async (file: File | null, textDescription?: string) => {
            setActionLoading(true);
            try {
              const uploadedUrl = await onProofUpload(file, id, textDescription);
              if (uploadedUrl) {
                if (refetchTasks) refetchTasks();
                setShowProofModal(false);
              }
            } catch (error) {
              console.error("Proof submission failed:", error);
            } finally {
              setActionLoading(false);
            }
          }}
          uploadProgress={uploadProgress}
        />,
        getOverlayRoot() // Phase 2: Portal into overlay-root instead of document.body
      )}
    </>
  );
};

export default TaskCard;