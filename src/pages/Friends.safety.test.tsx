// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const mocks = vi.hoisted(() => ({ userId: 'account-a', list: vi.fn(), refresh: vi.fn() }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: mocks.userId }, profile: { id: mocks.userId }, profileLoading: false }) }));
vi.mock('../hooks/useFriends', () => ({ useFriends: () => ({ friends: [], pendingRequests: [], sentRequests: [], loading: false, error: null, refreshFriends: mocks.refresh }) }));
vi.mock('../hooks/useInvite', () => ({ useInvite: () => ({ shareInviteLink: vi.fn() }) }));
vi.mock('../hooks/useThemeStrings', () => ({ useThemeStrings: () => ({ strings: { friendsTitle: 'People', friendsTabLabel: 'People' } }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../lib/supabase', () => ({ supabase: {} }));
vi.mock('../lib/contactSafety', () => ({ contactSafetyEnabled: () => true, listBlockedPeople: mocks.list, lookupContacts: vi.fn() }));
vi.mock('../components/PersonSafety', () => ({ PersonSafety: () => null }));
import Friends from './Friends';
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('discards the prior account block list even when the new account request fails', async () => {
  mocks.userId = 'account-a';
  mocks.list.mockResolvedValueOnce([{ id: 'private-person', display_name: 'Private contact A', avatar_url: null }]);
  const { rerender } = render(<MemoryRouter><Friends /></MemoryRouter>);
  await waitFor(() => expect(screen.getByText('Private contact A')).toBeTruthy());
  mocks.userId = 'account-b'; mocks.list.mockRejectedValueOnce(new Error('connection failed'));
  rerender(<MemoryRouter><Friends /></MemoryRouter>);
  expect(screen.queryByText('Private contact A')).toBeNull();
  await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('safety.failed'));
  expect(screen.queryByText('Private contact A')).toBeNull();
});
