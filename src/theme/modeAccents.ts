// src/theme/modeAccents.ts
// Single source of truth for per-mode accent hex/RGB values (Guild/Family/Couple).
//
// SYNC NOTE: src/index.css defines the same values as CSS custom properties
// (--mode-accent / --mode-accent-rgb) in its `:root` block and the
// `[data-mode="family"]` / `[data-mode="couple"]` override blocks, because
// plain CSS can't import a TS module. If you change a hex here, update
// src/index.css to match (and vice versa) — search index.css for
// "--mode-accent:" to find both spots.
//
// Consumers: theme/modalTheme.ts, components/ProfileEditModal.tsx,
// components/onboarding/OnboardingStep1Mode.tsx.

import { ThemeId } from './theme.types';

export const MODE_ACCENT_HEX: Record<ThemeId, string> = {
  guild: '#20F9D2',
  family: '#F5D76E',
  couple: '#FF6FAE',
};

export const MODE_ACCENT_RGB: Record<ThemeId, string> = {
  guild: '32, 249, 210',
  family: '245, 215, 110',
  couple: '255, 111, 174',
};
