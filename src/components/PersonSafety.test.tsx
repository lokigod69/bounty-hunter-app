// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
const mocks = vi.hoisted(() => ({ report: vi.fn(), block: vi.fn(), error: vi.fn() }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-hot-toast', () => ({ toast: { error: mocks.error } }));
vi.mock('../lib/contactSafety', () => ({ contactSafetyEnabled: () => import.meta.env.VITE_CONTACT_SAFETY_ENABLED === 'true', reportPerson: mocks.report, setPersonBlock: mocks.block }));
vi.mock('./ui/ModalShell', () => ({ ModalShell: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) => isOpen ? <div role="dialog">{children}</div> : null }));
vi.mock('./ui/AppButton', () => ({ AppButton: ({ children, variant, ...props }: { children: ReactNode; variant: string }) => <button data-variant={variant} {...props}>{children}</button> }));
import { PersonSafety } from './PersonSafety';

describe('person safety interactions', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('VITE_CONTACT_SAFETY_ENABLED', 'true'); });
  afterEach(() => { cleanup(); vi.unstubAllEnvs(); });
  it('is hidden before deployment and for oneself', () => {
    vi.stubEnv('VITE_CONTACT_SAFETY_ENABLED', 'false');
    const { rerender } = render(<PersonSafety personId="person" name="Alex" />);
    expect(screen.queryByRole('button')).toBeNull();
    vi.stubEnv('VITE_CONTACT_SAFETY_ENABLED', 'true'); rerender(<PersonSafety personId="me" name="Me" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
  it('shows a report receipt only after success and refuses duplicate submits', async () => {
    let resolve!: (receipt: string) => void;
    mocks.report.mockReturnValue(new Promise<string>(r => { resolve = r; }));
    render(<PersonSafety personId="person" name="Alex" blocked />);
    fireEvent.click(screen.getByLabelText('safety.person'));
    fireEvent.change(screen.getByLabelText('safety.details'), { target: { value: 'Unwanted messages' } });
    fireEvent.click(screen.getByText('safety.send')); fireEvent.click(screen.getByText('safety.send'));
    expect(mocks.report).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('status')).toBeNull();
    resolve('receipt'); await waitFor(() => expect(screen.getByRole('status').textContent).toBe('safety.received'));
    expect(screen.getByText('safety.unblock')).toBeTruthy();
  });
  it('keeps the dialog and entered report after a failed request', async () => {
    mocks.report.mockRejectedValue(new Error('unavailable'));
    render(<PersonSafety personId="person" name="Alex" />); fireEvent.click(screen.getByLabelText('safety.person'));
    fireEvent.change(screen.getByLabelText('safety.details'), { target: { value: 'Keep this text' } });
    fireEvent.click(screen.getByText('safety.send'));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect((screen.getByLabelText('safety.details') as HTMLTextAreaElement).value).toBe('Keep this text');
    expect(screen.queryByRole('status')).toBeNull();
  });
});
