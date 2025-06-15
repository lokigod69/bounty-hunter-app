// src/hooks/useCollectedBounties.ts
// This hook fetches and manages the bounties collected by the current user.
// Adjusted Supabase query result typing for 'bounties' as a potential array.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Bounty } from '../types/database'; // Assuming Bounty type includes all necessary details
import { useAuth } from './useAuth';
import { PostgrestError } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';

export interface CollectedBounty extends Bounty {
  collected_at: string;
  collection_id: string; 
}

// Type for the raw data returned by the Supabase query, matching the select string
interface CollectedBountyQueryResult {
  collection_id: string;
  collected_at: string;
  // Supabase might return the joined 'bounties' as an array, even if it's a single item or null
  bounties: Bounty[] | null; 
}

export interface UseCollectedBountiesReturn {
  collectedBounties: CollectedBounty[];
  isLoading: boolean;
  error: string | null;
  fetchCollectedBounties: () => Promise<void>;
}

export const useCollectedBounties = (): UseCollectedBountiesReturn => {
  const { user } = useAuth();
  const [collectedBounties, setCollectedBounties] = useState<CollectedBounty[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCollectedBounties = useCallback(async () => {
    if (!user) {
      // setError('User not authenticated.'); // Or handle silently
      setCollectedBounties([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Fetch collected_bounty entries and join with bounties table
      // Adjust the select query as needed based on your actual table structure
      const { data, error: rpcError } = await supabase
        .from('collected_bounties')
        .select(`
          collection_id:id,
          collected_at,
          bounties (*)
        `)
        .eq('collector_id', user.id)
        .order('collected_at', { ascending: false });

      if (rpcError) {
        throw rpcError;
      }

      if (data) {
        const queryData = data as CollectedBountyQueryResult[];
        const transformedData: CollectedBounty[] = queryData
          .map((item) => {
            const bountyDetail = item.bounties && item.bounties.length > 0 ? item.bounties[0] : null;
            if (!bountyDetail) {
              console.warn(`Collected bounty record ${item.collection_id} has no associated bounty details or bounty is null.`);
              return null;
            }
            return {
              ...bountyDetail,
              collected_at: item.collected_at,
              collection_id: item.collection_id,
            };
          })
          .filter((bounty): bounty is CollectedBounty => bounty !== null);
        setCollectedBounties(transformedData);
      }

    } catch (err) {
      let errorMessage = 'Failed to fetch collected bounties.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      const postgrestError = err as PostgrestError;
      if (postgrestError && postgrestError.message) {
        errorMessage = postgrestError.message;
      }
      console.error('Error fetching collected bounties:', errorMessage);
      setError(errorMessage);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCollectedBounties();
  }, [fetchCollectedBounties]);

  return {
    collectedBounties,
    isLoading,
    error,
    fetchCollectedBounties,
  };
};
