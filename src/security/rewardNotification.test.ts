// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createRewardNotificationHandler, type NotificationClient } from '../../supabase/functions/notify-reward-creator/handler';

const collectorId = '11111111-1111-4111-8111-111111111111';
const rewardId = '22222222-2222-4222-8222-222222222222';
const creatorId = '33333333-3333-4333-8333-333333333333';
const collectionId = '44444444-4444-4444-8444-444444444444';
const now = Date.parse('2026-09-07T02:00:00Z');

function setup() {
  const rows: Record<string, { data: Record<string, unknown> | null; error: unknown }> = {
    collected_rewards: { data: { id: collectionId, collected_at: '2026-09-07T01:55:00Z' }, error: null },
    rewards_store: { data: { creator_id: creatorId }, error: null },
  };
  const queries: Array<{ table: string; filters: Array<[string, string]> }> = [];
  const getUser = vi.fn().mockResolvedValue({ data: { user: { id: collectorId } }, error: null });
  const getUserById = vi.fn().mockResolvedValue({
    data: { user: { id: creatorId, email: 'verified@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' } },
    error: null,
  });
  const client: NotificationClient = {
    auth: { getUser, admin: { getUserById } },
    async findCollection(reward, collector) {
      queries.push({ table: 'collected_rewards', filters: [['reward_id', reward], ['collector_id', collector]] });
      return rows.collected_rewards;
    },
    async findReward(reward) {
      queries.push({ table: 'rewards_store', filters: [['id', reward]] });
      return rows.rewards_store;
    },
  };
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 200 }));
  const getClient = vi.fn(() => client);
  const env: Record<string, string> = { RESEND_API_KEY: 'server-test-key', RESEND_FROM_EMAIL: 'Bounty Hunter <app@example.com>' };
  const handler = createRewardNotificationHandler({ getClient, getEnv: (key) => env[key], fetch: fetchMock, now: () => now });
  return { handler, rows, queries, getUser, getUserById, fetchMock, getClient, env };
}

function request(body: unknown = { reward_id: rewardId, collector_id: collectorId }, extraHeaders: Record<string, string> = {}) {
  return new Request('https://function.example/notify-reward-creator', {
    method: 'POST', headers: { authorization: 'Bearer user-token', 'content-type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
  });
}

describe('reward notification authorization and delivery', () => {
  it('allows preflight and rejects non-POST methods without querying or sending', async () => {
    const { handler, getClient, fetchMock } = setup();
    expect((await handler(new Request('https://function.example', { method: 'OPTIONS' }))).status).toBe(204);
    const rejected = await handler(new Request('https://function.example'));
    expect(rejected.status).toBe(405);
    expect(rejected.headers.get('allow')).toBe('POST, OPTIONS');
    expect(getClient).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['', 'Basic user-token', 'Bearer token extra'])('rejects invalid bearer header %j', async (authorization) => {
    const { handler, getClient } = setup();
    expect((await handler(request(undefined, { authorization }))).status).toBe(401);
    expect(getClient).not.toHaveBeenCalled();
  });

  it.each([
    null, [], { reward_id: rewardId }, { reward_id: {}, collector_id: collectorId },
    { reward_id: 'invalid-id', collector_id: collectorId },
    { reward_id: rewardId, collector_id: collectorId, to: 'attacker@example.com' },
  ])('rejects malformed or extra payload fields before authentication lookup: %j', async (body) => {
    const { handler, getUser } = setup();
    expect((await handler(request(body))).status).toBe(400);
    expect(getUser).not.toHaveBeenCalled();
  });

  it('rejects invalid JSON and non-JSON content', async () => {
    const { handler } = setup();
    const invalidJson = new Request('https://function.example', {
      method: 'POST', headers: { authorization: 'Bearer token', 'content-type': 'application/json' }, body: '{',
    });
    expect((await handler(invalidJson)).status).toBe(400);
    expect((await handler(request(undefined, { 'content-type': 'text/plain' }))).status).toBe(415);
  });

  it('enforces actual body bytes even when Content-Length understates them', async () => {
    const { handler, getUser } = setup();
    const oversized = request({ reward_id: 'x'.repeat(1024), collector_id: collectorId }, { 'content-length': '1' });
    expect((await handler(oversized)).status).toBe(413);
    expect(getUser).not.toHaveBeenCalled();
  });

  it('fails closed when the provider is not configured', async () => {
    const { handler, env, fetchMock } = setup();
    delete env.RESEND_API_KEY;
    expect((await handler(request())).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('verifies the bearer token and binds the collector to the authenticated identity', async () => {
    const { handler, getUser, queries, fetchMock } = setup();
    getUser.mockResolvedValue({ data: { user: { id: creatorId } }, error: null });
    expect((await handler(request())).status).toBe(403);
    expect(getUser).toHaveBeenCalledWith('user-token');
    expect(queries).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects invalid sessions without exposing auth service errors', async () => {
    const { handler, getUser, fetchMock } = setup();
    getUser.mockResolvedValue({ data: { user: null }, error: { message: 'sensitive auth detail' } });
    const response = await handler(request());
    expect(response.status).toBe(401);
    expect(await response.text()).not.toContain('sensitive');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires a collection belonging to both the reward and the caller', async () => {
    const { handler, rows, queries, fetchMock } = setup();
    rows.collected_rewards.data = null;
    expect((await handler(request())).status).toBe(403);
    expect(queries[0].filters).toEqual([['reward_id', rewardId], ['collector_id', collectorId]]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['2026-09-06T01:55:00Z', 'not-a-date', '2026-09-07T03:00:00Z'])('rejects stale or invalid server event time %s', async (collectedAt) => {
    const { handler, rows, fetchMock } = setup();
    rows.collected_rewards.data!.collected_at = collectedAt;
    expect((await handler(request())).status).toBe(409);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not send to an unconfirmed Auth email', async () => {
    const { handler, getUserById, fetchMock } = setup();
    getUserById.mockResolvedValue({ data: { user: { id: creatorId, email: 'unconfirmed@example.com' } }, error: null });
    expect((await handler(request())).status).toBe(409);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses the verified Auth recipient, generic content and a stable event key on retries', async () => {
    const { handler, getUserById, queries, fetchMock } = setup();
    expect((await handler(request())).status).toBe(200);
    expect((await handler(request())).status).toBe(200);
    expect(getUserById).toHaveBeenCalledWith(creatorId);
    expect(queries.every((query) => query.table !== 'profiles')).toBe(true);
    for (const [url, options] of fetchMock.mock.calls) {
      expect(url).toBe('https://api.resend.com/emails');
      expect(new Headers(options?.headers).get('Idempotency-Key')).toBe(`reward-collected/${collectionId}`);
      const email = JSON.parse(options!.body as string);
      expect(email.to).toEqual(['verified@example.com']);
      expect(email.html).toContain('Open Bounty Hunter');
      expect(options?.signal).toBeInstanceOf(AbortSignal);
    }
    // The provider enforces deduplication; this test proves that retries use the
    // same key, not that a mocked provider delivered only one message.
  });

  it('does not expose or consume the provider error body', async () => {
    const { handler, fetchMock } = setup();
    const failure = new Response('private provider data and recipient@example.com', { status: 429 });
    fetchMock.mockResolvedValue(failure);
    const response = await handler(request());
    expect(response.status).toBe(502);
    expect(await response.text()).not.toMatch(/private|recipient@example/);
    expect(failure.bodyUsed).toBe(false);
  });

  it('returns generic errors for database and network failures', async () => {
    const db = setup();
    db.rows.collected_rewards.error = { message: 'sensitive database detail' };
    const dbResponse = await db.handler(request());
    expect(dbResponse.status).toBe(500);
    expect(await dbResponse.text()).not.toContain('sensitive');
    const network = setup();
    network.fetchMock.mockRejectedValue(new Error('sensitive connection detail'));
    const netResponse = await network.handler(request());
    expect(netResponse.status).toBe(500);
    expect(await netResponse.text()).not.toContain('sensitive');
  });
});
