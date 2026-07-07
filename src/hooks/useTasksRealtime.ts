// src/hooks/useTasksRealtime.ts
// Phase 2.2: Shared realtime subscription for the `tasks` table.
// Wires postgres_changes into a debounced refetch so useAssignedContracts,
// useIssuedContracts, and useActionCounts all stay live without each
// hand-rolling their own channel.
//
// Pattern lifted from the orphaned realtime block in useTasks.ts (event
// '*', full refetch on any change, RLS scopes visibility) plus the
// StrictMode-hardening already proven in useFriends.ts: a channelRef guard
// that tears down any channel this hook instance still holds before
// creating a new one, subscribe/cleanup wrapped in try/catch, and a
// per-subscribe-attempt unique channel name (see channelSeq below) so a
// stale in-flight teardown can never collide with a fresh subscribe.

import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { debounce } from '../lib/debounce';

type TaskRow = Database['public']['Tables']['tasks']['Row'];

const REFETCH_DEBOUNCE_MS = 250;

// Monotonic counter shared by every hook instance. Guarantees each
// subscribe attempt gets a channel name Supabase Realtime has never seen
// before - including the two back-to-back subscribe attempts React
// StrictMode fires for the same component instance (mount -> cleanup ->
// mount), where a wall-clock timestamp could theoretically collide, and
// the case of two different hooks (e.g. useAssignedContracts +
// useIssuedContracts, both used by Dashboard.tsx) mounting at once.
let channelSeq = 0;

/**
 * Subscribes to `postgres_changes` on `tasks` (any event) and calls
 * `onChange` after a short debounce once things go quiet, so a burst of
 * events (e.g. several rows changing in one transaction) triggers one
 * refetch instead of many. RLS scopes which rows the current session
 * receives events for, so this is safe to mount from multiple hooks/pages
 * at once - each gets its own channel and its own debounce timer.
 *
 * `hookName` should be a short, stable label identifying the calling hook
 * (e.g. 'useAssignedContracts'). It's folded into the channel name purely
 * for readability in logs/dashboards - it does not need to be globally
 * unique by itself, the sequence number handles that.
 */
export function useTasksRealtime(
  userId: string | undefined,
  hookName: string,
  onChange: () => void
): void {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!userId) return;

    // Defensive teardown in case this effect instance already holds a
    // channel. Shouldn't happen outside StrictMode's double-invoke, but
    // it's cheap insurance against the exact bug class that once crashed
    // the app on desktop (duplicate UserCredits realtime channel).
    if (channelRef.current) {
      try {
        channelRef.current.unsubscribe();
      } catch {
        // best-effort cleanup only
      }
      channelRef.current = null;
    }

    const scheduleRefetch = debounce(() => onChangeRef.current(), REFETCH_DEBOUNCE_MS);
    const channelName = `tasks-realtime:${hookName}:${userId}:${++channelSeq}`;

    try {
      const channel = supabase
        .channel(channelName)
        .on<RealtimePostgresChangesPayload<TaskRow>>(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            // RLS scopes this to rows the current user can see.
          },
          () => {
            scheduleRefetch();
          }
        )
        .subscribe();

      channelRef.current = channel;
    } catch {
      channelRef.current = null;
    }

    return () => {
      scheduleRefetch.cancel();
      if (channelRef.current) {
        try {
          channelRef.current.unsubscribe();
          supabase.removeChannel(channelRef.current);
        } catch {
          // best-effort cleanup only
        }
        channelRef.current = null;
      }
    };
  }, [userId, hookName]);
}
