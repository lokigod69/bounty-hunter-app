// @vitest-environment happy-dom
import { StrictMode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { AuthProvider } from './AuthContext';

const native = vi.hoisted(() => ({
  addListener: vi.fn(), getLaunchUrl: vi.fn(), exchange: vi.fn(), setSession: vi.fn(), remove: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@capacitor/app', () => ({ App: native }));
vi.mock('../i18n', () => ({ default: { t: () => 'Please try again.' } }));
vi.mock('../lib/supabase', () => ({ supabase: { auth: {
  getSession: async () => ({ data: { session: null } }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
  exchangeCodeForSession: native.exchange,
  setSession: native.setSession,
} } }));

beforeEach(() => {
  vi.clearAllMocks();
  native.addListener.mockResolvedValue({ remove: native.remove });
  native.exchange.mockResolvedValue({ error: null });
  native.setSession.mockResolvedValue({ error: null });
});
afterEach(cleanup);

it('handles a cold-start callback once even when appUrlOpen repeats it in StrictMode', async () => {
  const callback = { url: 'bountyhunter://auth/callback?code=one-use-code' };
  native.getLaunchUrl.mockResolvedValue(callback);
  render(<StrictMode><AuthProvider><div>App</div></AuthProvider></StrictMode>);
  await waitFor(() => expect(native.exchange).toHaveBeenCalledWith('one-use-code'));
  const listener = native.addListener.mock.calls[native.addListener.mock.calls.length - 1][1];
  await act(() => listener(callback));
  expect(native.exchange).toHaveBeenCalledOnce();
});

it('handles warm-start tokens and ignores unrelated deep links', async () => {
  native.getLaunchUrl.mockResolvedValue(undefined);
  render(<AuthProvider><div>App</div></AuthProvider>);
  await waitFor(() => expect(native.getLaunchUrl).toHaveBeenCalledOnce());
  const listener = native.addListener.mock.calls[0][1];
  await act(() => listener({ url: 'bountyhunter://unrelated?code=bad' }));
  expect(native.exchange).not.toHaveBeenCalled();
  await act(() => listener({ url: 'bountyhunter://auth/callback#access_token=access&refresh_token=refresh' }));
  expect(native.setSession).toHaveBeenCalledWith({ access_token: 'access', refresh_token: 'refresh' });
  cleanup();
  expect(native.remove).toHaveBeenCalledOnce();
});
