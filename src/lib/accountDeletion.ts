import { supabase } from './supabase';

export type AccountDeletionCode = 'deleted' | 'reauth_required' | 'deletion_in_progress' | 'retry_required' | 'unavailable';
const operationKey = 'bounty_account_deletion_operation';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const userUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let retainedOperation: { userId: string; operationId: string } | null = null;

// Keep the opaque receipt across reloads, scoped to the currently confirmed
// account. It authorizes no new deletion and contains no password/access token.
export function getAccountDeletionOperation(userId: string): string {
  try {
    const saved = JSON.parse(localStorage.getItem(operationKey) ?? 'null');
    if (saved?.userId === userId && typeof saved.operationId === 'string' && uuid.test(saved.operationId)) {
      retainedOperation = saved;
      return saved.operationId;
    }
  } catch { /* Storage may be unavailable; the caller can retain the returned ID. */ }
  if (retainedOperation?.userId === userId) return retainedOperation.operationId;
  const operationId = crypto.randomUUID();
  retainedOperation = { userId, operationId };
  try { localStorage.setItem(operationKey, JSON.stringify(retainedOperation)); } catch { /* In-memory retry remains possible. */ }
  return operationId;
}

// Read-only completion receipt: deliberately bypass auth auto-refresh. It uses
// only public project credentials and the opaque operation, never an old token.
export async function readAccountDeletionReceipt(userId: string, operationId: string): Promise<boolean> {
  if (!userUuid.test(userId) || !uuid.test(operationId)) return false;
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!baseUrl || !anonKey) return false;
  try {
    const result = await fetch(`${baseUrl.replace(/\/$/, '')}/functions/v1/delete-account`, {
      method: 'POST', headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation_id: operationId, receipt_user_id: userId, receipt: true }),
      signal: AbortSignal.timeout(15000),
    });
    return result.ok && (await result.json())?.code === 'deleted';
  } catch { return false; }
}

async function invokeDeletion(operationId: string): Promise<AccountDeletionCode> {
  try {
    const { data, error } = await supabase.functions.invoke('delete-account', {
      body: { operation_id: operationId, confirm: true },
    });
    let result: unknown = data;
    // Supabase returns non-2xx response bodies through FunctionsHttpError.context.
    if (error && 'context' in error && error.context instanceof Response) {
      try { result = await error.context.clone().json(); } catch { return 'retry_required'; }
    } else if (error) return 'retry_required';
    const code = result && typeof result === 'object' && 'code' in result ? result.code : null;
    if (code === 'deleted' || code === 'reauth_required' || code === 'deletion_in_progress' ||
        code === 'retry_required' || code === 'unavailable') return code;
    return 'retry_required';
  } catch { return 'retry_required'; }
}

export async function deleteOwnAccount(operationId: string): Promise<AccountDeletionCode> {
  if (!uuid.test(operationId)) return 'unavailable';
  const result = await invokeDeletion(operationId);
  if (result === 'deleted') return result;
  // Read the matching saved account, never the subject of an unverified JWT.
  let saved = retainedOperation;
  try { saved = JSON.parse(localStorage.getItem(operationKey) ?? 'null') ?? saved; } catch { /* Memory fallback. */ }
  if (saved?.operationId === operationId && typeof saved.userId === 'string' &&
      await readAccountDeletionReceipt(saved.userId, operationId)) return 'deleted';
  return result;
}

// Sign-in creates a fresh session; refreshing an old token or calling the Auth
// password-change nonce API does not qualify. Never persist/log the password.
export async function reauthenticateAccountForDeletion(password: string): Promise<boolean> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user?.email || !password) return false;
    const result = await supabase.auth.signInWithPassword({ email: user.email, password });
    return !result.error && result.data.user?.id === user.id && Boolean(result.data.session);
  } catch { return false; }
}
