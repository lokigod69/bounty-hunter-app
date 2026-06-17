import { describe, expect, it } from 'vitest';
import { canPurchaseReward } from './rewards.domain';

describe('canPurchaseReward', () => {
  it('allows a purchase when the reward is available and credits are sufficient', () => {
    expect(
      canPurchaseReward({
        userCredits: 25,
        rewardCost: 10,
        isAvailable: true,
        isCreator: false,
        isAlreadyClaimed: false,
      })
    ).toEqual({ allowed: true, newCreditsBalance: 15 });
  });

  it('blocks unavailable rewards', () => {
    expect(
      canPurchaseReward({
        userCredits: 25,
        rewardCost: 10,
        isAvailable: false,
        isCreator: false,
        isAlreadyClaimed: false,
      })
    ).toEqual({ allowed: false, reason: 'This reward is not available.' });
  });

  it('blocks self-purchases', () => {
    expect(
      canPurchaseReward({
        userCredits: 25,
        rewardCost: 10,
        isAvailable: true,
        isCreator: true,
        isAlreadyClaimed: false,
      })
    ).toEqual({ allowed: false, reason: 'You cannot purchase your own reward.' });
  });

  it('blocks repeat claims', () => {
    expect(
      canPurchaseReward({
        userCredits: 25,
        rewardCost: 10,
        isAvailable: true,
        isCreator: false,
        isAlreadyClaimed: true,
      })
    ).toEqual({ allowed: false, reason: 'You have already claimed this reward.' });
  });

  it('blocks purchases with insufficient credits', () => {
    expect(
      canPurchaseReward({
        userCredits: 9,
        rewardCost: 10,
        isAvailable: true,
        isCreator: false,
        isAlreadyClaimed: false,
      })
    ).toEqual({
      allowed: false,
      reason: 'Insufficient credits. You have 9, but need 10.',
    });
  });
});
