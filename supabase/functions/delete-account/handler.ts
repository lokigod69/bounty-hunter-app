type Result<T> = { data: T | null; error: unknown };
export interface DeletionBackend {
  getUser(token: string): PromiseLike<{ data: { user: { id: string } | null }; error: unknown }>;
  receipt(userId: string, operationId: string): PromiseLike<Result<boolean>>;
  begin(userId: string, sessionId: string, operationId: string): PromiseLike<Result<{ phase?: string; error?: string }>>;
  files(userId: string, operationId: string): PromiseLike<Result<Array<{ bucket_id: string; name: string }>>>;
  removeFiles(bucket: string, names: string[]): PromiseLike<{ error: unknown }>;
  cleanup(userId: string, operationId: string): PromiseLike<Result<{ phase?: string; error?: string }>>;
  deleteUser(userId: string): PromiseLike<{ error: unknown }>;
  complete(userId: string, operationId: string): PromiseLike<Result<boolean>>;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const operationUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const response = (status: number, code: string) => new Response(JSON.stringify({ code }), { status, headers });

// Decode only after Auth getUser has validated this exact token. Decoding itself
// is not signature verification. The DB then binds session_id to user_id and
// auth.sessions.created_at; refreshed JWT iat never substitutes for reauth.
function validatedSessionId(token: string, verifiedUserId: string): string | null {
  try {
    const part = token.split('.')[1];
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
    return payload.sub === verifiedUserId && typeof payload.session_id === 'string' && uuid.test(payload.session_id)
      ? payload.session_id : null;
  } catch { return null; }
}

type DeletionRequest = { operationId: string; receiptUserId?: string };
async function operationFromRequest(req: Request): Promise<DeletionRequest | null> {
  if (req.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return null;
  const reader = req.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let body = ''; let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 512) { await reader.cancel(); return null; }
      body += decoder.decode(value, { stream: true });
    }
    const data = JSON.parse(body + decoder.decode());
    if (!data || Array.isArray(data) || typeof data.operation_id !== 'string' || !operationUuid.test(data.operation_id)) return null;
    if (data.confirm === true && Object.keys(data).length === 2) return { operationId: data.operation_id.toLowerCase() };
    if (data.receipt === true && Object.keys(data).length === 3 &&
        typeof data.receipt_user_id === 'string' && uuid.test(data.receipt_user_id)) {
      return { operationId: data.operation_id.toLowerCase(), receiptUserId: data.receipt_user_id.toLowerCase() };
    }
    return null;
  } catch { return null; } finally { reader.releaseLock(); }
}

export function createDeleteAccountHandler(getBackend: () => DeletionBackend | null) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (req.method !== 'POST') return response(405, 'method_not_allowed');
    const token = /^Bearer ([^\s]+)$/i.exec(req.headers.get('authorization') ?? '')?.[1];
    if (!token) return response(401, 'reauth_required');
    const request = await operationFromRequest(req);
    if (!request) return response(400, 'invalid_request');
    const { operationId, receiptUserId } = request;
    const backend = getBackend();
    if (!backend) return response(503, 'unavailable');
    try {
      // This explicit read-only capability works using the public anon key after
      // Auth deletion, without storing an expired access token or refreshing it.
      // It reveals only a matching operation's completion and never mutates data.
      if (receiptUserId) {
        const receipt = await backend.receipt(receiptUserId, operationId);
        return receipt.error ? response(503, 'unavailable')
          : response(receipt.data === true ? 200 : 202, receipt.data === true ? 'deleted' : 'retry_required');
      }
      const { data: { user }, error: authError } = await backend.getUser(token);
      if (authError || !user) return response(401, 'reauth_required');
      const sessionId = validatedSessionId(token, user.id);
      if (!sessionId) return response(401, 'reauth_required');

      const begun = await backend.begin(user.id, sessionId, operationId);
      if (begun.error) return response(503, 'retry_required');
      if (begun.data?.error === 'reauth_required') return response(401, 'reauth_required');
      if (begun.data?.error === 'deletion_in_progress') return response(409, 'deletion_in_progress');
      if (!['storage', 'auth', 'complete'].includes(begun.data?.phase ?? '')) return response(503, 'retry_required');

      // Bounded batches are removed via the Storage API. Re-query from the start
      // because removal changes pagination. A partial failure leaves the frozen
      // marker and remaining objects intact for this same operation to resume.
      for (let batch = 0; batch < 20; batch++) {
        const files = await backend.files(user.id, operationId);
        if (files.error || !Array.isArray(files.data)) return response(503, 'retry_required');
        if (files.data.length === 0) break;
        const grouped = new Map<string, string[]>();
        for (const file of files.data) {
          if (typeof file.bucket_id !== 'string' || typeof file.name !== 'string') return response(503, 'retry_required');
          grouped.set(file.bucket_id, [...(grouped.get(file.bucket_id) ?? []), file.name]);
        }
        for (const [bucket, paths] of grouped) {
          if ((await backend.removeFiles(bucket, paths)).error) return response(503, 'retry_required');
        }
        if (batch === 19) return response(202, 'retry_required');
      }
      const cleaned = await backend.cleanup(user.id, operationId);
      if (cleaned.error || !['auth', 'complete'].includes(cleaned.data?.phase ?? '')) return response(503, 'retry_required');
      // Concurrent retries or a lost admin response may report deletion failure.
      // Only the SQL check of actual Auth absence can turn that into success.
      await backend.deleteUser(user.id);
      const completed = await backend.complete(user.id, operationId);
      if (completed.error || completed.data !== true) return response(503, 'retry_required');
      return response(200, 'deleted');
    } catch {
      // Never return/log tokens, identity data, SQL errors or Storage paths.
      return response(503, 'retry_required');
    }
  };
}
