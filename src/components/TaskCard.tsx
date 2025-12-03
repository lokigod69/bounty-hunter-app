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

import { Archive, CheckCircle, CircleDollarSign, Clock, Eye, FileText, Link, Trash2, XCircle, User } from 'lucide-react';
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
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [viewingProof, setViewingProof] = useState(false);

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

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsExpanded(false);
      setIsAnimatingOut(false);
      clearLayer(); // Phase 2: Clear overlay layer when modal closes
    }, 300);
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
    trackMouse: true,
    preventScrollOnSwipe: true,
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

  const handleViewProof = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[TaskCard] View proof clicked for task:', task.id);
    
    if (!task.proof_url) {
      console.error('[TaskCard] No proof URL available for task:', task.id);
      toast.error(t('errorViewing'), { duration: 4000 });
      return;
    }

    try {
      setViewingProof(true);
      
      // Enhanced proof URL validation using centralized helper
      const proofUrl = task.proof_url!; // Non-null assertion since we checked above
      
      // Validate URL format using centralized helper
      if (!isValidUrl(proofUrl)) {
        console.error('[TaskCard] Invalid proof URL format:', proofUrl);
        toast.error(t('errorViewing') + ' - Invalid proof URL', { duration: 6000 });
        return;
      }
      
      // Log for debugging
      console.log('[TaskCard] Opening proof URL:', proofUrl);
      
      try {
        // Try to fetch the URL to verify it's accessible
        const response = await fetch(proofUrl, { method: 'HEAD' });
        if (!response.ok) {
          throw new Error(`Proof file not accessible: ${response.status} ${response.statusText}`);
        }
        
        // Open in new tab/window
        window.open(proofUrl, '_blank', 'noopener,noreferrer');
        
        // Play success sound
        soundManager.play('click1');
        
      } catch (urlError) {
        console.error('[TaskCard] Proof URL not accessible:', proofUrl, urlError);
        toast.error(t('errorViewing') + ' - Proof file not accessible', { duration: 6000 });
      }
      
    } catch (error) {
      console.error('[TaskCard] Error viewing proof:', error);
      const errorMessage = getErrorMessage(error, 'proof-viewing');
      toast.error(errorMessage, { duration: 6000 });
    } finally {
      setViewingProof(false);
    }
  }, [task.id, task.proof_url, t]);

  const renderActionButtonsInModal = () => {
    if (isArchived) return null;
    if (status === 'completed') return null;

    if (!isCreatorView && assigned_to === user?.id) {
      if ((status === 'pending' || status === 'in_progress')) {
        // Always show proof modal for "Complete Task" - allows text or file proof
        return <button onClick={(e) => { e.stopPropagation(); setShowProofModal(true); }} className="btn-primary py-2 px-8 text-md" disabled={actionLoading}>{actionLoading ? 'Submitting...' : 'Complete Task'}</button>;
      }
    }
    return null;
  };

  const collapsedCardBgColor = isArchived
    ? 'bg-slate-700/20 border-slate-600/50 hover:border-slate-500'
    : status === 'pending'
    ? 'bg-red-500/10 border-red-500/50 hover:border-red-400'
    : status === 'review'
    ? 'bg-yellow-500/10 border-yellow-500/50 hover:border-yellow-400'
    : 'bg-green-500/10 border-green-500/50 hover:border-green-400';

  const modalBgColor = isArchived
    ? 'bg-slate-900 border-2 border-slate-700'
    : status === 'pending'
    ? 'bg-red-900 border-2 border-red-500'
    : status === 'in_progress'
    ? 'bg-blue-900 border-2 border-blue-500'
    : status === 'review'
    ? 'bg-yellow-900 border-2 border-yellow-500'
    : status === 'completed'
    ? 'bg-green-900 border-2 border-green-500'
    : status === 'rejected'
    ? 'bg-rose-900 border-2 border-rose-500'
    : 'bg-slate-800 border border-slate-700';

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

      <BaseCard
        variant="glass"
        className={`relative cursor-pointer overflow-visible ${collapsedCardBgColor} p-4 sm:p-5`}
        hover={true}
        onClick={() => {
          console.log('[TaskCard] Card clicked, expanding task:', id);
          setIsExpanded(true);
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
          {...swipeHandlers}
          className="min-h-[60px] flex flex-col"
          onClick={(e) => {
            // Explicit click handler on inner div - belt-and-suspenders fix
            // This ensures clicks work even if swipeable handlers intercept
            console.log('[TaskCard] Inner div clicked, expanding task:', id);
            setIsExpanded(true);
          }}
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

      {isExpanded && createPortal(
        <div 
          data-overlay="TaskCardExpanded"
          className={`fixed inset-0 z-modal-backdrop flex items-center justify-center p-4 ${isAnimatingOut ? 'modal-fade-out' : 'modal-fade-in'}`}
          onClick={() => {
            console.log("[TaskCardModal] Backdrop clicked, closing");
            handleClose();
          }}
        >
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
            onClick={handleClose}
          />
          <div
            className={`relative z-modal-content w-[95vw] sm:w-full max-w-2xl shadow-2xl rounded-lg p-6 max-h-[90vh] flex flex-col ${isAnimatingOut ? 'modal-slide-down' : 'modal-slide-up'} ${modalBgColor}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 pb-4 border-b border-slate-600/50 flex-shrink-0 text-center">
              <h3 className="text-3xl sm:text-4xl font-bold text-slate-100 break-words max-w-full overflow-hidden font-mandalore" title={title}>{title}</h3>
              <p className="text-md text-slate-400 mt-2 flex items-center justify-center">
                <User size={18} className="mr-2" /> {isCreatorView ? actorName : fromName}
              </p>
            </div>

            <div className="flex-1 space-y-6 mb-6 overflow-y-auto overflow-x-hidden pr-2" style={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}>
              <div className="py-4 px-4 rounded-lg bg-slate-800/40 border border-slate-700/60 flex items-center justify-between w-full text-base">
                <div
                  className="flex items-center flex-shrink-0 mr-4"
                  onMouseEnter={(e) => handleShowTooltip(deadline ? <CountdownTimer deadline={deadline} baseColor='text-purple-400' /> : <span className="text-slate-500">Not set</span>, e.currentTarget)}
                  onMouseLeave={handleHideTooltip}
                >
                  <Clock size={24} className="text-purple-400 flex-shrink-0" />
                </div>
                <div className="flex-grow text-center mx-4 min-w-0">
                  <p className="text-sm text-slate-300 whitespace-normal break-words task-card-description">
                    <FileText size={20} className="mr-2 text-sky-400 inline-block relative -top-px" /> {description || 'No further details provided for this mission.'}
                  </p>
                </div>
                <div
                  className="flex items-center flex-shrink-0 ml-4"
                  onMouseEnter={(e) => handleShowTooltip(status ? (status === 'pending' ? (deadline && new Date(deadline) < new Date() ? 'OVERDUE' : 'OPEN') : status.replace('_', ' ').toUpperCase()) : 'UNKNOWN', e.currentTarget)}
                  onMouseLeave={handleHideTooltip}
                >
                  {status === 'pending' ? <CircleDollarSign size={24} className="text-red-400 flex-shrink-0" /> : status === 'review' ? <Eye size={24} className="text-yellow-400 flex-shrink-0" /> : status === 'completed' ? <CheckCircle size={24} className="text-green-400 flex-shrink-0" /> : <XCircle size={24} className="text-slate-400 flex-shrink-0" />}
                </div>
              </div>

              <div className="py-4 rounded-lg bg-slate-700/30 border border-slate-600/50 text-center w-3/4 mx-auto overflow-x-hidden">
                {reward_text ? (
                  <div className="flex flex-col items-center justify-center min-h-[50px]">
                    {reward_type === 'credit' ? (
                      <div className="flex items-center justify-center py-1" data-testid="mission-cost">
                        <DoubleCoinValue value={parseInt(reward_text || '0', 10)} />
                      </div>
                    ) : task.image_url ? (
                      <div className="relative w-48 h-48 group mx-auto">
                        <img src={task.image_url} alt={reward_text || 'Reward'} className="w-full h-full object-cover rounded-lg border-2 border-slate-600" />
                        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-black/70 p-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-lg">
                          <span className="text-white text-center text-sm font-semibold break-words">{reward_text}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-2xl font-bold py-1 px-3 break-all max-w-full relative overflow-hidden flex items-center justify-center">
                        <span className="animate-pulsate-present mr-2">🎁</span> 
                        <RewardTextWithShimmer rewardText={reward_text} />
                      </div>
                    )}
                  </div>
                ) : <span className="text-slate-400 text-lg">No bounty specified</span>}
              </div>

              {task.proof_url && ['review', 'completed', 'archived'].includes(status) && !isCreatorView && (
                <div className="py-4 px-4 mt-1 rounded-lg bg-slate-800/40 border border-slate-700/60 w-2/3 mx-auto">
                  <div className="flex items-center text-slate-400 mb-3 justify-center">
                    <Eye size={18} className="mr-2 text-indigo-400" />
                    <span className="font-semibold">SUBMITTED PROOF</span>
                  </div>
                  <div className="rounded-md bg-slate-900/50 p-3 border border-slate-700 text-center">
                    {task.proof_url && renderProofLink(task.proof_url!, 'proof-link')}
                  </div>
                </div>
              )}

              {isCreatorView && status === 'review' && task.proof_url && (
                <div className="py-4 px-4 mt-1 rounded-lg bg-slate-800/40 border border-slate-700/60 w-2/3 mx-auto">
                  <div className="flex items-center justify-center text-slate-400 mb-3">
                    <Eye size={18} className="mr-2 text-indigo-400" />
                    <span className="font-semibold">PROOF FOR REVIEW</span>
                  </div>
                  <div className="rounded-md bg-slate-900/50 p-3 border border-slate-700 text-center">
                    {task.proof_url && renderProofLink(task.proof_url!, 'inline-flex items-center text-teal-400 hover:text-teal-300 underline text-base font-semibold py-2 px-4 rounded-md transition-colors duration-150 ease-in-out hover:bg-teal-700/20', true)}
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-auto pt-6 flex flex-col gap-4">
              {isCreatorView && status === 'review' && (
                <div className="flex justify-center gap-4">
                  <button 
                    onClick={() => onApprove && onApprove(id)} 
                    className="btn-success flex-1 py-2 text-lg min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed" 
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Processing...' : 'Approve'}
                  </button>
                  <button 
                    onClick={() => onReject && onReject(id)} 
                    className="btn-danger flex-1 py-2 text-lg min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed" 
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Processing...' : 'Reject'}
                  </button>
                </div>
              )}

              <div className="flex flex-col items-center gap-4">
                <div className="w-full flex justify-center">
                  {renderActionButtonsInModal()}
                </div>
                <button onClick={handleClose} className="btn-secondary py-2 px-8 text-md">Close</button>
                {isCreatorView && !isArchived && (
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      handleClose(); // Close the TaskCard modal first
                      onDeleteTaskRequest(id); 
                    }}
                    className="p-2 rounded-full hover:bg-red-500/20 transition-colors duration-200"
                    disabled={actionLoading}
                    title="Delete Task"
                  >
                    <Trash2 size={20} className="text-slate-400 hover:text-red-400" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        getOverlayRoot() // Phase 2: Portal into overlay-root instead of document.body
      )}

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