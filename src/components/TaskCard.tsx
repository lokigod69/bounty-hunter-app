// src/components/TaskCard.tsx
// REFACTOR: Implemented modal-based expansion system to fix layout bugs.
// Expanded card now renders as a fixed-position overlay, separate from grid/flex flow.
// Click collapsed card to open modal, click backdrop or 'Close' button to dismiss.
// FONT FIX: Applied Futura font (via inline styles) to card titles, descriptions, and status text.
// CRITICAL FIX: Uses React Portal (createPortal) for tooltips and modals.
// UI REFINEMENT: Consolidated status display at the bottom of the expanded card modal.
// DATA FIX: Uses task.creator.display_name and task.assignee.display_name.

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

type TaskStatus = string;
import { Archive, CheckCircle, CircleDollarSign, Clock, Eye, FileText, Link, Trash2, XCircle, User } from 'lucide-react';
import { AssignedContract } from '../hooks/useAssignedContracts';
import { supabase } from '../lib/supabase';

import ProofModal from './ProofModal';
import './TaskCard.css'; // Import custom CSS for TaskCard
import { createPortal } from 'react-dom';
import { useSwipeable } from 'react-swipeable';

interface TaskCardProps {
  refetchTasks?: () => void;
  task: AssignedContract;
  isCreatorView: boolean;
  onStatusUpdate: (taskId: string, status: TaskStatus, currentCredits?: number, rewardAmount?: number) => void;
  onProofUpload: (file: File, taskId: string) => Promise<string | null>;
  onDeleteTaskRequest: (taskId: string) => void;
  onApprove?: (taskId: string) => void;
  onReject?: (taskId: string) => void;
  uploadProgress: number;
  currentUserCredits?: number;
  isArchived?: boolean;
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
  onStatusUpdate,
  onProofUpload,
  onDeleteTaskRequest,
  onApprove,
  onReject,
  uploadProgress,
  currentUserCredits,
  refetchTasks,
  isArchived,
}) => {
  const { user } = useAuth();
  const [showProofModal, setShowProofModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const [tooltipContent, setTooltipContent] = useState<React.ReactNode>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isExpanded]);

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
    }, 300);
  };

  const { id, title, description, assigned_to, deadline, reward_type, reward_text, status, proof_required, creator, assignee } = task;

  const actorName = isCreatorView ? (assignee?.display_name || 'N/A') : (creator?.display_name || 'N/A');
  const fromName = creator?.display_name || 'Unknown';

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
    setActionLoading(true);
    try {
      const rewardAmount = reward_type === 'credit' && reward_text ? parseInt(reward_text, 10) : undefined;
      await onStatusUpdate(id, newStatus, currentUserCredits, rewardAmount);
    } catch (e) {
      console.error("Action failed", e);
    } finally {
      setActionLoading(false);
    }
  };

  const renderProofLink = (url: string, className: string, withIcon: boolean = false) => {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
        {withIcon && <Link size={20} className="mr-2" />}
        View Submitted Proof
      </a>
    );
  };

  const renderActionButtonsInModal = () => {
    if (isArchived) return null;
    if (status === 'completed') return null;

    if (!isCreatorView && assigned_to === user?.id) {
      if ((status === 'pending' || status === 'in_progress')) {
        if (proof_required) {
          return <button onClick={(e) => { e.stopPropagation(); setShowProofModal(true); }} className="btn-primary py-2 px-8 text-md" disabled={actionLoading}>{actionLoading ? 'Submitting...' : 'Submit Proof'}</button>;
        }
        return <button onClick={(e) => { e.stopPropagation(); handleAction('review'); }} className="btn-primary py-2 px-8 text-md" disabled={actionLoading}>{actionLoading ? 'Completing...' : 'Complete Task'}</button>;
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
        document.body
      )}

      <div
        {...swipeHandlers}
        className={`relative p-4 rounded-lg border transition-all duration-300 ease-in-out cursor-pointer overflow-visible ${collapsedCardBgColor}`}
        onClick={() => !isAnimatingOut && setIsExpanded(true)}
      >
        <div className="flex justify-between items-start">
          <h3 className={`text-lg font-bold mb-2 pr-4 ${titleColorClass} font-futura min-w-0`}>
            <span className="block truncate" title={title}>{title}</span>
          </h3>
          <div className="flex-shrink-0 text-right">
            <CountdownTimer deadline={deadline} />
          </div>
        </div>
        <div className="flex justify-between items-center mt-2">
          <p className="text-sm text-slate-400 flex items-center">
            <User size={16} className="mr-2" /> {actorName}
          </p>
          <div className="flex items-center">
            {status === 'review' && <Eye size={16} className="text-yellow-400" />}
            {status === 'completed' && <CheckCircle size={16} className="text-green-400" />}
            {isArchived && <Archive size={16} className="text-slate-500" />}
          </div>
        </div>
      </div>

      {isExpanded && createPortal(
        <div className={`fixed inset-0 z-modal-backdrop flex items-center justify-center p-4 ${isAnimatingOut ? 'modal-fade-out' : 'modal-fade-in'}`}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
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

            <div className="flex-1 space-y-6 mb-6 overflow-y-auto overflow-x-hidden pr-2">
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
                      <div className="flex items-center gap-2 text-xl text-amber-400 font-bold">
                        <span className="text-4xl animate-proper-spin mr-2">🪙</span>
                        <span className="text-2xl">{reward_text} Credits</span>
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
                        <span className="animate-pulsate-present mr-2">🎁</span> <span className="bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-transparent animate-shimmer">{reward_text}</span>
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
                    {task.proof_url && renderProofLink(task.proof_url, 'proof-link')}
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
                    {task.proof_url && renderProofLink(task.proof_url, 'inline-flex items-center text-teal-400 hover:text-teal-300 underline text-base font-semibold py-2 px-4 rounded-md transition-colors duration-150 ease-in-out hover:bg-teal-700/20', true)}
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-auto pt-6 flex flex-col gap-4">
              {isCreatorView && status === 'review' && (
                <div className="flex justify-center gap-4">
                  <button onClick={() => onApprove && onApprove(id)} className="btn-success flex-1 py-2 text-lg">Approve</button>
                  <button onClick={() => onReject && onReject(id)} className="btn-danger flex-1 py-2 text-lg">Reject</button>
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
        document.body
      )}

      {showProofModal && createPortal(
        <ProofModal
          taskId={id}
          onClose={() => setShowProofModal(false)}
          onSubmit={async (file: File) => {
            setActionLoading(true);
            try {
              const uploadedUrl = await onProofUpload(file, id);
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
        document.body
      )}
    </>
  );
};

export default TaskCard;