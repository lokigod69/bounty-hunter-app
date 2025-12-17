// src/context/AuthContext.tsx
// R6 FIX: Shared auth context so all components see the same profile state
// Previously, useAuth was a standalone hook where each component had its own state copy

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/custom';  // R25: Use custom Profile type with partner_user_id
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

      console.log('[AuthContext] Initial session:', session?.user?.id);
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

        console.log('[AuthContext] Auth state changed:', _event, session?.user?.id);
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
    if (!session?.user) {
      setProfile(null);
      setProfileLoading(false);
      ensuringUserIdRef.current = null;
      return;
    }

    if (ensuringUserIdRef.current === session.user.id) {
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      try {
        ensuringUserIdRef.current = session.user.id;
        // R17: Log before calling ensureProfileForUser
        console.log('[AuthContext] loadProfile start', {
          userId: session.user.id,
          userEmail: session.user.email,
        });
        setProfileLoading(true);
        setProfileError(null);

        const profileData = await ensureProfileForUser(supabase, session.user);

        if (cancelled) {
          console.log('[AuthContext] Profile load cancelled, ignoring result');
          return;
        }

        if (profileData) {
          // R17: Enhanced logging to track avatar_url through pipeline - log FULL URL
          console.log('[AuthContext] Profile loaded successfully', {
            id: profileData.id,
            display_name: profileData.display_name,
            avatar_url: profileData.avatar_url, // R17: Log FULL URL
            avatar_url_short: profileData.avatar_url?.substring(0, 60) || 'NULL',
            hasAvatar: !!profileData.avatar_url,
            updated_at: profileData.updated_at,
          });
          setProfile(profileData);
          setProfileError(null);
        } else {
          console.warn('[AuthContext] No profile returned for user:', session.user.id.substring(0, 8));
          setProfile(null);
          setProfileError(null);
        }
      } catch (err) {
        if (cancelled) {
          console.log('[AuthContext] Profile load error ignored (cancelled)');
          return;
        }

        const error = err instanceof Error ? err : new Error(String(err));
        console.error('[AuthContext] Error loading profile:', error);
        setProfileError(error);
        setProfile(null);
      } finally {
        // R12 FIX: Always set profileLoading to false and reset ref
        // Previously, if cancelled=true, profileLoading stayed stuck at true
        console.log('[AuthContext] Profile loading complete, cancelled:', cancelled);
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
    if (!session?.user) {
      return;
    }

    ensuringUserIdRef.current = null;

    try {
      ensuringUserIdRef.current = session.user.id;
      console.log('[AuthContext] Force refreshing profile for user:', session.user.id);
      setProfileLoading(true);
      setProfileError(null);

      const profileData = await ensureProfileForUser(supabase, session.user);

      if (profileData) {
        // R17: Enhanced logging to track avatar_url through pipeline - log FULL URL
        console.log('[AuthContext] Profile refreshed successfully', {
          id: profileData.id,
          display_name: profileData.display_name,
          avatar_url: profileData.avatar_url, // R17: Log FULL URL
          avatar_url_short: profileData.avatar_url?.substring(0, 60) || 'NULL',
          hasAvatar: !!profileData.avatar_url,
          updated_at: profileData.updated_at,
        });
        setProfile(profileData);
        setProfileError(null);
      } else {
        console.warn('[AuthContext] Profile refresh returned null');
        setProfile(null);
        setProfileError(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[AuthContext] Error refreshing profile:', error);
      setProfileError(error);
      setProfile(null);
    } finally {
      console.log('[AuthContext] Profile refresh complete');
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
      console.log('[AuthContext] Setting partner:', partnerId);
      const { error } = await supabase
        .from('profiles')
        .update({ partner_user_id: partnerId })
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
