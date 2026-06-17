import { describe, expect, it, vi } from 'vitest';

describe('grantCredits', () => {
  it('blocks direct client-side credit grants', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');

    const { grantCredits } = await import('./credits');

    await expect(grantCredits({ userId: 'user-1', amount: 10 })).rejects.toThrow(
      'Direct client credit grants are disabled'
    );
  });
});
