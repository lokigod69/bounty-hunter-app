// src/context/AuthContext.tsx
// R6 FIX: Shared auth context so all components see the same profile state
// Previously, useAuth was a standalone hook where each component had its own state copy

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/database';
import { ensureProfileForUser } from '../lib/profileBootstrap';

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
        console.log('[AuthContext] Loading profile for user:', session.user.id);
        setProfileLoading(true);
        setProfileError(null);

        const profileData = await ensureProfileForUser(supabase, session.user);

        if (cancelled) {
          console.log('[AuthContext] Profile load cancelled, ignoring result');
          return;
        }

        if (profileData) {
          // R15: Enhanced logging to track avatar_url through pipeline
          console.log('[AuthContext] Profile loaded successfully:', {
            id: profileData.id.substring(0, 8),
            display_name: profileData.display_name,
            avatar_url: profileData.avatar_url?.substring(0, 50) || 'NULL',
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
        // R15: Enhanced logging to track avatar_url through pipeline
        console.log('[AuthContext] Profile refreshed successfully:', {
          id: profileData.id.substring(0, 8),
          display_name: profileData.display_name,
          avatar_url: profileData.avatar_url?.substring(0, 50) || 'NULL',
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
