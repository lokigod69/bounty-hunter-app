// src/context/AuthContext.tsx
// R6 FIX: Shared auth context so all components see the same profile state
// Previously, useAuth was a standalone hook where each component had its own state copy

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/custom';  // R25: Use custom Profile type with partner_user_id
import type { Database } from '../types/database';
import { ensureProfileForUser } from '../lib/profileBootstrap';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  authLoading: boolean;
  profileLoading: boolean;
  hasSession: boolean;
  hasProfile: boolean;
  error: string | null;
  profileError: Error | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setPartner: (partnerId: string | null) => Promise<boolean>;  // R25: Set partner for couple mode
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<Error | null>(null);

  const ensuringUserIdRef = useRef<string | null>(null);

  // Effect 1: Initialize session and set up auth state listener
  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setAuthLoading(false);

      if (!session?.user) {
        setProfileLoading(false);
        ensuringUserIdRef.current = null;
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        setAuthLoading(false);

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
  useEffect(() => {
    const sessionUser = session?.user;

    if (!sessionUser) {
      setProfile(null);
      setProfileLoading(false);
      ensuringUserIdRef.current = null;
      return;
    }

    const ensuredSessionUser: User = sessionUser;

    if (ensuringUserIdRef.current === ensuredSessionUser.id) {
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      try {
        ensuringUserIdRef.current = ensuredSessionUser.id;
        setProfileLoading(true);
        setProfileError(null);

        const profileData = await ensureProfileForUser(supabase, ensuredSessionUser);

        if (cancelled) {
          return;
        }

        if (profileData) {
          setProfile(profileData);
          setProfileError(null);
        } else {
          setProfile(null);
          setProfileError(null);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        const error = err instanceof Error ? err : new Error(String(err));
        console.error('[AuthContext] Error loading profile:', error);
        setProfileError(error);
        setProfile(null);
      } finally {
        // R12 FIX: Always set profileLoading to false and reset ref
        // Previously, if cancelled=true, profileLoading stayed stuck at true
        setProfileLoading(false);
        ensuringUserIdRef.current = null;
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
      // R18 FIX: Clear the ref in cleanup so that if the effect re-runs
      // (due to React Strict Mode double-mount or actual session changes),
      // the guard doesn't incorrectly block the new run.
      // Without this, Strict Mode causes: run1 sets ref → cleanup → run2 sees ref → returns early → profile never loads
      ensuringUserIdRef.current = null;
    };
  }, [session]);

  const refreshProfile = async () => {
    const sessionUser = session?.user;

    if (!sessionUser) {
      return;
    }

    const ensuredSessionUser: User = sessionUser;

    ensuringUserIdRef.current = null;

    try {
      ensuringUserIdRef.current = ensuredSessionUser.id;
      setProfileLoading(true);
      setProfileError(null);

      const profileData = await ensureProfileForUser(supabase, ensuredSessionUser);

      if (profileData) {
        setProfile(profileData);
        setProfileError(null);
      } else {
        setProfile(null);
        setProfileError(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[AuthContext] Error refreshing profile:', error);
      setProfileError(error);
      setProfile(null);
    } finally {
      setProfileLoading(false);
      ensuringUserIdRef.current = null;
    }
  };

  // R25: Set partner_user_id for couple mode
  const setPartner = async (partnerId: string | null): Promise<boolean> => {
    if (!user) {
      toast.error('You must be logged in to set a partner.');
      return false;
    }

    try {
      const updatePayload = { partner_user_id: partnerId } as unknown as Database['public']['Tables']['profiles']['Update'];
      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', user.id);

      if (error) {
        console.error('[AuthContext] Error setting partner:', error);
        toast.error('Failed to set partner. Please try again.');
        return false;
      }

      // Update local profile state immediately
      if (profile) {
        setProfile({ ...profile, partner_user_id: partnerId });
      }

      toast.success(partnerId ? 'Partner selected!' : 'Partner cleared.');
      return true;
    } catch (err) {
      console.error('[AuthContext] Unexpected error setting partner:', err);
      toast.error('Failed to set partner. Please try again.');
      return false;
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

  const loading = authLoading || profileLoading;
  const hasSession = !!session;
  const hasProfile = !!profile && !!profile.id;

  const value: AuthContextType = {
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
    setPartner,  // R25
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
