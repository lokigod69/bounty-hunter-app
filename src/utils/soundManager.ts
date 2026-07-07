// Enhanced sound manager with Android-specific optimizations
class SoundManager {
  private sounds: { [key: string]: HTMLAudioElement } = {};
  private isAndroid: boolean = false;
  private androidVersion: number = 0;
  private isLowPowerMode: boolean = false;
  private enabled: boolean = true; // Add enabled state

  constructor() {
    this.detectAndroid();
    this.detectLowPowerMode();
    this.preloadSounds();
    // Load enabled state from localStorage
    const savedState = localStorage.getItem('soundEnabled');
    this.enabled = savedState !== null ? JSON.parse(savedState) : true;
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

  private preloadSounds(): void {
    // Every key requested anywhere in the app must be registered here —
    // play() silently no-ops on unknown keys, which is how half the app's
    // sounds went missing for months.
    // Volumes (Phase 4 pass): UI clicks stay quiet, completion sounds sit in
    // the middle, the coin payout is the loudest moment in the app.
    const soundFiles: Record<string, { path: string; volume: number }> = {
      acceptContract: { path: '/sounds/success.mp3', volume: 0.5 },
      success: { path: '/sounds/success.mp3', volume: 0.5 },
      click1: { path: '/sounds/click1a.mp3', volume: 0.35 }, // trimmed variant; click1.mp3 is a 5.4 MB full track
      click2: { path: '/sounds/click2a.mp3', volume: 0.35 },
      // Nav tab clicks (Layout)
      click1a: { path: '/sounds/click1a.mp3', volume: 0.35 },
      click1b: { path: '/sounds/click1b.mp3', volume: 0.35 },
      click1c: { path: '/sounds/click1c.mp3', volume: 0.35 },
      click1d: { path: '/sounds/click1d.mp3', volume: 0.35 },
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
    };

    Object.entries(soundFiles).forEach(([name, { path, volume }]) => {
      const audio = new Audio(path);
      audio.volume = volume;

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

      this.sounds[name] = audio;
    });
  }

  public play(soundName: string): void {
    // Skip sound if disabled globally
    if (!this.enabled) {
      return;
    }

    // Skip sound in low power mode on Android
    if (this.isAndroid && this.isLowPowerMode) {
      return;
    }

    const audio = this.sounds[soundName];
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

  public preloadSound(soundName: string): void {
    const audio = this.sounds[soundName];
    if (audio && this.isAndroid) {
      // Only preload on Android when specifically requested
      audio.preload = 'auto';
      audio.load();
    }
  }

  public setVolume(soundName: string, volume: number): void {
    const audio = this.sounds[soundName];
    if (audio) {
      // Adjust volume for Android devices
      const adjustedVolume = this.isAndroid ? Math.min(volume * 0.8, 1.0) : volume;
      audio.volume = adjustedVolume;
    }
  }

  public mute(soundName?: string): void {
    if (soundName) {
      const audio = this.sounds[soundName];
      if (audio) {
        audio.muted = true;
      }
    } else {
      // Mute all sounds
      Object.values(this.sounds).forEach(audio => {
        audio.muted = true;
      });
    }
  }

  public unmute(soundName?: string): void {
    if (soundName) {
      const audio = this.sounds[soundName];
      if (audio) {
        audio.muted = false;
      }
    } else {
      // Unmute all sounds
      Object.values(this.sounds).forEach(audio => {
        audio.muted = false;
      });
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    // Save to localStorage
    localStorage.setItem('soundEnabled', JSON.stringify(this.enabled));
    return this.enabled;
  }

  public enable(): void {
    this.enabled = true;
    localStorage.setItem('soundEnabled', JSON.stringify(this.enabled));
  }

  public disable(): void {
    this.enabled = false;
    localStorage.setItem('soundEnabled', JSON.stringify(this.enabled));
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
