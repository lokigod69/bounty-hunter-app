// src/components/TaskForm.tsx
// DESCRIPTION TEXTAREA FIX: Made the description textarea smaller and auto-resizable.
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
// Z-INDEX FIX: Increased modal z-index to ensure it appears above all other UI elements.
// PHASE 1 FIX: Enhanced mobile menu coordination and improved modal behavior to prevent UI conflicts.
// PHASE 3 FIX: Enhanced responsive positioning with improved mobile layouts, better touch targets, and optimized positioning logic.

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Calendar, Award, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createPortal } from 'react-dom';
import { useFriends } from '../hooks/useFriends';
import { soundManager } from '../utils/soundManager';
import { useUI } from '../context/UIContext';
import { useTheme } from '../context/ThemeContext'; // R14: For couple mode self-assignment prevention
import { getOverlayRoot } from '../lib/overlayRoot';
import { logOverlayRootState } from '../lib/overlayDebug';
import type { Database } from '../types/database';
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
  is_daily?: boolean; // P5: Indicates if this is a daily recurring mission
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
  const { t } = useTranslation();
  const { theme } = useTheme(); // R14: For couple mode self-assignment prevention
  const { openModal, clearLayer } = useUI();
  const hasOpenedModalRef = useRef(false);
  
  // Phase 7: Use UIContext to coordinate overlay layers and scroll locking
  // Only call openModal() once when component mounts, prevent duplicate calls
  useEffect(() => {
    if (!hasOpenedModalRef.current) {
      openModal();
      hasOpenedModalRef.current = true;
    }
    // Phase 10: Debug logging
    if (import.meta.env.DEV) {
      logOverlayRootState('TaskForm mounted');
    }
    return () => {
      clearLayer(); // Phase 7: Clear layer when modal unmounts
      hasOpenedModalRef.current = false;
      // Phase 10: Debug logging
      if (import.meta.env.DEV) {
        logOverlayRootState('TaskForm unmounted');
      }
    };
  }, [openModal, clearLayer]);

  // Phase 9: Simplified close handler - let cleanup effect handle clearLayer()
  const handleClose = () => {
    // Local state controls mount/unmount via IssuedPage
    onClose(); // this sets isTaskFormOpen = false
    // clearLayer() will run in the useEffect cleanup when the component unmounts
  };
  const { friends, loading } = useFriends(userId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState(''); // Added description state
  const [assignedTo, setAssignedTo] = useState('');
  const [deadline, setDeadline] = useState('');
  const [contractType, setContractType] = useState<'bounty' | 'credit'>('bounty'); // New state for contract type
  const [rewardText, setRewardText] = useState(''); // For bounty description or credit amount
  const [proofRequired, setProofRequired] = useState(false); // New state for proof requirement
  const [isDaily, setIsDaily] = useState(false); // P5: State for daily mission toggle
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
      setIsDaily(editingTask.is_daily || false); // P5: Set is_daily from editing task
    } else {
      // Reset form for creation mode or if editingTask is cleared
      setTitle('');
      setDescription(''); // Reset description
      setAssignedTo(friends.length === 1 ? friends[0].friend.id : '');
      setDeadline('');
      setContractType('bounty'); // Default to bounty for new tasks
      setRewardText('');
      setProofRequired(false); // Reset proof required for new tasks
      setIsDaily(false); // P5: Reset is_daily for new tasks
    }
  }, [editingTask, friends]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = t('taskForm.validation.titleRequired');
    }

    if (!assignedTo) {
      newErrors.assignedTo = t('taskForm.validation.assigneeRequired');
    }

    // R14: Prevent self-assignment in couple mode
    if (theme.id === 'couple' && assignedTo === userId) {
      newErrors.assignedTo = `In partner mode, ${theme.strings.missionPlural} are meant for your ${theme.strings.crewLabel}.`;
      toast.error(`You can't assign a ${theme.strings.missionSingular} to yourself in partner mode.`);
    }

    if (contractType === 'bounty' && !rewardText.trim()) {
      newErrors.rewardText = t('taskForm.validation.bountyRequired');
    } else if (contractType === 'credit' && !rewardText) { // rewardText for credit will be the selected value, e.g., '1', '5'
      newErrors.rewardText = t('taskForm.validation.creditRequired');
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
      is_daily: isDaily, // P5: Add is_daily to payload
    };
    setIsSubmitting(true);
    try {
      await onSubmit(taskPayload, editingTask ? editingTask.id : undefined);
      // Play sound on success
      if (editingTask) {
        soundManager.play('saveContract');
      } else {
        soundManager.play('create');
      }
      // Close modal after successful submission
      handleClose();
    } catch (error: unknown) {
      console.error('Task submission error:', error);
      let errorMessage = t('taskForm.submissionError');
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

  console.log("[TaskFormModal] Rendering modal");

  // Phase 7: Portal TaskForm to overlay-root to fix stacking context issues
  const overlayRoot = getOverlayRoot();
  if (!overlayRoot) {
    console.error("[TaskFormModal] Overlay root not found");
    return null;
  }

  const modalContent = (
    <div 
      data-overlay="TaskForm"
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-modal-backdrop p-2 sm:p-4"
      onClick={() => {
        console.log("[TaskFormModal] Backdrop clicked, closing");
        handleClose();
      }}
    >
      {/* Enhanced responsive close button with better touch targets */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          console.log("[TaskFormModal] Close button clicked");
          handleClose();
        }}
        className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white hover:text-gray-300 z-modal-controls p-3 sm:p-2 bg-slate-700/50 hover:bg-slate-600/70 rounded-full transition-colors shadow-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label={t('taskForm.closeButton')}
      >
        <X size={20} />
      </button>

      <div 
        className="glass-card w-full max-w-md mx-2 sm:mx-4 p-4 sm:p-6 relative animate-fade-in overflow-y-auto mobile-scroll max-h-[95vh] sm:max-h-[85vh] z-modal-content rounded-lg sm:rounded-2xl modal-mobile-fade sm:modal-fade-in"
        style={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Original close button removed from here */}
        
        <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-5 gradient-text text-center">{editingTask ? t('taskForm.editTitle') : t('taskForm.createTitle')}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Task Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              {t('taskForm.contractTitleLabel')}
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`input-field w-full ${errors.title ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder={t('taskForm.contractTitlePlaceholder')}
              maxLength={50}
            />
            {errors.title && <p className="text-[var(--warning-orange)] text-xs mt-1">{errors.title}</p>}
          </div>

          {/* Task Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              {t('taskForm.descriptionLabel')}
            </label>
            <textarea
              id="description"
              value={description ?? ''}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field w-full min-h-[40px] resize-none"
              placeholder={t('taskForm.descriptionPlaceholder')}
              rows={1}
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
              {t('taskForm.assignToLabel')}
            </label>
            {loading ? (
              <div className="animate-pulse h-10 bg-white/10 rounded-lg"></div>
            ) : friends.length === 0 ? (
              <p className="text-[var(--warning-orange)] text-sm">
                {t('taskForm.noFriendsWarning')}
              </p>
            ) : (
              <>
                <select
                  id="assignedTo"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className={`input-field w-full ${errors.assignedTo ? 'border-red-500 focus:ring-red-500' : ''}`}
                >
                  <option value="">{t('taskForm.assignToPlaceholder')}</option>
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
              {t('taskForm.deadlineLabel')}
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
              {t('taskForm.contractTypeLabel')}
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
              <option value="bounty">{t('taskForm.bountyContract')}</option>
              <option value="credit">{t('taskForm.creditContract')}</option>
            </select>
          </div>

          {/* Conditional Reward Inputs based on Contract Type */}
          {contractType === 'bounty' ? (
            <div>
              <label htmlFor="rewardTextBounty" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                {t('taskForm.bountyDescriptionLabel')}
              </label>
              <input
                type="text"
                id="rewardTextBounty"
                value={rewardText}
                onChange={(e) => setRewardText(e.target.value)}
                className={`input-field w-full ${errors.rewardText ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder={t('taskForm.bountyDescriptionPlaceholder')}
              />
              {errors.rewardText && <p className="text-[var(--warning-orange)] text-xs mt-1">{errors.rewardText}</p>}
            </div>
          ) : (
            <div>
              <label htmlFor="rewardTextCredit" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                {t('taskForm.creditRewardLabel')}
              </label>
              <select
                id="rewardTextCredit"
                value={rewardText} // rewardText will store the credit amount as string
                onChange={(e) => setRewardText(e.target.value)}
                className={`input-field w-full ${errors.rewardText ? 'border-red-500 focus:ring-red-500' : ''}`}
              >
                {/* Note: Styling <option> tags with background colors has limited cross-browser support. The select box itself is styled. */}
                <option className="bg-gray-800 text-white" value="1">{t('taskForm.creditOptions.quickTask')}</option>
                <option className="bg-gray-800 text-white" value="2">{t('taskForm.creditOptions.smallChore')}</option>
                <option className="bg-gray-800 text-white" value="3">{t('taskForm.creditOptions.mediumTask')}</option>
                <option className="bg-gray-800 text-white" value="5">{t('taskForm.creditOptions.largeTask')}</option>
                <option className="bg-gray-800 text-white" value="10">{t('taskForm.creditOptions.majorTask')}</option>
              </select>
              {errors.rewardText && <p className="text-[var(--warning-orange)] text-xs mt-1">{errors.rewardText}</p>}
            </div>
          )}

          {/* Proof Required Checkbox with enhanced mobile touch targets */}
          <div className="flex items-center py-2">
            <input
              id="proofRequired"
              type="checkbox"
              checked={proofRequired}
              onChange={(e) => setProofRequired(e.target.checked)}
              className="h-5 w-5 sm:h-4 sm:w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-3 sm:mr-2"
            />
            <label htmlFor="proofRequired" className="text-sm sm:text-sm text-[var(--text-secondary)] cursor-pointer flex-1">
              {t('taskForm.proofRequiredLabel')}
            </label>
          </div>

          {/* P5: Daily Mission Checkbox */}
          <div className="flex items-center py-2">
            <input
              id="isDaily"
              type="checkbox"
              checked={isDaily}
              onChange={(e) => setIsDaily(e.target.checked)}
              className="h-5 w-5 sm:h-4 sm:w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-3 sm:mr-2"
            />
            <label htmlFor="isDaily" className="text-sm sm:text-sm text-[var(--text-secondary)] cursor-pointer flex-1">
              Make this a daily mission
            </label>
          </div>
          
          {/* Enhanced mobile-friendly submit button */}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 sm:py-2.5 px-4 rounded-lg transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-4 sm:mt-2 text-base sm:text-sm min-h-[48px] sm:min-h-[auto]"
            disabled={isSubmitting}
          >
            {isSubmitting ? (editingTask ? t('taskForm.submitButton.saving') : t('taskForm.submitButton.creating')) : (editingTask ? t('taskForm.submitButton.saveChanges') : t('taskForm.submitButton.createContract'))}
          </button>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, overlayRoot);
}