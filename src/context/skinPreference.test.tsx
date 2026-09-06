// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';
import { readSkin, SKIN_STORAGE_KEY } from '../theme/skins';

const from = vi.hoisted(() => vi.fn());
vi.mock('../lib/supabase', () => ({ supabase: { from } }));
vi.mock('./AuthContext', () => ({ useAuth: () => ({ user: { id: 'me' }, profile: { theme: 'guild' }, profileLoading: false }) }));
function Choices() {
  const { skinId, setSkinId, themeId } = useTheme();
  return <><output>{skinId} / {themeId}</output><button onClick={() => setSkinId('astral')}>Astral</button></>;
}
beforeEach(() => { localStorage.clear(); from.mockClear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('device skin preference', () => {
  it('falls back to Starlight for a missing or invalid saved skin', () => {
    expect(readSkin()).toBe('starlight');
    localStorage.setItem(SKIN_STORAGE_KEY, 'retired-skin');
    expect(readSkin()).toBe('starlight');
  });
  it('applies and restores a skin without changing the account palette or writing to Supabase', () => {
    const view = render(<ThemeProvider><Choices /></ThemeProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Astral' }));
    expect(screen.getByText('astral / guild')).toBeTruthy();
    expect(document.documentElement.dataset.skin).toBe('astral');
    expect(localStorage.getItem(SKIN_STORAGE_KEY)).toBe('astral');
    view.unmount();
    render(<ThemeProvider><Choices /></ThemeProvider>);
    expect(screen.getByText('astral / guild')).toBeTruthy();
    expect(from).not.toHaveBeenCalled();
  });
  it('still allows an in-session choice when storing it is unavailable', () => {
    render(<ThemeProvider><Choices /></ThemeProvider>);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage blocked'); });
    fireEvent.click(screen.getByRole('button', { name: 'Astral' }));
    expect(screen.getByText('astral / guild')).toBeTruthy();
  });
});
