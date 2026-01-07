// src/hooks/useCollectedRewards.ts
// This hook fetches and manages the rewards collected by the current user.
// Renamed from useCollectedBounties.ts and updated internal references.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
// Assuming 'rewards_store' is the table and its type might be aliased as 'Reward' or directly used.
// For now, using 'Reward' as a placeholder for the type from 'rewards_store' table.
// We might need to define this type or ensure it's correctly generated in database.ts.
import { Database } from '../types/database'; 
// Explicitly using the table type for now, will adjust if a simpler 'Reward' type is available/created.
type Reward = Database['public']['Tables']['rewards_store']['Row'];

import { useAuth } from './useAuth';
import { PostgrestError } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';

export interface CollectedReward extends Reward {
  collected_at: string;
  collection_id: string; 
}

// Type for the raw data returned by the Supabase query, matching the select string
interface CollectedRewardQueryResult {
  collection_id: string;
  collected_at: string;
  rewards_store: Reward[] | null; // Changed from 'bounties'
}

export interface UseCollectedRewardsReturn {
  collectedRewards: CollectedReward[];
  isLoading: boolean;
  error: string | null;
  fetchCollectedRewards: () => Promise<void>;
}

export const useCollectedRewards = (): UseCollectedRewardsReturn => {
  const { user } = useAuth();
  const [collectedRewards, setCollectedRewards] = useState<CollectedReward[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCollectedRewards = useCallback(async () => {
    if (!user) {
      setCollectedRewards([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase
        .from('collected_rewards') // Changed from 'collected_bounties'
        .select(`
          collection_id:id,
          collected_at,
          rewards_store (*) 
        `) // Changed from 'bounties (*)'
        .eq('collector_id', user.id)
        .order('collected_at', { ascending: false });

      if (rpcError) {
        throw rpcError;
      }

      if (data) {
        const queryData = data as CollectedRewardQueryResult[];
        const transformedData: CollectedReward[] = queryData
          .map((item) => {
            const rewardDetail = item.rewards_store && item.rewards_store.length > 0 ? item.rewards_store[0] : null;
            if (!rewardDetail) {
              return null;
            }
            return {
              ...rewardDetail,
              collected_at: item.collected_at,
              collection_id: item.collection_id,
            };
          })
          .filter((reward): reward is CollectedReward => reward !== null);
        setCollectedRewards(transformedData);
      }

    } catch (err) {
      let errorMessage = 'Failed to fetch collected rewards.'; // Changed message
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      const postgrestError = err as PostgrestError;
      if (postgrestError && postgrestError.message) {
        errorMessage = postgrestError.message;
      }
      setError(errorMessage);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCollectedRewards();
  }, [fetchCollectedRewards]);

  return {
    collectedRewards,
    isLoading,
    error,
    fetchCollectedRewards,
  };
};
