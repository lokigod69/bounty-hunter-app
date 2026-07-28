// Unified user feedback: sound + haptics fired through one semantic API.
// Call sites say WHAT happened (tap, success, payday, warning) and this module
// decides how it feels.
//
// THE REGISTER Wave 0: sound and haptics are now INDEPENDENT channels.
// Previously both gates checked the single sound toggle, so muting the app in
// a quiet room also removed every vibration — on the one platform where
// haptics are the only remaining silent channel. Defaults: sound OFF for
// fresh installs (soundManager), haptics ON. Each has its own settings toggle.
//
// Haptics run natively on iOS/Android via @capacitor/haptics; in the browser the
// plugin falls back to navigator.vibrate where available and silently no-ops
// elsewhere. The plugin is loaded lazily on first use — a static import here
// would put @capacitor/* on the critical path of every page load.

import { soundManager, type SoundKey } from './soundManager';

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

function readHapticsPref(): boolean {
  try {
    const raw = localStorage.getItem('hapticsEnabled');
    if (raw !== null) return JSON.parse(raw) === true;
  } catch {
    /* malformed/unavailable storage falls through to the default */
  }
  return true; // haptics default ON
}

let hapticsEnabled = readHapticsPref();

function impact(style: 'Light' | 'Medium' | 'Heavy'): void {
  if (!hapticsEnabled) return;
  loadHaptics().then((mod) => {
    if (!mod) return;
    mod.Haptics.impact({ style: mod.ImpactStyle[style] }).catch(() => void 0);
  });
}

function notify(type: 'Success' | 'Warning' | 'Error'): void {
  if (!hapticsEnabled) return;
  loadHaptics().then((mod) => {
    if (!mod) return;
    mod.Haptics.notification({ type: mod.NotificationType[type] }).catch(() => void 0);
  });
}

export const feedback = {
  /** Light impact for button taps / nav clicks. Optional UI sound (e.g. 'click1a', 'toggleOn'). */
  tap(soundKey?: SoundKey): void {
    impact('Light');
    if (soundKey) soundManager.play(soundKey);
  },

  /** Medium impact — a commitment landing (seal strikes, accept). */
  press(soundKey?: SoundKey): void {
    impact('Medium');
    if (soundKey) soundManager.play(soundKey);
  },

  /** A completed action: save, accept, submit. */
  success(soundKey: SoundKey = 'success'): void {
    notify('Success');
    soundManager.play(soundKey);
  },

  /** Credits landing: approve payout, reward claim. Success haptic + coin sound. */
  payday(extraSoundKey?: SoundKey): void {
    notify('Success');
    if (extraSoundKey) soundManager.play(extraSoundKey);
    soundManager.play('payday');
  },

  /**
   * Rank-up — the only three-note event in the product (THE REGISTER §3.1).
   * Heavy strike, then payday at +140ms, then success at +320ms. The strike
   * itself is haptic-only until a real seal.mp3 is commissioned.
   */
  rankUp(): void {
    impact('Heavy');
    window.setTimeout(() => {
      notify('Success');
      soundManager.play('payday');
    }, 140);
    window.setTimeout(() => {
      soundManager.play('success');
    }, 320);
  },

  /** Destructive or cautionary action: reject, delete. Sound optional (e.g. 'delete'). */
  warning(soundKey?: SoundKey): void {
    notify('Warning');
    if (soundKey) soundManager.play(soundKey);
  },

  /** A failed action. Haptic only — errors already toast loudly. */
  error(): void {
    notify('Error');
  },

  /** The independent haptics preference (sound lives in soundManager). */
  isHapticsEnabled(): boolean {
    return hapticsEnabled;
  },

  setHapticsEnabled(value: boolean): void {
    hapticsEnabled = value;
    try {
      localStorage.setItem('hapticsEnabled', JSON.stringify(value));
    } catch {
      /* storage may be unavailable (private mode) */
    }
  },
};

export default feedback;
