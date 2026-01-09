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
      // Two-step query to avoid silent join failures from RLS
      // Step 1: Get collected_rewards rows (collector always has RLS access)
      const { data: collectedRows, error: crError } = await supabase
        .from('collected_rewards')
        .select('id, reward_id, collector_id, collected_at')
        .eq('collector_id', user.id)
        .order('collected_at', { ascending: false });

      if (crError) {
        throw crError;
      }

      if (!collectedRows || collectedRows.length === 0) {
        setCollectedRewards([]);
        return;
      }

      // Step 2: Fetch reward details by ID (RLS should allow assignee to read)
      const rewardIds = collectedRows.map(row => row.reward_id).filter(Boolean) as string[];

      if (rewardIds.length === 0) {
        setCollectedRewards([]);
        return;
      }

      const { data: rewards, error: rError } = await supabase
        .from('rewards_store')
        .select('*')
        .in('id', rewardIds);

      if (rError) {
        throw rError;
      }

      // Step 3: Merge client-side
      const rewardsMap = new Map((rewards || []).map(r => [r.id, r]));
      const transformedData: CollectedReward[] = collectedRows
        .map((row) => {
          const rewardDetail = row.reward_id ? rewardsMap.get(row.reward_id) : null;
          if (!rewardDetail) {
            console.warn('[useCollectedRewards] Reward not found for collection:', row.id, 'reward_id:', row.reward_id);
            return null;
          }
          return {
            ...rewardDetail,
            collected_at: row.collected_at,
            collection_id: row.id,
          };
        })
        .filter((reward): reward is CollectedReward => reward !== null);

      setCollectedRewards(transformedData);

    } catch (err) {
      let errorMessage = 'Failed to fetch collected rewards.';
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
