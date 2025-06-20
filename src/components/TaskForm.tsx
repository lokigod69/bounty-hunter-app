// src/components/TaskForm.tsx
// Form for creating new tasks and editing existing ones.
// Applied galactic theme: .glass-card (inherited), .modal-icon-button, themed labels, themed error messages. Input fields use enhanced .input-field.
// Fixed TypeScript error for taskPayload.reward_text to ensure it's string | undefined.
// Phase 5B: Updated terminology from 'Task' to 'Contract'. Corrected submit button text and rewardType values.
// Phase 6 (Credit System UI): Added Contract Type selector, conditional reward inputs, removed redundant rewardType state, and removed unused RewardType import.
// Phase 7 (Critical Fix): Ensured modal closes only on successful task submission in handleSubmit.
// Phase 8 (Backend Ready): Updated error handling in handleSubmit to use toast.error with error.message. Refined error typing in catch block.
// Phase 9 (Proof Required): Added 'proof_required' checkbox and associated logic.
// Phase 10 (Issued Page Refresh): Added isSubmitting state for loading indicator on submit button.
// Styling Update: Applied requested styling to credit dropdown, including bg-gray-800 for options (browser compatibility may vary).

import React, { useState, useEffect } from 'react';
import { X, Calendar, Award, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useFriends } from '../hooks/useFriends';
import { Database } from '../types/database';
import type { TaskStatus } from '../pages/IssuedPage'; // Import TaskStatus if needed for NewTaskData

// Define BaseTask from the Database type
type BaseTask = Database['public']['Tables']['tasks']['Row'];

// Alias Task to BaseTask for usage within this component
export type Task = BaseTask;

// Define NewTaskData based on the fields required for creating a new task
// This should align with what supabase insert needs for 'tasks'
// and the payload constructed in handleSubmit
export interface NewTaskData {
  title: string;
  description: string | null;
  assigned_to: string | null;
  deadline: string | null;
  reward_type: string; // 'credit' or 'text'
  reward_text?: string; // For bounty description or credit amount (stringified number)
  proof_required?: boolean;
  status: TaskStatus; // Should be 'pending' on creation
  created_by: string; // Added, as it's usually required
  // Add other fields from tasks.Insert as necessary
}

interface TaskFormProps {
  userId: string;
  onClose: () => void;
  onSubmit: (taskData: NewTaskData, taskId?: string) => Promise<void>; // NewTaskData is now locally defined
  editingTask?: Task | null; // Task is now locally defined as BaseTask
}

export default function TaskForm({ userId, onClose, onSubmit, editingTask }: TaskFormProps) {
  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    // Re-enable scroll when modal is closed
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []); // Empty dependency array ensures this runs only on mount and unmount
  const { friends, loading } = useFriends(userId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState(''); // Added description state
  const [assignedTo, setAssignedTo] = useState('');
  const [deadline, setDeadline] = useState('');
  const [contractType, setContractType] = useState<'bounty' | 'credit'>('bounty'); // New state for contract type
  const [rewardText, setRewardText] = useState(''); // For bounty description or credit amount
  const [proofRequired, setProofRequired] = useState(false); // New state for proof requirement
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Set default assignee if there's only one friend
    if (friends.length === 1 && !assignedTo && !editingTask) { // Only set default if not editing and only one friend
      setAssignedTo(friends[0].friend.id);
    }
  }, [friends, assignedTo, editingTask]);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title || '');
      setDescription(editingTask.description || ''); // Set description from editingTask
      setAssignedTo(editingTask.assigned_to || '');
      setDeadline(editingTask.deadline ? editingTask.deadline.split('T')[0] : '');
      if (editingTask.reward_type === 'credit') {
        setContractType('credit');
        setRewardText(editingTask.reward_text || '1'); // Default to '1' if not set for credit type
      } else {
        setContractType('bounty');
        // For 'bounty', reward_type could be 'text', 'items', 'other', or empty if we adapt old tasks
        // For simplicity now, let's assume 'bounty' contract maps to 'text' or is handled by rewardText only
        setRewardText(editingTask.reward_text || '');
        // editingTask.reward_type will be used by the payload logic if it's not 'credit'
      }
      setProofRequired(editingTask.proof_required || false);
    } else {
      // Reset form for creation mode or if editingTask is cleared
      setTitle('');
      setDescription(''); // Reset description
      setAssignedTo(friends.length === 1 ? friends[0].friend.id : '');
      setDeadline('');
      setContractType('bounty'); // Default to bounty for new tasks
      setRewardText('');
      setProofRequired(false); // Reset proof required for new tasks
    }
  }, [editingTask, friends]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!assignedTo) {
      newErrors.assignedTo = 'Please select a friend';
    }
    
    if (contractType === 'bounty' && !rewardText.trim()) {
      newErrors.rewardText = 'Reward description is required for Bounty Contracts.';
    } else if (contractType === 'credit' && !rewardText) { // rewardText for credit will be the selected value, e.g., '1', '5'
      newErrors.rewardText = 'Please select a credit amount for Credit Contracts.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const taskPayload: NewTaskData = {
      created_by: userId, // Add created_by to the payload
      status: 'pending' as TaskStatus, // Ensure status is set to pending
      title,
      description: description.trim() || null, // Use description state, allowing null for empty
      assigned_to: assignedTo,
      deadline: deadline || null,
      reward_type: contractType === 'credit' ? 'credit' : 'text', // Explicitly set 'text' for bounty, 'credit' for credit
      reward_text: rewardText.trim() ? rewardText.trim() : (contractType === 'credit' ? '0' : undefined), // Ensure credit has a value, bounty can be undefined
      proof_required: proofRequired, // Add proof_required to payload
    };
    setIsSubmitting(true);
    try {
      await onSubmit(taskPayload, editingTask ? editingTask.id : undefined);
      onClose(); // Only close if onSubmit was successful
    } catch (error: unknown) {
      console.error('Task submission error:', error);
      let errorMessage = 'Failed to submit contract. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      toast.error(errorMessage);
      // Optionally, set a form-level error message here to display to the user
      // setErrors(prev => ({ ...prev, form: 'Submission failed. Please try again.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get minimum date for deadline (today)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // const rewardTypes array is no longer directly used for the primary selector, but parts might be reused or adapted if old types are still supported elsewhere.
  // For now, it's superseded by the new contractType logic.

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 pt-16 px-4 pb-4 overflow-hidden touch-none"
      onClick={(e) => { // Click outside to dismiss
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Close button - moved to overlay for fixed positioning */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 z-[51] p-1.5 bg-slate-700/50 hover:bg-slate-600/70 rounded-full transition-colors"
        aria-label="Close"
      >
        <X size={24} />
      </button>

      <div 
        className="glass-card w-full max-w-md p-6 relative animate-fade-in overflow-y-auto max-h-[85vh]"
        onClick={(e) => e.stopPropagation()} // Prevent clicks on modal content from closing modal
      >
        {/* Original close button removed from here */}
        
        <h2 className="text-xl font-semibold mb-5 gradient-text">{editingTask ? 'Edit Contract' : 'Create New Contract'}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Contract Title*
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`input-field w-full ${errors.title ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="What needs to be done?"
            />
            {errors.title && <p className="text-[var(--warning-orange)] text-xs mt-1">{errors.title}</p>}
          </div>

          {/* Task Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description ?? ''}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field w-full min-h-[60px] resize-none"
              placeholder="Add more details about the task..."
              rows={2}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
              }}
            />
            {/* No error message for description as it's optional */}
          </div>
          
          {/* Assign To */}
          <div>
            <label htmlFor="assignedTo" className="flex items-center text-sm font-medium text-[var(--text-secondary)] mb-1">
              <Users size={16} className="mr-1" />
              Assign To*
            </label>
            {loading ? (
              <div className="animate-pulse h-10 bg-white/10 rounded-lg"></div>
            ) : friends.length === 0 ? (
              <p className="text-[var(--warning-orange)] text-sm">
                You need to add friends first to assign tasks.
              </p>
            ) : (
              <>
                <select
                  id="assignedTo"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className={`input-field w-full ${errors.assignedTo ? 'border-red-500 focus:ring-red-500' : ''}`}
                >
                  <option value="">Select a friend</option>
                  {friends.map((friendship) => (
                    <option key={friendship.friend.id} value={friendship.friend.id}>
                      {friendship.friend.display_name || friendship.friend.email}
                    </option>
                  ))}
                </select>
                {errors.assignedTo && <p className="text-[var(--warning-orange)] text-xs mt-1">{errors.assignedTo}</p>}
              </>
            )}
          </div>
          
          {/* Deadline */}
          <div>
            <label htmlFor="deadline" className="flex items-center text-sm font-medium text-[var(--text-secondary)] mb-1">
              <Calendar size={16} className="mr-1" />
              Deadline (Optional)
            </label>
            <input
              type="date"
              id="deadline"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={getMinDate()}
              className="input-field w-full"
            />
          </div>
          
          {/* Contract Type Selector */}
          <div className="mb-4">
            <label htmlFor="contractType" className="flex items-center text-sm font-medium text-[var(--text-secondary)] mb-1">
              <Award size={16} className="mr-1" />
              Contract Type
            </label>
            <select 
              id="contractType"
              value={contractType}
              onChange={(e) => {
                const newContractType = e.target.value as 'bounty' | 'credit';
                setContractType(newContractType);
                // Reset rewardText when changing contract type
                setRewardText(newContractType === 'credit' ? '1' : ''); 
              }}
              className="input-field w-full"
            >
              <option value="bounty">Bounty Contract (Direct Reward)</option>
              <option value="credit">Credit Contract (Coins)</option>
            </select>
          </div>

          {/* Conditional Reward Inputs based on Contract Type */}
          {contractType === 'bounty' ? (
            <div>
              <label htmlFor="rewardTextBounty" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Reward Description*
              </label>
              <input
                type="text"
                id="rewardTextBounty"
                value={rewardText}
                onChange={(e) => setRewardText(e.target.value)}
                className={`input-field w-full ${errors.rewardText ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="e.g., Trip to Bali, a rare artifact"
              />
              {errors.rewardText && <p className="text-[var(--warning-orange)] text-xs mt-1">{errors.rewardText}</p>}
            </div>
          ) : (
            <div>
              <label htmlFor="rewardTextCredit" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Credit Reward*
              </label>
              <select
                id="rewardTextCredit"
                value={rewardText} // rewardText will store the credit amount as string
                onChange={(e) => setRewardText(e.target.value)}
                className={`input-field w-full ${errors.rewardText ? 'border-red-500 focus:ring-red-500' : ''}`}
              >
                {/* Note: Styling <option> tags with background colors has limited cross-browser support. The select box itself is styled. */}
                <option className="bg-gray-800 text-white" value="1">1 Credit - Quick task</option>
                <option className="bg-gray-800 text-white" value="2">2 Credits - Small chore</option>
                <option className="bg-gray-800 text-white" value="3">3 Credits - Medium task</option>
                <option className="bg-gray-800 text-white" value="5">5 Credits - Large task</option>
                <option className="bg-gray-800 text-white" value="10">10 Credits - Major task</option>
              </select>
              {errors.rewardText && <p className="text-[var(--warning-orange)] text-xs mt-1">{errors.rewardText}</p>}
            </div>
          )}

          {/* Proof Required Checkbox */}
          <div className="flex items-center">
            <input
              id="proofRequired"
              type="checkbox"
              checked={proofRequired}
              onChange={(e) => setProofRequired(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-2"
            />
            <label htmlFor="proofRequired" className="text-sm text-[var(--text-secondary)]">
              Proof Required?
            </label>
          </div>
          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting ? (editingTask ? 'Saving...' : 'Creating...') : (editingTask ? 'Save Changes' : 'Create Contract')}
          </button>
        </form>
      </div>
    </div>
  );
}