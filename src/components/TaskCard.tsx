// src/components/TaskCard.tsx
// REFACTOR: Implemented modal-based expansion system to fix layout bugs.
// Expanded card now renders as a fixed-position overlay, separate from grid/flex flow.
// FONT FIX: Applied Futura font (via inline styles) to card titles, descriptions, and status text.
// CRITICAL FIX: Uses React Portal (createPortal) for tooltips and modals.
// UI REFINEMENT: Consolidated status display at the bottom of the expanded card modal.
// DATA FIX: Uses task.creator.display_name and task.assignee.display_name.

import React, { useState, useEffect } from 'react';

import { Archive, CheckCircle, Eye, Link, User } from 'lucide-react';
import { AssignedContract } from '../hooks/useAssignedContracts';
import { createPortal } from 'react-dom';
import { TaskStatus } from '../types/custom';
import { useUI } from '../context/UIContext';
import { getOverlayRoot } from '../lib/overlayRoot';
import { logOverlayRootState } from '../lib/overlayDebug';
import { BaseCard } from './ui/BaseCard';
import { useTheme } from '../context/ThemeContext'; // P5: Import useTheme for daily label

import { safeUrlRender } from '../lib/proofConfig';
import { getAccentVariant } from '../theme/accentVariants'; // R28: Mode-aware card accents
import { mapTaskStatusToModalState } from '../theme/modalTheme';

import ProofModal from './ProofModal';
import MissionModalShell from './modals/MissionModalShell';

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
  actionLoading?: boolean;
  onEditTaskRequest?: (task: AssignedContract) => void;
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

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isCreatorView,
  onProofUpload,
  onDeleteTaskRequest,
  onApprove,
  onReject,
  uploadProgress,
  actionLoading: externalActionLoading,
  onEditTaskRequest,
  refetchTasks,
  isArchived,
  streakCount,
}) => {
  const { openModal, clearLayer } = useUI();
  const { theme, themeId } = useTheme(); // P5: Get theme for daily label, R28: themeId for accents
  const [showProofModal, setShowProofModal] = useState(false);

  // R28: Get mode-aware accent variant for this card
  const accentVariant = getAccentVariant(themeId, task.id);
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
    ? 'bg-[#1a1625]/80 border-green-500/40 hover:border-green-400'
    : safeStatus === 'review'
    ? 'bg-[#1a1625]/80 border-yellow-500/40 hover:border-yellow-400'
    : 'bg-[#1a1625]/80'; // Pending/other - border applied via style prop

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
        description={description || 'No further details provided for this mission.'}
        deadline={deadline}
        fromUser={creator ? { name: creator.display_name || 'Unknown', avatar: creator.avatar_url || undefined } : undefined}
        toUser={assignee ? { name: assignee.display_name || 'Unknown', avatar: assignee.avatar_url || undefined } : undefined}
        reward={reward_text ? {
          type: reward_type === 'credit' ? 'credit' : task.image_url ? 'image' : 'text',
          value: reward_type === 'credit' ? parseInt(reward_text, 10) : reward_text,
          imageUrl: task.image_url || undefined,
        } : undefined}
        isDaily={task.is_daily ?? undefined}
        streakCount={streakCount}
        // Actions based on role and state
        primaryAction={
          // Assignee: Complete Task button (for pending/in_progress)
          !isCreatorView && (safeStatus === 'pending' || safeStatus === 'in_progress') && !isArchived
            ? {
                label: actionLoading ? 'Submitting...' : 'Complete Task',
                onClick: () => setShowProofModal(true),
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
      >
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
        className={`relative cursor-pointer overflow-visible ${collapsedCardBgColor} p-4 sm:p-5`}
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
                {isArchived ? 'Archived' :
                 safeStatus === 'pending' ? 'Open' :
                 safeStatus === 'review' ? 'In Review' :
                 safeStatus === 'completed' ? 'Done' :
                 safeStatus === 'rejected' ? 'Rejected' :
                 safeStatus}
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
              {safeStatus === 'review' && <Eye size={16} className="text-yellow-400" />}
              {safeStatus === 'completed' && <CheckCircle size={16} className="text-green-400" />}
              {isArchived && <Archive size={16} className="text-slate-500" />}
            </div>
          </div>
        </div>
      </BaseCard>

      {showProofModal && createPortal(
        <ProofModal
          taskId={id}
          onClose={() => setShowProofModal(false)}
          onSubmit={async (file: File | null, textDescription?: string) => {
            setInternalActionLoading(true);
            try {
              const uploadedUrl = await onProofUpload(file, id, textDescription);
              if (uploadedUrl) {
                if (refetchTasks) refetchTasks();
                setShowProofModal(false);
              }
            } catch (error) {
              console.error("Proof submission failed:", error);
            } finally {
              setInternalActionLoading(false);
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