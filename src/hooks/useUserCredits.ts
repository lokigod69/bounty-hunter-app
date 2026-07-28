// src/hooks/useUserCredits.ts
// Hook for fetching user credits balance
// Extracted from UserCredits.tsx for reuse

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { CREDITS_CHANGED_EVENT } from './usePayoutWatcher';

export const useUserCredits = () => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [credits, setCredits] = useState<number | null>(null);
  const [totalEarned, setTotalEarned] = useState<number | null>(null);
  // Which user the committed credits/totalEarned actually belong to. Guards
  // consumers (standing, rank-up) against reading account A's settled state
  // during the render window right after a session swap to account B.
  const [dataUserId, setDataUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Only the newest request commits: a payout-triggered refetch must not be
  // overwritten by a slower, older balance query finishing after it.
  const requestSeqRef = useRef(0);

  const fetchCredits = useCallback(async () => {
    requestSeqRef.current += 1;
    const seq = requestSeqRef.current;

    if (!user) {
      setLoading(false);
      setCredits(0);
      setTotalEarned(null);
      setDataUserId(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('user_credits')
        .select('balance, total_earned')
        .eq('user_id', user.id)
        .single();

      if (seq !== requestSeqRef.current) return; // superseded by a newer request

      if (dbError) {
        if (dbError.code === 'PGRST116' || (dbError.message.includes('JSON object requested, multiple (or no) rows returned') && !data)) {
          // No row yet — a genuinely-known zero for this user.
          setCredits(0);
          setTotalEarned(null);
          setDataUserId(user.id);
        } else {
          setError('Failed to load credits.');
          setCredits(0);
          setTotalEarned(null);
          setDataUserId(null);
        }
      } else if (data === null) {
        setCredits(0);
        setTotalEarned(null);
        setDataUserId(user.id);
      } else {
        setCredits(data?.balance ?? 0);
        setTotalEarned(typeof data.total_earned === 'number' ? data.total_earned : null);
        setDataUserId(user.id);
      }
    } catch (e: unknown) {
      if (seq !== requestSeqRef.current) return;
      let message = 'An unexpected error occurred.';
      if (e instanceof Error) {
        message = e.message;
      }
      setError(message);
      setCredits(0);
      setTotalEarned(null);
      setDataUserId(null);
    }
    if (seq === requestSeqRef.current) setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  useEffect(() => {
    const handleCreditsChanged = () => {
      void fetchCredits();
    };
    window.addEventListener(CREDITS_CHANGED_EVENT, handleCreditsChanged);
    return () => window.removeEventListener(CREDITS_CHANGED_EVENT, handleCreditsChanged);
  }, [fetchCredits]);

  return { credits, totalEarned, dataUserId, loading, error, refetch: fetchCredits };
};
