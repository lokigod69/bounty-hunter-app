// src/hooks/useStanding.ts
// Design V2 Wave 2 (THE REGISTER §3.1): standing derives from lifetime earned.
// useStanding wraps the credits fetch; useRankUpWatcher turns a band increase
// into a single RANK_UP_EVENT for the ceremony layer.
//
// Identity safety (Codex session review, finding 1): credits state is tagged
// with the user it belongs to (dataUserId). Standing is `known` only while
// that tag matches the CURRENT session user — so a session swap that doesn't
// unmount Layout can never show account A's rank as account B's, and the
// watcher can never write A's band under B's storage key. `known` stays true
// through refetches (dataUserId persists while loading flips), preserving the
// Wave 0 law that populated chrome never unmounts.

import { useEffect, useRef } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { getStanding, type Standing, type StandingBand } from '../core/credits/standing.domain';
import { useUserCredits } from './useUserCredits';

export const RANK_UP_EVENT = 'bh:rank-up';

export interface RankUpEventDetail {
  band: StandingBand;
  earned: number;
}

export interface UseStandingResult {
  standing: Standing;
  /** True only while committed data belongs to the current session user. */
  known: boolean;
  /** The user the standing belongs to — use this for any per-user side effect. */
  forUserId: string | null;
  /** Spendable balance from the same fetch, so pages need only one hook. */
  credits: number | null;
  loading: boolean;
  error: string | null;
}

export function useStanding(): UseStandingResult {
  const user = useUser();
  const { credits, totalEarned, dataUserId, loading, error } = useUserCredits();
  const forUserId = user?.id ?? null;
  const known = forUserId !== null && dataUserId === forUserId;
  return {
    standing: getStanding(known ? totalEarned : null),
    known,
    forUserId,
    credits: known ? credits : null,
    loading,
    error,
  };
}

const bandStorageKey = (userId: string) => `bh:standing-band:${userId}`;

// In-memory last-observed band per user (Codex finding 2): updated BEFORE
// persistence and dispatch, so a throwing localStorage.setItem can never make
// the same transition re-fire on the next earned-credits change.
const lastObservedBandByUser = new Map<string, number>();

// Mounted ONCE (in Layout, like usePayoutWatcher). Baseline-first: the first
// band ever observed for a user on this device is stored silently, so a
// reinstall or new device never replays an old rank-up. Only a band increase
// observed after that baseline fires the ceremony.
export function useRankUpWatcher(forUserId: string | null, standing: Standing, known: boolean): void {
  // Earned rides along in a ref so the effect re-runs only on band changes.
  const earnedRef = useRef(standing.earned);
  earnedRef.current = standing.earned;

  useEffect(() => {
    if (!forUserId || !known) return;

    let stored: number | null = lastObservedBandByUser.get(forUserId) ?? null;
    if (stored === null) {
      try {
        const raw = localStorage.getItem(bandStorageKey(forUserId));
        if (raw !== null) {
          const parsed = parseInt(raw, 10);
          if (Number.isInteger(parsed)) stored = parsed;
        }
      } catch {
        /* storage unavailable → behave as first observation, never throw */
      }
    }

    if (stored === standing.band) {
      lastObservedBandByUser.set(forUserId, standing.band);
      return;
    }

    lastObservedBandByUser.set(forUserId, standing.band);
    try {
      localStorage.setItem(bandStorageKey(forUserId), String(standing.band));
    } catch {
      /* in-memory guard above still prevents re-firing this session */
    }

    if (stored !== null && standing.band > stored) {
      window.dispatchEvent(
        new CustomEvent<RankUpEventDetail>(RANK_UP_EVENT, {
          detail: { band: standing.band, earned: earnedRef.current },
        })
      );
    }
  }, [forUserId, known, standing.band]);
}
