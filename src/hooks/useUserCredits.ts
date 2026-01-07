// src/hooks/useUserCredits.ts
// Hook for fetching user credits balance
// Extracted from UserCredits.tsx for reuse

import { useEffect, useState, useCallback } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';

export const useUserCredits = () => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCredits = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setCredits(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('user_credits')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (dbError) {
        if (dbError.code === 'PGRST116' || (dbError.message.includes('JSON object requested, multiple (or no) rows returned') && !data)) {
          try {
            const { error: upsertError } = await supabase
              .from('user_credits')
              .upsert({ user_id: user.id, balance: 0 }, { onConflict: 'user_id' });

            if (upsertError) {
              setError('Failed to initialize credits.');
              setCredits(0);
            } else {
              setCredits(0);
            }
          } catch (initError: unknown) {
            let initMessage = 'An unexpected error occurred during credit initialization.';
            if (initError instanceof Error) initMessage = initError.message;
            setError(initMessage);
            setCredits(0);
          }
        } else {
          setError('Failed to load credits.');
          setCredits(0);
        }
      } else if (data === null) {
        try {
          const { error: upsertError } = await supabase
            .from('user_credits')
            .upsert({ user_id: user.id, balance: 0 }, { onConflict: 'user_id' });

          if (upsertError) {
            setError('Failed to initialize credits.');
            setCredits(0);
          } else {
            setCredits(0);
          }
        } catch (initError: unknown) {
          let initMessage = 'An unexpected error occurred during credit initialization.';
          if (initError instanceof Error) initMessage = initError.message;
          setError(initMessage);
          setCredits(0);
        }
      } else {
        setCredits(data?.balance || 0);
      }
    } catch (e: unknown) {
      let message = 'An unexpected error occurred.';
      if (e instanceof Error) {
        message = e.message;
      }
      setError(message);
      setCredits(0);
    }
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  return { credits, loading, error, refetch: fetchCredits };
};
