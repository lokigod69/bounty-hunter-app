// src/components/onboarding/OnboardingStep2Reward.tsx
// P2: Onboarding Step 2 - Create First Reward

import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { createReward } from '../../domain/rewards';
import { BaseCard } from '../ui/BaseCard';
import { ArrowRight, ArrowLeft, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface OnboardingStep2RewardProps {
  onComplete: (rewardId: string) => void;
  onBack: () => void;
}

export default function OnboardingStep2Reward({
  onComplete,
  onBack,
}: OnboardingStep2RewardProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creditCost, setCreditCost] = useState<number | ''>(10);
  const [isLoading, setIsLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !name || creditCost === '') {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    setCreateError(null);

    try {
      // Use domain function with isOnboarding flag to allow unassigned rewards
      const result = await createReward({
        data: {
          p_name: name,
          p_description: description,
          p_image_url: '🎁', // Default emoji
          p_credit_cost: Number(creditCost),
          p_assigned_to: null, // Will be set to null during onboarding
        },
        userId: user.id,
        isOnboarding: true, // This bypasses friendship requirement
      });

      if (result.success && result.reward_id) {
        toast.success(`${theme.strings.rewardSingular} created!`);
        setCreateError(null);
        onComplete(result.reward_id);
      } else {
        // Non-blocking error - show info toast but allow proceeding
        const errorMsg = result.message || 'Couldn\'t save this gift right now. You can create gifts later in the Gift Store.';
        setCreateError(errorMsg);
        toast.error(errorMsg);
        // Still allow user to proceed - don't block onboarding
        // User can manually proceed via skip button if they want
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create reward. You can create rewards later.';
      setCreateError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // Skip reward creation - just proceed to next step
    // No network call needed, just move forward
    setCreateError(null);
    onComplete(''); // Pass empty string to indicate skip
  };

  return (
    <BaseCard>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="reward-name" className="block text-sm font-medium text-white/70 mb-2">
            {theme.strings.rewardSingular.charAt(0).toUpperCase() + theme.strings.rewardSingular.slice(1)} Name *
          </label>
          <input
            id="reward-name"
            type="text"
            placeholder="e.g., Movie Night, New Bike, Weekend Trip"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field w-full text-white"
            required
            maxLength={100}
          />
        </div>

        <div>
          <label htmlFor="reward-description" className="block text-sm font-medium text-white/70 mb-2">
            Description (Optional)
          </label>
          <textarea
            id="reward-description"
            placeholder="What makes this reward special?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field w-full text-white h-24 resize-none"
            maxLength={500}
          />
        </div>

        <div>
          <label htmlFor="reward-cost" className="block text-sm font-medium text-white/70 mb-2">
            {theme.strings.tokenSingular.charAt(0).toUpperCase() + theme.strings.tokenSingular.slice(1)} Cost *
          </label>
          <input
            id="reward-cost"
            type="number"
            placeholder="10"
            value={creditCost}
            onChange={(e) => setCreditCost(e.target.value === '' ? '' : Number(e.target.value))}
            min="1"
            className="input-field w-full text-white"
            required
          />
          <p className="text-meta text-white/50 mt-1">
            This is how many {theme.strings.tokenPlural} {theme.strings.missionPlural} need to earn to unlock this {theme.strings.rewardSingular}.
          </p>
        </div>

        {createError && (
          <BaseCard className="bg-red-900/20 border-red-500/30">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-body text-red-400 font-semibold mb-1">Failed to create {theme.strings.rewardSingular}</p>
                <p className="text-meta text-red-400/70">{createError}</p>
              </div>
            </div>
          </BaseCard>
        )}

        {isLoading && (
          <div className="text-center text-white/70">
            Creating {theme.strings.rewardSingular}...
          </div>
        )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onBack}
              className="btn-secondary flex items-center gap-2 flex-1"
              disabled={isLoading}
            >
              <ArrowLeft size={20} />
              Back
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="btn-secondary flex items-center gap-2 flex-1"
              disabled={isLoading}
            >
              Skip for Now
            </button>
            <button
              type="submit"
              disabled={isLoading || !name || creditCost === ''}
              className="btn-primary flex items-center gap-2 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create {theme.strings.rewardSingular.charAt(0).toUpperCase() + theme.strings.rewardSingular.slice(1)}
              <ArrowRight size={20} />
            </button>
          </div>
      </form>
    </BaseCard>
  );
}

