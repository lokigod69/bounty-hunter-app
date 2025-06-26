// src/hooks/useUpdateBounty.ts
// Hook for updating a bounty in the rewards store.

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Database } from '../types/database';

// The parameters for the RPC function
type BountyUpdateParams = Database['public']['Functions']['update_reward_store_item']['Args'];

export const useUpdateBounty = () => {
  const supabase = useSupabaseClient<Database>();
  const [isLoading, setIsLoading] = useState(false);

  const updateBounty = async (updates: BountyUpdateParams) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('update_reward_store_item', updates);

      if (error) {
        throw new Error(error.message);
      }

      toast.success('Bounty updated successfully!');
      setIsLoading(false);
      return { success: true, data };
    } catch (err: unknown) {
      let errorMessage = 'An unexpected error occurred.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      console.error('Error updating bounty:', err);
      toast.error(`Error updating bounty: ${errorMessage}`);
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  return { updateBounty, isLoading };
};
