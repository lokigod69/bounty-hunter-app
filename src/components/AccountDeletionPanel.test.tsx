// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountDeletionPanel } from './AccountDeletionPanel';
import en from '../i18n/locales/en/translation.json';

const api = vi.hoisted(() => ({ remove: vi.fn(), reauth: vi.fn(), operation: vi.fn() }));
vi.mock('../lib/accountDeletion', () => ({
  deleteOwnAccount: api.remove, reauthenticateAccountForDeletion: api.reauth,
  getAccountDeletionOperation: api.operation,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({
  t: (key: string) => en.accountDeletion[key.split('.')[1] as keyof typeof en.accountDeletion] ?? key,
}) }));
vi.mock('../utils/feedback', () => ({ feedback: { tap: vi.fn() } }));
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  api.operation.mockReturnValue('operation');
  api.reauth.mockResolvedValue(true);
  api.remove.mockResolvedValue('deleted');
});

function setup() {
  const onDeleted = vi.fn();
  render(<AccountDeletionPanel userId="me" onDeleted={onDeleted} onBusyChange={vi.fn()} />);
  return { onDeleted, accept: () => fireEvent.click(screen.getByRole('checkbox', { hidden: true })),
    submit: () => fireEvent.submit(document.querySelector('form')!) };
}

describe('account deletion confirmation', () => {
  it('requires explicit acknowledgement before making any request', () => {
    const ui = setup();
    ui.submit();
    expect(api.remove).not.toHaveBeenCalled();
    expect(api.reauth).not.toHaveBeenCalled();
  });
  it('finishes only after the server confirms deletion', async () => {
    const ui = setup(); ui.accept(); ui.submit();
    await waitFor(() => expect(ui.onDeleted).toHaveBeenCalledOnce());
    expect(api.remove).toHaveBeenCalledWith('operation');
    expect(api.reauth).not.toHaveBeenCalled();
  });
  it('keeps a partial failure visible and reuses the same operation on retry', async () => {
    api.remove.mockResolvedValueOnce('retry_required');
    const ui = setup(); ui.accept(); ui.submit();
    await screen.findByRole('alert');
    expect(ui.onDeleted).not.toHaveBeenCalled();
    ui.submit();
    await waitFor(() => expect(ui.onDeleted).toHaveBeenCalledOnce());
    expect(api.remove.mock.calls).toEqual([['operation'], ['operation']]);
    expect(api.operation).toHaveBeenCalledOnce();
  });
  it('requires successful reauthentication after the server rejects an old session', async () => {
    api.remove.mockResolvedValueOnce('reauth_required');
    api.reauth.mockResolvedValue(false);
    const ui = setup(); ui.accept(); ui.submit();
    const password = await screen.findByLabelText(en.accountDeletion.password);
    fireEvent.change(password, { target: { value: 'incorrect' } }); ui.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(en.accountDeletion.passwordError));
    expect(api.remove).toHaveBeenCalledTimes(1);
    expect((password as HTMLInputElement).value).toBe('');
    expect(ui.onDeleted).not.toHaveBeenCalled();
  });
  it('does not launch duplicate deletions while a request is pending', async () => {
    let finish!: (value: string) => void;
    api.remove.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const ui = setup(); ui.accept(); ui.submit(); ui.submit();
    expect(api.remove).toHaveBeenCalledOnce();
    finish('deleted');
    await waitFor(() => expect(ui.onDeleted).toHaveBeenCalledOnce());
  });
});
