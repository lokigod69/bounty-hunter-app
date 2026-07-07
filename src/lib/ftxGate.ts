// src/lib/ftxGate.ts
// P2: First-Time Experience gate - determines if user should see onboarding

import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import type { Database } from '../types/database';

const ONBOARDING_COMPLETED_KEY = 'bounty_onboarding_completed';

export interface FTXGateResult {
  shouldShowOnboarding: boolean;
  hasMissions: boolean;
  hasRewards: boolean;
}

/**
 * Checks if user should see the onboarding flow.
 * 
 * Returns true if:
 * - onboarding_completed flag is not set in localStorage
 * - AND user has no missions
 * - AND user has no rewards
 * 
 * Returns false if:
 * - profile.onboarding_completed is true (Phase 2.6: DB-persisted flag)
 * - OR onboarding_completed flag is set to 'true' in localStorage
 * - OR user already has missions or rewards (existing user)
 */
export async function checkFTXGate(
  userId: string | null,
  onboardingCompletedFlag?: boolean | null,
): Promise<FTXGateResult> {
  // Phase 2.6: the DB-persisted profile flag OR the localStorage cache count as
  // gate-passed. localStorage stays the immediate/offline source of truth.
  const onboardingCompleted =
    onboardingCompletedFlag === true ||
    localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';

  if (onboardingCompleted) {
    return {
      shouldShowOnboarding: false,
      hasMissions: false,
      hasRewards: false,
    };
  }

  if (!userId) {
    // Not logged in, don't show onboarding
    return {
      shouldShowOnboarding: false,
      hasMissions: false,
      hasRewards: false,
    };
  }

  // Check if user has any missions
  const { data: missionsData, error: missionsError } = await supabase
    .from('tasks')
    .select('id')
    .or(`created_by.eq.${userId},assigned_to.eq.${userId}`)
    .limit(1);

  const hasMissions = !missionsError && missionsData && missionsData.length > 0;

  // Check if user has any rewards (created or assigned)
  const { data: rewardsData, error: rewardsError } = await supabase
    .from('rewards_store')
    .select('id')
    .or(`creator_id.eq.${userId},assigned_to.eq.${userId}`)
    .limit(1);

  const hasRewards = !rewardsError && rewardsData && rewardsData.length > 0;

  // Show onboarding only if user has no missions AND no rewards
  const shouldShowOnboarding = !hasMissions && !hasRewards;

  return {
    shouldShowOnboarding,
    hasMissions,
    hasRewards,
  };
}

/**
 * Fire-and-forget: persist onboarding_completed to the current user's profile.
 * localStorage remains the immediate source of truth, so a Supabase failure only
 * produces a console.warn and never breaks the UX. No-op when logged out.
 */
async function persistOnboardingCompleted(value: boolean): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const updatePayload = {
      onboarding_completed: value,
    } as unknown as Database['public']['Tables']['profiles']['Update'];

    const { error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id);

    if (error) {
      console.warn('ftxGate: failed to persist onboarding_completed:', error.message);
    }
  } catch (err) {
    console.warn('ftxGate: failed to persist onboarding_completed:', err);
  }
}

/**
 * Marks onboarding as completed in localStorage (offline cache) AND, for
 * logged-in users, persists onboarding_completed = true to the profile.
 */
export function markOnboardingCompleted(): void {
  localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
  void persistOnboardingCompleted(true);
}

/**
 * Clears the onboarding completed flag (for testing / restarting onboarding).
 * Also resets onboarding_completed = false in the DB (used by Restart Onboarding).
 */
export function clearOnboardingFlag(): void {
  localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
  void persistOnboardingCompleted(false);
}

/**
 * Hook version of FTX gate logic for use in components.
 * Returns ready state and whether to redirect to onboarding.
 * Does NOT use any router hooks - pure data fetching only.
 */
export function useFTXGateLogic(
  userId: string | null | undefined,
  loading: boolean,
  onboardingCompleted?: boolean | null,
) {
  const [ready, setReady] = useState(false);
  const [shouldRedirectToOnboarding, setShouldRedirectToOnboarding] = useState(false);

  useEffect(() => {
    async function checkGate() {
      if (loading) {
        setReady(false);
        return;
      }

      if (!userId) {
        // Not logged in, don't gate
        setReady(true);
        setShouldRedirectToOnboarding(false);
        return;
      }

      const result = await checkFTXGate(userId, onboardingCompleted);
      setShouldRedirectToOnboarding(result.shouldShowOnboarding);
      setReady(true);
    }

    checkGate();
  }, [userId, loading, onboardingCompleted]);

  return { ready, shouldRedirectToOnboarding };
}
