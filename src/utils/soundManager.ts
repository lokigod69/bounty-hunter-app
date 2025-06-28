// src/utils/soundManager.ts
// Manages all audio feedback for the application.

class SoundManager {
  private sounds: { [key: string]: HTMLAudioElement } = {};
  private enabled: boolean = true;

  constructor() {
    // Initialize all sounds
    this.sounds = {
      // General actions
      success: new Audio('/sounds/success.mp3'),
      create: new Audio('/sounds/create.mp3'),
      coin: new Audio('/sounds/coin.mp3'),
      notification: new Audio('/sounds/notification.mp3'),
      
      // UI feedback sounds
      navigation: new Audio('/sounds/click1.mp3'),    // Tab/menu navigation
      delete: new Audio('/sounds/click2.mp3'),        // Delete actions
      upload: new Audio('/sounds/click3.mp3'),        // Successful uploads
      friendRequest: new Audio('/sounds/click7.mp3'), // Send friend request
      acceptContract: new Audio('/sounds/click8.mp3'), // Accept contract

      // Tab navigation sounds
      click1a: new Audio('/sounds/click1a.mp3'),
      click1b: new Audio('/sounds/click1b.mp3'),
      click1c: new Audio('/sounds/click1c.mp3'),
      click1d: new Audio('/sounds/click1d.mp3'),
      click1e: new Audio('/sounds/click1e.mp3'),

      // Additional specific sounds
      approveProof: new Audio('/sounds/click4.mp3'),     // Approve submitted proof
      saveContract: new Audio('/sounds/click5.mp3'),     // Save contract edits
      saveProfile: new Audio('/sounds/click6.mp3'),      // Save profile changes
    };

    // Preload all sounds and set a default volume
    Object.values(this.sounds).forEach(sound => {
      sound.preload = 'auto';
      sound.volume = 0.5; // Default volume, can be adjusted
    });

    // Check user preference from localStorage
    const storedPreference = localStorage.getItem('soundEnabled');
    this.enabled = storedPreference !== 'false';
  }

  play(soundName: keyof SoundManager['sounds']) {
    if (!this.enabled) return;
    
    try {
      const sound = this.sounds[soundName];
      if (sound) {
        sound.currentTime = 0; // Rewind to start for rapid plays
        sound.play().catch(e => console.error('Sound play failed:', e));
      } else {
        console.warn(`Sound '${soundName}' not found.`);
      }
    } catch (error) {
      console.error(`Error playing sound '${soundName}':`, error);
    }
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    localStorage.setItem('soundEnabled', String(this.enabled));
    return this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export const soundManager = new SoundManager();
