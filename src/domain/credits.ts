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
 * Direct client-side credit grants are disabled.
 *
 * Credits must be awarded through trusted server-side RPC flows
 * (for example approve_task), not from browser code.
 */
export async function grantCredits(params: GrantCreditsParams): Promise<void> {
  const { userId, amount } = params;

  if (amount <= 0) {
    throw new Error('Credit amount must be positive.');
  }

  if (!userId) {
    throw new Error('User ID is required.');
  }

  throw new Error(
    'Direct client credit grants are disabled. Credits are awarded server-side via trusted approval RPCs.'
  );
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

