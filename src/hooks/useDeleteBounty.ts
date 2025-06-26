// src/hooks/useDeleteBounty.ts
// Hook for deleting a bounty from the rewards store.

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Database } from '../types/database';

export const useDeleteBounty = () => {
  const supabase = useSupabaseClient<Database>();
  const [isLoading, setIsLoading] = useState(false);

  const deleteBounty = async (bountyId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('delete_reward_store_item', {
        p_bounty_id: bountyId,
      });

      if (error) {
        throw new Error(error.message);
      }

      toast.success('Bounty deleted successfully!');
      setIsLoading(false);
      return { success: true };
    } catch (err: unknown) {
      let errorMessage = 'An unexpected error occurred.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      console.error('Error deleting bounty:', err);
      toast.error(`Error deleting bounty: ${errorMessage}`);
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  return { deleteBounty, isLoading };
};
