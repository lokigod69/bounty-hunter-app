// src/components/onboarding/OnboardingStep2Reward.tsx
// P2: Onboarding Step 2 - Create First Reward

import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useCreateBounty } from '../../hooks/useCreateBounty';
import { useTheme } from '../../context/ThemeContext';
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
  const { createBounty, isLoading, error } = useCreateBounty();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creditCost, setCreditCost] = useState<number | ''>(10);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !name || creditCost === '') {
      toast.error('Please fill in all required fields.');
      return;
    }

    // Note: create_reward_store_item RPC requires p_assigned_to to be a friend.
    // For onboarding, we'll try to create a self-assigned reward, but if it fails,
    // we'll allow the user to skip and create rewards later.
    // In a future update, we could create a self-friendship or modify the RPC.
    const result = await createBounty({
      p_name: name,
      p_description: description,
      p_image_url: '🎁', // Default emoji
      p_credit_cost: Number(creditCost),
      p_assigned_to: user.id, // Try assigning to self
    });

    if (result && result.success && result.reward_id) {
      toast.success(`${theme.strings.rewardSingular} created!`);
      setCreateError(null);
      onComplete(result.reward_id);
    } else {
      // If creation fails (likely due to friendship requirement), allow skip
      const errorMsg = result?.message || error || 'Reward creation failed. You can create rewards later after inviting someone.';
      setCreateError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const handleSkip = () => {
    // Allow skipping reward creation - user can create rewards later
    toast.info(`You can create ${theme.strings.rewardPlural} later from the ${theme.strings.storeTitle}.`);
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

