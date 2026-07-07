// src/hooks/useCollectedRewards.ts
// This hook fetches and manages the rewards collected by the current user.
// Renamed from useCollectedBounties.ts and updated internal references.
// R33: Added creator profile data for showing who the reward was from.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';
type Reward = Database['public']['Tables']['rewards_store']['Row'];

import { useAuth } from './useAuth';
import { PostgrestError } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { markRewardRedeemed } from '../domain/rewards';
import type { CollectedRewardRow } from '../types/custom';

// R33: Profile info type for creator
export interface CreatorProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface CollectedReward extends Reward {
  collected_at: string;
  collection_id: string;
  // Always populated by the mapper (null when not yet redeemed); required so the
  // .filter() type-predicate below narrows cleanly.
  redeemed_at: string | null;
  creator_profile?: CreatorProfile | null;
}

export interface UseCollectedRewardsReturn {
  collectedRewards: CollectedReward[];
  isLoading: boolean;
  error: string | null;
  fetchCollectedRewards: () => Promise<void>;
  markRedeemed: (collectionId: string, redeemed: boolean) => Promise<void>;
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
      // redeemed_at is not in the generated database types yet (Phase 2.8),
      // so the typed select string would resolve to a SelectQueryError. Cast the
      // row shape via .returns<CollectedRewardRow[]>() (overlay from custom.ts).
      const { data: collectedRows, error: crError } = await supabase
        .from('collected_rewards')
        .select('id, reward_id, collector_id, collected_at, redeemed_at')
        .eq('collector_id', user.id)
        .order('collected_at', { ascending: false })
        .returns<CollectedRewardRow[]>();

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

      // Step 3: R33 - Fetch creator profiles
      const creatorIds = [...new Set((rewards || []).map(r => r.creator_id).filter(Boolean))] as string[];
      let creatorProfiles: Record<string, CreatorProfile> = {};

      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', creatorIds);

        if (profiles) {
          creatorProfiles = profiles.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as Record<string, CreatorProfile>);
        }
      }

      // Step 4: Merge client-side with creator profiles
      const rewardsMap = new Map((rewards || []).map(r => [r.id, r]));
      const transformedData: CollectedReward[] = collectedRows
        .map((row): CollectedReward | null => {
          const rewardDetail = row.reward_id ? rewardsMap.get(row.reward_id) : null;
          if (!rewardDetail) {
            return null;
          }
          return {
            ...rewardDetail,
            collected_at: row.collected_at ?? '',
            collection_id: row.id,
            // Phase 2.8: redeemed_at (typed via CollectedRewardRow overlay)
            redeemed_at: row.redeemed_at ?? null,
            creator_profile: rewardDetail.creator_id ? creatorProfiles[rewardDetail.creator_id] || null : null,
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

  // Phase 2.8: mark a collected reward as redeemed/delivered (or reverse it).
  // Optimistically updates local state; on failure the error is thrown so the
  // caller (page) can surface a toast, and we refetch to restore truth.
  const markRedeemed = useCallback(async (collectionId: string, redeemed: boolean) => {
    const result = await markRewardRedeemed(collectionId, redeemed);

    if (!result.success) {
      await fetchCollectedRewards();
      throw new Error(result.message);
    }

    const nextRedeemedAt = redeemed ? new Date().toISOString() : null;
    setCollectedRewards((prev) =>
      prev.map((reward) =>
        reward.collection_id === collectionId
          ? { ...reward, redeemed_at: nextRedeemedAt }
          : reward
      )
    );
  }, [fetchCollectedRewards]);

  useEffect(() => {
    fetchCollectedRewards();
  }, [fetchCollectedRewards]);

  return {
    collectedRewards,
    isLoading,
    error,
    fetchCollectedRewards,
    markRedeemed,
  };
};
