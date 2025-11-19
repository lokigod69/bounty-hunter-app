// src/domain/credits.ts
// Domain functions for credit operations.
// Encapsulates Supabase RPC calls for credit management.

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface GrantCreditsParams {
  userId: string;
  amount: number;
  reason?: string;
  supabaseClient?: SupabaseClient;
}

/**
 * Grants credits to a user.
 * 
 * Uses RPC: increment_user_credits
 * This creates the user_credits row if it doesn't exist.
 */
export async function grantCredits(params: GrantCreditsParams): Promise<void> {
  const { userId, amount, supabaseClient = supabase } = params;

  if (amount <= 0) {
    throw new Error('Credit amount must be positive.');
  }

  const { error } = await supabaseClient.rpc('increment_user_credits', {
    user_id_param: userId,
    amount_param: amount,
  });

  if (error) {
    throw error;
  }
}

/**
 * Gets the current credit balance for a user.
 * 
 * Returns 0 if no credits record exists.
 */
export async function getUserCredits(userId: string, supabaseClient: SupabaseClient = supabase): Promise<number> {
  const { data, error } = await supabaseClient
    .from('user_credits')
    .select('balance')
    .eq('user_id', userId)
    .single();

  if (error) {
    // If no row exists, return 0 (user hasn't earned credits yet)
    if (error.code === 'PGRST116') {
      return 0;
    }
    throw error;
  }

  return data?.balance ?? 0;
}

