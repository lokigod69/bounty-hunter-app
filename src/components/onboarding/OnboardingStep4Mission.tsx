// src/components/onboarding/OnboardingStep4Mission.tsx
// P2: Onboarding Step 4 - Create First Mission

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useFriends } from '../../hooks/useFriends';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { BaseCard } from '../ui/BaseCard';
import { ArrowRight, ArrowLeft, Target, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { TaskStatus } from '../../pages/IssuedPage';

interface OnboardingStep4MissionProps {
  firstRewardId: string | null;
  invitedUserId: string | null;
  assigneeChoice: 'self' | 'invited' | null;
  onComplete: () => void;
  onBack: () => void;
}

export default function OnboardingStep4Mission({
  firstRewardId,
  invitedUserId,
  assigneeChoice,
  onComplete,
  onBack,
}: OnboardingStep4MissionProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { friends } = useFriends(user?.id);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Set default assignee based on onboarding state
  useEffect(() => {
    if (!user) return;

    if (assigneeChoice === 'invited' && invitedUserId) {
      setAssignedTo(invitedUserId);
    } else {
      // Default to self
      setAssignedTo(user.id);
    }
  }, [user, assigneeChoice, invitedUserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !title || !assignedTo) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsCreating(true);

    try {
      const newTask = {
        title,
        description: description || null,
        assigned_to: assignedTo,
        created_by: user.id,
        status: 'pending' as TaskStatus,
        reward_type: 'credit',
        reward_text: '10', // Default credit amount for onboarding
        proof_required: false,
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert([newTask])
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast.success(`${theme.strings.missionSingular.charAt(0).toUpperCase() + theme.strings.missionSingular.slice(1)} created! You're all set.`);
      setCreateError(null);
      onComplete();
    } catch (error) {
      console.error('Error creating mission:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to create mission. Please try again.';
      setCreateError(errorMsg);
      toast.error(errorMsg);
      setIsCreating(false);
    }
  };

  // Get assignee options
  const assigneeOptions = [
    { id: user?.id || '', label: 'Myself', value: user?.id || '' },
    ...(invitedUserId && friends.some(f => f.friend.id === invitedUserId)
      ? [{ id: invitedUserId, label: friends.find(f => f.friend.id === invitedUserId)?.friend.display_name || 'Invited Friend', value: invitedUserId }]
      : []),
  ];

  return (
    <BaseCard>
      <div className="space-y-6">
        <div className="text-center">
          <Target size={48} className="mx-auto mb-4 text-teal-400" />
          <p className="text-body text-white/70">
            Create your first {theme.strings.missionSingular}. This is what you'll assign to yourself or others to earn {theme.strings.tokenPlural}.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="mission-title" className="block text-sm font-medium text-white/70 mb-2">
              {theme.strings.missionSingular.charAt(0).toUpperCase() + theme.strings.missionSingular.slice(1)} Title *
            </label>
            <input
              id="mission-title"
              type="text"
              placeholder="e.g., Complete morning routine, Finish project report"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field w-full text-white"
              required
              maxLength={100}
            />
          </div>

          <div>
            <label htmlFor="mission-description" className="block text-sm font-medium text-white/70 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="mission-description"
              placeholder="Add more details about what needs to be done..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field w-full text-white h-24 resize-none"
              maxLength={500}
            />
          </div>

          <div>
            <label htmlFor="mission-assignee" className="block text-sm font-medium text-white/70 mb-2">
              Assign To *
            </label>
            <select
              id="mission-assignee"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="input-field w-full text-white"
              required
            >
              <option value="">Select assignee...</option>
              {assigneeOptions.map((option) => (
                <option key={option.id} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-meta text-white/50 mt-1">
              {assigneeOptions.length > 1
                ? 'You can assign this to yourself or your invited friend.'
                : 'Only you for now (invite someone later to assign missions to them).'}
            </p>
          </div>

          {createError && (
            <BaseCard className="bg-red-900/20 border-red-500/30">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-body text-red-400 font-semibold mb-1">Failed to create {theme.strings.missionSingular}</p>
                  <p className="text-meta text-red-400/70">{createError}</p>
                </div>
              </div>
            </BaseCard>
          )}

          {isCreating && (
            <div className="text-center text-white/70">
              Creating {theme.strings.missionSingular}...
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onBack}
              className="btn-secondary flex items-center gap-2 flex-1"
              disabled={isCreating}
            >
              <ArrowLeft size={20} />
              Back
            </button>
            <button
              type="submit"
              disabled={isCreating || !title || !assignedTo}
              className="btn-primary flex items-center gap-2 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create {theme.strings.missionSingular.charAt(0).toUpperCase() + theme.strings.missionSingular.slice(1)}
              <ArrowRight size={20} />
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                // Skip creating mission, just mark onboarding complete
                toast.success(`You can create ${theme.strings.missionPlural} later from the ${theme.strings.missionsLabel} page.`);
                setCreateError(null);
                onComplete();
              }}
              className="text-meta text-white/50 hover:text-white/70 underline"
              disabled={isCreating}
            >
              Skip, I'll create one later
            </button>
          </div>
        </form>
      </div>
    </BaseCard>
  );
}

