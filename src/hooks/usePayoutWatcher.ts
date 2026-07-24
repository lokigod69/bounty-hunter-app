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

  const refetchPayouts = useCallback(async () => {
    if (!userId) return;
    const requestedUserId = userId;
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

    const payouts = detectPayouts(previousStatusesRef.current, rows);
    previousStatusesRef.current = nextStatuses;
    if (payouts.length === 0 || document.hidden) return;

    payouts.forEach((payout) => {
      feedback.payday();
      window.dispatchEvent(new CustomEvent<PayoutEventDetail>(PAYOUT_EVENT, {
        detail: payout,
      }));
    });
    window.dispatchEvent(new Event(CREDITS_CHANGED_EVENT));
  }, [userId]);

  useEffect(() => {
    if (activeUserRef.current !== userId) {
      activeUserRef.current = userId;
      previousStatusesRef.current = new Map();
      baselineReadyRef.current = false;
    }
    if (userId) void refetchPayouts();
  }, [refetchPayouts, userId]);

  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && userId) {
        window.dispatchEvent(new Event(CREDITS_CHANGED_EVENT));
        void refetchPayouts();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refetchPayouts, userId]);

  useTasksRealtime(userId, 'usePayoutWatcher', () => {
    void refetchPayouts();
  });
}
