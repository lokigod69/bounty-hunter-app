// src/components/UserCredits.tsx
// Phase 8: Credit System UI - User Credits Display Widget for Header
// Fetches and displays the current user's actual credit balance from Supabase.
// Fixed lint errors for catch block type and potential null in toLocaleString.
// Changes:
// - Replaced '🪙' emoji with custom SpinningCoinIcon.

import React, { useEffect, useState } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import SpinningCoinIcon from './SpinningCoinIcon';

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
          console.error('Error fetching user credits:', dbError);
          setError('Failed to load credits.');
          setCredits(0); // Show 0 on error
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
        <SpinningCoinIcon size={18} className="mr-1" />
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
        <SpinningCoinIcon size={18} className="mr-1" />
        <span>0</span>
      </div>
    );
  }

  return (
    <div className="credit-badge">
      <SpinningCoinIcon size={18} className="mr-1" />
      {/* Ensure credits is treated as a number, defaulting to 0 if null */}
      <span>{(credits ?? 0).toLocaleString()}</span>
    </div>
  );
};

export default UserCredits;
