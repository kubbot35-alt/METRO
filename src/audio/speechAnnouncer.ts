import type { LanguageId } from '../domain/types';

export type SpeechStyle = 'standard' | 'pa';

export interface ISpeechAnnouncer {
  announce(
    id: number,
    text: string,
    muted: boolean,
    volume?: number,
    language?: LanguageId,
    style?: SpeechStyle,
  ): boolean;
  isPolishVoiceAvailable(): boolean;
  isVoiceAvailable?(language: LanguageId): boolean;
  stop(): void;
  dispose(): void;
}

export class WebSpeechAnnouncer implements ISpeechAnnouncer {
  private readonly synth: SpeechSynthesis | null;
  private polishVoice: SpeechSynthesisVoice | null = null;
  private englishVoice: SpeechSynthesisVoice | null = null;
  private lastSpokenKey = '';

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

  public isVoiceAvailable(language: LanguageId): boolean {
    if (this.synth && (!this.polishVoice || !this.englishVoice)) {
      this.refreshVoices();
    }
    return language === 'en' ? this.englishVoice !== null : this.polishVoice !== null;
  }

  public announce(
    id: number,
    text: string,
    muted: boolean,
    volume = 0.92,
    language: LanguageId = 'pl',
    style: SpeechStyle = 'standard',
  ): boolean {
    const key = `${id}:${language}:${style}`;
    if (key === this.lastSpokenKey) {
      return this.isVoiceAvailable(language) && !muted && volume > 0.01;
    }
    this.lastSpokenKey = key;
    const clampedVol = Math.max(0, Math.min(1, volume));
    if (muted || clampedVol <= 0.01 || !this.synth) {
      return false;
    }
    if (!this.polishVoice || !this.englishVoice) {
      this.refreshVoices();
    }
    const voice = language === 'en' ? this.englishVoice : this.polishVoice;
    if (!voice) {
      return false;
    }
    try {
      this.synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'en' ? (voice.lang || 'en-US') : 'pl-PL';
      utterance.voice = voice;
      utterance.rate = style === 'pa' ? 0.93 : language === 'en' ? 0.96 : 0.98;
      utterance.pitch = style === 'pa' ? 0.94 : 1.0;
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

    const exactEnGb = voices.find((v) => v.lang.toLowerCase() === 'en-gb');
    const exactEnUs = voices.find((v) => v.lang.toLowerCase() === 'en-us');
    const anyEn = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
    this.englishVoice = exactEnUs ?? exactEnGb ?? anyEn ?? null;
  }
}
