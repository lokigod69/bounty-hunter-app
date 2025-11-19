// src/hooks/useAuth.ts
// Custom hook for handling authentication (Magic Link only)
// Removed Google OAuth functionality.
// Updated to use profile bootstrap helper for resilient profile creation.

import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/database';
import { ensureProfileForUser } from '../lib/profileBootstrap';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true); // Session initialization
  const [profileLoading, setProfileLoading] = useState(false); // Profile fetching
  const [error, setError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<Error | null>(null);
  
  // Track which user ID we're currently ensuring profile for to prevent duplicate calls
  const [ensuringUserId, setEnsuringUserId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      setAuthLoading(false); // Session initialization complete
      
      if (session?.user) {
        ensureProfile(session.user);
      } else {
        setProfileLoading(false);
        setEnsuringUserId(null);
      }
    });

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        setAuthLoading(false); // Session state change complete
        
        if (session?.user) {
          ensureProfile(session.user);
        } else {
          setProfile(null);
          setProfileLoading(false);
          setProfileError(null);
          setEnsuringUserId(null);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const ensureProfile = async (user: User, forceRefresh = false) => {
    // Prevent duplicate calls - if already ensuring profile for this user, skip
    // Unless forceRefresh is true (for refreshProfile)
    if (!forceRefresh && ensuringUserId === user.id) {
      return;
    }

    try {
      setEnsuringUserId(user.id);
      console.log('[useAuth] Starting profile ensure for user:', user.id);
      setProfileLoading(true);
      setProfileError(null);
      
      const profile = await ensureProfileForUser(supabase, user);
      
      console.log('[useAuth] Profile ensured successfully:', profile.id);
      setProfile(profile);
      setProfileError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[useAuth] Error ensuring profile:', error);
      setProfileError(error);
      setProfile(null); // Clear profile on error
    } finally {
      console.log('[useAuth] Profile loading complete, setting profileLoading to false');
      setProfileLoading(false);
      setEnsuringUserId(null);
    }
  };


  const signOut = async () => {
    try {
      setAuthLoading(true);
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      setError((error as Error).message);
      console.error('Error signing out:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await ensureProfile(user, true); // Force refresh even if profile exists
    }
  };

  // Combined loading state: true if auth is initializing OR profile is loading
  const loading = authLoading || profileLoading;

  return {
    user,
    profile,
    session,
    loading,
    authLoading,
    profileLoading,
    error,
    profileError,
    signOut,
    refreshProfile,
  };
}