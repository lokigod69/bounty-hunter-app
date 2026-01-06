// src/context/ThemeContext.tsx
// P1: Theme System - Theme context provider and hook for theme selection

import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { ThemeId, ThemeDefinition } from '../theme/theme.types';
import { DEFAULT_THEME_ID, themesById } from '../theme/themes';

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

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Initialize theme from localStorage or default
  const [themeId, setThemeIdState] = useState<ThemeId>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_THEME_ID;
    }
    
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && (stored === 'guild' || stored === 'family' || stored === 'couple')) {
      return stored as ThemeId;
    }
    
    return DEFAULT_THEME_ID;
  });

  const theme = themesById[themeId];

  // Persist theme changes to localStorage
  const setThemeId = (id: ThemeId) => {
    setThemeIdState(id);
    localStorage.setItem(THEME_STORAGE_KEY, id);
  };

  // Optional: Load from user profile if available (future enhancement)
  // For now, we stick to localStorage as per instructions

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

