// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDeleteAccountHandler } from '../../supabase/functions/delete-account/handler';

const client = vi.hoisted(() => ({
  functions: { invoke: vi.fn() }, auth: { getUser: vi.fn(), signInWithPassword: vi.fn() },
}));
vi.mock('./supabase', () => ({ supabase: client }));
import { deleteOwnAccount, getAccountDeletionOperation, readAccountDeletionReceipt, reauthenticateAccountForDeletion } from './accountDeletion';

const user = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const session = '10000000-0000-4000-8000-000000000001';
const operation = '20000000-0000-4000-8000-000000000001';
const token = (sub = user, sessionId: string | null = session) => `header.${btoa(JSON.stringify({ sub, session_id: sessionId, iat: 1788723600 }))}.signature`;
const ok = <T>(data: T) => ({ data, error: null });
function backend() {
  return {
    getUser: vi.fn().mockResolvedValue(ok({ user: { id: user } })),
    receipt: vi.fn().mockResolvedValue(ok(false)),
    begin: vi.fn().mockResolvedValue(ok({ phase: 'storage' })),
    files: vi.fn().mockResolvedValue(ok([])),
    removeFiles: vi.fn().mockResolvedValue({ error: null }),
    cleanup: vi.fn().mockResolvedValue(ok({ phase: 'auth' })),
    deleteUser: vi.fn().mockResolvedValue({ error: null }),
    complete: vi.fn().mockResolvedValue(ok(true)),
  };
}
const request = (body: unknown = { operation_id: operation, confirm: true }, bearer = token()) => new Request('https://example.invalid/delete-account', {
  method: 'POST', headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
async function run(b = backend(), req = request()) {
  const response = await createDeleteAccountHandler(() => b)(req);
  return { status: response.status, ...(await response.json()) };
}
describe('self-account deletion endpoint', () => {
  it('derives identity/session from the Auth-validated token and verifies actual completion', async () => {
    const b = backend();
    expect(await run(b)).toEqual({ status: 200, code: 'deleted' });
    expect(b.getUser).toHaveBeenCalledWith(token());
    expect(b.begin).toHaveBeenCalledWith(user, session, operation);
    expect(b.deleteUser).toHaveBeenCalledWith(user);
    expect(b.complete).toHaveBeenCalledWith(user, operation);
    expect(b.cleanup.mock.invocationCallOrder[0]).toBeLessThan(b.deleteUser.mock.invocationCallOrder[0]);
  });
  it.each([
    { operation_id: operation, confirm: true, user_id: other },
    { operation_id: operation, confirm: false },
    { operation_id: 'predictable', confirm: true },
    { operation_id: operation, receipt: true, receipt_user_id: user, confirm: true },
  ])('rejects unapproved request shape %j', async body => {
    const b = backend(); expect((await run(b, request(body))).status).toBe(400);
    expect(b.getUser).not.toHaveBeenCalled(); expect(b.begin).not.toHaveBeenCalled();
  });
  it('bounds streamed bodies', async () => {
    const b = backend(); expect((await run(b, request({ extra: 'a'.repeat(600) }))).status).toBe(400);
    expect(b.getUser).not.toHaveBeenCalled();
  });
  it('does not trust a rejected bearer, even with decodable claims', async () => {
    const b = backend(); b.getUser.mockResolvedValue({ data: { user: null }, error: 'expired' });
    expect((await run(b)).code).toBe('reauth_required');
    expect(b.begin).not.toHaveBeenCalled(); expect(b.receipt).not.toHaveBeenCalled();
  });
  it.each([token(other), token(user, null), 'malformed'])('rejects missing or mismatched session claim', async bearer => {
    const b = backend(); expect((await run(b, request(undefined, bearer))).code).toBe('reauth_required');
    expect(b.begin).not.toHaveBeenCalled();
  });
  it.each(['reauth_required', 'deletion_in_progress'])('preserves database refusal %s without deleting', async code => {
    const b = backend(); b.begin.mockResolvedValue(ok({ error: code }));
    expect((await run(b)).code).toBe(code); expect(b.files).not.toHaveBeenCalled();
  });
  it('removes every bucket through Storage API and re-queries before cleanup', async () => {
    const b = backend(); b.files.mockResolvedValueOnce(ok([
      { bucket_id: 'avatars', name: `${user}/a.webp` }, { bucket_id: 'bounty-proofs', name: 'proofs/id/e.pdf' },
    ])).mockResolvedValue(ok([]));
    expect((await run(b)).code).toBe('deleted');
    expect(b.removeFiles).toHaveBeenCalledWith('avatars', [`${user}/a.webp`]);
    expect(b.removeFiles).toHaveBeenCalledWith('bounty-proofs', ['proofs/id/e.pdf']);
    expect(b.files).toHaveBeenCalledTimes(2);
    expect(b.removeFiles.mock.invocationCallOrder[1]).toBeLessThan(b.cleanup.mock.invocationCallOrder[0]);
  });
  it('keeps relational/Auth data if any Storage deletion fails', async () => {
    const b = backend(); b.files.mockResolvedValue(ok([{ bucket_id: 'avatars', name: 'a' }]));
    b.removeFiles.mockResolvedValue({ error: 'private path and secret' });
    expect(await run(b)).toEqual({ status: 503, code: 'retry_required' });
    expect(b.cleanup).not.toHaveBeenCalled(); expect(b.deleteUser).not.toHaveBeenCalled();
  });
  it('caps work for resumable large deletions', async () => {
    const b = backend(); b.files.mockResolvedValue(ok([{ bucket_id: 'avatars', name: 'a' }]));
    expect(await run(b)).toEqual({ status: 202, code: 'retry_required' });
    expect(b.removeFiles).toHaveBeenCalledTimes(20); expect(b.cleanup).not.toHaveBeenCalled();
  });
  it('never deletes Auth if relational cleanup rolls back', async () => {
    const b = backend(); b.cleanup.mockResolvedValue(ok({ error: 'storage_remaining' }));
    expect((await run(b)).code).toBe('retry_required'); expect(b.deleteUser).not.toHaveBeenCalled();
  });
  it('never reports success merely because Auth admin responded', async () => {
    const b = backend(); b.complete.mockResolvedValue(ok(false));
    expect(await run(b)).toEqual({ status: 503, code: 'retry_required' });
  });
  it('can resolve an ambiguous Auth admin error only when SQL confirms absence', async () => {
    const b = backend(); b.deleteUser.mockResolvedValue({ error: 'already removed' });
    expect((await run(b)).code).toBe('deleted');
  });
  it('returns generic retry on unexpected server failures', async () => {
    const b = backend(); b.cleanup.mockRejectedValue(new Error('secret SQL user data'));
    expect(await run(b)).toEqual({ status: 503, code: 'retry_required' });
  });
  it.each([true, false])('receipt-only requests cannot mutate anything (completion=%s)', async completed => {
    const b = backend(); b.receipt.mockResolvedValue(ok(completed));
    const result = await run(b, request({ operation_id: operation, receipt_user_id: user, receipt: true }, 'public-anon-key'));
    expect(result.code).toBe(completed ? 'deleted' : 'retry_required');
    expect(b.receipt).toHaveBeenCalledWith(user, operation);
    for (const fn of [b.getUser, b.begin, b.files, b.cleanup, b.deleteUser, b.complete]) expect(fn).not.toHaveBeenCalled();
  });
});

describe('account deletion client recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
    vi.stubEnv('VITE_SUPABASE_URL', 'https://project.example.invalid');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-anon');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'retry_required' }), { status: 202 })));
  });
  it('retains opaque operation per user across repeated reads', () => {
    const own = getAccountDeletionOperation(user);
    expect(getAccountDeletionOperation(user)).toBe(own);
    expect(getAccountDeletionOperation(other)).not.toBe(own);
    expect(localStorage.getItem('bounty_account_deletion_operation')).not.toContain('token');
  });
  it('recovers completed deletion even when invoke token refresh fails before request', async () => {
    const own = getAccountDeletionOperation(user);
    client.functions.invoke.mockRejectedValue(new Error('Auth refresh failed'));
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ code: 'deleted' })));
    expect(await deleteOwnAccount(own)).toBe('deleted');
    const options = vi.mocked(fetch).mock.calls[0][1]!;
    expect(options.headers).toEqual({ apikey: 'public-anon', Authorization: 'Bearer public-anon', 'Content-Type': 'application/json' });
    expect(JSON.parse(options.body as string)).toEqual({ operation_id: own, receipt_user_id: user, receipt: true });
  });
  it('does not turn a pending receipt into success or hide reauthentication requirement', async () => {
    const own = getAccountDeletionOperation(user);
    client.functions.invoke.mockResolvedValue({ data: null, error: { context: new Response(JSON.stringify({ code: 'reauth_required' }), { status: 401 }) } });
    expect(await deleteOwnAccount(own)).toBe('reauth_required');
  });
  it('rejects a nonmatching operation when recovering a saved account', async () => {
    getAccountDeletionOperation(user);
    client.functions.invoke.mockRejectedValue(new Error('Auth gone'));
    expect(await deleteOwnAccount(operation)).toBe('retry_required');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not accept receipt completion on a failed HTTP response', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ code: 'deleted' }), { status: 503 }));
    expect(await readAccountDeletionReceipt(user, operation)).toBe(false);
  });
  it('does not send invalid receipts', async () => {
    expect(await readAccountDeletionReceipt('invalid', operation)).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('reauthenticates using the verified account email and requires the same user', async () => {
    client.auth.getUser.mockResolvedValue(ok({ user: { id: user, email: 'verified@example.invalid' } }));
    client.auth.signInWithPassword.mockResolvedValue(ok({ user: { id: other }, session: {} }));
    expect(await reauthenticateAccountForDeletion('secret')).toBe(false);
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'verified@example.invalid', password: 'secret' });
  });
  it('handles network errors without leaking passwords', async () => {
    client.auth.getUser.mockRejectedValue(new Error('network'));
    expect(await reauthenticateAccountForDeletion('secret')).toBe(false);
  });
});
