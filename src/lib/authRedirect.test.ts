import { beforeEach, describe, expect, it, vi } from 'vitest';

const isNativePlatform = vi.fn();

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform,
  },
}));

describe('getAuthRedirectTo', () => {
  beforeEach(() => {
    isNativePlatform.mockReturnValue(false);
    vi.stubGlobal('window', {
      location: {
        origin: 'https://app.example.com',
      },
    });
  });

  it('keeps web redirects on the current origin', async () => {
    const { getAuthRedirectTo } = await import('./authRedirect');

    expect(getAuthRedirectTo()).toBe('https://app.example.com/login');
  });

  it('uses the iOS custom URL scheme on native platforms', async () => {
    isNativePlatform.mockReturnValue(true);
    const { getAuthRedirectTo } = await import('./authRedirect');

    expect(getAuthRedirectTo()).toBe('bountyhunter://auth/callback');
  });
});

describe('parseSupabaseAuthCallback', () => {
  it('extracts a PKCE code from a custom scheme callback', async () => {
    const { parseSupabaseAuthCallback } = await import('./authRedirect');

    expect(parseSupabaseAuthCallback('bountyhunter://auth/callback?code=abc123')).toEqual({
      code: 'abc123',
    });
  });

  it('extracts implicit tokens from callback hash params', async () => {
    const { parseSupabaseAuthCallback } = await import('./authRedirect');

    expect(
      parseSupabaseAuthCallback(
        'bountyhunter://auth/callback#access_token=access&refresh_token=refresh'
      )
    ).toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
    });
  });

  it('ignores non-auth callback URLs', async () => {
    const { parseSupabaseAuthCallback } = await import('./authRedirect');

    expect(parseSupabaseAuthCallback('https://app.example.com/login?code=abc123')).toEqual({});
  });
});
