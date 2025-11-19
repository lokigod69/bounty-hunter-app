// src/domain/streaks.ts
// Domain functions for daily mission streak operations.
// Encapsulates Supabase calls for streak tracking.

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { computeNewStreakCount } from '../core/contracts/contracts.domain';

export interface StreakData {
  id: string;
  contract_id: string;
  user_id: string;
  streak_count: number;
  last_completion_date: string; // Date string (YYYY-MM-DD)
}

export interface UpdateStreakParams {
  missionId: string;
  userId: string;
  supabaseClient?: SupabaseClient;
}

/**
 * Fetches streak data for a specific contract and user.
 */
export async function getStreak(
  contractId: string,
  userId: string,
  supabaseClient: SupabaseClient = supabase
): Promise<StreakData | null> {
  const { data, error } = await supabaseClient
    .from('daily_mission_streaks')
    .select('*')
    .eq('contract_id', contractId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching streak:', error);
    return null;
  }

  return data;
}

/**
 * Updates or creates streak data after a completion.
 * Returns the new streak count.
 */
export async function updateStreakAfterCompletion(params: UpdateStreakParams): Promise<number> {
  const { missionId, userId, supabaseClient = supabase } = params;

  // Fetch existing streak
  const existingStreak = await getStreak(missionId, userId, supabaseClient);
  
  const now = new Date();
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format

  let newStreakCount: number;
  
  if (existingStreak) {
    // Compute new streak count
    newStreakCount = computeNewStreakCount(
      existingStreak.streak_count,
      existingStreak.last_completion_date ? new Date(existingStreak.last_completion_date) : null,
      now
    );

    // Update existing streak
    const { error } = await supabaseClient
      .from('daily_mission_streaks')
      .update({
        streak_count: newStreakCount,
        last_completion_date: todayStr,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingStreak.id);

    if (error) {
      console.error('Error updating streak:', error);
      throw error;
    }
  } else {
    // Create new streak (first completion)
    newStreakCount = 1;

    const { error } = await supabaseClient
      .from('daily_mission_streaks')
      .insert({
        contract_id: missionId,
        user_id: userId,
        streak_count: newStreakCount,
        last_completion_date: todayStr,
      });

    if (error) {
      console.error('Error creating streak:', error);
      throw error;
    }
  }

  return newStreakCount;
}

/**
 * Fetches streaks for multiple contracts at once.
 * Returns a map of contract_id -> streak data.
 */
export async function getStreaksForContracts(
  contractIds: string[],
  userId: string,
  supabaseClient: SupabaseClient = supabase
): Promise<Record<string, StreakData>> {
  if (contractIds.length === 0) {
    return {};
  }

  const { data, error } = await supabaseClient
    .from('daily_mission_streaks')
    .select('*')
    .in('contract_id', contractIds)
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching streaks:', error);
    return {};
  }

  const streakMap: Record<string, StreakData> = {};
  (data || []).forEach(streak => {
    streakMap[streak.contract_id] = streak;
  });

  return streakMap;
}

