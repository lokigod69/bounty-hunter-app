// src/components/TaskCard.tsx
// Transformed into a holographic bounty poster.
// Applied .bounty-card-galactic style, added .bounty-header, and .status-indicator-bar.
// Corrected JSX structure by removing duplicated code and extraneous characters.
// Removed unused imports and variables (CheckCircle, currentUserId, user from useAuth).
// Implemented dynamic header text ('BOUNTY'/'CONTRACT', 'CLAIM SUBMITTED', 'COLLECTED') and color based on task status and isCreator prop.
// Ensured consistent header font size between collapsed and expanded views.
// Updated status badge text: 'review' to 'Under Review', 'in_progress' to 'Open'.
// Flipped TaskCard header logic: 'BOUNTY' for creator's view (Issued Bounties tab), 'CONTRACT' for assignee's view (Active Contracts tab).
// Card component for displaying task information. Includes logic for status updates, proof submission, and an image lightbox for proof viewing.
// Corrected type error for onStatusUpdate call and cleaned up unused type imports.
// Added visual feedback for 'review' status and 'View proof' link.
// Added Approve/Reject buttons for creators and updated onStatusUpdate prop to accept full TaskStatus.
// Added collapsible functionality for a more compact display of completed tasks.
// Changed reward icon from Award to DollarSign.
// Added delete and edit buttons for task creators, and corresponding request props.
// Added display for task description.
// Fixed placeholder text bug and updated status badge for 'review' to 'Awaiting Approval' (yellow).
// Phase 5B: Updated terminology for bounty/contract status and proof submission.
// Phase 6 Part A.1: Added card state differentiation (CSS classes and icons) for active, claimed, and completed statuses.
// Phase 6 Part A: Updated task titles for better typography hierarchy (text-2xl, font-bold, text-glow-cyan-md).
// Phase 6 Part A: Made status badges (collapsed and expanded views) more prominent (text-sm, font-semibold, px-3).
// Fix 2 (Phase 6): Hide regular status badge for 'completed' tasks to prevent overlap with 'CREDITS TRANSFERRED' stamp.
// Phase 6 (Credit System UI): Added display for credit rewards (Coins icon and amount).
// Phase 7 (UI Improvement): Renamed 'Guild Verification' status to 'Verifying'.
// Phase 8 (Credit System UI): Updated credit reward display. Implemented auto-collapse. Removed unused defaultCollapsed prop. Added compressed summary layout for collapsed holographic cards.
// Phase 9A: Implemented final card redesign with new grid layout and assignee name display.
// Phase 10: Redesigned task cards with a "Route 66 Motel Sign" style.

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Task, TaskStatus } from '../types/database';
import { Calendar, Upload, ChevronDown, Trash2, FileEdit, User, CheckCircle, XCircle } from 'lucide-react';
import ProofModal from './ProofModal';
import ImageLightbox from './ImageLightbox';

interface TaskCardProps {
  task: Task;
  isCreator: boolean;
  onStatusUpdate: (taskId: string, status: TaskStatus) => void;
  onProofUpload: (file: File, taskId: string) => Promise<string | null>;
  onDeleteTaskRequest: (taskId: string) => void;
  onEditTaskRequest?: (task: Task) => void;
  uploadProgress: number;
  collapsible?: boolean;
}

const CreditBadge: React.FC<{ amount: string | number | null }> = ({ amount }) => {
  const displayAmount = amount ? (typeof amount === 'string' ? parseInt(amount, 10) : amount) : 0;
  if (isNaN(displayAmount)) {
    return (
      <div className="reward-badge"><span>🪙 Invalid Amount</span></div>
    );
  }
  return (
    <div className="credit-badge">
      <span className="coin-icon">🪙</span>
      <span>{displayAmount.toLocaleString()}</span>
    </div>
  );
};

const StatusBadge: React.FC<{ status: TaskStatus, deadline: string | null }> = ({ status, deadline }) => {
  const isOverdue = () => {
    if (!deadline) return false;
    return new Date(deadline) < new Date() && status === 'pending';
  };

  const getStatusText = () => {
    if (status === 'in_progress') return 'Open';
    if (status === 'review') return 'Verifying';
    if (status === 'completed') return 'Completed';
    if (status === 'rejected') return 'Rejected';
    if (isOverdue()) return 'Overdue';
    return 'Pending';
  };

  const getStatusColorClass = () => {
    if (status === 'completed') return 'bg-green-500/20 text-green-400';
    if (status === 'review') return 'bg-yellow-500/20 text-yellow-400';
    if (status === 'rejected' || isOverdue()) return 'bg-red-500/20 text-red-400';
    return 'bg-blue-500/20 text-blue-400';
  };

  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColorClass()} capitalize`}>
      {getStatusText()}
    </span>
  );
};

export default function TaskCard({
  task,
  isCreator,
  onStatusUpdate,
  onProofUpload,
  onDeleteTaskRequest,
  onEditTaskRequest,
  uploadProgress,
  collapsible: incomingCollapsiblePropValue = false,
}: TaskCardProps) {
  const { user } = useAuth();
  const [showProofModal, setShowProofModal] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  const collapsible = !isCreator ? true : incomingCollapsiblePropValue;
  const [isExpanded, setIsExpanded] = useState(!collapsible);

  useEffect(() => {
    if (collapsible) {
      setIsExpanded(false);
    } else {
      setIsExpanded(true);
    }
  }, [task.id, collapsible]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleProofSubmit = async (file: File) => {
    await onProofUpload(file, task.id);
    setShowProofModal(false);
  };

  return (
    <div className="task-card-container">
      <div className={`task-type-vertical ${
        task.reward_type === 'credit' ? 'credit-type' : 
        task.status === 'completed' ? 'completed-type' : ''
      }`}>
        <div className="vertical-text">
          {(task.reward_type === 'credit' ? 'CREDIT' : 'BOUNTY')
            .split('')
            .map((letter, index) => (
              <span key={index} className="letter">{letter}</span>
            ))}
        </div>
      </div>

      <div className="task-card-content">
        <div className="task-header-row">
          <div className="task-info">
            <h3 className="task-title">{task.title}</h3>
            <div className="task-meta">
              <span className="meta-item">
                <Calendar size={14} />
                {formatDate(task.deadline)}
              </span>
              <span className="meta-item">
                <User size={14} />
                {task.profiles?.display_name || 'Unknown User'}
              </span>
            </div>
          </div>
          <div className="task-actions">
            <StatusBadge status={task.status} deadline={task.deadline} />
            {task.reward_type === 'credit' && (
              <CreditBadge amount={task.reward_text} />
            )}
            <button
              aria-label={isExpanded ? 'Collapse task details' : 'Expand task details'}
              onClick={() => setIsExpanded(!isExpanded)}
              className="expand-toggle-btn"
            >
              <ChevronDown
                className={`expand-toggle ${isExpanded ? 'expanded' : ''}`}
              />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="task-details-content pt-4 mt-4 border-t border-cyan-300/20">
            <p className="task-description text-sm text-slate-300 mb-4">{task.description || 'No description provided.'}</p>
            <div className="task-footer-actions flex justify-between items-center">
              {isCreator ? (
                <div className="creator-actions flex items-center gap-2">
                  {task.status === 'review' && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); onStatusUpdate(task.id, 'completed'); }} className="btn-approve">
                        <CheckCircle size={16} /> Approve
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onStatusUpdate(task.id, 'rejected'); }} className="btn-reject">
                        <XCircle size={16} /> Reject
                      </button>
                    </>
                  )}
                  <button aria-label="Edit task" onClick={(e) => { e.stopPropagation(); onEditTaskRequest?.(task); }} className="btn-edit">
                      <FileEdit size={16} />
                  </button>
                  <button aria-label="Delete task" onClick={(e) => { e.stopPropagation(); onDeleteTaskRequest(task.id); }} className="btn-delete">
                      <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div className="assignee-actions">
                  {task.assigned_to === user?.id && task.status === 'in_progress' && (
                    <button onClick={(e) => { e.stopPropagation(); setShowProofModal(true); }} className="btn-submit-proof">
                      <Upload size={16} /> Submit Proof
                    </button>
                  )}
                </div>
              )}
              {task.status === 'review' && task.proof_url && (
                <a href="#" onClick={(e) => { e.stopPropagation(); setLightboxImageUrl(task.proof_url); setShowLightbox(true); }} className="link-view-proof">
                  View proof
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {showProofModal && (
        <ProofModal
          onClose={() => setShowProofModal(false)}
          onSubmit={handleProofSubmit}
          uploadProgress={uploadProgress}
        />
      )}

      {showLightbox && lightboxImageUrl && (
        <ImageLightbox
          src={lightboxImageUrl}
          alt="Proof of completion"
          onClose={() => setShowLightbox(false)}
        />
      )}
    </div>
  );
}