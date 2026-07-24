// Enhanced sound manager with Android-specific optimizations.
//
// THE REGISTER Wave 0 changes:
// - The registry is typed: `SoundKey` is derived from the map below, so a
//   typo'd key is a compile error instead of four months of silence (the
//   History tab requested an unregistered 'click1e' since it was written).
// - Audio elements are created lazily and warmed on the first user gesture.
//   Previously the constructor ran at module scope with preload='auto',
//   fetching ~844 kb of MP3 during first paint.
// - Fresh installs default to sound OFF (haptics stay on — see feedback.ts).
//   "Quiet by default" is the right posture for an app used in living rooms;
//   the profile settings toggle turns sound on in one tap. Existing devices
//   keep whatever they had stored.

// Every key requested anywhere in the app must be registered here.
// Volumes (Phase 4 pass): UI clicks stay quiet, completion sounds sit in
// the middle, the coin payout is the loudest moment in the app.
const soundFiles = {
  acceptContract: { path: '/sounds/success.mp3', volume: 0.5 },
  success: { path: '/sounds/success.mp3', volume: 0.5 },
  click1: { path: '/sounds/click1a.mp3', volume: 0.35 }, // trimmed variant; click1.mp3 is a 5.4 MB full track
  click2: { path: '/sounds/click2a.mp3', volume: 0.35 },
  // Nav tab clicks (Layout)
  click1a: { path: '/sounds/click1a.mp3', volume: 0.35 },
  click1b: { path: '/sounds/click1b.mp3', volume: 0.35 },
  click1c: { path: '/sounds/click1c.mp3', volume: 0.35 },
  click1d: { path: '/sounds/click1d.mp3', volume: 0.35 },
  // Fifth tab (History) — no dedicated sample; reuses the second click voice.
  click1e: { path: '/sounds/click1b.mp3', volume: 0.35 },
  notification: { path: '/sounds/notification.mp3', volume: 0.5 },
  coin: { path: '/sounds/coin.mp3', volume: 0.65 },
  create: { path: '/sounds/create.mp3', volume: 0.5 },
  delete: { path: '/sounds/delete lowD.mp3', volume: 0.45 },
  // Action aliases used across pages/modals
  upload: { path: '/sounds/click2c.mp3', volume: 0.35 },
  saveProfile: { path: '/sounds/success.mp3', volume: 0.5 },
  toggleOn: { path: '/sounds/click2b.mp3', volume: 0.35 },
  saveContract: { path: '/sounds/create.mp3', volume: 0.5 },
  friendRequest: { path: '/sounds/notification.mp3', volume: 0.5 },
  approveProof: { path: '/sounds/success.mp3', volume: 0.5 },
  // Credit award moment (feedback.payday). Same file as `coin` for now —
  // a distinct payday sound is parked for the audio audition.
  payday: { path: '/sounds/coin.mp3', volume: 0.65 },
} as const;

export type SoundKey = keyof typeof soundFiles;

export const SOUND_KEYS = Object.keys(soundFiles) as SoundKey[];

class SoundManager {
  private sounds: Partial<Record<SoundKey, HTMLAudioElement>> = {};
  private isAndroid: boolean = false;
  private androidVersion: number = 0;
  private isLowPowerMode: boolean = false;
  private enabled: boolean;
  private warmed: boolean = false;

  constructor() {
    this.detectAndroid();
    this.detectLowPowerMode();
    // Load enabled state from localStorage. Malformed data must not crash the
    // module (this constructor runs before the root error boundary mounts).
    let saved: boolean | null = null;
    try {
      const raw = localStorage.getItem('soundEnabled');
      if (raw !== null) saved = JSON.parse(raw) === true;
    } catch {
      saved = null;
    }
    // Fresh install default: sound OFF.
    this.enabled = saved ?? false;
    this.registerWarmup();
  }

  private detectAndroid(): void {
    const userAgent = navigator.userAgent.toLowerCase();
    this.isAndroid = userAgent.includes('android');

    if (this.isAndroid) {
      const androidMatch = userAgent.match(/android (\d+)/);
      if (androidMatch) {
        this.androidVersion = parseInt(androidMatch[1], 10);
      }
    }
  }

  private detectLowPowerMode(): void {
    // Check for battery API to detect low power mode
    const nav = navigator as unknown as { getBattery?: () => Promise<{ level: number }> };
    if (typeof nav.getBattery === 'function') {
      nav
        .getBattery()
        .then((battery) => {
          this.isLowPowerMode = battery.level < 0.2; // Below 20%
        })
        .catch(() => {
          this.isLowPowerMode = false;
        });
    }
  }

  /** Instantiate all audio elements on the first user gesture — never at first paint. */
  private registerWarmup(): void {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    window.addEventListener(
      'pointerdown',
      () => {
        this.warmed = true;
        if (!this.enabled) return; // muted installs never fetch audio
        SOUND_KEYS.forEach((key) => this.ensureAudio(key));
        // Safari unlock: constructing elements is not enough — playback must
        // directly result from a user gesture at least once, or the first
        // asynchronous sound (e.g. a payday arriving via realtime) may be
        // rejected. Play one muted sample inside the gesture handler.
        const unlock = this.sounds.click1a;
        if (unlock) {
          unlock.muted = true;
          const attempt = unlock.play();
          if (attempt !== undefined) {
            attempt
              .then(() => {
                unlock.pause();
                unlock.currentTime = 0;
                unlock.muted = false;
              })
              .catch(() => {
                unlock.muted = false;
              });
          } else {
            unlock.muted = false;
          }
        }
      },
      { once: true, passive: true }
    );
  }

  private ensureAudio(soundName: SoundKey): HTMLAudioElement | null {
    const existing = this.sounds[soundName];
    if (existing) return existing;

    const config = soundFiles[soundName];
    if (!config) return null;

    let audio: HTMLAudioElement;
    try {
      audio = new Audio(config.path);
    } catch {
      return null;
    }
    audio.volume = config.volume;

    // Android-specific optimizations
    if (this.isAndroid) {
      audio.preload = 'none'; // Don't preload on Android to save bandwidth

      // Set audio context to handle Android audio policies
      if (this.androidVersion >= 9) {
        audio.setAttribute('playsinline', 'true');
      }
    } else {
      audio.preload = 'auto';
    }

    this.sounds[soundName] = audio;
    return audio;
  }

  public play(soundName: SoundKey): void {
    // Skip sound if disabled globally
    if (!this.enabled) {
      return;
    }

    // Skip sound in low power mode on Android
    if (this.isAndroid && this.isLowPowerMode) {
      return;
    }

    const audio = this.ensureAudio(soundName);
    if (!audio) {
      if (import.meta.env.DEV) {
        console.warn(`soundManager: unknown sound key "${soundName}"`);
      }
      return;
    }

    try {
      // Android-specific playback handling
      if (this.isAndroid) {
        // Reset audio for Android compatibility
        audio.currentTime = 0;

        // Use promise-based play for better error handling
        const playPromise = audio.play();

        if (playPromise !== undefined) {
          playPromise
            .catch(() => {
              // Fallback: try to play with user interaction
              this.playWithUserInteraction(audio);
            });
        }
      } else {
        // Standard web playback
        audio.currentTime = 0;
        audio.play().catch(() => void 0);
      }
    } catch {
      void 0;
    }
  }

  private playWithUserInteraction(audio: HTMLAudioElement): void {
    // Create a temporary button to trigger user interaction
    const tempButton = document.createElement('button');
    tempButton.style.display = 'none';
    tempButton.onclick = () => {
      audio.play().catch(() => void 0);
      document.body.removeChild(tempButton);
    };

    document.body.appendChild(tempButton);
    tempButton.click();
  }

  public preloadSound(soundName: SoundKey): void {
    const audio = this.ensureAudio(soundName);
    if (audio && this.isAndroid) {
      // Only preload on Android when specifically requested
      audio.preload = 'auto';
      audio.load();
    }
  }

  public setVolume(soundName: SoundKey, volume: number): void {
    const audio = this.ensureAudio(soundName);
    if (audio) {
      // Adjust volume for Android devices
      const adjustedVolume = this.isAndroid ? Math.min(volume * 0.8, 1.0) : volume;
      audio.volume = adjustedVolume;
    }
  }

  public mute(soundName?: SoundKey): void {
    if (soundName) {
      const audio = this.sounds[soundName];
      if (audio) {
        audio.muted = true;
      }
    } else {
      // Mute all sounds
      Object.values(this.sounds).forEach(audio => {
        if (audio) audio.muted = true;
      });
    }
  }

  public unmute(soundName?: SoundKey): void {
    if (soundName) {
      const audio = this.sounds[soundName];
      if (audio) {
        audio.muted = false;
      }
    } else {
      // Unmute all sounds
      Object.values(this.sounds).forEach(audio => {
        if (audio) audio.muted = false;
      });
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    // Save to localStorage
    try {
      localStorage.setItem('soundEnabled', JSON.stringify(this.enabled));
    } catch { /* storage may be unavailable (private mode) */ }
    if (this.enabled && this.warmed) {
      SOUND_KEYS.forEach((key) => this.ensureAudio(key));
    }
    return this.enabled;
  }

  public enable(): void {
    this.enabled = true;
    try {
      localStorage.setItem('soundEnabled', JSON.stringify(this.enabled));
    } catch { /* ignore */ }
  }

  public disable(): void {
    this.enabled = false;
    try {
      localStorage.setItem('soundEnabled', JSON.stringify(this.enabled));
    } catch { /* ignore */ }
  }

  public isAndroidDevice(): boolean {
    return this.isAndroid;
  }

  public getAndroidVersion(): number {
    return this.androidVersion;
  }
}

// Export singleton instance
export const soundManager = new SoundManager();
export default soundManager;
