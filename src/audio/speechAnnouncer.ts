export interface ISpeechAnnouncer {
  announce(id: number, text: string, muted: boolean, volume?: number): boolean;
  isPolishVoiceAvailable(): boolean;
  stop(): void;
  dispose(): void;
}

export class WebSpeechAnnouncer implements ISpeechAnnouncer {
  private readonly synth: SpeechSynthesis | null;
  private polishVoice: SpeechSynthesisVoice | null = null;
  private lastSpokenId = -1;

  public constructor() {
    this.synth = typeof window !== 'undefined' && 'speechSynthesis' in window
      ? window.speechSynthesis
      : null;
    if (this.synth) {
      this.refreshVoices();
      this.synth.addEventListener('voiceschanged', this.handleVoicesChanged);
    }
  }

  public isPolishVoiceAvailable(): boolean {
    if (!this.polishVoice && this.synth) {
      this.refreshVoices();
    }
    return this.polishVoice !== null;
  }

  public announce(id: number, text: string, muted: boolean, volume = 0.92): boolean {
    if (id === this.lastSpokenId) {
      return this.polishVoice !== null && !muted && volume > 0.01;
    }
    this.lastSpokenId = id;
    const clampedVol = Math.max(0, Math.min(1, volume));
    if (muted || clampedVol <= 0.01 || !this.synth || !this.isPolishVoiceAvailable()) {
      return false;
    }
    try {
      this.synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pl-PL';
      utterance.voice = this.polishVoice;
      utterance.rate = 0.98;
      utterance.pitch = 1.0;
      utterance.volume = clampedVol;
      this.synth.speak(utterance);
      return true;
    } catch {
      return false;
    }
  }

  public stop(): void {
    if (!this.synth) {
      return;
    }
    try {
      this.synth.cancel();
    } catch {
      // Ignore synthesis errors in headless environments
    }
  }

  public dispose(): void {
    if (this.synth) {
      this.synth.removeEventListener('voiceschanged', this.handleVoicesChanged);
    }
    this.stop();
  }

  private readonly handleVoicesChanged = (): void => {
    this.refreshVoices();
  };

  private refreshVoices(): void {
    if (!this.synth) {
      return;
    }
    const voices = this.synth.getVoices();
    const exactPl = voices.find((v) => v.lang.toLowerCase() === 'pl-pl');
    const anyPl = voices.find((v) => v.lang.toLowerCase().startsWith('pl'));
    this.polishVoice = exactPl ?? anyPl ?? null;
  }
}
