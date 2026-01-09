// src/hooks/useDeleteBounty.ts
// Hook for deleting a bounty from the rewards store.

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './useAuth';
import { soundManager } from '../utils/soundManager';
import { deleteReward } from '../domain/rewards';

export const useDeleteBounty = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const deleteBounty = async (bountyId: string) => {
    if (!user) {
      toast.error('You must be logged in to delete a bounty.');
      return { success: false, error: 'Not authenticated' };
    }

    setIsLoading(true);
    try {
      await deleteReward({
        rewardId: bountyId,
        userId: user.id,
      });

      soundManager.play('delete');
      toast.success('Bounty deleted successfully!');
      setIsLoading(false);
      return { success: true };
    } catch (err: unknown) {
      let errorMessage = 'An unexpected error occurred.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      toast.error(`Error deleting bounty: ${errorMessage}`);
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  return { deleteBounty, isLoading };
};
