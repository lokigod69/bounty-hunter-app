// Guards the feedback contract: every semantic event fires the right
// haptic + sound pair, and the two channels are INDEPENDENT — muting sound
// must not remove haptics (THE REGISTER Wave 0 split; supersedes the old
// single-toggle contract).

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
    feedback.setHapticsEnabled(true);
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

  it('press fires a medium impact (a commitment landing)', async () => {
    feedback.press();
    await flush();
    expect(impact).toHaveBeenCalledWith({ style: 'MEDIUM' });
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

  it('rankUp is the only three-note event: heavy strike, payday at +140ms, success at +320ms', async () => {
    vi.useFakeTimers();
    try {
      feedback.rankUp();
      await vi.advanceTimersByTimeAsync(0);
      expect(impact).toHaveBeenCalledWith({ style: 'HEAVY' });
      expect(play).not.toHaveBeenCalled(); // the strike is haptic-only (no seal.mp3 yet)

      await vi.advanceTimersByTimeAsync(140);
      expect(notification).toHaveBeenCalledWith({ type: 'SUCCESS' });
      expect(play).toHaveBeenCalledWith('payday');

      await vi.advanceTimersByTimeAsync(180);
      expect(play).toHaveBeenCalledWith('success');
    } finally {
      vi.useRealTimers();
    }
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

  it('muting sound does NOT silence haptics — the channels are independent', async () => {
    enabled = false; // sound toggle off
    feedback.tap('click1a');
    feedback.success();
    await flush();

    // Haptics still fire (sound gating happens inside soundManager.play).
    expect(impact).toHaveBeenCalledWith({ style: 'LIGHT' });
    expect(notification).toHaveBeenCalledWith({ type: 'SUCCESS' });
  });

  it('the haptics preference silences haptics without touching sound', async () => {
    feedback.setHapticsEnabled(false);
    feedback.tap('click1a');
    feedback.success();
    feedback.payday();
    feedback.warning('delete');
    feedback.error();
    await flush();

    expect(impact).not.toHaveBeenCalled();
    expect(notification).not.toHaveBeenCalled();
    // Sound keys are still delegated — the sound channel has its own toggle.
    expect(play).toHaveBeenCalledWith('click1a');
    expect(play).toHaveBeenCalledWith('payday');
  });

  it('the haptics preference round-trips through the setter', () => {
    // (Storage persistence is guarded try/catch in the implementation; this
    // suite runs in a node environment without localStorage.)
    feedback.setHapticsEnabled(false);
    expect(feedback.isHapticsEnabled()).toBe(false);
    feedback.setHapticsEnabled(true);
    expect(feedback.isHapticsEnabled()).toBe(true);
  });
});
