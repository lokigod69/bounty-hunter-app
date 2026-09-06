import type { ThemeDefinition, ThemeId } from './theme.types';

// Persisted IDs stay compatible with existing profiles. These are appearances,
// never relationship types or authorization boundaries.
export const themesById: Record<ThemeId, ThemeDefinition> = {
  guild: { id: 'guild' },
  family: { id: 'family' },
  couple: { id: 'couple' },
};
export const DEFAULT_THEME_ID: ThemeId = 'guild';
export const PUBLIC_THEME_IDS: ThemeId[] = ['guild', 'family', 'couple'];
export function isThemeId(value: unknown): value is ThemeId {
  return value === 'guild' || value === 'family' || value === 'couple';
}
export function toPublicThemeId(value: unknown): ThemeId {
  return isThemeId(value) ? value : DEFAULT_THEME_ID;
}
