// src/components/TaskCard.tsx
// REFACTOR: Implemented modal-based expansion system to fix layout bugs.
// Expanded card now renders as a fixed-position overlay, separate from grid/flex flow.
// FONT FIX: Applied Futura font (via inline styles) to card titles, descriptions, and status text.
// CRITICAL FIX: Uses React Portal (createPortal) for tooltips and modals.
// UI REFINEMENT: Consolidated status display at the bottom of the expanded card modal.
// DATA FIX: Uses task.creator.display_name and task.assignee.display_name.
// R35: Type-based card accent (gold=credit / mode=gift), TypeEmblem indicator, daily badge.

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Eye, Link, User, Flame } from 'lucide-react';
import { AssignedContract } from '../hooks/useAssignedContracts';
import { TaskStatus } from '../types/custom';
import { useUI } from '../context/UIContext';
import { BaseCard } from './ui/BaseCard';
import { Coin } from './visual/Coin';
import { TypeEmblem } from './visual/TypeEmblem'; // R35: Contract-type gift emblem
import { useTheme } from '../context/ThemeContext'; // P5: Import useTheme for daily label
import { useThemeStrings } from '../hooks/useThemeStrings'; // R35: dailyLabel string

import { safeUrlRender } from '../lib/proofConfig';
import { getTypeAccentVariant } from '../theme/accentVariants'; // R35: Type-based card accents
import { mapTaskStatusToModalState } from '../theme/modalTheme';

import ProofModal from './ProofModal';
import MissionModalShell from './modals/MissionModalShell';

interface TaskCardProps {
  refetchTasks?: () => void;
  task: AssignedContract;
  isCreatorView: boolean;
  onStatusUpdate: (taskId: string, status: TaskStatus, currentCredits?: number, rewardAmount?: number) => void;
  onProofUpload: (file: File | null, taskId: string, textDescription?: string) => Promise<string | null>;
  onDirectComplete?: (taskId: string) => Promise<boolean>; // R31: For completing tasks without proof
  onDeleteTaskRequest: (taskId: string) => void;
  onApprove?: (taskId: string) => void;
  onReject?: (taskId: string) => void;
  onArchive?: (taskId: string) => Promise<void>; // Archive action for completed tasks
  uploadProgress: number;
  actionLoading?: boolean;
  onEditTaskRequest?: (task: AssignedContract) => void;
  currentUserCredits?: number;
  isArchived?: boolean;
}

// R30: Improved CountdownTimer - hide when no deadline, show "Overdue" when past
const CountdownTimer: React.FC<{ deadline: string | null; baseColor?: string }> = ({ deadline, baseColor = 'text-slate-400' }) => {
  const calculateTimeLeft = () => {
    if (!deadline) return null;
    const difference = +new Date(deadline) - +new Date();
    if (difference <= 0) {
      return 'overdue';
    }
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
    };
  };
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  useEffect(() => {
    if (!deadline) return;
    const timer = setTimeout(() => setTimeLeft(calculateTimeLeft()), 1000 * 60);
    return () => clearTimeout(timer);
  });

  // R30: No deadline - don't show anything
  if (!deadline) return null;

  // R30: Overdue - show "Overdue" in red
  if (timeLeft === 'overdue') {
    return <span className="text-xs text-red-400 font-semibold">Overdue</span>;
  }

  // R30: Has time left - show countdown
  if (!timeLeft || typeof timeLeft === 'string') return null;

  return (
    <span className={`text-xs ${baseColor} flex items-center`}>
      {timeLeft.days !== undefined && timeLeft.days > 0 && `${timeLeft.days}d `}
      {timeLeft.hours !== undefined && timeLeft.hours > 0 && `${timeLeft.hours}h `}
      {`${timeLeft.minutes}m`}
    </span>
  );
};

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isCreatorView,
  onProofUpload,
  onDirectComplete, // R31: For completing tasks without proof
  onDeleteTaskRequest,
  onApprove,
  onReject,
  onArchive, // Archive action for completed tasks
  uploadProgress,
  actionLoading: externalActionLoading,
  onEditTaskRequest,
  refetchTasks,
  isArchived,
}) => {
  const { t } = useTranslation();
  const { openModal, clearLayer } = useUI();
  const { theme, themeId } = useTheme(); // P5: Get theme for daily label, R28: themeId for accents
  const { strings } = useThemeStrings(); // R35: mode-aware dailyLabel
  const [showProofModal, setShowProofModal] = useState(false);

  // R35: Type-based accent — credit → gold (matches coin), gift/other → mode accent
  const derivedRewardType: 'credit' | 'text' | 'image' =
    task.reward_type === 'credit' ? 'credit' : task.image_url ? 'image' : 'text';
  const accentVariant = getTypeAccentVariant(themeId, derivedRewardType);
  const [internalActionLoading, setInternalActionLoading] = useState(false);
  const actionLoading = internalActionLoading || !!externalActionLoading;
  const [isExpanded, setIsExpanded] = useState(false);

  // R9: Simplified handleClose - MissionModalShell handles its own animation
  const handleClose = () => {
    setIsExpanded(false);
    clearLayer();
  };

  // Phase 2: Sync expanded state with UIContext
  useEffect(() => {
    if (isExpanded) {
      openModal(); // Phase 2: Use UIContext to coordinate overlay layers
    }
  }, [isExpanded, openModal]);

  const { id, title, description, deadline, reward_type, reward_text, status, creator, assignee } = task;
  const safeStatus = (status || 'pending') as TaskStatus;

  const actorName: string = isCreatorView ? (assignee?.display_name ?? 'N/A') : (creator?.display_name ?? 'N/A');

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

  // R28: Mode-aware card backgrounds with accent borders from accentVariants
  // Archived/completed/review have specific colors, pending uses mode accent
  const collapsedCardBgColor = isArchived
    ? 'bg-slate-800/60 border-slate-600/40 hover:border-slate-500'
    : safeStatus === 'completed'
    ? 'bg-slate-900/50 border-green-500/40 hover:border-green-400'
    : safeStatus === 'review'
    ? 'bg-slate-900/50 border-yellow-500/40 hover:border-yellow-400'
    : 'bg-slate-900/50'; // Pending/other - border applied via style prop

  // R28: Title colors - pending uses neutral white (accent is on border/chip), others stay semantic
  const titleColorClass = isArchived
    ? 'text-slate-500'
    : safeStatus === 'completed'
    ? 'text-green-400'
    : safeStatus === 'review'
    ? 'text-yellow-400'
    : 'text-white/90'; // R28: Pending/other - neutral white, accent shows on border/chip

  return (
    <>
      {/* R9: Use MissionModalShell for expanded view */}
      <MissionModalShell
        isOpen={isExpanded}
        onClose={handleClose}
        mode={theme.id}
        role={isCreatorView ? 'creator' : 'assignee'}
        state={mapTaskStatusToModalState(safeStatus, isArchived, deadline)}
        title={title}
        description={description || undefined}
        deadline={deadline}
        fromUser={creator ? { name: creator.display_name || 'Unknown', avatar: creator.avatar_url || undefined } : undefined}
        toUser={assignee ? { name: assignee.display_name || 'Unknown', avatar: assignee.avatar_url || undefined } : undefined}
        reward={reward_text ? {
          type: reward_type === 'credit' ? 'credit' : task.image_url ? 'image' : 'text',
          value: reward_type === 'credit' ? parseInt(reward_text, 10) : reward_text,
          imageUrl: task.image_url || undefined,
        } : undefined}
        // Actions based on role and state
        primaryAction={
          // Assignee: Complete Task button (for pending/in_progress)
          // Phase 2.3: also allow resubmit after a rejection ('rejected')
          // R31: Branch on proof_required - if false, skip modal and submit directly
          !isCreatorView && (safeStatus === 'pending' || safeStatus === 'in_progress' || safeStatus === 'rejected') && !isArchived
            ? {
                label: actionLoading
                  ? 'Submitting...'
                  : safeStatus === 'rejected'
                  ? t('contracts.reject.resubmit')
                  : 'Complete Task',
                onClick: async () => {
                  const proofRequired = task.proof_required === true;
                  if (proofRequired) {
                    // Proof required - open modal
                    setShowProofModal(true);
                  } else {
                    // No proof required - submit directly for review
                    if (onDirectComplete) {
                      setInternalActionLoading(true);
                      try {
                        const success = await onDirectComplete(id);
                        if (success) {
                          handleClose();
                        }
                      } finally {
                        setInternalActionLoading(false);
                      }
                    } else {
                      // Fallback: open modal anyway if handler not provided
                      setShowProofModal(true);
                    }
                  }
                },
                loading: actionLoading,
              }
            // Creator in review: Approve button
            : isCreatorView && safeStatus === 'review'
            ? {
                label: actionLoading ? 'Processing...' : 'Approve',
                onClick: () => onApprove && onApprove(id),
                loading: actionLoading,
                variant: 'success',
              }
            : isCreatorView && (safeStatus === 'pending' || safeStatus === 'rejected') && !isArchived && onEditTaskRequest
            ? {
                label: 'Edit',
                onClick: () => {
                  handleClose();
                  onEditTaskRequest(task);
                },
                loading: actionLoading,
              }
            : undefined
        }
        secondaryAction={
          // Creator in review: Reject button
          isCreatorView && safeStatus === 'review'
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
        archiveAction={
          // Show archive button for completed tasks (both creator and assignee)
          safeStatus === 'completed' && !isArchived && onArchive
            ? {
                onClick: async () => {
                  setInternalActionLoading(true);
                  try {
                    await onArchive(id);
                    handleClose();
                    if (refetchTasks) refetchTasks();
                  } finally {
                    setInternalActionLoading(false);
                  }
                },
                loading: actionLoading,
              }
            : undefined
        }
      >
        {/* Phase 2.3: rejection reason shown to the assignee so they know why */}
        {!isCreatorView && safeStatus === 'rejected' && task.rejection_reason && (
          <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
            <div className="flex items-center text-red-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide">
                {t('contracts.reject.rejectedLabel')}
              </span>
            </div>
            <p className="text-sm text-slate-300 whitespace-pre-wrap break-words">
              {task.rejection_reason}
            </p>
          </div>
        )}

        {/* Proof section for assignee (viewing submitted proof) */}
        {task.proof_url && ['review', 'completed', 'archived'].includes(safeStatus) && !isCreatorView && (
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
        {isCreatorView && safeStatus === 'review' && task.proof_url && (
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
      </MissionModalShell>

      {/* R6 FIX: Simplified click handling */}
      {/* R28: Apply mode-aware accent border for pending tasks */}
      <BaseCard
        variant="glass"
        className={`relative cursor-pointer overflow-visible touch-manipulation motion-safe:active:scale-[0.99] active:duration-100 ${collapsedCardBgColor} p-4 sm:p-5`}
        style={
          !isArchived && safeStatus === 'pending'
            ? {
                borderColor: accentVariant.borderColor,
                boxShadow: `0 0 8px ${accentVariant.glowColor}`,
              }
            : undefined
        }
        hover={true}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
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
              {/* R28: Status chip - mode-aware styling for pending */}
              <span
                className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap flex-shrink-0 ${
                  isArchived
                    ? 'bg-slate-600/30 text-slate-400 border border-slate-600/50'
                    : safeStatus === 'completed'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                    : safeStatus === 'review'
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                    : safeStatus === 'rejected'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                    : '' // Pending - styled via inline style below
                }`}
                style={
                  !isArchived && safeStatus === 'pending'
                    ? {
                        backgroundColor: `${accentVariant.glowColor}`,
                        borderColor: accentVariant.borderColor,
                        borderWidth: '1px',
                        borderStyle: 'solid',
                      }
                    : undefined
                }
              >
                {isArchived ? t('taskStatus.archived') :
                 safeStatus === 'pending' ? t('taskStatus.pending') :
                 safeStatus === 'review' ? t('taskStatus.review') :
                 safeStatus === 'completed' ? t('taskStatus.completed') :
                 safeStatus === 'rejected' ? t('taskStatus.rejected') :
                 safeStatus}
              </span>
              {/* R35: Daily-mission badge — dormant until is_daily is set (no layout impact when absent) */}
              {task.is_daily && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap flex-shrink-0 bg-orange-500/20 text-orange-400 border border-orange-500/50">
                  <Flame size={12} />
                  {strings.dailyLabel}
                </span>
              )}
              <h3 className={`text-base sm:text-lg font-bold ${titleColorClass} min-w-0 line-clamp-2`} title={title}>
                {title}
              </h3>
            </div>
            <div className="flex-shrink-0 text-right">
              <CountdownTimer deadline={deadline} />
            </div>
          </div>

          {/* Bottom row: Actor + Reward indicator (status shown in top-left badge only) */}
          <div className="flex justify-between items-center mt-auto pt-2 border-t border-slate-700/30">
            <p className="text-sm text-slate-400 flex items-center min-w-0">
              <User size={14} className="mr-1.5 flex-shrink-0" />
              <span className="truncate">{actorName}</span>
            </p>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              {/* R30: Reward indicator - coin + amount or emoji */}
              {reward_text && (
                <span className="flex items-center gap-1 text-xs">
                  {reward_type === 'credit' ? (
                    <Coin size="sm" variant="static" value={parseInt(reward_text, 10) || 0} />
                  ) : (
                    // R35: user-picked short emoji still wins; otherwise the mode gift emblem
                    reward_text.length <= 2 ? (
                      <span className="text-base" title={reward_text}>
                        {reward_text}
                      </span>
                    ) : (
                      <TypeEmblem size={32} />
                    )
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </BaseCard>

      {showProofModal && (
        <ProofModal
          onClose={() => setShowProofModal(false)}
          onSubmit={async (file: File | null, textDescription?: string) => {
            setInternalActionLoading(true);

            try {
              const uploadedUrl = await onProofUpload(file, id, textDescription);
              if (uploadedUrl) {
                if (refetchTasks) refetchTasks();
                setShowProofModal(false);
              }
            } finally {
              setInternalActionLoading(false);
            }
          }}
          uploadProgress={uploadProgress}
        />
      )}
    </>
  );
};

export default TaskCard;
