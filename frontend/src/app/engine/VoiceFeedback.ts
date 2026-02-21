/**
 * Voice Feedback System
 * Provides real-time audio feedback using browser speech synthesis
 */

export class VoiceFeedback {
  private synth: SpeechSynthesis;
  private lastAnnouncement: string = '';
  private lastAnnouncementTime: number = 0;
  private minTimeBetweenAnnouncements: number = 2000; // 2 seconds
  private enabled: boolean = true;
  private voice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.synth = window.speechSynthesis;
    this.loadVoice();
  }

  /**
   * Load preferred voice
   */
  private loadVoice(): void {
    const voices = this.synth.getVoices();
    
    if (voices.length === 0) {
      // Voices not loaded yet, try again
      this.synth.onvoiceschanged = () => {
        this.loadVoice();
      };
      return;
    }

    // Prefer English female voice if available
    this.voice = voices.find(voice => 
      voice.lang.startsWith('en') && voice.name.includes('Female')
    ) || voices.find(voice => 
      voice.lang.startsWith('en')
    ) || voices[0];
  }

  /**
   * Speak a message
   */
  private speak(text: string): void {
    if (!this.enabled) return;

    // Cancel any ongoing speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    if (this.voice) {
      utterance.voice = this.voice;
    }
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    this.synth.speak(utterance);
  }

  /**
   * Announce correct rep
   */
  public announceCorrectRep(repNumber: number): void {
    const now = Date.now();
    if (now - this.lastAnnouncementTime < this.minTimeBetweenAnnouncements) {
      return;
    }

    const message = `Correct rep ${repNumber}`;
    this.speak(message);
    
    this.lastAnnouncement = message;
    this.lastAnnouncementTime = now;
  }

  /**
   * Announce incomplete range
   */
  public announceIncompleteRange(): void {
    const now = Date.now();
    if (now - this.lastAnnouncementTime < this.minTimeBetweenAnnouncements) {
      return;
    }

    const message = 'Incomplete range of motion';
    this.speak(message);
    
    this.lastAnnouncement = message;
    this.lastAnnouncementTime = now;
  }

  /**
   * Announce alignment correction
   */
  public announceAlignment(instruction: string): void {
    const now = Date.now();
    if (now - this.lastAnnouncementTime < this.minTimeBetweenAnnouncements) {
      return;
    }

    this.speak(instruction);
    
    this.lastAnnouncement = instruction;
    this.lastAnnouncementTime = now;
  }

  /**
   * Announce general instruction
   */
  public announce(message: string): void {
    const now = Date.now();
    
    // Don't repeat same message too quickly
    if (message === this.lastAnnouncement && 
        now - this.lastAnnouncementTime < this.minTimeBetweenAnnouncements) {
      return;
    }

    this.speak(message);
    
    this.lastAnnouncement = message;
    this.lastAnnouncementTime = now;
  }

  /**
   * Enable voice feedback
   */
  public enable(): void {
    this.enabled = true;
  }

  /**
   * Disable voice feedback
   */
  public disable(): void {
    this.enabled = false;
    this.synth.cancel();
  }

  /**
   * Toggle voice feedback
   */
  public toggle(): void {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.synth.cancel();
    }
  }

  /**
   * Check if enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Stop all speech
   */
  public stop(): void {
    this.synth.cancel();
  }
}

// Singleton instance
let voiceFeedbackInstance: VoiceFeedback | null = null;

export function getVoiceFeedback(): VoiceFeedback {
  if (!voiceFeedbackInstance) {
    voiceFeedbackInstance = new VoiceFeedback();
  }
  return voiceFeedbackInstance;
}
