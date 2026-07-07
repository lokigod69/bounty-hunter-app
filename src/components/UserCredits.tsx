// src/components/UserCredits.tsx
// Phase 8: Credit System UI - User Credits Display Widget for Header
// Fetches and displays the current user's actual credit balance from Supabase.
// Fixed lint errors for catch block type and potential null in toLocaleString.
// Phase 12.1: Added real-time subscription to user_credits table for automatic balance updates.
// Changes:
// - Replaced '🪙' emoji with custom SpinningCoinIcon.
// - Added logic to initialize user_credits record with 0 balance if not found for an authenticated user, using upsert to prevent conflicts.
// MOBILE FIX: Disabled realtime subscriptions on mobile devices to prevent WebSocket connection storms.

import React, { useEffect, useState, useRef } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { Coin } from './visual/Coin';

// Several UserCredits instances can be mounted at once (desktop header, mobile
// pill, mobile menu). Supabase channels are deduped by topic and throw on a
// second subscribe, so every instance needs its own channel name.
let channelSeq = 0;

const useUserCredits = () => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCredits = async () => {
      if (!user) {
        setLoading(false);
        // setError('User not authenticated.'); // Optional: set error if no user
        setCredits(0); // Show 0 if no user
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: dbError } = await supabase
          .from('user_credits') // As per user feedback
          .select('balance')    // As per user feedback
          .eq('user_id', user.id)
          .single();

        if (dbError) {
          // Check if the error is because the user_credits record doesn't exist (e.g., Supabase code PGRST116)
          // Or if data is null when .single() is used and no row is found.
          if (dbError.code === 'PGRST116' || (dbError.message.includes('JSON object requested, multiple (or no) rows returned') && !data)) { 
            try {
              // Use upsert to prevent conflict if record already exists
              const { error: upsertError } = await supabase
                .from('user_credits')
                .upsert({ user_id: user.id, balance: 0 }, { onConflict: 'user_id' });

              if (upsertError) {
                setError('Failed to initialize credits.');
                setCredits(0);
              } else {
                setCredits(0); // Set to 0 as it's either new or we are re-fetching after this anyway
              }
            } catch (initError: unknown) {
              let initMessage = 'An unexpected error occurred during credit initialization.';
              if (initError instanceof Error) initMessage = initError.message;
              setError(initMessage);
              setCredits(0);
            }
          } else {
            setError('Failed to load credits.');
            setCredits(0); // Show 0 on other errors
          }
        } else if (data === null) {
            // This case handles when .single() returns null (no record) without an explicit PGRST116 error
            try {
              // Use upsert to prevent conflict if record already exists
              const { error: upsertError } = await supabase
                .from('user_credits')
                .upsert({ user_id: user.id, balance: 0 }, { onConflict: 'user_id' });

              if (upsertError) {
                setError('Failed to initialize credits.');
                setCredits(0);
              } else {
                setCredits(0); // Set to 0 as it's either new or we are re-fetching after this anyway
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
      } catch (e: unknown) { // Changed from any to unknown for better type safety
        let message = 'An unexpected error occurred.';
        if (e instanceof Error) {
          message = e.message;
        }
        setError(message);
        setCredits(0); // Show 0 on exception
      }
      setLoading(false);
    };

    fetchCredits();

    // Set up real-time subscription for credit changes (disabled on mobile to prevent connection issues)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    
    if (user && !isMobile) {
      const channel = supabase
        .channel(`user_credits_changes_${user.id}_${++channelSeq}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_credits',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchCredits(); // Re-fetch credits when a change is detected
          }
        )
        .subscribe();

      // Cleanup subscription on component unmount with error handling
      return () => {
        try {
          supabase.removeChannel(channel);
        } catch {
          // Silently handle cleanup errors to prevent console spam
        }
      };
    }
  }, [user, supabase]); // Removed unnecessary dependencies to reduce re-renders

  return { credits, loading, error };
};

// Smoothly animates the displayed balance when it changes (the "living credit HUD").
function useCountUp(target: number, duration = 600): number {
  const [value, setValue] = useState(target);
  const prevRef = useRef(target);
  useEffect(() => {
    const from = prevRef.current;
    const to = target;
    if (from === to) return;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      prevRef.current = to;
      setValue(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + (to - from) * eased);
      // Keep the ref on the last rendered value so an animation interrupted
      // by a new target resumes from what's on screen, not a stale balance.
      prevRef.current = next;
      setValue(next);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

const UserCredits: React.FC = () => {
  const { credits, loading, error } = useUserCredits();
  const animatedValue = useCountUp(credits ?? 0);

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-slate-400">
        <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
        <span>Loading credits...</span>
      </div>
    );
  }

  if (error) {
    // Display 0 credits with an error indicator
    return (
      <div className="credit-badge">
        <Coin size="sm" variant="subtle-spin" label="¢" showValue={false} className="mr-2" />
        <span>0</span>
      </div>
    );
  }

  // Show 0 if not loading and credits is still null
  if (credits === null && !loading) {
     return (
      <div className="credit-badge">
        <Coin size="sm" variant="subtle-spin" label="¢" showValue={false} className="mr-2" />
        <span>0</span>
      </div>
    );
  }

  // Format credits for compact display (1.2k for 1200, etc.)
  const formatCredits = (value: number): string => {
    if (value >= 10000) return `${(value / 1000).toFixed(0)}k`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toLocaleString();
  };

  return (
    <div className="credit-badge">
      {/* Decorative coin with ¢ symbol - balance shown as text */}
      <Coin size="sm" variant="subtle-spin" label="¢" showValue={false} className="mr-2" />
      <span>{formatCredits(animatedValue)}</span>
    </div>
  );
};

export default UserCredits;
