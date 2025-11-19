// src/hooks/usePurchaseBounty.ts
// Hook for purchasing/claiming a reward store item.

import { useState } from 'react';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';
import { purchaseReward } from '../domain/rewards';

interface PurchaseBountyResult {
  success: boolean;
  error?: string;
}

export const usePurchaseBounty = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const purchaseBounty = async (rewardId: string): Promise<PurchaseBountyResult | null> => {
    if (!user) {
      toast.error('You must be logged in to claim a bounty.');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await purchaseReward({
        rewardId,
        userId: user.id,
      });

      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success(result.message || 'Bounty claimed successfully!');
      setIsLoading(false);
      return { success: true };

    } catch (err: unknown) {
      let errorMessage = 'An unexpected error occurred.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      console.error('Error claiming bounty:', errorMessage);
      setError(errorMessage);
      toast.error(`Error: ${errorMessage}`);
      setIsLoading(false);
      return null;
    }
  };

  return { purchaseBounty, isLoading, error };
};
