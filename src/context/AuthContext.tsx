// src/context/AuthContext.tsx
// R6 FIX: Shared auth context so all components see the same profile state
// Previously, useAuth was a standalone hook where each component had its own state copy

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/custom';
import { ensureProfileForUser } from '../lib/profileBootstrap';
import toast from 'react-hot-toast';
import { parseSupabaseAuthCallback } from '../lib/authRedirect';
import i18n from '../i18n';
import { stopNativePush,clearNativeNotifications } from '../lib/nativePush';

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

  const handledAuthUrls = useRef(new Set<string>());
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

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let listener: PluginListenerHandle | undefined;
    let cancelled = false;

    const completeSignIn = async ({ url }: { url: string }) => {
      if (cancelled || handledAuthUrls.current.has(url)) return;
      const authParams = parseSupabaseAuthCallback(url);
      if (!authParams.code && !(authParams.accessToken && authParams.refreshToken)) return;
      // A cold launch may also emit appUrlOpen. Exchange a single-use code once.
      handledAuthUrls.current.add(url);

      try {
        if (authParams.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(authParams.code);
          if (error) throw error;
        } else if (authParams.accessToken && authParams.refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: authParams.accessToken,
            refresh_token: authParams.refreshToken,
          });
          if (error) throw error;
        }
      } catch {
        handledAuthUrls.current.delete(url);
        toast.error(i18n.t('auth.login.unexpectedError'));
      }
    };
    App.addListener('appUrlOpen', completeSignIn).then(async (handle) => {
      if (cancelled) {
        handle.remove();
        return;
      }

      listener = handle;
      const launch = await App.getLaunchUrl();
      if (launch) await completeSignIn(launch);
    }).catch(() => {
      if (!cancelled) toast.error(i18n.t('auth.login.unexpectedError'));
    });

    return () => {
      cancelled = true;
      listener?.remove();
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

        const { profile: profileData, error: bootstrapError } = await ensureProfileForUser(
          supabase,
          ensuredSessionUser,
        );

        if (cancelled) {
          return;
        }

        if (bootstrapError) {
          setProfile(null);
          setProfileError(bootstrapError);
        } else {
          setProfile(profileData);
          setProfileError(null);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        const error = err instanceof Error ? err : new Error(String(err));
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

      const { profile: profileData, error: bootstrapError } = await ensureProfileForUser(
        supabase,
        ensuredSessionUser,
      );

      if (bootstrapError) {
        setProfile(null);
        setProfileError(bootstrapError);
      } else {
        setProfile(profileData);
        setProfileError(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setProfileError(error);
      setProfile(null);
    } finally {
      setProfileLoading(false);
      ensuringUserIdRef.current = null;
    }
  };

  const signOut = async () => {
    try {
      setAuthLoading(true);
      setError(null);
      await stopNativePush();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      await clearNativeNotifications();
    } catch (error) {
      setError((error as Error).message);
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  const loading = authLoading || profileLoading;
  const hasSession = !!session;
  // A new session can arrive before its profile request finishes. Never expose
  // the previous account's profile during that interval or after a failed read.
  const currentProfile = profile?.id === user?.id ? profile : null;
  const hasProfile = !!currentProfile;

  const value: AuthContextType = {
    user,
    profile: currentProfile,
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
