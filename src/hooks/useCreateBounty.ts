// src/hooks/useCreateBounty.ts
// Hook for creating a new reward store item (bounty).

import { useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import toast from 'react-hot-toast';
import { Database } from '../types/database';

// Define the arguments for the RPC function based on the latest SQL
interface CreateRewardStoreItemArgs {
  p_name: string;
  p_description: string;
  p_image_url: string;
  p_credit_cost: number;
  p_assigned_to: string;
}

interface CreateBountyResult {
  success: boolean;
  error?: string;
  reward_id?: string;
}

export const useCreateBounty = () => {
  const supabase = useSupabaseClient<Database>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBounty = async (bountyData: CreateRewardStoreItemArgs): Promise<CreateBountyResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('create_reward_store_item', bountyData);

      if (rpcError) {
        throw rpcError;
      }
      
      const result = data as unknown as CreateBountyResult;

      // The RPC returns a JSON object with success status and potential error message from our SQL function
      if (result && !result.success) {
        throw new Error(result.error || 'Failed to create bounty.');
      }

      toast.success('Bounty created successfully!');
      setIsLoading(false);
      return result;

    } catch (err: unknown) {
      let errorMessage = 'An unexpected error occurred.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      toast.error(`Error: ${errorMessage}`);
      setIsLoading(false);
      return null;
    }
  };

  return { createBounty, isLoading, error };
};
