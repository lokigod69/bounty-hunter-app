// Runtime-independent request handler so authorization and delivery boundaries can be tested.
type AuthUser = { id: string; email?: string; email_confirmed_at?: string };
type UserResult = { data: { user: AuthUser | null }; error: unknown };
type RowResult = { data: Record<string, unknown> | null; error: unknown };
export interface NotificationClient {
  auth: {
    getUser(jwt: string): PromiseLike<UserResult>;
    admin: { getUserById(id: string): PromiseLike<UserResult> };
  };
  findCollection(rewardId: string, collectorId: string): PromiseLike<RowResult>;
  findReward(rewardId: string): PromiseLike<RowResult>;
}

interface Dependencies {
  getClient: () => NotificationClient | null;
  getEnv: (name: string) => string | undefined;
  fetch: typeof fetch;
  now?: () => number;
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const maxBodyBytes = 1024;
const notificationWindowMs = 60 * 60 * 1000;

class RequestError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function json(status: number, body: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers });
}

async function readPayload(req: Request): Promise<{ reward_id: string; collector_id: string }> {
  if (req.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new RequestError(415, 'Use application/json.');
  }
  const reader = req.body?.getReader();
  if (!reader) throw new RequestError(400, 'Invalid notification request.');
  let size = 0;
  let body = '';
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBodyBytes) {
        await reader.cancel();
        throw new RequestError(413, 'Notification request is too large.');
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  let payload: unknown;
  try { payload = JSON.parse(body); } catch { throw new RequestError(400, 'Invalid notification request.'); }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new RequestError(400, 'Invalid notification request.');
  }
  const fields = payload as Record<string, unknown>;
  if (Object.keys(fields).some((key) => key !== 'reward_id' && key !== 'collector_id') ||
      typeof fields.reward_id !== 'string' || !uuid.test(fields.reward_id) ||
      typeof fields.collector_id !== 'string' || !uuid.test(fields.collector_id)) {
    throw new RequestError(400, 'Invalid notification request.');
  }
  return { reward_id: fields.reward_id.toLowerCase(), collector_id: fields.collector_id.toLowerCase() };
}

export function createRewardNotificationHandler(deps: Dependencies) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
        status: 405, headers: { ...headers, Allow: 'POST, OPTIONS' },
      });
    }

    try {
      const accessToken = /^Bearer ([^\s]+)$/i.exec(req.headers.get('authorization') ?? '')?.[1];
      if (!accessToken) throw new RequestError(401, 'Unauthorized.');
      const payload = await readPayload(req);
      const client = deps.getClient();
      const apiKey = deps.getEnv('RESEND_API_KEY');
      const from = deps.getEnv('RESEND_FROM_EMAIL');
      if (!client || !apiKey || !from) throw new RequestError(503, 'Notifications are temporarily unavailable.');

      const { data: { user }, error: authError } = await client.auth.getUser(accessToken);
      if (authError || !user) throw new RequestError(401, 'Unauthorized.');
      if (user.id !== payload.collector_id) throw new RequestError(403, 'Notification is not permitted.');

      const { data: collection, error: collectionError } = await client.findCollection(payload.reward_id, user.id);
      if (collectionError) throw new Error('Collection lookup failed.');
      if (!collection) throw new RequestError(403, 'Notification is not permitted.');

      // A provider key alone expires after 24h. Reject old events too, so this
      // immediate-send endpoint cannot be used to replay last week's purchase.
      // This bounded retry path is not a durable delivery queue or rate limit.
      const collectedAt = typeof collection.collected_at === 'string' ? Date.parse(collection.collected_at) : NaN;
      const age = (deps.now?.() ?? Date.now()) - collectedAt;
      if (!Number.isFinite(age) || age < -5 * 60 * 1000 || age > notificationWindowMs) {
        throw new RequestError(409, 'Notification window has expired.');
      }
      if (typeof collection.id !== 'string' || !uuid.test(collection.id)) throw new Error('Invalid collection identity.');

      const { data: reward, error: rewardError } = await client.findReward(payload.reward_id);
      if (rewardError || !reward || typeof reward.creator_id !== 'string') throw new Error('Reward lookup failed.');

      // Profile email is editable application data, not a verified destination.
      const { data: { user: creator }, error: creatorError } = await client.auth.admin.getUserById(reward.creator_id);
      if (creatorError || !creator?.email || !creator.email_confirmed_at) {
        throw new RequestError(409, 'Notification recipient is unavailable.');
      }

      // Generic content avoids exposing mission/reward text on email previews and
      // keeps retries stable when somebody changes a display name or reward title.
      const response = await deps.fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'Idempotency-Key': `reward-collected/${collection.id}`,
        },
        body: JSON.stringify({
          from, to: [creator.email],
          subject: 'A Bounty Hunter reward was collected',
          html: '<p>Someone collected one of your rewards.</p><p>Open Bounty Hunter to see the details.</p>',
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new RequestError(502, 'Notification could not be sent. Please try again.');
      return json(200, { message: 'Notification processed.' });
    } catch (error) {
      // Provider/database responses may contain recipient data and operational
      // details. Neither return nor log those raw bodies or auth tokens.
      return error instanceof RequestError
        ? json(error.status, { error: error.message })
        : json(500, { error: 'Notification could not be processed. Please try again.' });
    }
  };
}
