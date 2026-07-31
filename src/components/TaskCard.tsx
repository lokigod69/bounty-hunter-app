// src/components/TaskCard.tsx
// REFACTOR: Implemented modal-based expansion system to fix layout bugs.
// Expanded card now renders as a fixed-position overlay, separate from grid/flex flow.
// FONT FIX: Applied Futura font (via inline styles) to card titles, descriptions, and status text.
// CRITICAL FIX: Uses React Portal (createPortal) for tooltips and modals.
// UI REFINEMENT: Consolidated status display at the bottom of the expanded card modal.
// DATA FIX: Uses task.creator.display_name and task.assignee.display_name.
// R35: Type-based card accent (gold=credit / mode=gift), TypeEmblem indicator, daily badge.
// Wave B: Pending contracts can be accepted; dossier evidence renders text and private media.

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { User, Flame } from 'lucide-react';
import { AssignedContract } from '../hooks/useAssignedContracts';
import { TaskStatus } from '../types/custom';
import { useUI } from '../context/UIContext';
import { BaseCard } from './ui/BaseCard';
import { Coin } from './visual/Coin';
import { TypeEmblem } from './visual/TypeEmblem'; // R35: Contract-type gift emblem
import { useTheme } from '../context/ThemeContext'; // P5: Import useTheme for daily label
import { useThemeStrings } from '../hooks/useThemeStrings'; // R35: dailyLabel string
import { getTypeAccentVariant } from '../theme/accentVariants'; // R35: Type-based card accents
import { mapTaskStatusToModalState } from '../theme/modalTheme';
import { fireSeal } from './visual/sealEvents';

import ProofModal from './ProofModal';
import MissionModalShell from './modals/MissionModalShell';
import EvidencePanel from './EvidencePanel';

interface TaskCardProps {
  refetchTasks?: () => void;
  task: AssignedContract;
  isCreatorView: boolean;
  onStatusUpdate: (
    taskId: string,
    status: TaskStatus,
    currentCredits?: number,
    rewardAmount?: number
  ) => void | boolean | Promise<void | boolean>;
  onProofUpload: (file: File | null, taskId: string, textDescription?: string) => Promise<string | null>;
  onDirectComplete?: (taskId: string) => Promise<boolean>; // R31: For completing tasks without proof
  onDeleteTaskRequest: (taskId: string) => void;
  onApprove?: (taskId: string, anchor?: Element | null) => void;
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
  onStatusUpdate,
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
  const hasEvidence = Boolean(task.proof_url || task.proof_description?.trim());

  const actorName: string = isCreatorView ? (assignee?.display_name ?? 'N/A') : (creator?.display_name ?? 'N/A');

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
          // Assignee: accept pending work before proof submission becomes available.
          !isCreatorView && safeStatus === 'pending' && !isArchived
            ? {
                label: t('contracts.accept'),
                onClick: async (anchor) => {
                  setInternalActionLoading(true);
                  try {
                    const updated = await onStatusUpdate(id, 'in_progress');
                    if (updated !== false) fireSeal('accept', anchor);
                  } finally {
                    setInternalActionLoading(false);
                  }
                },
                loading: actionLoading,
              }
            // Assignee: submit proof after acceptance; rejected work keeps the resubmit flow.
            // R31: Branch on proof_required - if false, skip modal and submit directly.
            : !isCreatorView && (safeStatus === 'in_progress' || safeStatus === 'rejected') && !isArchived
            ? {
                label: actionLoading
                  ? 'Submitting...'
                  : safeStatus === 'rejected'
                  ? t('contracts.reject.resubmit')
                  : 'Complete Task',
                onClick: async (anchor) => {
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
                          fireSeal('transmit', anchor);
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
                onClick: (anchor) => onApprove && onApprove(id, anchor),
                loading: actionLoading,
                variant: 'success',
              }
            : isCreatorView && (safeStatus === 'pending' || safeStatus === 'rejected') && !isArchived && onEditTaskRequest
            ? {
                label: t('common.edit'),
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
                  } catch {
                    // Page-level handlers display archive failures; keep the modal open.
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
          <div className="mt-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
            <div className="flex items-center text-orange-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide">
                {t('contracts.reject.rejectedLabel')}
              </span>
            </div>
            <p className="text-sm text-slate-300 whitespace-pre-wrap break-words">
              {task.rejection_reason}
            </p>
          </div>
        )}

        {/* Evidence remains visible to both parties throughout review and resolution. */}
        {hasEvidence && ['review', 'completed', 'rejected'].includes(safeStatus) && (
          <EvidencePanel task={task} />
        )}
      </MissionModalShell>

      {/* R6 FIX: Simplified click handling */}
      {/* R28: Apply mode-aware accent border for pending tasks */}
      <BaseCard
        variant="glass"
        className={`relative cursor-pointer overflow-visible touch-manipulation motion-safe:active:scale-[0.99] active:duration-100 ${collapsedCardBgColor} p-4 sm:p-5`}
        style={
          !isArchived && (safeStatus === 'pending' || safeStatus === 'in_progress')
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
            {/* flex-wrap, and a real basis on the title further down.
                Both badges are `whitespace-nowrap flex-shrink-0` and the
                countdown column is flex-shrink-0, so the h3 was the only box in
                this row with both flex-shrink:1 and min-width:0 — flexbox
                resolved the ENTIRE deficit against it and min-w-0 put its floor
                at zero. line-clamp-2 compiles to overflow:hidden, so a
                zero-width title renders nothing at all: no ellipsis, no
                overflow, no clue that a title exists.

                German is where it crosses zero. "Zurückgesendet" (112px) +
                "Täglicher Moment" (139px) + two 8px gaps = 268px of nowrap
                badges. The content box is 296px on a 360px phone and 264px in
                the desktop lg:grid-cols-3 grid ((1024-64-48)/3 = 304px card,
                sm:p-5) — subtract the row gap and a 69px countdown and the
                title was owed -48px and -80px respectively. English lands at
                176px and merely looks cramped, which is why this read as a
                German bug. Polish is worse than German again at 289px.

                Not fixed with a breakpoint, and that is the point: the
                narrowest task card in the app is a DESKTOP one (264px), 32px
                narrower than a 360px phone's, so an xs:/sm: fix would have
                closed the report and left the desktop grid broken. */}
            <div className="flex-1 min-w-0 flex flex-wrap items-start gap-2">
              {/* R28: Status chip - mode-aware styling for pending */}
              <span
                className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap flex-shrink-0 max-w-full min-w-0 ${
                  isArchived
                    ? 'bg-slate-600/30 text-slate-400 border border-slate-600/50'
                    : safeStatus === 'completed'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                    : safeStatus === 'review'
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                    : safeStatus === 'rejected'
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                    : '' // Pending - styled via inline style below
                }`}
                style={
                  !isArchived && (safeStatus === 'pending' || safeStatus === 'in_progress')
                    ? {
                        backgroundColor: `${accentVariant.glowColor}`,
                        borderColor: accentVariant.borderColor,
                        borderWidth: '1px',
                        borderStyle: 'solid',
                      }
                    : undefined
                }
              >
                {/* max-w-full + truncate on the label is a backstop for locales
                    we have not added yet, in the same spirit as
                    .standing-rank's 14ch clamp. The widest shipped chip is
                    Swedish "Under granskning" at 122px and the narrowest line a
                    badge ever gets is 187px, so it never fires today — it just
                    guarantees the row cannot overflow the card whatever a
                    translator writes. */}
                <span className="truncate">
                  {isArchived ? t('taskStatus.archived') :
                   safeStatus === 'pending' ? t('taskStatus.pending') :
                   safeStatus === 'in_progress' ? t('taskStatus.inProgress') :
                   safeStatus === 'review' ? t('taskStatus.review') :
                   safeStatus === 'completed' ? t('taskStatus.completed') :
                   safeStatus === 'rejected' ? t('taskStatus.rejected') :
                   safeStatus}
                </span>
              </span>
              {/* R35: Daily-mission badge — dormant until is_daily is set (no layout impact when absent) */}
              {task.is_daily && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap flex-shrink-0 max-w-full min-w-0 bg-orange-500/20 text-orange-400 border border-orange-500/50">
                  <Flame size={12} className="flex-shrink-0" />
                  {/* Widest shipped label: Polish "Codzienny obowiązek", 161px
                      against a 187px minimum line. Same backstop as the chip. */}
                  <span className="truncate">{strings.dailyLabel}</span>
                </span>
              )}
              {/* basis-40: the title asks for 160px — about two clamped lines of
                  ~20 characters. If the badges leave less than that, it wraps to
                  its own line and flex-1 grows it to the full row width, instead
                  of being squeezed to zero and disappearing entirely. */}
              <h3 className={`text-base sm:text-lg font-bold ${titleColorClass} flex-1 basis-40 min-w-0 line-clamp-2`} title={title}>
                {title}
              </h3>
            </div>
            <div className="flex-shrink-0 text-right">
              {!isArchived && <CountdownTimer deadline={deadline} />}
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
          onSubmit={async (
            file: File | null,
            textDescription?: string,
            anchor?: Element | null
          ) => {
            setInternalActionLoading(true);

            try {
              const uploadedUrl = await onProofUpload(file, id, textDescription);
              if (uploadedUrl) {
                fireSeal('transmit', anchor);
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
