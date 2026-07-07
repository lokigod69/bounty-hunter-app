// src/context/ThemeContext.tsx
// P1: Theme System - Theme context provider and hook for theme selection
// Phase 2.6: theme now persists to profiles for logged-in users. localStorage
// stays the immediate/offline source of truth; DB writes are fire-and-forget so
// a Supabase failure never breaks the UX.

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { ThemeId, ThemeDefinition } from '../theme/theme.types';
import { DEFAULT_THEME_ID, themesById } from '../theme/themes';
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

function isThemeId(value: unknown): value is ThemeId {
  return value === 'guild' || value === 'family' || value === 'couple';
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // ThemeProvider is mounted inside AuthProvider (see App.tsx), so consuming the
  // auth context here is safe and does not create an import cycle (AuthContext
  // never imports ThemeContext).
  const { user, profile } = useAuth();

  // Initialize theme from localStorage or default
  const [themeId, setThemeIdState] = useState<ThemeId>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_THEME_ID;
    }

    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeId(stored)) {
      return stored;
    }

    return DEFAULT_THEME_ID;
  });

  // Resolution order: explicit persisted profile.theme (once auth loads) →
  // localStorage → default. To avoid clobbering a choice the user just made, we
  // only adopt profile.theme when localStorage had NO value at init; if the user
  // had a local value (or takes an action), that wins. This ref is what gates
  // that one-time adoption.
  const skipProfileAdoptRef = useRef<boolean>(
    typeof window !== 'undefined' && isThemeId(localStorage.getItem(THEME_STORAGE_KEY))
  );

  const theme = themesById[themeId];

  // Reflect the active mode on <html> so the --mode-accent CSS variables cascade app-wide.
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-mode', themeId);
    }
  }, [themeId]);

  // Adopt the persisted profile.theme once the auth profile becomes available,
  // but only on first load when localStorage had no value (fresh device). Any
  // later user action or pre-existing local value keeps precedence.
  useEffect(() => {
    if (skipProfileAdoptRef.current) return;
    const profileTheme = profile?.theme;
    if (!isThemeId(profileTheme)) return;

    // Lock further auto-adoption regardless of whether the value differs.
    skipProfileAdoptRef.current = true;
    if (profileTheme !== themeId) {
      setThemeIdState(profileTheme);
      localStorage.setItem(THEME_STORAGE_KEY, profileTheme);
    }
  }, [profile, themeId]);

  // Persist theme changes to localStorage AND (for logged-in users) to the
  // profile. localStorage is the immediate source of truth; the DB write is
  // fire-and-forget with a console.warn on failure.
  const setThemeId = (id: ThemeId) => {
    setThemeIdState(id);
    localStorage.setItem(THEME_STORAGE_KEY, id);
    // A user action always wins over a later profile adoption.
    skipProfileAdoptRef.current = true;

    const userId = user?.id;
    if (userId) {
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
