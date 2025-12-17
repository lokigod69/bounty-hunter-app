// src/domain/rewards.ts
// Domain functions for reward store operations.
// Encapsulates Supabase RPC calls for reward lifecycle.

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

export type RewardId = string;

export interface PurchaseRewardParams {
  rewardId: RewardId;
  userId: string;
  supabaseClient?: SupabaseClient<Database>;
}

export interface CreateRewardParams {
  data: Database['public']['Functions']['create_reward_store_item']['Args'];
  userId: string;
  supabaseClient?: SupabaseClient<Database>;
  isOnboarding?: boolean; // If true, allows creating unassigned rewards without friendship check
}

export interface UpdateRewardParams {
  rewardId: RewardId;
  updates: Database['public']['Functions']['update_reward_store_item']['Args'];
  userId: string;
  supabaseClient?: SupabaseClient<Database>;
}

export interface DeleteRewardParams {
  rewardId: RewardId;
  userId: string;
  supabaseClient?: SupabaseClient<Database>;
}

export interface PurchaseRewardResult {
  success: boolean;
  message: string;
  collection_id?: string;
  reward_name?: string;
}

export interface CreateRewardResult {
  success: boolean;
  reward_id?: string;
  message: string;
}

/**
 * Purchases a reward from the store.
 * 
 * Uses RPC: purchase_reward_store_item
 * This handles:
 * - Validating purchase (not creator, not already claimed, sufficient credits)
 * - Deducting credits
 * - Creating collected_rewards entry
 */
export async function purchaseReward(params: PurchaseRewardParams): Promise<PurchaseRewardResult> {
  const { rewardId, userId, supabaseClient = supabase } = params;

  const rpcArgs = {
    p_reward_id: rewardId,
    p_collector_id: userId,
  };

  // RPC function name cast to 'any' to bypass constraint checks due to incomplete database.ts types.
  const { data: rawData, error: rpcError } = await (supabaseClient as any).rpc(
    'purchase_reward_store_item',
    rpcArgs
  );

  if (rpcError) {
    throw rpcError;
  }

  const data = rawData as PurchaseRewardResult | null;
  const rpcResponse = data as { success?: boolean; message?: string; collection_id?: string; reward_name?: string };

  if (rpcResponse && rpcResponse.success === false) {
    return {
      success: false,
      message: rpcResponse.message || 'Purchase failed.',
    };
  }

  return {
    success: true,
    message: rpcResponse?.message || 'Reward purchased successfully!',
    collection_id: rpcResponse?.collection_id,
    reward_name: rpcResponse?.reward_name,
  };
}

/**
 * Creates a new reward in the store.
 * 
 * Uses RPC: create_reward_store_item for normal creation (requires friendship).
 * For onboarding, inserts directly into rewards_store table to allow unassigned rewards.
 */
export async function createReward(params: CreateRewardParams): Promise<CreateRewardResult> {
  const { data: rewardData, userId, supabaseClient = supabase, isOnboarding = false } = params;

  // During onboarding, insert directly into table to bypass friendship requirement
  // This allows creating unassigned rewards (assigned_to = null) for later assignment
  if (isOnboarding) {
    // Type assertion needed because TypeScript types may not reflect nullable assigned_to
    // but the database schema should allow it for unassigned rewards
    const { data: inserted, error: insertError } = await (supabaseClient as any)
      .from('rewards_store')
      .insert({
        name: rewardData.p_name,
        description: rewardData.p_description || null,
        image_url: rewardData.p_image_url || null,
        credit_cost: rewardData.p_credit_cost,
        creator_id: userId,
        assigned_to: null, // Unassigned during onboarding - can be assigned later
      })
      .select('id')
      .single();

    if (insertError) {
      // Non-blocking error - return failure but don't throw
      // This allows onboarding to continue even if reward creation fails
      console.warn('[createReward] Onboarding reward creation failed:', insertError);
      return {
        success: false,
        message: insertError.message || 'Couldn\'t save this gift right now. You can create gifts later in the Gift Store.',
      };
    }

    return {
      success: true,
      reward_id: inserted.id,
      message: 'Reward created successfully! You can assign it to someone after inviting them.',
    };
  }

  // Normal flow: use RPC (requires friendship)
  const rpcArgs = {
    ...rewardData,
    p_creator_id: userId,
  };

  const { data: rawData, error: rpcError } = await (supabaseClient as any).rpc(
    'create_reward_store_item',
    rpcArgs
  );

  if (rpcError) {
    throw rpcError;
  }

  const rpcResponse = rawData as { success?: boolean; reward_id?: string; message?: string; error?: string };

  if (rpcResponse && rpcResponse.success === false) {
    return {
      success: false,
      message: rpcResponse.error || rpcResponse.message || 'Reward creation failed.',
    };
  }

  return {
    success: true,
    reward_id: rpcResponse?.reward_id,
    message: rpcResponse?.message || 'Reward created successfully!',
  };
}

/**
 * Updates an existing reward.
 * 
 * Uses RPC: update_reward_store_item
 */
export async function updateReward(params: UpdateRewardParams): Promise<void> {
  const { rewardId, updates, userId, supabaseClient = supabase } = params;

  const rpcArgs = {
    ...updates,
    p_bounty_id: rewardId,
  };

  const { error } = await (supabaseClient as any).rpc(
    'update_reward_store_item',
    rpcArgs
  );

  if (error) {
    throw error;
  }
}

/**
 * Deletes a reward from the store.
 * 
 * Uses RPC: delete_reward_store_item
 */
export async function deleteReward(params: DeleteRewardParams): Promise<void> {
  const { rewardId, userId, supabaseClient = supabase } = params;

  const { error } = await (supabaseClient as any).rpc(
    'delete_reward_store_item',
    {
      p_reward_id: rewardId,
    }
  );

  if (error) {
    throw error;
  }
}

