// src/hooks/usePurchaseBounty.ts
// Hook for purchasing/claiming a reward store item.

import { useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';
import { Database } from '../types/database';

interface PurchaseBountyResult {
  success: boolean;
  error?: string;
}

export const usePurchaseBounty = () => {
  const supabase = useSupabaseClient<Database>();
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
      const { data, error: rpcError } = await supabase.rpc('purchase_bounty', {
        p_bounty_id: rewardId,
        p_collector_id: user.id
      });

      if (rpcError) {
        throw rpcError;
      }

      const result = data as unknown as PurchaseBountyResult;

      if (result && !result.success) {
        throw new Error(result.error || 'Failed to claim bounty.');
      }

      toast.success('Bounty claimed successfully!');
      setIsLoading(false);
      return result;

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
