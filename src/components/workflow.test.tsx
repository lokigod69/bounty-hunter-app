// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import en from '../i18n/locales/en/translation.json';
import { UIProvider } from '../context/UIContext';
import TaskForm from './TaskForm';
import FriendSelector from './FriendSelector';
import InvitePage from '../pages/InvitePage';
import { useAssignedContracts } from '../hooks/useAssignedContracts';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), friends: vi.fn(), redeem: vi.fn(), from: vi.fn(),
  user: { id: 'me', email: 'me@example.test' },
}));
vi.mock('../hooks/useFriends', () => ({ useFriends: mocks.friends }));
vi.mock('../hooks/useAuth', () => ({ useAuth: mocks.auth }));
vi.mock('../context/ThemeContext', () => ({ useTheme: () => ({ theme: { id: 'couple' }, themeId: 'couple' }) }));
vi.mock('../hooks/useInvite', () => ({ PENDING_INVITE_KEY: 'pending_invite_token', useInvite: () => ({ redeemInvite: mocks.redeem }) }));
vi.mock('../hooks/useTasksRealtime', () => ({ useTasksRealtime: vi.fn() }));
vi.mock('../lib/supabase', () => ({ supabase: { from: mocks.from } }));
vi.mock('../utils/feedback', () => ({ feedback: { tap: vi.fn(), success: vi.fn() } }));

const i18n = createInstance();
await i18n.use(initReactI18next).init({ lng: 'en', resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
function Wrapper({ children }: { children: React.ReactNode }) {
  return <I18nextProvider i18n={i18n}><MemoryRouter><UIProvider>{children}</UIProvider></MemoryRouter></I18nextProvider>;
}
const friends = [{ status: 'accepted', friend: { id: 'alex', display_name: 'Alex' } }, { status: 'accepted', friend: { id: 'sam', display_name: 'Sam' } }];
beforeEach(() => {
  localStorage.clear();
  mocks.auth.mockReturnValue({ user: mocks.user, hasProfile: true, authLoading: false, profileLoading: false, profile: { partner_user_id: 'alex' } });
  if (!document.getElementById('overlay-root')) { const root = document.createElement('div'); root.id = 'overlay-root'; document.body.appendChild(root); }
  mocks.friends.mockReturnValue({ friends, loading: false, error: null });
  mocks.redeem.mockReset();
});
afterEach(cleanup);

describe('mission creation and recipients', () => {
  it('preserves a typed draft and recipient when the people list refreshes', () => {
    const props = { userId: 'me', onClose: vi.fn(), onSubmit: vi.fn(), initialAssignee: 'sam' };
    const view = render(<TaskForm {...props} />, { wrapper: Wrapper });
    const title = screen.getByLabelText(en.taskForm.contractTitleLabel) as HTMLInputElement;
    fireEvent.change(title, { target: { value: 'Water the plants' } });
    mocks.friends.mockReturnValue({ friends: [...friends], loading: false, error: null });
    view.rerender(<TaskForm {...props} />);
    expect(title.value).toBe('Water the plants');
    expect((screen.getByLabelText(en.taskForm.assignToLabel) as HTMLSelectElement).value).toBe('sam');
  });
  it('starts with optional details closed, while an explicit reward stays required', async () => {
    const submit = vi.fn();
    render(<TaskForm userId="me" initialAssignee="alex" onClose={vi.fn()} onSubmit={submit} />, { wrapper: Wrapper });
    expect(screen.getByText(en.workflow.moreDetails).closest('details')?.open).toBe(false);
    fireEvent.change(screen.getByLabelText(en.taskForm.contractTitleLabel), { target: { value: 'Walk Luna' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Mission' }));
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByText(en.taskForm.validation.rewardRequired)).toBeTruthy();
  });
  it('allows every connected person in Rose appearance, regardless of saved partner metadata', () => {
    const select = vi.fn();
    render(<FriendSelector selectedFriend="alex" setSelectedFriend={select} />, { wrapper: Wrapper });
    const picker = screen.getByRole('combobox');
    fireEvent.change(picker, { target: { value: 'sam' } });
    expect(select).toHaveBeenCalledWith('sam');
    expect(screen.getByRole('option', { name: 'Alex' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Sam' })).toBeTruthy();
  });
});

it('keeps private proof paths intact when loading received missions', async () => {
  const task = { id: 'task', proof_url: 'me/task/photo.jpg', proof_type: 'image' };
  const query = { select: () => query, eq: () => query, then: (resolve: (value: unknown) => void) => Promise.resolve({ data: [task], error: null }).then(resolve) };
  mocks.from.mockReturnValue(query);
  const { result } = renderHook(useAssignedContracts);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.contracts[0].proof_url).toBe('me/task/photo.jpg');
});

it('retains a failed invitation, retries it, and clears it only after success', async () => {
  mocks.redeem.mockResolvedValueOnce({ success: false, message: 'Connection interrupted' })
    .mockResolvedValueOnce({ success: true, message: 'Connected with Alex' });
  render(<React.StrictMode><I18nextProvider i18n={i18n}><MemoryRouter initialEntries={['/invite/sample-token']}><Routes>
    <Route path="/invite/:token" element={<InvitePage />} />
  </Routes></MemoryRouter></I18nextProvider></React.StrictMode>);
  await screen.findByText('Connection interrupted');
  expect(localStorage.getItem('pending_invite_token')).toBe('sample-token');
  fireEvent.click(screen.getByRole('button', { name: en.common.tryAgain }));
  await screen.findByText('Connected with Alex');
  expect(localStorage.getItem('pending_invite_token')).toBeNull();
  expect(mocks.redeem).toHaveBeenCalledTimes(2);
});

it('shows a retry when profile bootstrap fails instead of losing the invite to a spinner', async () => {
  const retry = vi.fn();
  mocks.auth.mockReturnValue({ user: mocks.user, hasProfile: false, authLoading: false, profileLoading: false, profileError: new Error('offline'), refreshProfile: retry });
  render(<I18nextProvider i18n={i18n}><MemoryRouter initialEntries={['/invite/sample-token']}><Routes>
    <Route path="/invite/:token" element={<InvitePage />} />
  </Routes></MemoryRouter></I18nextProvider>);
  expect(screen.getByRole('alert')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: en.common.tryAgain }));
  expect(retry).toHaveBeenCalledOnce();
  expect(mocks.redeem).not.toHaveBeenCalled();
});
