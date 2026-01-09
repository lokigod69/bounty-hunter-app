// src/hooks/useUpdateBounty.ts
// Hook for updating a bounty in the rewards store.

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './useAuth';
import { Database } from '../types/database';
import { updateReward } from '../domain/rewards';

// The parameters for the RPC function
type BountyUpdateParams = Database['public']['Functions']['update_reward_store_item']['Args'];

export const useUpdateBounty = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const updateBounty = async (updates: BountyUpdateParams) => {
    if (!user) {
      toast.error('You must be logged in to update a bounty.');
      return { success: false, error: 'Not authenticated' };
    }

    if (!updates.p_bounty_id) {
      toast.error('Reward ID is required.');
      return { success: false, error: 'Missing reward ID' };
    }

    setIsLoading(true);
    try {
      await updateReward({
        rewardId: updates.p_bounty_id,
        updates,
        userId: user.id,
      });

      toast.success('Bounty updated successfully!');
      setIsLoading(false);
      return { success: true };
    } catch (err: unknown) {
      let errorMessage = 'An unexpected error occurred.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      toast.error(`Error updating bounty: ${errorMessage}`);
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  return { updateBounty, isLoading };
};
