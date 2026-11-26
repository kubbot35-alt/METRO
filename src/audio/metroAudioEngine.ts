import type { IAudioEvents, ISimulationSnapshot } from '../domain/types';
import {
  createContinuousSoundLayers,
  playPassingTrainWhoosh,
  type IContinuousSoundLayers,
} from './soundLayers';
import type { IAudioEngine } from './types';

export class MetroAudioEngine implements IAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private layers: IContinuousSoundLayers | null = null;
  private hornOscA: OscillatorNode | null = null;
  private hornOscB: OscillatorNode | null = null;
  private hornGain: GainNode | null = null;
  private muted = false;

  public unlock(): void {
    if (!this.ctx) {
      this.initializeContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.45, this.ctx.currentTime, 0.03);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public update(snapshot: ISimulationSnapshot, events: IAudioEvents): void {
    if (!this.ctx || this.ctx.state !== 'running') {
      return;
    }
    if (snapshot.phase !== 'playing') {
      this.silence();
      return;
    }
    const now = this.ctx.currentTime;
    this.layers?.update(snapshot, now);
    this.hornGain?.gain.setTargetAtTime(events.hornActive ? 0.28 : 0, now, 0.025);
    this.triggerOneShots(events);
  }

  public playAchievementChime(): void {
    if (!this.ctx || this.ctx.state !== 'running' || this.muted) {
      return;
    }
    this.playTone(523.25, 0.14, 0.14, 'triangle', 0.0);
    this.playTone(659.25, 0.14, 0.14, 'triangle', 0.11);
    this.playTone(783.99, 0.28, 0.16, 'sine', 0.22);
    this.playTone(1046.5, 0.34, 0.11, 'sine', 0.24);
  }

  public silence(): void {
    if (!this.ctx) {
      return;
    }
    const now = this.ctx.currentTime;
    this.layers?.silence(now);
    this.hornGain?.gain.setTargetAtTime(0, now, 0.04);
  }

  public dispose(): void {
    this.layers?.stop();
    this.hornOscA?.stop();
    this.hornOscB?.stop();
    void this.ctx?.close();
    this.ctx = null;
  }

  private initializeContext(): void {
    const AudioCtor = window.AudioContext;
    if (!AudioCtor) {
      return;
    }
    this.ctx = new AudioCtor();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.45;
    this.masterGain.connect(this.ctx.destination);
    this.layers = createContinuousSoundLayers(this.ctx, this.masterGain);
    this.setupHornNodes(this.ctx, this.masterGain);
  }

  private setupHornNodes(ctx: AudioContext, destination: GainNode): void {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1150;
    filter.Q.value = 2.4;
    this.hornGain = ctx.createGain();
    this.hornGain.gain.value = 0;
    this.hornOscA = ctx.createOscillator();
    this.hornOscB = ctx.createOscillator();
    this.hornOscA.type = 'sawtooth';
    this.hornOscB.type = 'triangle';
    this.hornOscA.frequency.value = 311.13;
    this.hornOscB.frequency.value = 392.0;
    this.hornOscA.connect(filter);
    this.hornOscB.connect(filter);
    filter.connect(this.hornGain);
    this.hornGain.connect(destination);
    this.hornOscA.start();
    this.hornOscB.start();
  }

  private triggerOneShots(events: IAudioEvents): void {
    if (events.doorToggledTo === 'open') {
      this.playTone(587, 0.16, 0.14, 'sine');
      this.playNoiseBurst(0.26, 950, 0.09);
    } else if (events.doorToggledTo === 'closed') {
      this.playDoorClosingBeeps();
    }
    if (events.brakeStopHiss) {
      this.playNoiseBurst(0.55, 1650, 0.12);
    }
    if (events.boardingCompleteChime || events.signalClearedChime) {
      this.playTone(659, 0.14, 0.15, 'triangle');
      this.playTone(880, 0.22, 0.14, 'triangle', 0.14);
    }
    if (events.atpTriggered) {
      this.playAtpAlarm();
    } else if (events.overspeedWarning || events.emergencyBrakeTriggered) {
      this.playTone(920, 0.14, 0.15, 'square');
    }
    if (events.railJointPulse) {
      this.playNoiseBurst(0.06, 260, 0.07);
    }
    if (events.czuwakAlertTriggered) {
      this.playTone(1320, 0.14, 0.17, 'triangle', 0);
      this.playTone(1320, 0.14, 0.17, 'triangle', 0.2);
    }
    if (events.czuwakAckChime) {
      this.playTone(760, 0.07, 0.12, 'sine', 0);
    }
    if (events.doorFaultBeep) {
      this.playTone(340, 0.14, 0.16, 'sawtooth', 0);
      this.playTone(300, 0.18, 0.16, 'sawtooth', 0.18);
    }
    if (events.passingTrainWhoosh && this.ctx && this.masterGain) {
      playPassingTrainWhoosh(this.ctx, this.masterGain);
    }
  }

  private playDoorClosingBeeps(): void {
    this.playTone(980, 0.09, 0.14, 'square', 0.0);
    this.playTone(980, 0.09, 0.14, 'square', 0.15);
    this.playTone(980, 0.09, 0.14, 'square', 0.3);
    this.playNoiseBurst(0.32, 750, 0.09, 0.42);
  }

  private playAtpAlarm(): void {
    this.playTone(1120, 0.12, 0.18, 'sawtooth', 0.0);
    this.playTone(840, 0.12, 0.18, 'sawtooth', 0.14);
    this.playTone(1120, 0.18, 0.18, 'sawtooth', 0.28);
    this.playNoiseBurst(0.45, 1400, 0.11, 0.05);
  }

  private playTone(
    freq: number,
    durationSec: number,
    volume: number,
    type: OscillatorType,
    delaySec = 0,
  ): void {
    if (!this.ctx || !this.masterGain) {
      return;
    }
    const start = this.ctx.currentTime + delaySec;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + durationSec);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(start);
    osc.stop(start + durationSec + 0.01);
  }

  private playNoiseBurst(
    durationSec: number,
    cutoffHz: number,
    volume: number,
    delaySec = 0,
  ): void {
    if (!this.ctx || !this.masterGain) {
      return;
    }
    const sampleCount = Math.floor(this.ctx.sampleRate * durationSec);
    const buffer = this.ctx.createBuffer(1, sampleCount, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = cutoffHz;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start(this.ctx.currentTime + delaySec);
  }
}
