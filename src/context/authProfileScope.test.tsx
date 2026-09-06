// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ subscribe: vi.fn(), ensure: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.mock('../i18n', () => ({ default: { t: () => 'Unavailable' } }));
vi.mock('../lib/profileBootstrap', () => ({ ensureProfileForUser: mocks.ensure }));
vi.mock('../lib/supabase', () => ({ supabase: { auth: {
  getSession: async () => ({ data: { session: { user: { id: 'account-a' } } } }),
  onAuthStateChange: mocks.subscribe,
} } }));
import { AuthProvider, useAuth } from './AuthContext';
function Consumer() { const auth = useAuth(); return <div data-testid="identity">{auth.user?.id}:{auth.profile?.display_name ?? 'no-profile'}:{String(auth.hasProfile)}</div>; }
afterEach(cleanup);
it('does not expose an old profile while the next account profile is loading or fails', async () => {
  mocks.subscribe.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  mocks.ensure.mockResolvedValueOnce({ profile: { id: 'account-a', display_name: 'Private A' }, error: null });
  render(<AuthProvider><Consumer /></AuthProvider>);
  await waitFor(() => expect(screen.getByTestId('identity').textContent).toBe('account-a:Private A:true'));
  let finish!: (result: unknown) => void;
  mocks.ensure.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  await act(() => mocks.subscribe.mock.calls[0][0]('SIGNED_IN', { user: { id: 'account-b' } }));
  expect(screen.getByTestId('identity').textContent).toBe('account-b:no-profile:false');
  await act(() => finish({ profile: null, error: new Error('offline') }));
  expect(screen.getByTestId('identity').textContent).toBe('account-b:no-profile:false');
});
