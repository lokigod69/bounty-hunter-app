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
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<Error | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        ensureProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          ensureProfile(session.user);
        } else {
          setProfile(null);
          setProfileLoading(false);
          setProfileError(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const ensureProfile = async (user: User) => {
    try {
      setProfileLoading(true);
      setProfileError(null);
      const profile = await ensureProfileForUser(supabase, user);
      
      setProfile(profile);
      setProfileError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setProfileError(error);
      console.error('Error ensuring profile:', error);
    } finally {
      setProfileLoading(false);
      setLoading(false);
    }
  };


  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      setError((error as Error).message);
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await ensureProfile(user);
    }
  };

  return {
    user,
    profile,
    session,
    loading,
    profileLoading,
    error,
    profileError,
    signOut,
    refreshProfile,
  };
}