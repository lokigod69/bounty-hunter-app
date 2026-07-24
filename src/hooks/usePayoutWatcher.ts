import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { feedback } from '../utils/feedback';
import { useTasksRealtime } from './useTasksRealtime';

export const PAYOUT_EVENT = 'bh:payout';
export const CREDITS_CHANGED_EVENT = 'bh:credits-changed';

export interface PayoutTaskRow {
  id: string;
  status: string | null;
  reward_type: string | null;
  reward_text: string | null;
}

export interface PayoutEventDetail {
  taskId: string;
  amount: number;
}

export function detectPayouts(
  previousStatuses: ReadonlyMap<string, string | null>,
  nextRows: readonly PayoutTaskRow[]
): PayoutEventDetail[] {
  return nextRows.flatMap((row) => {
    if (
      previousStatuses.get(row.id) !== 'review' ||
      row.status !== 'completed' ||
      row.reward_type !== 'credit'
    ) {
      return [];
    }

    const amount = Number(row.reward_text);
    return Number.isFinite(amount) && amount > 0
      ? [{ taskId: row.id, amount }]
      : [];
  });
}

function statusMap(rows: readonly PayoutTaskRow[]): Map<string, string | null> {
  return new Map(rows.map((row) => [row.id, row.status]));
}

export function usePayoutWatcher(userId: string | undefined): void {
  const previousStatusesRef = useRef<Map<string, string | null>>(new Map());
  const baselineReadyRef = useRef(false);
  const activeUserRef = useRef<string | undefined>(undefined);
  // Serialization: overlapping initial/realtime/visibility queries must not
  // commit out of order (a delayed 'review' snapshot could roll the baseline
  // back and replay a payday). One request runs at a time; anything arriving
  // meanwhile coalesces into a single trailing rerun — this also covers an
  // approval landing between mount and the baseline SELECT returning.
  const inFlightRef = useRef(false);
  const queuedRef = useRef(false);
  // Ledger of task ids already celebrated this session — the last defence
  // against any replay path.
  const processedRef = useRef<Set<string>>(new Set());
  // Payouts observed while the tab was hidden queue here and land on return
  // to foreground instead of being silently dropped.
  const pendingCeremoniesRef = useRef<PayoutEventDetail[]>([]);

  const deliver = useCallback((payouts: readonly PayoutEventDetail[]) => {
    if (payouts.length === 0) return;
    payouts.forEach((payout) => {
      feedback.payday();
      window.dispatchEvent(new CustomEvent<PayoutEventDetail>(PAYOUT_EVENT, {
        detail: payout,
      }));
    });
    window.dispatchEvent(new Event(CREDITS_CHANGED_EVENT));
  }, []);

  const refetchPayouts = useCallback(async () => {
    if (!userId) return;
    if (inFlightRef.current) {
      queuedRef.current = true;
      return;
    }
    inFlightRef.current = true;
    const requestedUserId = userId;
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id,status,reward_type,reward_text')
        .eq('assigned_to', requestedUserId)
        .in('status', ['review', 'completed']);

      if (error || activeUserRef.current !== requestedUserId) return;

      const rows: PayoutTaskRow[] = data ?? [];
      const nextStatuses = statusMap(rows);

      // Login and first mount establish truth only. Existing completed work must
      // never replay as a fresh payday ceremony.
      if (!baselineReadyRef.current) {
        previousStatusesRef.current = nextStatuses;
        baselineReadyRef.current = true;
        return;
      }

      const payouts = detectPayouts(previousStatusesRef.current, rows).filter(
        (payout) => !processedRef.current.has(payout.taskId)
      );
      previousStatusesRef.current = nextStatuses;
      payouts.forEach((payout) => processedRef.current.add(payout.taskId));
      if (payouts.length === 0) return;

      if (document.hidden) {
        pendingCeremoniesRef.current.push(...payouts);
        return;
      }
      deliver(payouts);
    } finally {
      inFlightRef.current = false;
      if (queuedRef.current) {
        queuedRef.current = false;
        void refetchPayouts();
      }
    }
  }, [userId, deliver]);

  useEffect(() => {
    if (activeUserRef.current !== userId) {
      activeUserRef.current = userId;
      previousStatusesRef.current = new Map();
      baselineReadyRef.current = false;
      processedRef.current = new Set();
      pendingCeremoniesRef.current = [];
      queuedRef.current = false;
    }
    if (userId) void refetchPayouts();
  }, [refetchPayouts, userId]);

  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && userId) {
        const pending = pendingCeremoniesRef.current;
        pendingCeremoniesRef.current = [];
        deliver(pending);
        window.dispatchEvent(new Event(CREDITS_CHANGED_EVENT));
        void refetchPayouts();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refetchPayouts, userId, deliver]);

  useTasksRealtime(userId, 'usePayoutWatcher', () => {
    void refetchPayouts();
  });
}
