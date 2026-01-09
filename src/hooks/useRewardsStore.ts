// src/hooks/useRewardsStore.ts
// Custom hook for managing rewards store interactions.
// It interacts with the 'rewards_store' table and associated RPCs.
// Uses manually defined types from 'rpc-types.ts' for RPC arguments and results.
// RPC function names are cast to 'any' (with precisely placed ESLint disable comments)
// to bypass TypeScript constraint checks due to incomplete auto-generated Supabase function types in database.ts.
// The raw result from rpc() is then cast to our specific manual type.
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';
import { PostgrestError } from '@supabase/supabase-js';
import { useAuth } from './useAuth';
import { toast } from 'react-hot-toast';

// These types point to 'rewards_store'. They will throw TS errors until 'database.ts' is regenerated.
export type RewardStoreItem = Database['public']['Tables']['rewards_store']['Row'];
export type NewRewardStoreItemData = Pick<
  Database['public']['Tables']['rewards_store']['Insert'],
  'name' | 'description' | 'image_url' | 'credit_cost'
>;

export interface UseRewardsStoreReturn {
  rewards: RewardStoreItem[];
  isLoadingRewards: boolean;
  rewardsError: string | null;
  fetchRewards: () => Promise<void>;
  createReward: (rewardData: NewRewardStoreItemData) => Promise<{ success: boolean; reward_id?: string; message: string }>;
  isCreatingReward: boolean;
  createRewardError: string | null;
  purchaseReward: (rewardId: string) => Promise<{ success: boolean; message: string }>;
  isPurchasingReward: boolean;
  purchaseRewardError: string | null;
  triggerNotification: (rewardId: string, collectorId: string) => Promise<void>;
}

export const useRewardsStore = (): UseRewardsStoreReturn => {
  const { user } = useAuth();
  const [rewards, setRewards] = useState<RewardStoreItem[]>([]);
  const [isLoadingRewards, setIsLoadingRewards] = useState<boolean>(false);
  const [rewardsError, setRewardsError] = useState<string | null>(null);

  const [isCreatingReward, setIsCreatingReward] = useState<boolean>(false);
  const [createRewardError, setCreateRewardError] = useState<string | null>(null);

  const [isPurchasingReward, setIsPurchasingReward] = useState<boolean>(false);
  const [purchaseRewardError, setPurchaseRewardError] = useState<string | null>(null);

  const triggerNotification = async (rewardId: string, collectorId: string) => {
    try {
      const { error: functionError } = await supabase.functions.invoke('notify-reward-creator', {
        body: { reward_id: rewardId, collector_id: collectorId }, // Ensure body matches expected params of 'notify-reward-creator'
      });
      if (functionError) throw functionError;
    } catch {
      void 0;
    }
  };

  const fetchRewards = useCallback(async () => {
    setIsLoadingRewards(true);
    setRewardsError(null);
    try {
      // Don't filter by is_active - let My Bounties show redeemed items too
      const { data, error } = await supabase
        .from('rewards_store')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRewards(data || []);
    } catch (err) {
      const postgrestError = err as PostgrestError;
      const errorMessage = postgrestError.message || 'Failed to fetch rewards.';
      setRewardsError(errorMessage);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsLoadingRewards(false);
    }
  }, []);

  const createReward = async (newReward: NewRewardStoreItemData): Promise<{ success: boolean; reward_id?: string; message: string }> => {
    if (!user) {
      const msg = 'User must be logged in to create a reward.';
      toast.error(msg);
      return { success: false, message: msg };
    }

    setIsCreatingReward(true);
    setCreateRewardError(null);

    try {
      const { createReward: createRewardDomain } = await import('../domain/rewards');
      const result = await createRewardDomain({
        data: {
          p_name: newReward.name,
          p_description: newReward.description ?? '',
          p_image_url: newReward.image_url ?? '',
          p_credit_cost: newReward.credit_cost,
          p_assigned_to: user.id,
        },
        userId: user.id,
      });

      if (!result.success) {
        toast.error(result.message);
        return result;
      }

      toast.success(result.message);
      fetchRewards();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setCreateRewardError(errorMessage);
      toast.error(`Error creating reward: ${errorMessage}`);
      return { success: false, message: errorMessage };
    } finally {
      setIsCreatingReward(false);
    }
  };

  const purchaseReward = async (rewardId: string): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      const msg = 'User must be logged in to purchase a reward.';
      toast.error(msg);
      return { success: false, message: msg };
    }

    setIsPurchasingReward(true);
    setPurchaseRewardError(null);

    try {
      const { purchaseReward: purchaseRewardDomain } = await import('../domain/rewards');
      // RPC uses auth.uid() internally for security
      const result = await purchaseRewardDomain({
        rewardId,
      });

      if (!result.success) {
        toast.error(result.message);
        return result;
      }

      toast.success(result.message);
      fetchRewards();

      if (result.collection_id) {
        triggerNotification(rewardId, user.id);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setPurchaseRewardError(errorMessage);
      toast.error(`Error purchasing reward: ${errorMessage}`);
      return { success: false, message: errorMessage };
    } finally {
      setIsPurchasingReward(false);
    }
  };

  return {
    rewards,
    isLoadingRewards,
    rewardsError,
    fetchRewards,
    createReward,
    isCreatingReward,
    createRewardError,
    purchaseReward,
    isPurchasingReward,
    purchaseRewardError,
    triggerNotification // Expose if needed directly, though usually internal
  };
};
