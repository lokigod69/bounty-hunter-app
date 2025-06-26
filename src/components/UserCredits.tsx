// src/components/UserCredits.tsx
// Phase 8: Credit System UI - User Credits Display Widget for Header
// Fetches and displays the current user's actual credit balance from Supabase.
// Fixed lint errors for catch block type and potential null in toLocaleString.
// Phase 12.1: Added real-time subscription to user_credits table for automatic balance updates.
// Changes:
// - Replaced '🪙' emoji with custom SpinningCoinIcon.
// - Added logic to initialize user_credits record with 0 balance if not found for an authenticated user, using upsert to prevent conflicts.

import React, { useEffect, useState } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import FlippingCoinIcon from './FlippingCoinIcon';

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
            console.log('No user_credits record found for user, attempting to create one.');
            try {
              // Use upsert to prevent conflict if record already exists
              const { error: upsertError } = await supabase
                .from('user_credits')
                .upsert({ user_id: user.id, balance: 0 }, { onConflict: 'user_id' });

              if (upsertError) {
                console.error('Error upserting user_credits record:', upsertError);
                setError('Failed to initialize credits.');
                setCredits(0);
              } else {
                console.log('Successfully ensured user_credits record exists (initialized with 0 balance if new).');
                setCredits(0); // Set to 0 as it's either new or we are re-fetching after this anyway
              }
            } catch (initError: unknown) {
              let initMessage = 'An unexpected error occurred during credit initialization.';
              if (initError instanceof Error) initMessage = initError.message;
              console.error('Exception upserting user_credits record:', initError);
              setError(initMessage);
              setCredits(0);
            }
          } else {
            console.error('Error fetching user credits:', dbError);
            setError('Failed to load credits.');
            setCredits(0); // Show 0 on other errors
          }
        } else if (data === null) {
            // This case handles when .single() returns null (no record) without an explicit PGRST116 error
            console.log('No user_credits record found (data is null), attempting to create one.');
            try {
              // Use upsert to prevent conflict if record already exists
              const { error: upsertError } = await supabase
                .from('user_credits')
                .upsert({ user_id: user.id, balance: 0 }, { onConflict: 'user_id' });

              if (upsertError) {
                console.error('Error upserting user_credits record:', upsertError);
                setError('Failed to initialize credits.');
                setCredits(0);
              } else {
                console.log('Successfully ensured user_credits record exists (initialized with 0 balance if new).');
                setCredits(0); // Set to 0 as it's either new or we are re-fetching after this anyway
              }
            } catch (initError: unknown) {
              let initMessage = 'An unexpected error occurred during credit initialization.';
              if (initError instanceof Error) initMessage = initError.message;
              console.error('Exception upserting user_credits record:', initError);
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
        console.error('Exception fetching user credits:', e);
        setError(message);
        setCredits(0); // Show 0 on exception
      }
      setLoading(false);
    };

    fetchCredits();

    // Set up real-time subscription for credit changes
    if (user) {
      const channel = supabase
        .channel(`user_credits_changes_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_credits',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('User credits changed:', payload);
            fetchCredits(); // Re-fetch credits when a change is detected
          }
        )
        .subscribe();

      // Cleanup subscription on component unmount
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, supabase]);

  return { credits, loading, error };
};

const UserCredits: React.FC = () => {
  const { credits, loading, error } = useUserCredits();

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-slate-400">
        <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
        <span>Loading credits...</span>
      </div>
    );
  }

  if (error) {
    // Display 0 credits with an error indicator or message if desired, 
    // but for now, let's ensure it shows 0 as per requirement.
    return (
      <div className="credit-badge">
        <FlippingCoinIcon className="mr-2 text-lg" />
        <span>0</span>
        {/* Optionally show a small error icon or tooltip here */}
      </div>
    );
  }

  // If loading is done and no error, credits should be a number (0 or more)
  // The (credits === null) check might be redundant if credits are initialized to 0 on error/no user
  if (credits === null && !loading) { // Ensure we show 0 if not loading and credits is still null
     return (
      <div className="credit-badge">
        <FlippingCoinIcon className="mr-2 text-lg" />
        <span>0</span>
      </div>
    );
  }

  return (
    <div className="credit-badge">
      <FlippingCoinIcon className="mr-2 text-lg" />
      {/* Ensure credits is treated as a number, defaulting to 0 if null */}
      <span>{(credits ?? 0).toLocaleString()}</span>
    </div>
  );
};

export default UserCredits;
