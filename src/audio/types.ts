import type { IAudioEvents, ISimulationSnapshot } from '../domain/types';

export interface IAudioEngine {
  unlock(): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  setAudioSettings?(masterVolume: number, trainVolume: number, voiceVolume: number): void;
  update(snapshot: ISimulationSnapshot, events: IAudioEvents): void;
  playAchievementChime(): void;
  silence(): void;
  dispose(): void;
}
