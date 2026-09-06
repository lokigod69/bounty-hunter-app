import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Calendar, Gift, Coins, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useFriends } from '../hooks/useFriends';
import { translateTaskLifecycleErrorObject } from '../i18n/taskLifecycleErrors';
import { feedback } from '../utils/feedback';
import { useThemeStrings } from '../hooks/useThemeStrings';
import { TEXT_LIMITS, isWithinLimit } from '../config/textLimits';
import { CharacterCounter } from './ui/CharacterCounter';
import { AppButton } from './ui/AppButton';
import { ModalShell } from './ui/ModalShell';
import { Coin } from './visual/Coin';
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
  is_daily?: boolean;
  status: TaskStatus; // Should be 'pending' on creation
  created_by: string; // Added, as it's usually required
  // Add other fields from tasks.Insert as necessary
}

interface TaskFormProps {
  userId: string;
  initialAssignee?: string;
  onClose: () => void;
  onSubmit: (taskData: NewTaskData, taskId?: string) => Promise<void>; // NewTaskData is now locally defined
  editingTask?: Task | null; // Task is now locally defined as BaseTask
}

export default function TaskForm({ userId, onClose, onSubmit, editingTask, initialAssignee }: TaskFormProps) {
  const { t } = useTranslation();
  const { strings } = useThemeStrings();
  // Phase 2.1: capitalized mode noun (Mission / Chore / Request) for interpolated titles/buttons
  const noun = strings.missionSingular.charAt(0).toUpperCase() + strings.missionSingular.slice(1);
  const { friends, loading } = useFriends(userId);
  const [title, setTitle] = useState(editingTask?.title || '');
  const [description, setDescription] = useState(editingTask?.description || ''); // Added description state
  const [assignedTo, setAssignedTo] = useState(editingTask?.assigned_to || initialAssignee || '');
  const [deadline, setDeadline] = useState(editingTask?.deadline?.split('T')[0] || '');
  const [contractType, setContractType] = useState<'bounty' | 'credit'>(editingTask?.reward_type === 'credit' ? 'credit' : 'bounty'); // New state for contract type
  const [rewardText, setRewardText] = useState(editingTask?.reward_text || ''); // For bounty description or credit amount
  const [proofRequired, setProofRequired] = useState(editingTask?.proof_required || false);
  const [detailsOpen, setDetailsOpen] = useState(Boolean(editingTask?.description || editingTask?.deadline || editingTask?.proof_required));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Proposal 013: a credit reward whose assignee is its creator is refused
  // server-side, because standing has to come from someone else's judgement.
  const isSelfAssigned = !!assignedTo && assignedTo === userId;

  useEffect(() => {
    // Set default assignee if there's only one friend
    if (friends.length === 1 && !assignedTo && !editingTask) { // Only set default if not editing and only one friend
      setAssignedTo(friends[0].friend.id);
    }
  }, [friends, assignedTo, editingTask]);

  // 013: switching the assignee to yourself removes the credit option from the
  // selector, so a selector left on 'credit' would be showing a value it no
  // longer offers. Fall back to a custom reward, which is always legal.
  useEffect(() => {
    if (isSelfAssigned && contractType === 'credit') {
      setContractType('bounty');
      setRewardText('');
    }
  }, [isSelfAssigned, contractType]);


  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = t('taskForm.validation.titleRequired');
    } else if (!isWithinLimit(title, TEXT_LIMITS.missionTitle)) {
      newErrors.title = `Title must be ${TEXT_LIMITS.missionTitle} characters or less`;
    }

    // R27: Validate description length
    if (!isWithinLimit(description, TEXT_LIMITS.missionDescription)) {
      newErrors.description = `Description must be ${TEXT_LIMITS.missionDescription} characters or less`;
    }

    if (!assignedTo || (!editingTask && !friends.some(({ friend }) => friend.id === assignedTo))) {
      newErrors.assignedTo = t('taskForm.validation.assigneeRequired');
    }

    if (contractType === 'bounty' && !rewardText.trim()) {
      newErrors.rewardText = t('taskForm.validation.rewardRequired');
    } else if (contractType === 'bounty' && !isWithinLimit(rewardText, TEXT_LIMITS.rewardLabel)) {
      newErrors.rewardText = `Reward must be ${TEXT_LIMITS.rewardLabel} characters or less`;
    } else if (contractType === 'credit' && !rewardText) { // rewardText for credit will be the selected value, e.g., '1', '5'
      newErrors.rewardText = t('taskForm.validation.creditRequired');
    }

    // Proposal 013: standing is earned from someone else's judgement, so a
    // credit reward can never pay its own creator. The assignee dropdown lists
    // friends only, which makes this unreachable in normal use — it is here for
    // the paths that are not the dropdown (a stale self-friendship row, a
    // pre-filled edit of an older self-assigned contract) so the user sees a
    // sentence instead of the server's raw error code. Checked last so it wins
    // over the generic "pick an amount" message above.
    if (contractType === 'credit' && assignedTo && assignedTo === userId) {
      newErrors.rewardText = t('taskForm.validation.selfAssignedCredit');
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
      status: (editingTask?.status as TaskStatus) ?? ('pending' as TaskStatus),
      title: title.trim(),
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
      // Fire feedback on success
      if (editingTask) {
        feedback.success('saveContract');
      } else {
        feedback.success('create');
      }
      // Close modal after successful submission
      onClose();
    } catch (error: unknown) {
      let errorMessage = t('taskForm.submissionError');
      // The RPC error carries a machine-readable code, so every lifecycle
      // refusal — including the 013 self-assigned-credit rule — is stated in
      // the user's language instead of the domain layer's generic fallback.
      const localized = translateTaskLifecycleErrorObject(error, t);
      if (localized) {
        errorMessage = localized;
      } else if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get minimum date for deadline (today)
  const getMinDate = () => {
    const today = new Date();
    return [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  };

  // const rewardTypes array is no longer directly used for the primary selector, but parts might be reused or adapted if old types are still supported elsewhere.
  // For now, it's superseded by the new contractType logic.

  return (
    <ModalShell isOpen onClose={onClose} name="TaskForm" labelledBy="taskform-title">
      <div
        className="flex-1 overflow-y-auto mobile-scroll p-4 sm:p-6"
        style={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}
      >
        <h2 id="taskform-title" className="text-lg sm:text-xl font-semibold mb-4 sm:mb-5 gradient-text text-center">{editingTask ? t('taskForm.editTitle', { noun }) : t('taskForm.createTitle', { noun })}</h2>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Task Title - R27: Added character counter */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="title" className="block text-sm font-medium text-[var(--text-secondary)]">
                {t('taskForm.contractTitleLabel')}
              </label>
              <CharacterCounter current={title.length} max={TEXT_LIMITS.missionTitle} />
            </div>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`input-field w-full ${errors.title ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder={t('taskForm.contractTitlePlaceholder')}
              maxLength={TEXT_LIMITS.missionTitle}
            />
            {errors.title && <p className="text-[var(--warning-orange)] text-xs mt-1">{errors.title}</p>}
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
                {t('taskForm.noFriendsWarning')}{' '}
                <Link
                  to="/friends"
                  onClick={onClose}
                  className="text-[var(--mode-accent)] underline underline-offset-2 hover:opacity-80 transition-opacity"
                >
                  {t('taskForm.goToFriends')}
                </Link>
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
                      {friendship.friend.display_name || t('layout.unknownUser')}
                    </option>
                  ))}
                </select>
                {errors.assignedTo && <p className="text-[var(--warning-orange)] text-xs mt-1">{errors.assignedTo}</p>}
              </>
            )}
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-[var(--text-secondary)] mb-2">{t('taskForm.contractTypeLabel')}</legend>
            <div className="reward-type-options">
              {(['bounty', 'credit'] as const).filter(type => type !== 'credit' || !isSelfAssigned).map(type => (
                <label className="reward-option" key={type}>
                  <input type="radio" name="contractType" value={type} checked={contractType === type}
                    onChange={() => { setContractType(type); setRewardText(type === 'credit' ? '1' : ''); }} />
                  <span>{type === 'bounty' ? <Gift size={20} aria-hidden="true" /> : <Coins size={20} aria-hidden="true" />}
                    {t(type === 'bounty' ? 'taskForm.rewardTypeDirect' : 'taskForm.rewardTypeCredit')}
                  </span>
                </label>
              ))}
            </div>
            {isSelfAssigned && (
              <p className="text-[var(--text-secondary)] text-xs mt-1">
                {t('taskForm.validation.selfAssignedCredit')}
              </p>
            )}
          </fieldset>

          {/* Conditional Reward Inputs based on Contract Type - R27: Added character counter */}
          {contractType === 'bounty' ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="rewardTextBounty" className="block text-sm font-medium text-[var(--text-secondary)]">
                  {t('taskForm.customRewardLabel')}
                </label>
                <CharacterCounter current={rewardText.length} max={TEXT_LIMITS.rewardLabel} />
              </div>
              <input
                type="text"
                id="rewardTextBounty"
                value={rewardText}
                onChange={(e) => setRewardText(e.target.value)}
                className={`input-field w-full ${errors.rewardText ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder={t('taskForm.customRewardPlaceholder')}
                maxLength={TEXT_LIMITS.rewardLabel}
              />
              {errors.rewardText && <p className="text-[var(--warning-orange)] text-xs mt-1">{errors.rewardText}</p>}
            </div>
          ) : (
            <fieldset>
              <legend className="text-sm font-medium text-[var(--text-secondary)] mb-2">{t('taskForm.creditRewardLabel')}</legend>
              <div className="credit-options">
                {[...new Set(['1', '2', '3', '5', '10', ...(editingTask?.reward_type === 'credit' && editingTask.reward_text ? [editingTask.reward_text] : [])])].map(amount => (
                  <label key={amount} className="reward-option credit-option" style={amount.length > 2 ? { gridColumn: 'span 2' } : undefined}>
                    <input type="radio" name="rewardTextCredit" value={amount} checked={rewardText === amount} onChange={() => setRewardText(amount)} aria-label={`${amount} ${Number(amount) === 1 ? strings.tokenSingular : strings.tokenPlural}`} />
                    <span><Coin value={Number(amount)} size="sm" /></span>
                  </label>
                ))}
              </div>
              {errors.rewardText && <p className="text-[var(--warning-orange)] text-xs mt-1">{errors.rewardText}</p>}
            </fieldset>
          )}

          <p className="text-sm text-white/60">{t(contractType === 'credit' ? 'workflow.rewardHintCredits' : 'workflow.rewardHintDirect')}</p>
          <details className="optional-details" open={detailsOpen} onToggle={event => setDetailsOpen(event.currentTarget.open)}>
            <summary>{t('workflow.moreDetails')}</summary>
            <div className="space-y-4 pt-3">
          {/* Task Description - R27: Added character counter */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="description" className="block text-sm font-medium text-[var(--text-secondary)]">
                {t('taskForm.descriptionLabel')}
              </label>
              <CharacterCounter current={description?.length ?? 0} max={TEXT_LIMITS.missionDescription} />
            </div>
            <textarea
              id="description"
              value={description ?? ''}
              onChange={(e) => setDescription(e.target.value)}
              className={`input-field w-full min-h-[40px] resize-none ${errors.description ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder={t('taskForm.descriptionPlaceholder')}
              rows={1}
              maxLength={TEXT_LIMITS.missionDescription}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
              }}
            />
            {errors.description && <p className="text-[var(--warning-orange)] text-xs mt-1">{errors.description}</p>}
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

            </div>
          </details>

          {/* Enhanced mobile-friendly submit button */}
          <AppButton
            type="submit"
            variant="cta"
            fullWidth
            loading={isSubmitting}
            disabled={loading || friends.length === 0}
            className="mt-4 sm:mt-2"
          >
            {isSubmitting ? (editingTask ? t('taskForm.submitButton.saving') : t('taskForm.submitButton.creating')) : (editingTask ? t('taskForm.submitButton.saveChanges') : t('taskForm.submitButton.createContract', { noun }))}
          </AppButton>
        </form>
      </div>
    </ModalShell>
  );
}
