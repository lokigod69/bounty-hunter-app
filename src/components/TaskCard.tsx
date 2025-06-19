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
import { Task, TaskStatus } from '../types/database';
import { FileEdit, Trash2, CheckCircle, ShieldCheck, Clock, Coins, FileVideo } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ProofModal from './ProofModal';
import ImageLightbox from './ImageLightbox';
import { createPortal } from 'react-dom';

interface ProfileLite {
  display_name: string | null;
  avatar_url: string | null;
}

interface TaskWithDetails extends Task {
  creator: ProfileLite | null;
  assignee: ProfileLite | null;
}

interface TaskCardProps {
  task: TaskWithDetails;
  isCreatorView: boolean;
  onStatusUpdate: (taskId: string, status: TaskStatus, currentCredits?: number, rewardAmount?: number) => void;
  onProofUpload: (file: File, taskId: string) => Promise<string | null>;
  onDeleteTaskRequest: (taskId: string) => void;
  onEditTaskRequest?: (task: TaskWithDetails) => void;
  onApprove?: (taskId: string) => void;
  onReject?: (taskId: string) => void;
  uploadProgress: number;
  currentUserCredits?: number;
}

const CountdownTimer: React.FC<{ deadline: string | null }> = ({ deadline }) => {
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
    return <span className="text-xs text-red-400">Past Deadline</span>;
  }
  return (
    <span className="text-xs text-slate-400 flex items-center">
      <Clock size={14} className="mr-1" />
      {timeLeft.days !== undefined && timeLeft.days > 0 && `${timeLeft.days}d `}
      {timeLeft.hours !== undefined && timeLeft.hours > 0 && `${timeLeft.hours}h `}
      {`${timeLeft.minutes}m left`}
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
}) => {
  const { user } = useAuth();
  const [showProofModal, setShowProofModal] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const getProofUrl = (path: string | null): string => {
    if (!path) return '/placeholder-image.png';
    try {
      return supabase.storage.from('bounty-proofs').getPublicUrl(path).data.publicUrl;
    } catch (error) {
      console.error('Error getting public proof URL:', error);
      return '/placeholder-image.png';
    }
  };

  const { id, title, description, assigned_to, created_by, deadline, reward_type, reward_text, status, proof_required, proof_url, creator, assignee } = task;

  const actorName = isCreatorView ? (assignee?.display_name || 'N/A') : (creator?.display_name || 'N/A');
  const fromName = creator?.display_name || 'Unknown';

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

  const renderActionButtonsInModal = () => {
    if (status === 'completed') {
      return <div className="flex items-center text-green-500"><CheckCircle size={20} className="mr-2" />Completed</div>;
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
            {onEditTaskRequest && <button onClick={(e) => { e.stopPropagation(); if (onEditTaskRequest) onEditTaskRequest(task); }} className="btn-secondary flex-1 py-2 text-sm"><FileEdit size={16} className="mr-1"/> Edit</button>}
            <button onClick={(e) => { e.stopPropagation(); onDeleteTaskRequest(id); }} className="btn-danger flex-1 py-2 text-sm"><Trash2 size={16} className="mr-1"/> Delete</button>
          </div>
        );
      }
    }
    return null;
  };

  const collapsedCardBgColor = status === 'pending'
    ? 'bg-red-500/10 border-red-500/50 hover:border-red-400'
    : status === 'review'
    ? 'bg-yellow-500/10 border-yellow-500/50 hover:border-yellow-400'
    : 'bg-green-500/10 border-green-500/50 hover:border-green-400';

  const modalBgColor = status === 'pending'
    ? 'bg-red-900/90 border-2 border-red-500'
    : status === 'review'
    ? 'bg-yellow-900/90 border-2 border-yellow-500'
    : status === 'completed'
    ? 'bg-green-900/90 border-2 border-green-500'
    : 'bg-slate-800 border border-slate-700'; // Fallback

  const titleColorClass = status === 'pending'
    ? 'text-red-700 dark:text-red-600'
    : status === 'review'
    ? 'text-yellow-700 dark:text-yellow-600'
    : 'text-green-700 dark:text-green-600';

  return (
    <>
      {/* Collapsed Card Preview */}
      <div
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsExpanded(false)}
          />

          {/* Modal Content */}
          <div
            className={`relative z-[51] w-full max-w-2xl shadow-2xl rounded-lg p-6 max-h-[90vh] overflow-y-auto flex flex-col animate-slideUp ${modalBgColor}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-4 pb-4 border-b border-slate-700/50">
              <h3 className="text-xl font-bold text-slate-100 break-words max-w-full overflow-hidden" title={title}>
                {title}
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                {isCreatorView ? `To: ${actorName}` : `From: ${fromName}`}
              </p>
            </div>

            {/* Body */}
            <div className="space-y-4 mb-6 flex-grow overflow-y-auto">
              <div className="max-h-[300px] overflow-y-auto pr-2">
                <p className="text-sm text-slate-300 whitespace-pre-wrap break-words" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {description || 'No description provided.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex flex-col space-y-1">
                  <span className="text-slate-500 block">Reward:</span>
                  {reward_text ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      {reward_type === 'credit' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-700 text-slate-200 text-xs">
                          <Coins size={14} className="mr-1 text-amber-400" /> 
                          <span>{reward_text} Credits</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-slate-700 text-slate-200 text-xs break-all max-w-full">
                          {reward_text}
                        </span>
                      )}
                    </div>
                  ) : <span className="text-slate-400">N/A</span>}
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Proof:</span>
                  {proof_required ? (
                    <span className="px-3 py-1 rounded-full bg-blue-600/30 text-blue-300 text-xs flex items-center w-fit">
                      <ShieldCheck size={14} className="mr-1.5" />
                      Required
                    </span>
                  ) : <span className="text-slate-400">Not Required</span>}
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Deadline:</span>
                  {deadline ? <CountdownTimer deadline={deadline} /> : <span className="text-slate-400">No Deadline</span>}
                </div>
                 <div>
                  <span className="text-slate-500 block mb-1">Status:</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full 
                      ${status === 'pending' ? 'bg-red-500' : status === 'review' ? 'bg-yellow-500 animate-pulse' : status === 'completed' ? 'bg-green-500' : 'bg-slate-500'}`} 
                    />
                    <span className="text-sm font-medium text-slate-300 task-status-text capitalize" style={{ fontFamily: "'MandaloreRough', 'Mandalore', sans-serif" }}>
                      {status ? (status === 'pending' ? (deadline && new Date(deadline) < new Date() ? 'Overdue' : 'OPEN') :
                       status.replace('_', ' ')) : 'Unknown Status'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Review Section for Creator */}
              {isCreatorView && status === 'review' && (
                <div className="mt-4 p-4 rounded-lg bg-slate-700/50 border border-slate-600">
                  <p className="text-sm text-slate-300 mb-2 font-semibold">Proof submitted by <span className="text-teal-400">{actorName}</span>:</p>
                  {(() => {
                    const proofDisplayUrl = getProofUrl(proof_url);
                    if (task.proof_type === 'video') {
                      return (
                        <div className="w-full h-32 flex flex-col items-center justify-center text-sm text-slate-400 bg-slate-900/50 rounded-md mb-3">
                          <FileVideo size={32} className="mb-2 text-teal-400" />
                          <span>Video proof submitted. Consider adding a link if available.</span>
                        </div>
                      );
                    } else if (proofDisplayUrl && proofDisplayUrl !== '/placeholder-image.png') {
                      return (
                        <img
                          src={proofDisplayUrl}
                          alt="Proof thumbnail"
                          className="w-full max-h-60 object-contain rounded-md mb-3 cursor-pointer hover:opacity-80 transition-opacity bg-slate-900/50 p-1"
                          onClick={(e) => { e.stopPropagation(); setLightboxImageUrl(proofDisplayUrl); setShowLightbox(true); }}
                          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-image.png'; }}
                        />
                      );
                    } else {
                      return <div className="w-full h-20 flex items-center justify-center text-sm text-slate-500 bg-slate-900/50 rounded-md mb-3">No proof image provided or URL is invalid.</div>;
                    }
                  })()}
                  <div className="flex gap-3 w-full mt-3">
                    {onApprove && <button onClick={(e) => { e.stopPropagation(); onApprove(id); }} className="btn-success flex-1 py-2 text-sm" disabled={actionLoading}>{actionLoading ? 'Approving...' : 'Approve'}</button>}
                    {onReject && <button onClick={(e) => { e.stopPropagation(); onReject(id); }} className="btn-danger flex-1 py-2 text-sm" disabled={actionLoading}>{actionLoading ? 'Rejecting...' : 'Reject'}</button>}
                  </div>
                </div>
              )}

              {/* View Proof link for Assignee (if proof submitted) */}
              {!isCreatorView && proof_url && (status === 'review' || status === 'completed' || status === 'rejected') && (
                <div className="mt-4 p-4 rounded-lg bg-slate-700/50 border border-slate-600">
                  <p className="text-sm text-slate-300 mb-2 font-semibold">Your Submitted Proof:</p>
                   {(() => {
                    const proofDisplayUrl = getProofUrl(proof_url);
                    if (task.proof_type === 'video') {
                      return (
                        <div className="w-full h-32 flex flex-col items-center justify-center text-sm text-slate-400 bg-slate-900/50 rounded-md">
                          <FileVideo size={32} className="mb-2 text-teal-400" />
                          <span>Video proof submitted.</span>
                        </div>
                      );
                    } else if (proofDisplayUrl && proofDisplayUrl !== '/placeholder-image.png') {
                      return (
                        <img
                          src={proofDisplayUrl}
                          alt="Your proof thumbnail"
                          className="w-full max-h-60 object-contain rounded-md cursor-pointer hover:opacity-80 transition-opacity bg-slate-900/50 p-1"
                          onClick={(e) => { e.stopPropagation(); setLightboxImageUrl(proofDisplayUrl); setShowLightbox(true); }}
                           onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-image.png'; }}
                        />
                      );
                    } else {
                      return <div className="w-full h-20 flex items-center justify-center text-sm text-slate-500 bg-slate-900/50 rounded-md">No proof image available or URL is invalid.</div>;
                    }
                  })()}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="mt-auto pt-4 border-t border-slate-700 space-y-3">
              {renderActionButtonsInModal()}
              <button
                onClick={() => setIsExpanded(false)}
                className="w-full text-sm text-slate-400 hover:text-slate-200 py-2 px-4 rounded-md border border-slate-600 hover:border-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                Close
              </button>
            </div>
          </div> 
        </div>
      )}

      {/* Proof Submission Modal (Portal) */}
      {showProofModal && (
        <ProofModal
          onClose={() => setShowProofModal(false)}
          onSubmit={async (file) => {
            setActionLoading(true);
            await onProofUpload(file, id);
            setActionLoading(false);
            setShowProofModal(false);
          }}
          uploadProgress={uploadProgress}
        />
      )}

      {/* Image Lightbox (Portal) */}
      {showLightbox && lightboxImageUrl &&
        createPortal(
          <ImageLightbox src={lightboxImageUrl as string} alt="Proof of completion" onClose={() => setShowLightbox(false)} />,
          document.body
        )}
    </>
  );
}

export default TaskCard;