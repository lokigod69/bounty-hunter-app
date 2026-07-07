import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { markRewardRedeemed } from './rewards';

// Minimal stub: only the rpc() method is exercised by markRewardRedeemed.
const makeClient = (rpc: ReturnType<typeof vi.fn>) =>
  ({ rpc } as unknown as SupabaseClient<Database>);

describe('markRewardRedeemed', () => {
  it('returns success when the RPC reports success', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { success: true, collection_id: 'c1', redeemed: true },
      error: null,
    });

    const result = await markRewardRedeemed('c1', true, makeClient(rpc));

    expect(rpc).toHaveBeenCalledWith('mark_reward_redeemed', {
      p_collection_id: 'c1',
      p_redeemed: true,
    });
    expect(result.success).toBe(true);
    expect(result.collection_id).toBe('c1');
    expect(result.redeemed).toBe(true);
  });

  it('returns failure when the RPC reports a logical error', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { success: false, error: 'FORBIDDEN', message: 'Not your reward.' },
      error: null,
    });

    const result = await markRewardRedeemed('c1', true, makeClient(rpc));

    expect(result.success).toBe(false);
    expect(result.message).toBe('Not your reward.');
  });

  it('returns failure when the transport errors', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'network down' },
    });

    const result = await markRewardRedeemed('c1', false, makeClient(rpc));

    expect(result.success).toBe(false);
    expect(result.message).toBe('network down');
  });
});
