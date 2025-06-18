// This file contains manually defined types for Supabase RPC functions
// that are not being automatically generated in `database.ts`.
// This serves as a workaround to resolve TypeScript errors.

export interface CreateRewardStoreItemArgs {
  p_name: string;
  p_description: string;
  p_image_url: string;
  p_credit_cost: number;
  p_creator_id: string; // UUID
}

export interface CreateRewardStoreItemResult {
  success: boolean;
  message: string;
  reward_id?: string; // UUID
}

export interface PurchaseRewardStoreItemArgs {
  p_reward_id: string; // UUID
  p_collector_id: string; // UUID
}

export interface PurchaseRewardStoreItemResult {
  success: boolean;
  message: string;
  collection_id?: string; // UUID
  reward_name?: string;
}
