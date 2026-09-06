// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFriends } from './useFriends';

const mocks = vi.hoisted(() => ({ from: vi.fn(), single: vi.fn() }));
vi.mock('../lib/supabase', () => ({ supabase: {
  from: mocks.from,
  channel: () => { const c = { on: () => c, subscribe: () => c, unsubscribe: vi.fn() }; return c; },
  removeChannel: vi.fn(),
} }));
beforeEach(() => {
  mocks.from.mockReset();
  mocks.single.mockReset();
  mocks.from.mockImplementation(() => {
    const query = { select: () => query, update: () => query, delete: () => query,
      eq: () => query, single: mocks.single, or: async () => ({ data: [], error: null }) };
    return query;
  });
});
afterEach(cleanup);

describe('connection mutation outcomes', () => {
  for (const action of ['accept', 'reject', 'cancel', 'remove'] as const) {
    it(`${action} reports denied or missing rows as failure`, async () => {
      // PostgREST .single() returns PGRST116 for zero affected rows, including
      // a DELETE silently filtered by RLS. A bare DELETE would return no error.
      mocks.single.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'No row changed' } });
      const { result } = renderHook(() => useFriends('me'));
      await waitFor(() => expect(result.current.loading).toBe(false));
      let changed: unknown;
      await act(async () => { changed = action === 'remove' ? await result.current.removeFriend('request')
        : action === 'cancel' ? await result.current.cancelSentRequest('request')
        : await result.current.respondToFriendRequest('request', action === 'accept'); });
      expect(changed).toBe(false);
      expect(result.current.error).toBe('No row changed');
    });
  }
  it('reports an actually deleted connection as success and refreshes', async () => {
    mocks.single.mockResolvedValue({ data: { id: 'request' }, error: null });
    const { result } = renderHook(() => useFriends('me'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    let changed: unknown;
    await act(async () => { changed = await result.current.removeFriend('request'); });
    expect(changed).toBe(true);
    expect(result.current.error).toBe(null);
  });
});
