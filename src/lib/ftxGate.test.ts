import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { from } = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: { from },
}));

import { checkFTXGate } from './ftxGate';

function makeQuery(result: {
  data: Array<{ id: string }> | null;
  error: { message: string } | null;
}) {
  const query = {
    select: vi.fn(),
    or: vi.fn(),
    limit: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.or.mockReturnValue(query);
  return query;
}

describe('checkFTXGate', () => {
  const getItem = vi.fn();

  beforeEach(() => {
    from.mockReset();
    getItem.mockReset();
    vi.stubGlobal('localStorage', {
      getItem,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fails closed when a gate query errors', async () => {
    from
      .mockReturnValueOnce(makeQuery({ data: null, error: { message: 'Network offline' } }))
      .mockReturnValueOnce(makeQuery({ data: [], error: null }));

    await expect(checkFTXGate('user-1')).resolves.toEqual({
      shouldShowOnboarding: false,
      hasMissions: false,
      hasRewards: false,
    });
  });

  it('short-circuits when the profile onboarding flag is true', async () => {
    await expect(checkFTXGate('user-1', true)).resolves.toEqual({
      shouldShowOnboarding: false,
      hasMissions: false,
      hasRewards: false,
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('short-circuits when localStorage matches the current user id', async () => {
    getItem.mockReturnValue('user-1');

    await expect(checkFTXGate('user-1')).resolves.toEqual({
      shouldShowOnboarding: false,
      hasMissions: false,
      hasRewards: false,
    });
    expect(from).not.toHaveBeenCalled();
  });
});
