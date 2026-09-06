// src/hooks/usePurchaseBounty.ts
// Hook for purchasing/claiming a reward store item.

import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';
import { purchaseReward } from '../domain/rewards';
import { CREDITS_CHANGED_EVENT } from './usePayoutWatcher';

interface PurchaseBountyResult {
  success: boolean;
  error?: string;
}

export const usePurchaseBounty = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const pending = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const purchaseBounty = async (rewardId: string): Promise<PurchaseBountyResult | null> => {
    if (pending.current) return null;
    if (!user) {
      toast.error('You must be logged in to claim a bounty.');
      return null;
    }

    pending.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // RPC uses auth.uid() internally for security
      const result = await purchaseReward({
        rewardId,
      });

      if (!result.success) {
        throw new Error(result.message);
      }

      window.dispatchEvent(new Event(CREDITS_CHANGED_EVENT));
      toast.success(t('rewards.claimSuccess'));
      return { success: true };

    } catch (err: unknown) {
      let errorMessage = 'An unexpected error occurred.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      pending.current = false;
      setIsLoading(false);
    }
  };

  return { purchaseBounty, isLoading, error };
};
