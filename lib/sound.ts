/**
 * Sound Utility for Typing Feedback
 *
 * Provides audio feedback for typing events using Web Audio API.
 * Uses oscillators to generate synthetic sounds (no external audio files needed).
 */

class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private masterVolume: number = 0.3; // 0.0 to 1.0

  constructor() {
    // Initialize AudioContext lazily on first use (user gesture required)
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      // AudioContext will be created on first play
    }
  }

  /**
   * Ensure AudioContext is initialized
   */
  private ensureAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    // Resume if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  /**
   * Play error sound (bonk)
   * Low-frequency "thud" sound to indicate typing error
   */
  playBonk(): void {
    if (!this.enabled) return;

    try {
      const ctx = this.ensureAudioContext();
      const now = ctx.currentTime;

      // Create oscillator for low thud
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Low frequency thud
      oscillator.frequency.setValueAtTime(100, now); // Start at 100Hz
      oscillator.frequency.exponentialRampToValueAtTime(40, now + 0.1); // Drop to 40Hz

      // Volume envelope (quick decay)
      gainNode.gain.setValueAtTime(this.masterVolume * 0.5, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      // Use square wave for harsher sound
      oscillator.type = 'square';

      oscillator.start(now);
      oscillator.stop(now + 0.15);
    } catch (error) {
      console.warn('Bonk sound failed:', error);
    }
  }

  /**
   * Play success sound (subtle click)
   * Soft click for correct keystrokes
   */
  playSuccess(): void {
    if (!this.enabled) return;

    try {
      const ctx = this.ensureAudioContext();
      const now = ctx.currentTime;

      // Create short noise burst for click
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // High frequency click
      oscillator.frequency.setValueAtTime(800, now);

      // Very short envelope
      gainNode.gain.setValueAtTime(this.masterVolume * 0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.02);

      oscillator.type = 'sine';

      oscillator.start(now);
      oscillator.stop(now + 0.02);
    } catch (error) {
      console.warn('Success sound failed:', error);
    }
  }

  /**
   * Play completion sound (victory fanfare)
   * Celebratory chord for completing a race/drill
   */
  playCompletion(): void {
    if (!this.enabled) return;

    try {
      const ctx = this.ensureAudioContext();
      const now = ctx.currentTime;

      // Play a simple major chord (C-E-G)
      const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
      const duration = 0.5;

      frequencies.forEach((freq, index) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.setValueAtTime(freq, now);

        // Staggered attack for richer sound
        const attackDelay = index * 0.05;
        gainNode.gain.setValueAtTime(0, now + attackDelay);
        gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.2, now + attackDelay + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

        oscillator.type = 'sine';

        oscillator.start(now + attackDelay);
        oscillator.stop(now + duration);
      });
    } catch (error) {
      console.warn('Completion sound failed:', error);
    }
  }

  /**
   * Play nitro boost sound (ascending whoosh)
   * For typing streaks or speed bursts
   */
  playNitro(): void {
    if (!this.enabled) return;

    try {
      const ctx = this.ensureAudioContext();
      const now = ctx.currentTime;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Ascending sweep
      oscillator.frequency.setValueAtTime(200, now);
      oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.3);

      gainNode.gain.setValueAtTime(this.masterVolume * 0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      oscillator.type = 'sawtooth';

      oscillator.start(now);
      oscillator.stop(now + 0.3);
    } catch (error) {
      console.warn('Nitro sound failed:', error);
    }
  }

  /**
   * Play metronome tick
   * For rhythm training mode
   */
  playTick(): void {
    if (!this.enabled) return;

    try {
      const ctx = this.ensureAudioContext();
      const now = ctx.currentTime;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(1000, now);

      gainNode.gain.setValueAtTime(this.masterVolume * 0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

      oscillator.type = 'sine';

      oscillator.start(now);
      oscillator.stop(now + 0.05);
    } catch (error) {
      console.warn('Tick sound failed:', error);
    }
  }

  /**
   * Enable/disable all sounds
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Set master volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Export singleton instance
export const soundManager = new SoundManager();

// Export convenience functions
export const playBonk = () => soundManager.playBonk();
export const playSuccess = () => soundManager.playSuccess();
export const playCompletion = () => soundManager.playCompletion();
export const playNitro = () => soundManager.playNitro();
export const playTick = () => soundManager.playTick();
export const setSoundEnabled = (enabled: boolean) => soundManager.setEnabled(enabled);
export const setSoundVolume = (volume: number) => soundManager.setVolume(volume);
