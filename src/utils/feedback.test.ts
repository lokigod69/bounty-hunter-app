// Guards the Phase-4 feedback contract: every semantic event fires the right
// haptic + sound pair, and the single sound toggle silences BOTH channels.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const impact = vi.fn().mockResolvedValue(undefined);
const notification = vi.fn().mockResolvedValue(undefined);
const play = vi.fn();
let enabled = true;

vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: (...args: unknown[]) => impact(...args),
    notification: (...args: unknown[]) => notification(...args),
  },
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' },
  NotificationType: { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' },
}));

vi.mock('./soundManager', () => ({
  soundManager: {
    play: (key: string) => play(key),
    isEnabled: () => enabled,
  },
}));

const { feedback } = await import('./feedback');

// The haptics plugin is dynamically imported, so haptic calls land a microtask
// after the feedback call; flush before asserting.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('feedback', () => {
  beforeEach(() => {
    enabled = true;
    impact.mockClear();
    notification.mockClear();
    play.mockClear();
  });

  it('tap fires a light impact and only plays a sound when a key is given', async () => {
    feedback.tap();
    await flush();
    expect(impact).toHaveBeenCalledWith({ style: 'LIGHT' });
    expect(play).not.toHaveBeenCalled();

    feedback.tap('click1a');
    expect(play).toHaveBeenCalledWith('click1a');
  });

  it('success fires a success haptic with the success sound by default', async () => {
    feedback.success();
    await flush();
    expect(notification).toHaveBeenCalledWith({ type: 'SUCCESS' });
    expect(play).toHaveBeenCalledWith('success');

    feedback.success('saveContract');
    expect(play).toHaveBeenCalledWith('saveContract');
  });

  it('payday plays the coin payout (plus an optional extra sound)', async () => {
    feedback.payday();
    await flush();
    expect(notification).toHaveBeenCalledWith({ type: 'SUCCESS' });
    expect(play).toHaveBeenCalledWith('payday');

    play.mockClear();
    feedback.payday('approveProof');
    expect(play).toHaveBeenCalledWith('approveProof');
    expect(play).toHaveBeenCalledWith('payday');
  });

  it('warning and error fire the matching notification haptics', async () => {
    feedback.warning('delete');
    await flush();
    expect(notification).toHaveBeenCalledWith({ type: 'WARNING' });
    expect(play).toHaveBeenCalledWith('delete');

    feedback.error();
    await flush();
    expect(notification).toHaveBeenCalledWith({ type: 'ERROR' });
  });

  it('the sound toggle silences haptics too', async () => {
    enabled = false;
    feedback.tap('click1a');
    feedback.success();
    feedback.payday();
    feedback.warning('delete');
    feedback.error();
    await flush();

    expect(impact).not.toHaveBeenCalled();
    expect(notification).not.toHaveBeenCalled();
    // sounds themselves are gated inside soundManager.play; feedback still
    // delegates the keys it was asked for
  });
});
