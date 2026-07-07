// Unified user feedback: sound + haptics fired together through one semantic API.
// Call sites say WHAT happened (tap, success, payday, warning) and this module
// decides how it feels. Both channels respect the single sound toggle in
// soundManager — muting the app mutes vibration too.
//
// Haptics run natively on iOS/Android via @capacitor/haptics; in the browser the
// plugin falls back to navigator.vibrate where available and silently no-ops
// elsewhere. The plugin is loaded lazily on first use — a static import here
// would put @capacitor/* on the critical path of every page load.

import { soundManager } from './soundManager';

type HapticsModule = typeof import('@capacitor/haptics');

let hapticsLoad: Promise<HapticsModule | null> | null = null;

function loadHaptics(): Promise<HapticsModule | null> {
  if (!hapticsLoad) {
    hapticsLoad = import('@capacitor/haptics').then(
      (mod) => mod,
      () => null
    );
  }
  return hapticsLoad;
}

function impact(style: 'Light' | 'Medium' | 'Heavy'): void {
  if (!soundManager.isEnabled()) return;
  loadHaptics().then((mod) => {
    if (!mod) return;
    mod.Haptics.impact({ style: mod.ImpactStyle[style] }).catch(() => void 0);
  });
}

function notify(type: 'Success' | 'Warning' | 'Error'): void {
  if (!soundManager.isEnabled()) return;
  loadHaptics().then((mod) => {
    if (!mod) return;
    mod.Haptics.notification({ type: mod.NotificationType[type] }).catch(() => void 0);
  });
}

export const feedback = {
  /** Light impact for button taps / nav clicks. Optional UI sound (e.g. 'click1a', 'toggleOn'). */
  tap(soundKey?: string): void {
    impact('Light');
    if (soundKey) soundManager.play(soundKey);
  },

  /** A completed action: save, accept, submit. */
  success(soundKey: string = 'success'): void {
    notify('Success');
    soundManager.play(soundKey);
  },

  /** Credits landing: approve payout, reward claim. Success haptic + coin sound. */
  payday(extraSoundKey?: string): void {
    notify('Success');
    if (extraSoundKey) soundManager.play(extraSoundKey);
    soundManager.play('payday');
  },

  /** Destructive or cautionary action: reject, delete. Sound optional (e.g. 'delete'). */
  warning(soundKey?: string): void {
    notify('Warning');
    if (soundKey) soundManager.play(soundKey);
  },

  /** A failed action. Haptic only — errors already toast loudly. */
  error(): void {
    notify('Error');
  },
};

export default feedback;
