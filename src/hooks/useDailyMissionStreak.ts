// src/hooks/useDailyMissionStreak.ts
// P5: Hook for fetching and updating daily mission streaks

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { computeNewStreakCount } from '../core/contracts/contracts.domain';

export interface StreakData {
  id: string;
  contract_id: string;
  user_id: string;
  streak_count: number;
  last_completion_date: string; // Date string (YYYY-MM-DD)
}

/**
 * Fetches streak data for a specific contract and user.
 */
export const fetchStreak = async (
  contractId: string,
  userId: string
): Promise<StreakData | null> => {
  const { data, error } = await supabase
    .from('daily_mission_streaks')
    .select('*')
    .eq('contract_id', contractId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data;
};

/**
 * Updates or creates streak data after a completion.
 * Returns the new streak count.
 */
export const updateStreakAfterCompletion = async (
  contractId: string,
  userId: string
): Promise<number> => {
  // Fetch existing streak
  const existingStreak = await fetchStreak(contractId, userId);
  
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
    const { error } = await supabase
      .from('daily_mission_streaks')
      .update({
        streak_count: newStreakCount,
        last_completion_date: todayStr,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingStreak.id);

    if (error) {
      throw error;
    }
  } else {
    // Create new streak (first completion)
    newStreakCount = 1;

    const { error } = await supabase
      .from('daily_mission_streaks')
      .insert({
        contract_id: contractId,
        user_id: userId,
        streak_count: newStreakCount,
        last_completion_date: todayStr,
      });

    if (error) {
      throw error;
    }
  }

  return newStreakCount;
};

/**
 * Fetches streaks for multiple contracts at once.
 * Returns a map of contract_id -> streak data.
 */
export const fetchStreaksForContracts = async (
  contractIds: string[],
  userId: string
): Promise<Record<string, StreakData>> => {
  if (contractIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from('daily_mission_streaks')
    .select('*')
    .in('contract_id', contractIds)
    .eq('user_id', userId);

  if (error) {
    return {};
  }

  const streakMap: Record<string, StreakData> = {};
  (data || []).forEach(streak => {
    streakMap[streak.contract_id] = streak;
  });

  return streakMap;
};

/**
 * Hook for fetching streak data for a contract.
 */
export const useDailyMissionStreak = (contractId: string | null, userId: string | null) => {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStreakData = useCallback(async () => {
    if (!contractId || !userId) {
      setStreak(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchStreak(contractId, userId);
      setStreak(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch streak';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [contractId, userId]);

  return {
    streak,
    loading,
    error,
    refetch: fetchStreakData,
  };
};

