// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const me = '00000000-0000-4000-8000-000000000001';
const alex = '00000000-0000-4000-8000-000000000002';
const args = { p_reward_id: 'reward-one', p_collector_id: me };
beforeEach(() => vi.resetModules());
const client = async () => (await import('./supabase.mjs')).supabase;

describe('offline reward lifecycle', () => {
  it('spends 20 of 24 credits exactly once and supports used/undo without another debit', async () => {
    const db = await client();
    const [first, repeated] = await Promise.all([db.rpc('purchase_reward', args), db.rpc('purchase_reward', args)]);
    expect(first.data).toMatchObject({ success: true, new_balance: 4 });
    expect(repeated.data).toMatchObject({ success: false, error: 'ALREADY_COLLECTED' });
    const { data: credits } = await db.from('user_credits').select('*').eq('user_id', me).single();
    expect(credits).toMatchObject({ balance: 4, total_earned: 34 });
    const { data: collected } = await db.from('collected_rewards').select('*').eq('collector_id', me);
    expect(collected).toHaveLength(1);
    expect(collected[0]).toMatchObject({ reward_id: 'reward-one', redeemed_at: null });
    expect((await db.rpc('mark_reward_redeemed', { p_collection_id: first.data.collection_id, p_redeemed: true })).data.success).toBe(true);
    expect((await db.from('collected_rewards').select('*').single()).data.redeemed_at).toBeTruthy();
    await db.rpc('mark_reward_redeemed', { p_collection_id: first.data.collection_id, p_redeemed: false });
    expect((await db.from('collected_rewards').select('*').single()).data.redeemed_at).toBeNull();
    expect((await db.from('user_credits').select('*').eq('user_id', me).single()).data.balance).toBe(4);
  });
  it('leaves balances and collections untouched when funds are insufficient', async () => {
    const db = await client();
    await db.from('user_credits').update({ balance: 19 }).eq('user_id', me);
    expect((await db.rpc('purchase_reward', args)).data.error).toBe('INSUFFICIENT_FUNDS');
    expect((await db.from('collected_rewards').select('*')).data).toHaveLength(0);
    expect((await db.from('user_credits').select('*').eq('user_id', me).single()).data.balance).toBe(19);
  });
  it('refuses another collector, another recipient, self-claims and unavailable rewards', async () => {
    const db = await client();
    expect((await db.rpc('purchase_reward', { ...args, p_collector_id: alex })).data.error).toBe('FORBIDDEN');
    await db.from('rewards_store').update({ assigned_to: alex }).eq('id', 'reward-one');
    expect((await db.rpc('purchase_reward', args)).data.error).toBe('FORBIDDEN');
    await db.from('rewards_store').update({ assigned_to: me, creator_id: me }).eq('id', 'reward-one');
    expect((await db.rpc('purchase_reward', args)).data.error).toBe('SELF_PURCHASE');
    await db.from('rewards_store').update({ is_active: false }).eq('id', 'reward-one');
    expect((await db.rpc('purchase_reward', args)).data.error).toBe('REWARD_NOT_FOUND');
    expect((await db.from('collected_rewards').select('*')).data).toHaveLength(0);
  });
});
