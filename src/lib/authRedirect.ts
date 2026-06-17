import { Capacitor } from '@capacitor/core';

export const IOS_AUTH_REDIRECT_URL = 'bountyhunter://auth/callback';

export interface SupabaseAuthCallbackParams {
  code?: string;
  accessToken?: string;
  refreshToken?: string;
}

export function getAuthRedirectTo(path = '/login'): string | undefined {
  if (Capacitor.isNativePlatform()) {
    return IOS_AUTH_REDIRECT_URL;
  }

  if (typeof window === 'undefined') {
    return undefined;
  }

  return new URL(path, window.location.origin).toString();
}

export function parseSupabaseAuthCallback(url: string): SupabaseAuthCallbackParams {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return {};
  }

  if (parsed.protocol !== 'bountyhunter:' || parsed.host !== 'auth' || parsed.pathname !== '/callback') {
    return {};
  }

  const code = parsed.searchParams.get('code') ?? undefined;
  const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  const accessToken = hashParams.get('access_token') ?? undefined;
  const refreshToken = hashParams.get('refresh_token') ?? undefined;

  return {
    ...(code ? { code } : {}),
    ...(accessToken ? { accessToken } : {}),
    ...(refreshToken ? { refreshToken } : {}),
  };
}
