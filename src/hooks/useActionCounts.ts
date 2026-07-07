// src/hooks/useActionCounts.ts
// Phase 2.2: Count-only data for nav action badges (Layout.tsx).
// Deliberately cheap: two `head: true, count: 'exact'` queries (no rows
// pulled back) rather than reusing useAssignedContracts/useIssuedContracts,
// which fetch full contract rows with profile joins - too heavy to mount
// in the always-on Layout shell. Kept live by the same shared
// useTasksRealtime subscription the contract hooks use.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useTasksRealtime } from './useTasksRealtime';

export interface ActionCounts {
  /** Issued tasks (created by me) sitting in 'review' - proofs awaiting my approval. */
  reviewCount: number;
  /** My assigned tasks sitting in 'rejected' - need a resubmit from me. */
  rejectedCount: number;
}

const EMPTY_COUNTS: ActionCounts = { reviewCount: 0, rejectedCount: 0 };

export function useActionCounts(): ActionCounts {
  const { user } = useAuth();
  const [counts, setCounts] = useState<ActionCounts>(EMPTY_COUNTS);

  const fetchCounts = useCallback(async () => {
    if (!user?.id) {
      setCounts(EMPTY_COUNTS);
      return;
    }

    const [reviewResult, rejectedResult] = await Promise.all([
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', user.id)
        .eq('is_archived', false)
        .eq('status', 'review'),
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .eq('is_archived', false)
        .eq('status', 'rejected'),
    ]);

    // Badges are non-critical nav chrome - on error, quietly keep whatever
    // counts we last had rather than toast-spamming from the shell layout.
    if (reviewResult.error || rejectedResult.error) {
      return;
    }

    setCounts({
      reviewCount: reviewResult.count ?? 0,
      rejectedCount: rejectedResult.count ?? 0,
    });
  }, [user?.id]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  useTasksRealtime(user?.id, 'useActionCounts', fetchCounts);

  return counts;
}
