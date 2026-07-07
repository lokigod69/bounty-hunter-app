// src/domain/rewards.ts
// Domain functions for reward store operations.
// Encapsulates Supabase RPC calls for reward lifecycle.

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

export type RewardId = string;

export interface PurchaseRewardParams {
  rewardId: RewardId;
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

export interface MarkRewardRedeemedResult {
  success: boolean;
  collection_id?: string;
  redeemed?: boolean;
  message: string;
}

/**
 * Purchases a reward from the store.
 *
 * Uses RPC: purchase_reward (atomic version with FOR UPDATE locking)
 * This handles:
 * - Validating purchase (not creator, not already claimed, sufficient credits)
 * - Deducting credits atomically (prevents race conditions)
 * - Creating collected_rewards entry
 * - Prevents negative balances and double-purchases
 */
export async function purchaseReward(params: PurchaseRewardParams): Promise<PurchaseRewardResult> {
  const { rewardId, supabaseClient = supabase } = params;

  // Get current user from session for the atomic RPC
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      message: 'You must be logged in to purchase rewards.',
    };
  }

  // Use atomic purchase_reward RPC with row-level locking
  const rpcArgs = {
    p_reward_id: rewardId,
    p_collector_id: user.id,
  };

  const { data: rawData, error: rpcError } = await supabaseClient.rpc('purchase_reward' as never, rpcArgs as never);

  if (rpcError) {
    // R32: Better error handling - extract useful information from Supabase errors
    // Common issues: function doesn't exist, permission denied, parameter mismatch
    const errorCode = (rpcError as { code?: string }).code;
    const errorHint = (rpcError as { hint?: string }).hint;
    const errorDetails = (rpcError as { details?: string }).details;

    let userMessage = rpcError.message || 'Failed to claim reward.';

    // Check for common error codes
    if (errorCode === '42883' || (rpcError.message?.includes('function') && rpcError.message?.includes('does not exist'))) {
      userMessage = 'Claim feature is temporarily unavailable. Please try again later.';
    } else if (errorCode === '42501' || rpcError.message?.includes('permission denied')) {
      userMessage = 'Permission denied. Please try logging out and back in.';
    } else if (errorHint) {
      userMessage = errorHint;
    } else if (errorDetails) {
      userMessage = errorDetails;
    }

    return {
      success: false,
      message: userMessage,
    };
  }

  const rpcResponse = rawData as {
    success?: boolean;
    message?: string;
    error?: string;
    collection_id?: string;
    reward_id?: string;
    reward_name?: string;
    new_balance?: number;
  } | null;

  if (rpcResponse && rpcResponse.success === false) {
    // Map specific error codes to user-friendly messages
    let message = rpcResponse.message || 'Purchase failed.';
    if (rpcResponse.error === 'INSUFFICIENT_FUNDS') {
      message = 'Not enough credits for this reward.';
    } else if (rpcResponse.error === 'ALREADY_COLLECTED') {
      message = 'You already have this reward!';
    } else if (rpcResponse.error === 'SELF_PURCHASE') {
      message = 'You cannot purchase your own reward.';
    } else if (rpcResponse.error === 'REWARD_NOT_FOUND') {
      message = 'This reward is no longer available.';
    }

    return {
      success: false,
      message,
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
 * Marks a collected reward as redeemed/delivered (or reverses that).
 *
 * Uses RPC: mark_reward_redeemed
 * The RPC enforces collector_id = auth.uid() and sets redeemed_at = now()
 * when p_redeemed is true, else null.
 * Returns json: on success { success: true, collection_id, redeemed },
 * on failure { success: false, error, message }
 * (error codes: NOT_AUTHENTICATED / BAD_REQUEST / NOT_FOUND / FORBIDDEN).
 */
export async function markRewardRedeemed(
  collectionId: string,
  redeemed: boolean,
  supabaseClient: SupabaseClient<Database> = supabase
): Promise<MarkRewardRedeemedResult> {
  const rpcArgs = {
    p_collection_id: collectionId,
    p_redeemed: redeemed,
  };

  const { data: rawData, error: rpcError } = await supabaseClient.rpc('mark_reward_redeemed' as never, rpcArgs as never);

  if (rpcError) {
    return {
      success: false,
      message: rpcError.message || 'Failed to update reward status.',
    };
  }

  const rpcResponse = rawData as {
    success?: boolean;
    error?: string;
    message?: string;
    collection_id?: string;
    redeemed?: boolean;
  } | null;

  if (!rpcResponse || rpcResponse.success === false) {
    return {
      success: false,
      message: rpcResponse?.message || 'Failed to update reward status.',
    };
  }

  return {
    success: true,
    collection_id: rpcResponse.collection_id,
    redeemed: rpcResponse.redeemed,
    message: rpcResponse.message || 'Reward status updated.',
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
    const { data: inserted, error: insertError } = await supabaseClient
      .from('rewards_store')
      .insert({
        name: rewardData.p_name,
        description: rewardData.p_description || null,
        image_url: rewardData.p_image_url || null,
        credit_cost: rewardData.p_credit_cost,
        creator_id: userId,
        assigned_to: null as unknown as string, // Unassigned during onboarding - can be assigned later
      })
      .select('id')
      .single();

    if (insertError) {
      // Non-blocking error - return failure but don't throw
      // This allows onboarding to continue even if reward creation fails
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
  const { data: rawData, error: rpcError } = await supabaseClient.rpc('create_reward_store_item' as never, rewardData as never);

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
  const { rewardId, updates, supabaseClient = supabase } = params;

  const rpcArgs = {
    ...updates,
    p_bounty_id: rewardId,
  };

  const { error } = await supabaseClient.rpc('update_reward_store_item' as never, rpcArgs as never);

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
  const { rewardId, supabaseClient = supabase } = params;

  const { error } = await supabaseClient.rpc('delete_reward_store_item' as never, { p_reward_id: rewardId } as never);

  if (error) {
    throw error;
  }
}

