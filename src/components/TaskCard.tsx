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

import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Task, TaskStatus } from '../types/database'; 
import { Calendar, Clock, DollarSign, Upload, ChevronDown, ChevronUp, Trash2, FileEdit } from 'lucide-react';
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
  defaultCollapsed?: boolean;
}

export default function TaskCard({
  task,
  isCreator,
  onStatusUpdate,
  onProofUpload,
  onDeleteTaskRequest,
  onEditTaskRequest,
  uploadProgress,
  collapsible: incomingCollapsiblePropValue = false, // Default for prop if not provided
  defaultCollapsed = true,
}: TaskCardProps) {
  // Determine final collapsible state:
  // - For "My Tasks" (isCreator === false), always allow collapsing.
  // - For "Created Tasks" (isCreator === true), respect the incoming prop.
  const collapsible = !isCreator ? true : incomingCollapsiblePropValue;

  // console.log(`TaskCard Render: Title='${task.title}', isCreator=${isCreator}, final collapsible=${collapsible}, incoming=${incomingCollapsiblePropValue}, status='${task.status}'`);

  useAuth(); // Call useAuth if it has side effects or provides context, but user object itself is not directly used here now.
  const [showProofModal, setShowProofModal] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(!(collapsible && defaultCollapsed));

  const toggleExpand = () => {
    if (collapsible) {
      setIsExpanded(!isExpanded);
    }
  };

  // Format date for better display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No deadline';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Check if task is overdue
  const isOverdue = () => {
    if (!task.deadline) return false;
    const deadline = new Date(task.deadline);
    return deadline < new Date() && task.status === 'pending';
  };

  // Handle proof upload
  const handleProofSubmit = async (file: File) => {
    await onProofUpload(file, task.id);
    setShowProofModal(false);
  };

  // Get status color
  const getStatusIndicatorClass = () => {
    if (task.status === 'in_progress') return 'Open';
    if (task.status === 'review') return 'Under Review';
    if (task.status === 'completed') return 'Completed';
    if (task.status === 'rejected') return 'Rejected';
    if (isOverdue()) return 'Overdue';
    return 'Pending'; // Default for 'pending' or other statuses
  };

  const getStatusColor = () => {
    if (task.status === 'completed') return 'bg-green-500/20 text-green-400';
    if (task.status === 'review') return 'bg-yellow-500/20 text-yellow-400'; // Color for 'review' status
    if (isOverdue()) return 'bg-red-500/20 text-red-400';
    return 'bg-blue-500/20 text-blue-400'; // Default for pending, in_progress etc.
  };

  const getBountyHeaderText = (status: TaskStatus, creatorView: boolean): string => {
    switch (status) {
      case 'review':
        return 'CLAIM SUBMITTED';
      case 'completed':
        return 'COLLECTED';
      default:
        return creatorView ? 'BOUNTY' : 'CONTRACT';
    }
  };

  const getBountyHeaderClass = (status: TaskStatus): string => {
    switch (status) {
      case 'review':
        return 'review'; // Will correspond to .bounty-header.review in CSS
      case 'completed':
        return 'completed'; // Will correspond to .bounty-header.completed in CSS
      default:
        return ''; // Default .bounty-header style (orange)
    }
  };

  if (collapsible && !isExpanded) {
    return (
      <div 
        className="bounty-card-galactic p-3 cursor-pointer" // Use bounty-card-galactic, adjust padding
        onClick={toggleExpand}
      >
        {/* Ensure collapsed header inherits font size from .bounty-header by removing inline fontSize. Adjust padding if needed. */}
        <div className={`bounty-header ${getBountyHeaderClass(task.status)}`} style={{ position: 'relative', background: 'none', borderBottom: 'none', padding: '0.25rem 0.5rem' }}>
          {getBountyHeaderText(task.status, isCreator)}
        </div> {/* Simplified header for collapsed view */}
        <div className="flex justify-between items-center mt-1"> {/* Added mt-1 for spacing from header */}
          <h3 className="text-md font-medium text-white truncate pr-2">{task.title}</h3>
          <div className="flex items-center">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor()} capitalize`}>
              {task.status === 'review' ? 'Under Review' : task.status === 'in_progress' ? 'Open' : task.status}
            </span>
            <ChevronDown size={20} className="ml-2 text-white/70" />
          </div>
        </div>
        <div className={`status-indicator-bar ${getStatusIndicatorClass()}`}></div>
      </div>
    );
  }

  return (
    <>
      <div className="bounty-card-galactic"> {/* Main card style update */}
        <div className={`bounty-header ${getBountyHeaderClass(task.status)}`}>
          {getBountyHeaderText(task.status, isCreator)}
        </div>
        <div className="p-5 pt-12"> {/* Adjusted padding for bounty-header */}
          {/* Task Header */}
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-medium text-white">{task.title}</h3>
            <div className="flex items-center">
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor()} capitalize`}
              >
                {task.status === 'completed' ? 'Completed' : task.status === 'review' ? 'Under Review' : task.status === 'in_progress' ? 'Open' : isOverdue() ? 'Overdue' : task.status}
              </span>
              {collapsible && (
                <button 
                  onClick={toggleExpand} 
                  className="ml-2 p-1 rounded-full hover:bg-white/10 focus:outline-none" 
                  aria-label="Collapse task details"
                >
                  <ChevronUp size={20} className="text-white/70" />
                </button>
              )}
            </div>
          </div>

          {/* Task Description */}
          {task.description && (
            <p className="text-sm text-white/80 my-3 whitespace-pre-wrap">{task.description}</p>
          )}

          {/* Proof Status and Link (Banner for review status) */}
          {/* The main status badge now also indicates 'Awaiting Approval', so this banner might be redundant or complementary */}
          {task.status === 'review' && (
            <div className="text-center mb-3">
              <div className="inline-block bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-sm">
                Proof submitted
              </div>
            </div>
          )}
          {task.proof_url && (
            <a href={task.proof_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline mt-2 mb-3 block text-center">
              View proof
            </a>
          )}

          {/* Task Details */}
          <div className="space-y-3 mb-5">
            {/* Deadline */}
            <div className="flex items-center text-white/70">
              <Calendar size={16} className="mr-2" />
              <span className="text-sm">
                {task.deadline ? formatDate(task.deadline) : 'No deadline'}
              </span>
            </div>

            {/* Created/Completed Time */}
            <div className="flex items-center text-white/70">
              <Clock size={16} className="mr-2" />
              <span className="text-sm">
                {task.status === 'completed' && task.completed_at
                  ? `Completed: ${formatDate(task.completed_at)}`
                  : `Created: ${formatDate(task.created_at)}`}
              </span>
            </div>

            {/* Reward */}
            {(task.reward_type || task.reward_text) && (
              <div className="flex items-center text-teal-400">
                <DollarSign size={16} className="mr-2" />
                <span className="text-sm">
                  {task.reward_type && (
                    <span className="capitalize mr-1">{task.reward_type}:</span>
                  )}
                  {task.reward_text || ''}
                </span>
              </div>
            )}
          </div>



        {/* Proof Preview */}
        {task.proof_url && (
          <div className="mb-4">
            <p className="text-sm text-white/70 mb-2">Proof of completion:</p>
            <div className="rounded-lg overflow-hidden bg-black/30 h-40 flex items-center justify-center">
              {task.proof_type === 'image' ? (
                <img
                  src={task.proof_url}
                  alt="Proof"
                  className="max-h-full max-w-full object-contain cursor-pointer"
                  onClick={() => {
                    setLightboxImageUrl(task.proof_url);
                    setShowLightbox(true);
                  }}
                />
              ) : (
                <video
                  src={task.proof_url}
                  controls
                  className="max-h-full max-w-full"
                />
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0 sm:space-x-3">
          {/* Left side buttons (status updates) */}
          <div className="flex-grow flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
            {isCreator && task.status === 'review' && (
              <>
                <button
                  onClick={() => onStatusUpdate(task.id, 'completed')}
                  className="btn-primary w-full sm:w-auto"
                >
                  Approve Proof
                </button>
                <button
                  onClick={() => onStatusUpdate(task.id, 'pending')}
                  className="btn-secondary w-full sm:w-auto" // Consider a more distinct 'reject' style
                >
                  Reject Proof
                </button>
              </>
            )}
            {!isCreator && task.status === 'pending' && (
              <button
                onClick={() => onStatusUpdate(task.id, 'in_progress')}
                className="btn-primary w-full sm:w-auto"
              >
                Start Task
              </button>
            )}
            {!isCreator && task.status === 'in_progress' && (
              <button
                onClick={() => setShowProofModal(true)}
                className="btn-primary w-full sm:w-auto flex items-center justify-center"
              >
                <Upload size={16} className="mr-2" /> Submit Proof
              </button>
            )}
          </div>

          {/* Right side buttons (creator actions) */}
          {isCreator && onEditTaskRequest && (
            <div className="flex space-x-2 self-end sm:self-center">
              <button 
                onClick={() => onEditTaskRequest(task)}
                className="modal-icon-button hover:text-accent-cyan"
                aria-label="Edit task"
              >
                <FileEdit size={18} />
              </button>
              <button 
                onClick={() => onDeleteTaskRequest(task.id)}
                className="modal-icon-button hover:text-warning-orange"
                aria-label="Delete task"
              >
                <Trash2 size={18} />
              </button>
            </div>
          )}
        </div>
      </div> {/* End of p-5 pt-12 content wrapper */}
      <div className={`status-indicator-bar ${getStatusIndicatorClass()}`}></div>
    </div> {/* End of bounty-card-galactic */}

    {/* Proof Upload Modal */}
    {showProofModal && (
      <ProofModal
        onClose={() => setShowProofModal(false)}
        onSubmit={handleProofSubmit}
        uploadProgress={uploadProgress}
      />
    )}

      {/* Image Lightbox for Proofs */}
      {showLightbox && lightboxImageUrl && (
        <ImageLightbox
          src={lightboxImageUrl}
          alt="Proof Preview"
          onClose={() => {
            setShowLightbox(false);
            setLightboxImageUrl(null);
          }}
        />
      )}
    </>
  );
}