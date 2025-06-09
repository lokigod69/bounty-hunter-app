// src/components/TaskCard.tsx
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
import { Calendar, Clock, CheckCircle, DollarSign, Upload, ChevronDown, ChevronUp, Trash2, FileEdit } from 'lucide-react';
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

  const { user } = useAuth();
  const currentUserId = user?.id;
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
  const getStatusColor = () => {
    if (task.status === 'completed') return 'bg-green-500/20 text-green-400';
    if (task.status === 'review') return 'bg-yellow-500/20 text-yellow-400'; // Color for 'review' status
    if (isOverdue()) return 'bg-red-500/20 text-red-400';
    return 'bg-blue-500/20 text-blue-400'; // Default for pending, in_progress etc.
  };

  if (collapsible && !isExpanded) {
    return (
      <div 
        className="glass-card overflow-hidden transition-all duration-300 hover:shadow-md p-3 cursor-pointer"
        onClick={toggleExpand}
      >
        <div className="flex justify-between items-center">
          <h3 className="text-md font-medium text-white truncate pr-2">{task.title}</h3>
          <div className="flex items-center">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor()} capitalize`}>
              {task.status === 'review' ? 'Awaiting Approval' : task.status}
            </span>
            <ChevronDown size={20} className="ml-2 text-white/70" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="glass-card overflow-hidden transition-all duration-300 hover:shadow-xl">
        <div className="p-5">
          {/* Task Header */}
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-medium text-white">{task.title}</h3>
            <div className="flex items-center">
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor()} capitalize`}
              >
                {task.status === 'completed' ? 'Completed' : task.status === 'review' ? 'Awaiting Approval' : isOverdue() ? 'Overdue' : task.status}
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

          {/* Actions */}
          <div className="flex justify-end items-center pt-3 border-t border-white/10">
            {/* Submit Proof Button (assignee action) */}
            {currentUserId === task.assigned_to && task.status === 'pending' && !task.proof_url && (
              <button
                onClick={() => setShowProofModal(true)}
                className="btn btn-primary btn-sm flex items-center"
              >
                <Upload size={16} className="mr-2" />
                Submit Proof
              </button>
            )}

            {/* Mark Complete Button (creator action, if not assigned to self and pending) */}
            {isCreator && task.status === 'pending' && currentUserId !== task.assigned_to && (
              <button
                onClick={() => onStatusUpdate(task.id, 'completed')}
                className="btn btn-secondary btn-sm flex items-center ml-2"
              >
                <CheckCircle size={16} className="mr-2" />
                Mark Complete
              </button>
            )}

            {/* Completed Status Indicator */}
            {task.status === 'completed' && (
              <span className="text-green-400 flex items-center ml-2">
                <CheckCircle size={16} className="mr-1" />
                Completed
              </span>
            )}

            {/* Approve/Reject Buttons (creator action for 'review' status) */}
            {task.status === 'review' && task.created_by === currentUserId && (
              <div className="flex gap-2 ml-2">
                <button
                  onClick={() => onStatusUpdate(task.id, 'completed')}
                  className="btn btn-success btn-sm text-white"
                >
                  Approve
                </button>
                <button
                  onClick={() => onStatusUpdate(task.id, 'rejected')}
                  className="btn btn-warning btn-sm text-white"
                >
                  Reject
                </button>
              </div>
            )}

            {/* Delete Button (creator action, always available if creator) */}
            {isCreator && onEditTaskRequest && (
              <button
                onClick={() => onEditTaskRequest(task)}
                className="btn btn-secondary btn-sm flex items-center ml-2"
                aria-label="Edit task"
              >
                <FileEdit size={16} className="mr-2" />
                Edit
              </button>
            )}
            {isCreator && (
              <button
                onClick={() => onDeleteTaskRequest(task.id)}
                className="btn btn-danger btn-sm flex items-center ml-2"
                aria-label="Delete task"
              >
                <Trash2 size={16} className="mr-2" />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

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