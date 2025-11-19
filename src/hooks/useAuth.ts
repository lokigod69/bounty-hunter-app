// src/hooks/useAuth.ts
// Custom hook for handling authentication (Magic Link only)
// Removed Google OAuth functionality.
// Updated to use profile bootstrap helper for resilient profile creation.

import { useState, useEffect, useRef } from 'react';
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
  // Use ref to avoid dependency issues in useEffect
  const ensuringUserIdRef = useRef<string | null>(null);

  // Effect 1: Initialize session and set up auth state listener
  useEffect(() => {
    let isMounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      setAuthLoading(false); // Session initialization complete
      
      if (!session?.user) {
        setProfileLoading(false);
        ensuringUserIdRef.current = null;
      }
    });

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        setAuthLoading(false); // Session state change complete
        
        if (!session?.user) {
          setProfile(null);
          setProfileLoading(false);
          setProfileError(null);
          ensuringUserIdRef.current = null;
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Effect 2: Ensure profile when session changes
  // This effect depends ONLY on session, preventing duplicate calls
  useEffect(() => {
    if (!session?.user) {
      // No session → no profile
      setProfile(null);
      setProfileLoading(false);
      ensuringUserIdRef.current = null;
      return;
    }

    // Prevent duplicate calls - if already ensuring profile for this user, skip
    if (ensuringUserIdRef.current === session.user.id) {
      return;
    }

    let cancelled = false;

    async function ensureProfile() {
      try {
        ensuringUserIdRef.current = session.user.id;
        console.log('[useAuth] Starting profile ensure for user:', session.user.id);
        setProfileLoading(true);
        setProfileError(null);
        
        const profile = await ensureProfileForUser(supabase, session.user);
        
        if (!cancelled) {
          console.log('[useAuth] Profile ensured successfully:', profile.id);
          setProfile(profile);
          setProfileError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error(String(err));
          console.error('[useAuth] Error ensuring profile:', error);
          setProfileError(error);
          setProfile(null); // Clear profile on error
        }
      } finally {
        if (!cancelled) {
          console.log('[useAuth] Profile loading complete, setting profileLoading to false');
          setProfileLoading(false);
          ensuringUserIdRef.current = null;
        }
      }
    }

    ensureProfile();

    return () => {
      cancelled = true;
      // Don't clear ensuringUserIdRef here - let it be cleared in finally block
    };
  }, [session]); // Only depend on session - this prevents duplicate calls

  // Manual refresh function (for explicit refresh calls)
  const refreshProfile = async () => {
    if (!session?.user) {
      return;
    }

    // Force refresh by clearing the ref guard
    ensuringUserIdRef.current = null;
    
    try {
      ensuringUserIdRef.current = session.user.id;
      console.log('[useAuth] Force refreshing profile for user:', session.user.id);
      setProfileLoading(true);
      setProfileError(null);
      
      const profile = await ensureProfileForUser(supabase, session.user);
      
      console.log('[useAuth] Profile refreshed successfully:', profile.id);
      setProfile(profile);
      setProfileError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[useAuth] Error refreshing profile:', error);
      setProfileError(error);
      setProfile(null);
    } finally {
      console.log('[useAuth] Profile refresh complete, setting profileLoading to false');
      setProfileLoading(false);
      ensuringUserIdRef.current = null;
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

  // Combined loading state: true if auth is initializing OR profile is loading
  const loading = authLoading || profileLoading;

  // Explicit boolean flags for session and profile
  const hasSession = !!session;
  const hasProfile = !!profile;

  return {
    user,
    profile,
    session,
    loading,
    authLoading,
    profileLoading,
    hasSession,
    hasProfile,
    error,
    profileError,
    signOut,
    refreshProfile,
  };
}