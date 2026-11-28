import type { CameraMode, IAudioEvents, ISimulationSnapshot } from '../domain/types';
import { OneShotAudioPlayer, type IAudioMixerBuses, type IOneShotAudioPlayer } from './oneShotAudioPlayer';
import { createContinuousSoundLayers, type IContinuousSoundLayers } from './soundLayers';
import type { IAudioEngine } from './types';

export class MetroAudioEngine implements IAudioEngine {
  private readonly oneShots: IOneShotAudioPlayer;
  private ctx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private trainGain: GainNode | null = null;
  private trainCameraFilter: BiquadFilterNode | null = null;
  private voiceSipGain: GainNode | null = null;
  private alertsRadioGain: GainNode | null = null;
  private layers: IContinuousSoundLayers | null = null;
  private hornOscA: OscillatorNode | null = null;
  private hornOscB: OscillatorNode | null = null;
  private hornGain: GainNode | null = null;
  private muted = false;
  private masterVolume = 0.85;
  private trainVolume = 0.9;
  private voiceVolume = 0.95;
  private alertsVolume = 0.9;
  private lastCameraMode: CameraMode | null = null;

  public constructor(oneShots: IOneShotAudioPlayer = new OneShotAudioPlayer()) {
    this.oneShots = oneShots;
  }

  public unlock(): void {
    if (!this.ctx) this.initializeContext();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.syncMixerGains();
  }

  public isMuted(): boolean { return this.muted; }

  public setAudioSettings(masterVolume: number, trainVolume: number, voiceVolume: number, alertsVolume = 0.9): void {
    this.masterVolume = Math.max(0, Math.min(1, masterVolume));
    this.trainVolume = Math.max(0, Math.min(1, trainVolume));
    this.voiceVolume = Math.max(0, Math.min(1, voiceVolume));
    this.alertsVolume = Math.max(0, Math.min(1, alertsVolume));
    this.syncMixerGains();
  }

  public update(snapshot: ISimulationSnapshot, events: IAudioEvents): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    if (snapshot.phase !== 'playing') { this.silence(); return; }
    const now = this.ctx.currentTime;
    this.syncCameraPerspectiveFilter(snapshot.cameraMode, now);
    this.layers?.update(snapshot, now);
    this.hornGain?.gain.setTargetAtTime(events.hornActive ? 0.28 : 0, now, 0.025);
    this.oneShots.triggerAll(snapshot, events, this.getMixerBuses());
  }

  public playAchievementChime(): void {
    if (!this.ctx || this.ctx.state !== 'running' || this.muted) return;
    this.oneShots.playAchievementChime(this.getMixerBuses());
  }

  public silence(): void {
    if (!this.ctx) return;
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

  private getMixerBuses(): IAudioMixerBuses {
    return {
      ctx: this.ctx,
      trainBus: this.trainCameraFilter ?? this.trainGain ?? this.masterGain,
      trainGain: this.trainGain ?? this.masterGain,
      sipBus: this.voiceSipGain ?? this.masterGain,
      alertsBus: this.alertsRadioGain ?? this.masterGain,
    };
  }

  private syncMixerGains(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.masterGain?.gain.setTargetAtTime(this.muted ? 0 : this.masterVolume * 0.56, now, 0.03);
    this.trainGain?.gain.setTargetAtTime(this.trainVolume, now, 0.03);
    this.voiceSipGain?.gain.setTargetAtTime(this.voiceVolume, now, 0.03);
    this.alertsRadioGain?.gain.setTargetAtTime(this.alertsVolume, now, 0.03);
  }

  private initializeContext(): void {
    if (!window.AudioContext) return;
    this.ctx = new window.AudioContext();
    this.setupMasterBuses(this.ctx);
    this.setupChannelBuses(this.ctx);
    this.layers = createContinuousSoundLayers(this.ctx, this.trainCameraFilter!);
    this.setupHornNodes(this.ctx, this.trainCameraFilter!);
  }

  private setupMasterBuses(ctx: AudioContext): void {
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -10;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 6;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.16;
    this.compressor.connect(ctx.destination);
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : this.masterVolume * 0.56;
    this.masterGain.connect(this.compressor);
  }

  private setupChannelBuses(ctx: AudioContext): void {
    this.trainGain = ctx.createGain();
    this.trainGain.gain.value = this.trainVolume;
    this.trainCameraFilter = ctx.createBiquadFilter();
    this.trainCameraFilter.type = 'lowpass';
    this.trainCameraFilter.frequency.value = 1650;
    this.trainCameraFilter.Q.value = 0.7;
    this.trainCameraFilter.connect(this.trainGain);
    this.trainGain.connect(this.masterGain!);
    this.voiceSipGain = ctx.createGain();
    this.voiceSipGain.gain.value = this.voiceVolume;
    this.voiceSipGain.connect(this.masterGain!);
    this.alertsRadioGain = ctx.createGain();
    this.alertsRadioGain.gain.value = this.alertsVolume;
    this.alertsRadioGain.connect(this.masterGain!);
  }

  private syncCameraPerspectiveFilter(cameraMode: CameraMode, now: number): void {
    if (!this.trainCameraFilter || this.lastCameraMode === cameraMode) return;
    this.lastCameraMode = cameraMode;
    const cutoffHz =
      cameraMode === 'cab' ? 1550 : cameraMode === 'interior' ? 2750 : cameraMode === 'mirror' ? 4200 : 15000;
    this.trainCameraFilter.frequency.setTargetAtTime(cutoffHz, now, 0.08);
  }

  private setupHornNodes(ctx: AudioContext, destination: AudioNode): void {
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
}
