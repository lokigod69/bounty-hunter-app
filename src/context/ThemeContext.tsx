// src/context/ThemeContext.tsx
// P1: Theme System - Theme context provider and hook for theme selection
// Phase 2.6: theme persists to profiles for logged-in users.
// Hardening 2026-07-11 (theme-leak fix): the authenticated profile is now the
// authority and localStorage is only a cache. Public surfaces (login/invite,
// fresh accounts with profile.theme=null) can only ever render a PUBLIC_THEME_IDS
// theme, so a stale 'family'/'couple' left on the device by an earlier account
// or dev session can no longer leak. Logout clears the cache entirely.

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { ThemeId, ThemeDefinition } from '../theme/theme.types';
import {
  DEFAULT_THEME_ID,
  themesById,
  isThemeId,
  toPublicThemeId,
} from '../theme/themes';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

interface ThemeContextType {
  themeId: ThemeId;
  theme: ThemeDefinition;
  setThemeId: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'bounty_theme';

interface ThemeProviderProps {
  children: ReactNode;
}

function persistProfileTheme(userId: string, id: ThemeId) {
  const updatePayload = {
    theme: id,
  } as unknown as Database['public']['Tables']['profiles']['Update'];
  supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId)
    .then(({ error }) => {
      if (error) {
        console.warn('ThemeContext: failed to persist theme to profile:', error.message);
      }
    });
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // ThemeProvider is mounted inside AuthProvider (see App.tsx), so consuming the
  // auth context here is safe and does not create an import cycle (AuthContext
  // never imports ThemeContext).
  const { user, profile, profileLoading } = useAuth();

  // Device cache. May legitimately hold non-public values (internal/dev
  // accounts); the effective-theme computation below decides whether they may
  // actually render.
  const [cachedThemeId, setCachedThemeId] = useState<ThemeId>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_THEME_ID;
    }
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeId(stored) ? stored : DEFAULT_THEME_ID;
  });

  // True once the user explicitly picks a theme this session (onboarding card /
  // profile modal). An explicit pick outranks profile adoption until reload —
  // the profile object in AuthContext stays stale until its next refetch, so we
  // must not let it revert a choice the user just made.
  const explicitChoiceRef = useRef(false);

  const profileResolved = Boolean(user) && Boolean(profile) && !profileLoading;
  const profileTheme = profile?.theme;

  // Effective theme — what the app actually renders:
  // 1. an explicit user action this session wins;
  // 2. else an authenticated profile's persisted theme (any theme — this is how
  //    internal family/couple accounts keep working);
  // 3. else (logged out, still loading, or profile.theme null/invalid) only a
  //    public theme — stale device state must never surface a gated theme.
  const themeId: ThemeId = explicitChoiceRef.current
    ? cachedThemeId
    : profileResolved && isThemeId(profileTheme)
    ? profileTheme
    : toPublicThemeId(cachedThemeId);

  const theme = themesById[themeId];

  // Reflect the active mode on <html> so the --mode-accent CSS variables cascade app-wide.
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-mode', themeId);
    }
  }, [themeId]);

  // Logout / account switch: the previous account's theme (and any stale device
  // value) must not leak into public pages or the next account.
  const lastUserIdRef = useRef<string | null>(user?.id ?? null);
  useEffect(() => {
    const currentId = user?.id ?? null;
    if (lastUserIdRef.current === currentId) return;
    const hadUser = lastUserIdRef.current !== null;
    lastUserIdRef.current = currentId;
    if (hadUser) {
      explicitChoiceRef.current = false;
      localStorage.removeItem(THEME_STORAGE_KEY);
      setCachedThemeId(DEFAULT_THEME_ID);
    }
  }, [user]);

  // Once the authenticated profile resolves (and the user hasn't just picked a
  // theme themselves): adopt a valid profile.theme into the cache, or — for a
  // fresh account with no persisted theme — normalize account + cache to the
  // public default so the device's leftovers don't become the account's theme.
  const normalizedForUserRef = useRef<string | null>(null);
  useEffect(() => {
    if (!profileResolved || explicitChoiceRef.current) return;
    const uid = user?.id;
    if (!uid) return;

    if (isThemeId(profileTheme)) {
      if (profileTheme !== cachedThemeId) {
        setCachedThemeId(profileTheme);
        localStorage.setItem(THEME_STORAGE_KEY, profileTheme);
      }
      return;
    }

    // profile.theme is null/invalid → one-time normalization per account.
    if (normalizedForUserRef.current === uid) return;
    normalizedForUserRef.current = uid;
    if (cachedThemeId !== DEFAULT_THEME_ID) {
      setCachedThemeId(DEFAULT_THEME_ID);
    }
    localStorage.setItem(THEME_STORAGE_KEY, DEFAULT_THEME_ID);
    persistProfileTheme(uid, DEFAULT_THEME_ID);
  }, [profileResolved, profileTheme, cachedThemeId, user]);

  // Persist theme changes to localStorage AND (for logged-in users) to the
  // profile. localStorage is the immediate source of truth; the DB write is
  // fire-and-forget with a console.warn on failure.
  const setThemeId = (id: ThemeId) => {
    setCachedThemeId(id);
    localStorage.setItem(THEME_STORAGE_KEY, id);
    // A user action always wins over a later profile adoption.
    explicitChoiceRef.current = true;

    const userId = user?.id;
    if (userId) {
      persistProfileTheme(userId, id);
    }
  };

  const value: ThemeContextType = {
    themeId,
    theme,
    setThemeId,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
