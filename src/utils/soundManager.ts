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
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        this.isLowPowerMode = battery.level < 0.2; // Below 20%
      }).catch(() => {
        this.isLowPowerMode = false;
      });
    }
  }

  private preloadSounds(): void {
    const soundFiles = {
      acceptContract: '/sounds/success.mp3',
      success: '/sounds/success.mp3',
      click1: '/sounds/click1.mp3',
      click2: '/sounds/click2.mp3',
      notification: '/sounds/notification.mp3',
      coin: '/sounds/coin.mp3',
      create: '/sounds/create.mp3',
      delete: '/sounds/delete lowD.mp3',
    };

    Object.entries(soundFiles).forEach(([name, path]) => {
      const audio = new Audio(path);
      
      // Android-specific optimizations
      if (this.isAndroid) {
        audio.preload = 'none'; // Don't preload on Android to save bandwidth
        audio.volume = 0.7; // Slightly lower volume for Android speakers
        
        // Set audio context to handle Android audio policies
        if (this.androidVersion >= 9) {
          audio.setAttribute('playsinline', 'true');
        }
      } else {
        audio.preload = 'auto';
        audio.volume = 0.5;
      }

      // Add error handling for audio loading
      audio.addEventListener('error', (e) => {
        console.warn(`Failed to load sound: ${name}`, e);
      });

      // Add load event to ensure audio is ready
      audio.addEventListener('canplaythrough', () => {
        console.log(`Sound loaded: ${name}`);
      });

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
      console.warn(`Sound not found: ${soundName}`);
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
            .then(() => {
              console.log(`Sound played successfully: ${soundName}`);
            })
            .catch((error) => {
              console.warn(`Sound play failed: ${soundName}`, error);
              // Fallback: try to play with user interaction
              this.playWithUserInteraction(audio, soundName);
            });
        }
      } else {
        // Standard web playback
        audio.currentTime = 0;
        audio.play().catch((error) => {
          console.warn(`Sound play failed: ${soundName}`, error);
        });
      }
    } catch (error) {
      console.warn(`Error playing sound: ${soundName}`, error);
    }
  }

  private playWithUserInteraction(audio: HTMLAudioElement, soundName: string): void {
    // Create a temporary button to trigger user interaction
    const tempButton = document.createElement('button');
    tempButton.style.display = 'none';
    tempButton.onclick = () => {
      audio.play().catch((error) => {
        console.warn(`Fallback sound play failed: ${soundName}`, error);
      });
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
