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
  private trainGain: GainNode | null = null;
  private voiceRadioGain: GainNode | null = null;
  private layers: IContinuousSoundLayers | null = null;
  private hornOscA: OscillatorNode | null = null;
  private hornOscB: OscillatorNode | null = null;
  private hornGain: GainNode | null = null;
  private muted = false;
  private masterVolume = 0.85;
  private trainVolume = 0.9;
  private voiceVolume = 0.95;

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
    this.syncMixerGains();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setAudioSettings(masterVolume: number, trainVolume: number, voiceVolume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, masterVolume));
    this.trainVolume = Math.max(0, Math.min(1, trainVolume));
    this.voiceVolume = Math.max(0, Math.min(1, voiceVolume));
    this.syncMixerGains();
  }

  private syncMixerGains(): void {
    if (!this.ctx) {
      return;
    }
    const now = this.ctx.currentTime;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.masterVolume * 0.52, now, 0.03);
    }
    if (this.trainGain) {
      this.trainGain.gain.setTargetAtTime(this.trainVolume, now, 0.03);
    }
    if (this.voiceRadioGain) {
      this.voiceRadioGain.gain.setTargetAtTime(this.voiceVolume, now, 0.03);
    }
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
    this.masterGain.gain.value = this.muted ? 0 : this.masterVolume * 0.52;
    this.masterGain.connect(this.ctx.destination);

    this.trainGain = this.ctx.createGain();
    this.trainGain.gain.value = this.trainVolume;
    this.trainGain.connect(this.masterGain);

    this.voiceRadioGain = this.ctx.createGain();
    this.voiceRadioGain.gain.value = this.voiceVolume;
    this.voiceRadioGain.connect(this.masterGain);

    this.layers = createContinuousSoundLayers(this.ctx, this.trainGain);
    this.setupHornNodes(this.ctx, this.trainGain);
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
    if (events.passingTrainWhoosh && this.ctx && this.trainGain) {
      playPassingTrainWhoosh(this.ctx, this.trainGain);
    }
    if (events.radioDispatchTriggered) {
      this.playRadioSquelch();
    }
    if (events.radioAckChime) {
      this.playRadioRogerBeep();
    }
    if (events.wiperSweepTick) {
      this.playWiperSwish();
    }
    if (events.thirdRailSparkCrackle) {
      this.playElectricSparkCrackle();
    }
    if (events.highBeamDimBonusChime) {
      this.playTone(740, 0.09, 0.11, 'sine', 0.0);
      this.playTone(987.77, 0.16, 0.12, 'sine', 0.085);
    }
    if (events.nightCrewClearedChime) {
      this.playTone(659.25, 0.1, 0.13, 'triangle', 0.0);
      this.playTone(880, 0.12, 0.13, 'triangle', 0.09);
      this.playTone(1174.66, 0.2, 0.14, 'sine', 0.18);
    }
    if (events.nightCrewViolationBuzz) {
      this.playTone(220, 0.18, 0.18, 'sawtooth', 0.0);
      this.playTone(185, 0.26, 0.18, 'sawtooth', 0.18);
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

  private playRadioSquelch(): void {
    const bus = this.voiceRadioGain ?? this.masterGain;
    this.playNoiseBurst(0.14, 2400, 0.14, 0.0, bus);
    this.playTone(1750, 0.055, 0.09, 'sine', 0.06, bus);
    this.playNoiseBurst(0.11, 1900, 0.11, 0.15, bus);
  }

  private playRadioRogerBeep(): void {
    const bus = this.voiceRadioGain ?? this.masterGain;
    this.playTone(1180, 0.065, 0.12, 'triangle', 0.0, bus);
    this.playTone(1580, 0.095, 0.13, 'triangle', 0.075, bus);
    this.playNoiseBurst(0.05, 2200, 0.06, 0.16, bus);
  }

  private playWiperSwish(): void {
    // Gentle damped rubber-on-glass swish + subtle mechanical relay click
    this.playNoiseBurst(0.22, 620, 0.045, 0.0, this.trainGain);
    this.playTone(145, 0.045, 0.025, 'sine', 0.0, this.trainGain);
  }

  private playElectricSparkCrackle(): void {
    // Sharp high-voltage third-rail arc crackle + brief 100Hz/3.6kHz snap
    this.playNoiseBurst(0.045, 4200, 0.13, 0.0, this.trainGain);
    this.playNoiseBurst(0.06, 2600, 0.09, 0.032, this.trainGain);
    this.playTone(185, 0.05, 0.065, 'sawtooth', 0.0, this.trainGain);
  }

  private playTone(
    freq: number,
    durationSec: number,
    volume: number,
    type: OscillatorType,
    delaySec = 0,
    destination: GainNode | null = null,
  ): void {
    const target = destination ?? this.trainGain ?? this.masterGain;
    if (!this.ctx || !target) {
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
    gain.connect(target);
    osc.start(start);
    osc.stop(start + durationSec + 0.01);
  }

  private playNoiseBurst(
    durationSec: number,
    cutoffHz: number,
    volume: number,
    delaySec = 0,
    destination: GainNode | null = null,
  ): void {
    const target = destination ?? this.trainGain ?? this.masterGain;
    if (!this.ctx || !target) {
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
    gain.connect(target);
    source.start(this.ctx.currentTime + delaySec);
  }
}
