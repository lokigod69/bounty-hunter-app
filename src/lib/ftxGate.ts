// src/lib/ftxGate.ts
// P2: First-Time Experience gate - determines if user should see onboarding

import { useState, useEffect } from 'react';
import { supabase } from './supabase';

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
 * - onboarding_completed flag is set to 'true'
 * - OR user already has missions or rewards (existing user)
 */
export async function checkFTXGate(userId: string | null): Promise<FTXGateResult> {
  // Check localStorage flag first
  const onboardingCompleted = localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
  
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
 * Marks onboarding as completed in localStorage.
 * Optionally, can be extended to update profile table in the future.
 */
export function markOnboardingCompleted(): void {
  localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
}

/**
 * Clears the onboarding completed flag (for testing / restarting onboarding).
 */
export function clearOnboardingFlag(): void {
  localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
}

/**
 * Hook version of FTX gate logic for use in components.
 * Returns ready state and whether to redirect to onboarding.
 * Does NOT use any router hooks - pure data fetching only.
 */
export function useFTXGateLogic(userId: string | null | undefined, loading: boolean) {
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

      const result = await checkFTXGate(userId);
      setShouldRedirectToOnboarding(result.shouldShowOnboarding);
      setReady(true);
    }

    checkGate();
  }, [userId, loading]);

  return { ready, shouldRedirectToOnboarding };
}
