// src/hooks/useStanding.ts
// Design V2 Wave 2 (THE REGISTER §3.1): standing derives from lifetime earned.
// useStanding wraps the credits fetch; useRankUpWatcher turns a band increase
// into a single RANK_UP_EVENT for the ceremony layer.

import { useEffect, useRef } from 'react';
import { getStanding, type Standing, type StandingBand } from '../core/credits/standing.domain';
import { useUserCredits } from './useUserCredits';

export const RANK_UP_EVENT = 'bh:rank-up';

export interface RankUpEventDetail {
  band: StandingBand;
  earned: number;
}

export interface UseStandingResult {
  standing: Standing;
  /** True only once real data has answered — never act on a loading zero. */
  known: boolean;
  loading: boolean;
  error: string | null;
}

export function useStanding(): UseStandingResult {
  const { totalEarned, loading, error } = useUserCredits();
  // Settle-once: after the first successful answer, standing stays known
  // through later refetches (loading flips true on every CREDITS_CHANGED) —
  // the Wave 0 law: populated chrome never unmounts to show nothing.
  const hasSettled = useRef(false);
  if (!loading && !error) hasSettled.current = true;
  return {
    standing: getStanding(totalEarned),
    known: hasSettled.current,
    loading,
    error,
  };
}

const bandStorageKey = (userId: string) => `bh:standing-band:${userId}`;

// Mounted ONCE (in Layout, like usePayoutWatcher). Baseline-first: the first
// band ever observed for a user on this device is stored silently, so a
// reinstall or new device never replays an old rank-up. Only a band increase
// observed after that baseline fires the ceremony.
export function useRankUpWatcher(userId: string | undefined, standing: Standing, known: boolean): void {
  useEffect(() => {
    if (!userId || !known) return;

    let stored: number | null = null;
    try {
      const raw = localStorage.getItem(bandStorageKey(userId));
      if (raw !== null) {
        const parsed = parseInt(raw, 10);
        if (!Number.isNaN(parsed)) stored = parsed;
      }
    } catch {
      /* storage unavailable → behave as first observation, never throw */
    }

    if (stored === standing.band) return;

    try {
      localStorage.setItem(bandStorageKey(userId), String(standing.band));
    } catch {
      /* if storage fails we may re-celebrate next session; acceptable */
    }

    if (stored !== null && standing.band > stored) {
      window.dispatchEvent(
        new CustomEvent<RankUpEventDetail>(RANK_UP_EVENT, {
          detail: { band: standing.band, earned: standing.earned },
        })
      );
    }
  }, [userId, known, standing.band, standing.earned]);
}
