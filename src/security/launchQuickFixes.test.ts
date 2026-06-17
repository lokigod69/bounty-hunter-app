import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), 'utf8');
}

describe('launch quick-fix regressions', () => {
  it('uses route identity instead of literal Guild Roster text for the pending-request badge', () => {
    const source = readRepoFile('src/components/Layout.tsx');

    expect(source).not.toContain("item.name === 'Guild Roster'");
    expect(source).toContain("item.path === '/friends'");
  });

  it('keeps reward lightbox scroll locking and z-index on the shared overlay system', () => {
    const source = readRepoFile('src/components/modals/RewardImageLightbox.tsx');

    expect(source).not.toContain('document.body.style.overflow');
    expect(source).toContain('lockScroll');
    expect(source).toContain('unlockScroll');
    expect(source).toContain('z-critical-overlay');
  });

  it('does not leave /my-rewards pointed at an under-construction page', () => {
    const source = readRepoFile('src/App.tsx');

    expect(source).not.toContain('MyCollectedRewardsPage');
    expect(source).toContain('path="my-rewards"');
    expect(source).toContain('to="/rewards-store?tab=collected"');
  });

  it('keeps public onboarding Guild-only for V1', () => {
    const source = readRepoFile('src/components/onboarding/OnboardingStep1Mode.tsx');

    expect(source).toContain("PUBLIC_ONBOARDING_THEME_IDS: ThemeId[] = ['guild']");
    expect(source).not.toContain('Object.values(themesById).map');
  });

  it('keeps the profile mode switcher internal/dev-only for non-Guild modes', () => {
    const source = readRepoFile('src/components/ProfileEditModal.tsx');

    expect(source).toContain('VISIBLE_PROFILE_MODE_OPTIONS');
    expect(source).toContain('import.meta.env.DEV');
  });
});
