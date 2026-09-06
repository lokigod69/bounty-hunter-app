export const SKIN_IDS = ['starlight', 'forged', 'astral'] as const;
export type SkinId = typeof SKIN_IDS[number];
export const SKIN_STORAGE_KEY = 'bounty_skin';

export function isSkinId(value: unknown): value is SkinId {
  return SKIN_IDS.some((id) => id === value);
}

export function readSkin(): SkinId {
  try {
    const stored = localStorage.getItem(SKIN_STORAGE_KEY);
    return isSkinId(stored) ? stored : 'starlight';
  } catch {
    return 'starlight';
  }
}
