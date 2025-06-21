// src/components/TaskCard.tsx
// REFACTOR: Implemented modal-based expansion system to fix layout bugs.
// Expanded card now renders as a fixed-position overlay, separate from grid/flex flow.
// Click collapsed card to open modal, click backdrop or 'Close' button to dismiss.
// FONT FIX: Applied Futura font (via inline styles) to card titles, descriptions, and status text.
// CRITICAL FIX: Uses React Portal (createPortal) for ImageLightbox.
// UI REFINEMENT: Consolidated status display at the bottom of the expanded card modal.
// DATA FIX: Uses task.creator.display_name and task.assignee.display_name.

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

// Define Task-related types from the generated Database types
// Assuming TaskStatus is a string enum from the DB, but defining as string for safety
type TaskStatus = string;
import { Archive, CheckCircle, CircleDollarSign, Clock, Edit3, Eye, FileText, Trash2, XCircle, User } from 'lucide-react'; // Removed FileVideo
import { AssignedContract } from '../hooks/useAssignedContracts';
import { supabase } from '../lib/supabase';

import ProofModal from './ProofModal';
import './TaskCard.css'; // Import custom CSS for TaskCard
import { createPortal } from 'react-dom';
import { useSwipeable } from 'react-swipeable'; // Import useSwipeable

interface TaskCardProps {
  refetchTasks?: () => void;
  task: AssignedContract;
  isCreatorView: boolean;
  onStatusUpdate: (taskId: string, status: TaskStatus, currentCredits?: number, rewardAmount?: number) => void;
  onProofUpload: (file: File, taskId: string) => Promise<string | null>;
  onDeleteTaskRequest: (taskId: string) => void;
  onEditTaskRequest?: (task: AssignedContract) => void;
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
    const pastDeadlineColor = baseColor === 'text-purple-400' ? 'text-purple-400 font-semibold' : 'text-red-400';
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
  onEditTaskRequest,
  onApprove,
  onReject,
  uploadProgress,
  currentUserCredits,
  refetchTasks, // Added refetchTasks here
  isArchived,
}) => {
  const { user } = useAuth();
  const [showProofModal, setShowProofModal] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [showTimeTooltip, setShowTimeTooltip] = useState(false);

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

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsExpanded(false);
      setIsAnimatingOut(false); // Reset for next time
    }, 300); // Duration should match the CSS animation
  };

  const { id, title, description, assigned_to, created_by, deadline, reward_type, reward_text, status, proof_required, proof_url, creator, assignee } = task;

  const actorName = isCreatorView ? (assignee?.display_name || 'N/A') : (creator?.display_name || 'N/A');
  const fromName = creator?.display_name || 'Unknown';

  const handleArchive = async () => {
    if (task.status !== 'completed' || task.is_archived) return;
    setActionLoading(true); // Indicate loading state
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ is_archived: true })
        .eq('id', task.id);

      if (error) {
        console.error('Error archiving task:', error);
        // Optionally, show a toast notification for the error
      } else {
        console.log(`Task ${task.id} archived successfully`);
        if (refetchTasks) {
          refetchTasks();
        } else if (onStatusUpdate) {
          // Fallback if refetchTasks is not provided, though less ideal
          onStatusUpdate(task.id, task.status); 
        }
        // Optionally, show a success toast notification
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
    }
    setActionLoading(false);
  };

  // Function to render the archive button
const renderArchiveButton = () => {
  if (task.status === 'completed' && !task.is_archived) {
    return (
      <button
        onClick={(e) => { 
          e.stopPropagation(); 
          handleArchive(); 
        }}
        className="btn-secondary flex-1 py-2 text-sm ml-2" // Added ml-2 for spacing
        disabled={actionLoading}
        title="Archive Task"
      >
        <Archive size={16} className="mr-1" /> Archive
      </button>
    );
  }
  return null;
};

const renderActionButtonsInModal = () => {
    if (isArchived) return null;

    if (status === 'completed') {
      return null;
    }
    if (!isCreatorView && assigned_to === user?.id) {
      if ((status === 'pending' || status === 'in_progress')) {
        if (proof_required) {
          return <button onClick={(e) => { e.stopPropagation(); setShowProofModal(true); }} className="btn-primary w-full py-3 text-md" disabled={actionLoading}>{actionLoading ? 'Submitting...' : 'Submit Proof'}</button>;
        }
        return <button onClick={(e) => { e.stopPropagation(); handleAction('review'); }} className="btn-primary w-full py-3 text-md" disabled={actionLoading}>{actionLoading ? 'Completing...' : 'Complete Task'}</button>;
      }
    }
    if (isCreatorView && created_by === user?.id) {
      if (status === 'review') return null; // Approve/Reject are in their own section
      if (status === 'pending' || status === 'in_progress' || status === 'rejected') {
        return (
          <div className="flex gap-2 w-full">
            {onEditTaskRequest && <button onClick={(e) => { e.stopPropagation(); if (onEditTaskRequest) onEditTaskRequest(task); }} className="btn-secondary flex-1 py-2 text-sm"><Edit3 size={16} className="mr-1"/> Edit</button>}
            {onDeleteTaskRequest && <button onClick={(e) => { e.stopPropagation(); if (onDeleteTaskRequest) onDeleteTaskRequest(task.id); }} className="btn-danger flex-1 py-2 text-sm"><Trash2 size={16} className="mr-1"/> Delete</button>}
            {renderArchiveButton()}
          </div>
        );
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
    ? 'bg-red-900 border-2 border-red-500' // OPEN
    : status === 'in_progress'
    ? 'bg-blue-900 border-2 border-blue-500' // IN PROGRESS
    : status === 'review'
    ? 'bg-yellow-900 border-2 border-yellow-500' // REVIEW
    : status === 'completed'
    ? 'bg-green-900 border-2 border-green-500' // COMPLETED
    : status === 'rejected'
    ? 'bg-rose-900 border-2 border-rose-500' // REJECTED (using rose for a distinct red)
    : 'bg-slate-800 border border-slate-700'; // Fallback for ARCHIVED or other unknown

  const titleColorClass = status === 'pending'
    ? 'text-red-700 dark:text-red-600'
    : status === 'review'
    ? 'text-yellow-700 dark:text-yellow-600'
    : 'text-green-700 dark:text-green-600';

  return (
    <>
      {/* Collapsed Card Preview */}
      <div
        {...swipeHandlers} // Added swipe handlers here
        onClick={() => setIsExpanded(true)}
        className={`task-card relative border-2 rounded-lg cursor-pointer transition-all duration-300 ease-in-out
          ${isExpanded ? 'invisible opacity-0 scale-95' : 'visible opacity-100 scale-100'}
          ${collapsedCardBgColor}
          p-4 min-h-[80px] flex flex-col items-center justify-center text-center group hover:shadow-lg`}
      >
        <h3 
          className={`collapsed-title text-lg font-bold text-center w-full px-2 overflow-hidden ${titleColorClass}`}
          title={title} 
        >
          <span className="block truncate">
            {title}
          </span>
        </h3>
      </div>

      {/* Expanded Card Modal */}
      {isExpanded && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isAnimatingOut ? 'modal-fade-out' : 'modal-fade-in'}`}>
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal Content */}
          <div
            className={`relative z-[51] w-[95vw] sm:w-full max-w-2xl shadow-2xl rounded-lg p-6 max-h-[90vh] flex flex-col ${isAnimatingOut ? 'modal-slide-down' : 'modal-slide-up'} ${modalBgColor}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER: Title and Creator/Assignee */}
            <div className="mb-6 pb-4 border-b border-slate-600/50 flex-shrink-0 text-center">
              <h3 className="text-3xl sm:text-4xl font-bold text-slate-100 break-words max-w-full overflow-hidden font-mandalore" title={title}>
                {title}
              </h3>
              <p className="text-md text-slate-400 mt-2 flex items-center justify-center">
                <User size={18} className="mr-2" /> {isCreatorView ? actorName : fromName}
              </p>
            </div>

            {/* Body - This is now the main scrollable area */}
            <div className="flex-1 space-y-6 mb-6 overflow-y-auto pr-2">

              {/* REWARD SECTION */}
              <div className="py-8 px-4 rounded-lg bg-slate-700/30 border border-slate-600/50 text-center">
                {reward_text ? (
                  <div className="flex flex-col items-center justify-center min-h-[50px]">
                    {reward_type === 'credit' ? (
                      <div className="flex items-center gap-2 text-2xl text-amber-400 font-bold">
                        <span className="text-5xl animate-proper-spin mr-2">🪙</span>
                        <span className="text-3xl">{reward_text} Credits</span>
                      </div>
                    ) : task.image_url ? (
                      <div className="relative w-48 h-48 group mx-auto">
                        <img src={task.image_url} alt={reward_text || 'Reward'} className="w-full h-full object-cover rounded-lg border-2 border-slate-600" />
                        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-black/70 p-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-lg">
                          <span className="text-white text-center text-sm font-semibold break-words">{reward_text}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-3xl font-bold py-1 px-3 break-all max-w-full relative overflow-hidden flex items-center justify-center">
                        <span className="animate-pulsate-present mr-2">🎁</span> <span className="bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-transparent animate-shimmer">{reward_text}</span>
                      </div>
                    )}
                  </div>
                ) : <span className="text-slate-400 text-lg">No bounty specified</span>}
              </div>

              {/* INTEGRATED DESCRIPTION & LOGISTICS SECTION */}
              <div className="py-4 px-4 rounded-lg bg-slate-800/40 border border-slate-700/60 flex items-center justify-between w-full text-base">
                {/* Left: Deadline */}
                <div className="relative flex items-center flex-shrink-0 mr-4 group">
                  <Clock
                    size={24}
                    className="text-purple-400 flex-shrink-0 cursor-pointer"
                    onClick={() => setShowTimeTooltip(prev => !prev)}
                  />
                  <div className={`absolute bottom-full left-0 mb-2 w-max px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg shadow-lg transition-opacity duration-300 pointer-events-none z-10 opacity-0 group-hover:opacity-100 ${showTimeTooltip ? 'opacity-100' : ''}`}>
                    {deadline ? (
                      <CountdownTimer deadline={deadline} baseColor='text-purple-400' />
                    ) : (
                      <span className="text-slate-500">Not set</span>
                    )}
                    <div className="absolute left-4 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900"></div>
                  </div>
                </div>

                {/* Center: Description */}
                <div className="flex-grow text-center mx-4 min-w-0">
                  <p className="text-sm text-slate-300 whitespace-normal break-words task-card-description">
                    <FileText size={20} className="mr-2 text-sky-400 inline-block relative -top-px" /> {description || 'No further details provided for this mission.'}
                  </p>
                </div>

                {/* Right: Status */}
                <div className="relative flex items-center flex-shrink-0 ml-4 group">
                  {status === 'pending'
                    ? <CircleDollarSign size={24} className="text-red-400 flex-shrink-0" />
                    : status === 'review'
                    ? <Eye size={24} className="text-yellow-400 flex-shrink-0" />
                    : status === 'completed'
                    ? <CheckCircle size={24} className="text-green-400 flex-shrink-0" />
                    : <XCircle size={24} className="text-slate-400 flex-shrink-0" />}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg shadow-lg transition-opacity duration-300 pointer-events-none z-10 opacity-0 group-hover:opacity-100">
                    {status ? (status === 'pending' ? (deadline && new Date(deadline) < new Date() ? 'OVERDUE' : 'OPEN') :
                     status.replace('_', ' ').toUpperCase()) : 'UNKNOWN'}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900"></div>
                  </div>
                </div>
              </div>

              {/* --- NEW PROOF DISPLAY AND SUBMISSION SECTIONS --- */}

              {/* Submitted Proof Display Area - For Assignee */}
              {task.proof_url && ['review', 'completed', 'archived'].includes(task.status) && !isCreatorView && (
                <div className="py-4 px-4 mt-1 rounded-lg bg-slate-800/40 border border-slate-700/60">
                  <div className="flex items-center text-slate-400 mb-3">
                    <Eye size={18} className="mr-2 text-indigo-400" />
                    <span className="font-semibold">SUBMITTED PROOF</span>
                  </div>
                  <div className="rounded-md bg-slate-900/50 p-3 border border-slate-700 text-center">
                    {proof_url ? (
                      <a 
                        href={proof_url as string} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center text-teal-400 hover:text-teal-300 underline text-base font-semibold py-2 px-4 rounded-md transition-colors duration-150 ease-in-out hover:bg-teal-700/20"
                      >
                        <FileText size={20} className="mr-2" />
                        View Submitted Proof
                      </a>
                    ) : (
                      <p className="text-slate-500 text-sm">Proof URL is unexpectedly missing.</p> 
                    )}
                  </div>
                </div>
              )}

              {/* Review Section for Creator (includes proof display) */}
              {isCreatorView && status === 'review' && (
                <div className="py-4 px-4 mt-1 rounded-lg bg-slate-800/40 border border-slate-700/60">
                  <div className="flex items-center justify-center bg-slate-800/60 rounded-t-md p-2">
                    <Eye size={18} className="mr-2 text-indigo-400" />
                    <span className="font-semibold">
                      {proof_url ? (
                        <a href={proof_url} target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:text-teal-300 underline">
                          Proof
                        </a>
                      ) : (
                        'Proof'
                      )}
                      {' '}Submitted
                    </span>
                  </div>
                  {/* Action buttons for creator to approve/reject proof */}
                  <div className="flex items-center justify-center gap-x-2 mt-3">
                    {onApprove && <button onClick={() => onApprove(id)} className="btn-success w-full">Approve</button>}
                    {onReject && <button onClick={() => onReject(id)} className="btn-danger w-full">Reject</button>}
                  </div>
                </div>
              )}


            </div>

            {/* Footer Actions */}
            <div className="mt-auto pt-4 border-t border-slate-700 space-y-3">
              {renderActionButtonsInModal()}
              <div {...swipeHandlers} className={`bg-gray-800 rounded-lg shadow-lg p-4 transition-all duration-300 ${isExpanded ? 'mb-4' : ''} border border-gray-700 hover:border-purple-500`}>
                <button
                  onClick={handleClose}
                  className="w-full text-sm text-slate-400 hover:text-slate-200 py-2 px-4 rounded-md border border-slate-600 hover:border-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div> 
        </div>
      )}

      {/* Proof Submission Modal (Portal) */}
      {showProofModal &&
        createPortal(
          <ProofModal
            onClose={() => setShowProofModal(false)}
            onSubmit={async (file: File) => {
              setActionLoading(true);
              try {
                await onProofUpload(file, id); // Call TaskCard's onProofUpload
                if (refetchTasks) refetchTasks();
                setShowProofModal(false); // Close modal on success
              } catch (error) {
                console.error('Proof submission failed via modal:', error);
                // Error handling within ProofModal might be better, or pass an onError prop
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
}

export default TaskCard;