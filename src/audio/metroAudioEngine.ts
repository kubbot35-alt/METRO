import type { CameraMode, IAudioEvents, ISimulationSnapshot } from '../domain/types';
import {
  createContinuousSoundLayers,
  playPassingTrainWhoosh,
  type IContinuousSoundLayers,
} from './soundLayers';
import type { IAudioEngine } from './types';

export class MetroAudioEngine implements IAudioEngine {
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

  public setAudioSettings(
    masterVolume: number,
    trainVolume: number,
    voiceVolume: number,
    alertsVolume = 0.9,
  ): void {
    this.masterVolume = Math.max(0, Math.min(1, masterVolume));
    this.trainVolume = Math.max(0, Math.min(1, trainVolume));
    this.voiceVolume = Math.max(0, Math.min(1, voiceVolume));
    this.alertsVolume = Math.max(0, Math.min(1, alertsVolume));
    this.syncMixerGains();
  }

  private syncMixerGains(): void {
    if (!this.ctx) {
      return;
    }
    const now = this.ctx.currentTime;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.masterVolume * 0.56, now, 0.03);
    }
    if (this.trainGain) {
      this.trainGain.gain.setTargetAtTime(this.trainVolume, now, 0.03);
    }
    if (this.voiceSipGain) {
      this.voiceSipGain.gain.setTargetAtTime(this.voiceVolume, now, 0.03);
    }
    if (this.alertsRadioGain) {
      this.alertsRadioGain.gain.setTargetAtTime(this.alertsVolume, now, 0.03);
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
    this.syncCameraPerspectiveFilter(snapshot.cameraMode, now);
    this.layers?.update(snapshot, now);
    this.hornGain?.gain.setTargetAtTime(events.hornActive ? 0.28 : 0, now, 0.025);
    this.triggerOneShots(snapshot, events);
  }

  public playAchievementChime(): void {
    if (!this.ctx || this.ctx.state !== 'running' || this.muted) {
      return;
    }
    const bus = this.alertsRadioGain ?? this.masterGain;
    this.playTone(523.25, 0.14, 0.14, 'triangle', 0.0, bus);
    this.playTone(659.25, 0.14, 0.14, 'triangle', 0.11, bus);
    this.playTone(783.99, 0.28, 0.16, 'sine', 0.22, bus);
    this.playTone(1046.5, 0.34, 0.11, 'sine', 0.24, bus);
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

    // Master dynamics compressor/limiter to prevent clipping when multiple sounds overlap
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -10;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 6;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.16;
    this.compressor.connect(this.ctx.destination);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : this.masterVolume * 0.56;
    this.masterGain.connect(this.compressor);

    // Channel 1: Train Motors & Tracks (routed through camera-perspective acoustic filter)
    this.trainGain = this.ctx.createGain();
    this.trainGain.gain.value = this.trainVolume;
    this.trainCameraFilter = this.ctx.createBiquadFilter();
    this.trainCameraFilter.type = 'lowpass';
    this.trainCameraFilter.frequency.value = 1650;
    this.trainCameraFilter.Q.value = 0.7;
    this.trainCameraFilter.connect(this.trainGain);
    this.trainGain.connect(this.masterGain);

    // Channel 2: Announcements & Chimes (SIP / PA / Door chimes)
    this.voiceSipGain = this.ctx.createGain();
    this.voiceSipGain.gain.value = this.voiceVolume;
    this.voiceSipGain.connect(this.masterGain);

    // Channel 3: Alarms, Czuwak, ATP & Dispatcher Radio (crisp inside cab)
    this.alertsRadioGain = this.ctx.createGain();
    this.alertsRadioGain.gain.value = this.alertsVolume;
    this.alertsRadioGain.connect(this.masterGain);

    this.layers = createContinuousSoundLayers(this.ctx, this.trainCameraFilter);
    this.setupHornNodes(this.ctx, this.trainCameraFilter);
  }

  private syncCameraPerspectiveFilter(cameraMode: CameraMode, now: number): void {
    if (!this.trainCameraFilter || this.lastCameraMode === cameraMode) {
      return;
    }
    this.lastCameraMode = cameraMode;
    // Camera-dependent acoustics:
    // - Cab: slightly muffled exterior sounds (~1550 Hz) while cab alerts/clicks stay crisp
    // - Interior: passenger car resonance (~2750 Hz)
    // - Exterior / Bogie / Station / Mirror: raw, full bandwidth (15000 Hz)
    const cutoffHz =
      cameraMode === 'cab'
        ? 1550
        : cameraMode === 'interior'
          ? 2750
          : cameraMode === 'mirror'
            ? 4200
            : 15000;
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

  private triggerOneShots(snapshot: ISimulationSnapshot, events: IAudioEvents): void {
    const trainBus = this.trainCameraFilter ?? this.trainGain ?? this.masterGain;
    const sipBus = this.voiceSipGain ?? this.masterGain;
    const alertsBus = this.alertsRadioGain ?? this.masterGain;

    if (events.doorToggledTo === 'open') {
      this.playDoorOpenSequence(sipBus, trainBus);
    } else if (events.doorToggledTo === 'closed') {
      this.playDoorClosingBeeps(sipBus, trainBus);
    }
    if (events.brakeStopHiss || events.airReleaseHiss) {
      const isSeria81 = snapshot.trainModel.id === 'seria81';
      this.playNoiseBurst(
        isSeria81 ? 0.68 : 0.48,
        isSeria81 ? 1950 : 1550,
        isSeria81 ? 0.16 : 0.1,
        0,
        trainBus,
      );
    }
    if (events.contactorClick) {
      this.playSeria81ContactorClick(trainBus);
    }
    if (events.boardingCompleteChime || events.signalClearedChime) {
      this.playTone(659, 0.14, 0.15, 'triangle', 0, sipBus);
      this.playTone(880, 0.22, 0.14, 'triangle', 0.14, sipBus);
    }
    if (events.atpTriggered) {
      this.playAtpAlarm(alertsBus);
    } else if (events.overspeedWarning || events.emergencyBrakeTriggered) {
      this.playTone(920, 0.14, 0.16, 'square', 0, alertsBus);
    }
    if (events.railJointPulse) {
      this.playRailJointTaDam(snapshot.kinematics.speedKmh, trainBus);
    }
    if (events.turnoutThud) {
      this.playTurnoutDoubleThud(snapshot.kinematics.speedKmh, trainBus);
    }
    if (events.czuwakAlertTriggered) {
      this.playTone(1320, 0.14, 0.18, 'triangle', 0, alertsBus);
      this.playTone(1320, 0.14, 0.18, 'triangle', 0.2, alertsBus);
    }
    if (events.czuwakAckChime) {
      this.playTone(760, 0.07, 0.13, 'sine', 0, alertsBus);
    }
    if (events.doorFaultBeep) {
      this.playTone(340, 0.14, 0.17, 'sawtooth', 0, alertsBus);
      this.playTone(300, 0.18, 0.17, 'sawtooth', 0.18, alertsBus);
    }
    if (events.passingTrainWhoosh && this.ctx && trainBus) {
      playPassingTrainWhoosh(this.ctx, trainBus);
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
      this.playElectricSparkCrackle(trainBus);
    }
    if (events.highBeamDimBonusChime) {
      this.playTone(740, 0.09, 0.11, 'sine', 0.0, alertsBus);
      this.playTone(987.77, 0.16, 0.12, 'sine', 0.085, alertsBus);
    }
    if (events.nightCrewClearedChime) {
      this.playTone(659.25, 0.1, 0.13, 'triangle', 0.0, alertsBus);
      this.playTone(880, 0.12, 0.13, 'triangle', 0.09, alertsBus);
      this.playTone(1174.66, 0.2, 0.14, 'sine', 0.18, alertsBus);
    }
    if (events.nightCrewViolationBuzz) {
      this.playTone(220, 0.18, 0.18, 'sawtooth', 0.0, alertsBus);
      this.playTone(185, 0.26, 0.18, 'sawtooth', 0.18, alertsBus);
    }
    if (events.paAnnouncementTriggered) {
      this.playPaIntercomChime();
    }
    if (events.cabSwitchChime) {
      this.playCabSwitchChime();
    }
  }

  private playRailJointTaDam(speedKmh: number, bus: AudioNode | null): void {
    // Rhythmic metallic double-tap ("ta-dam") scaling smoothly with train speed
    const speedRatio = Math.max(0.18, Math.min(1, speedKmh / 80));
    const bogieGapSec = Math.max(0.048, Math.min(0.135, 2.1 / Math.max(15, speedKmh)));
    const vol = 0.045 + speedRatio * 0.065;

    // First axle hit ("ta")
    this.playNoiseBurst(0.048, 340 + speedRatio * 180, vol * 0.85, 0, bus);
    this.playTone(112, 0.042, vol * 0.65, 'triangle', 0, bus);

    // Second axle hit ("dam")
    this.playNoiseBurst(0.055, 280 + speedRatio * 160, vol, bogieGapSec, bus);
    this.playTone(92, 0.052, vol * 0.8, 'triangle', bogieGapSec, bus);
  }

  private playTurnoutDoubleThud(speedKmh: number, bus: AudioNode | null): void {
    // Louder metallic frog & check-rail double thud when crossing turnouts before stations
    const speedRatio = Math.max(0.25, Math.min(1, speedKmh / 75));
    const vol = 0.09 + speedRatio * 0.08;
    const gapSec = Math.max(0.065, Math.min(0.16, 2.7 / Math.max(16, speedKmh)));

    this.playNoiseBurst(0.075, 240, vol, 0, bus);
    this.playTone(74, 0.07, vol * 0.9, 'sine', 0, bus);
    this.playNoiseBurst(0.085, 210, vol * 1.08, gapSec, bus);
    this.playTone(64, 0.08, vol, 'sine', gapSec, bus);
  }

  private playSeria81ContactorClick(bus: AudioNode | null): void {
    // Mechanical cam-shaft contactor ("stycznik") clack when changing Seria 81 throttle notches
    this.playNoiseBurst(0.028, 1850, 0.085, 0, bus);
    this.playTone(215, 0.032, 0.075, 'square', 0, bus);
    this.playTone(138, 0.038, 0.065, 'triangle', 0.022, bus);
  }

  private playDoorOpenSequence(sipBus: AudioNode | null, trainBus: AudioNode | null): void {
    this.playTone(587, 0.16, 0.14, 'sine', 0, sipBus);
    // Pneumatic cylinder hiss + soft rubber door leaf stop thud
    this.playNoiseBurst(0.28, 1150, 0.1, 0.02, trainBus);
    this.playTone(84, 0.075, 0.09, 'sine', 0.24, trainBus);
  }

  private playDoorClosingBeeps(sipBus: AudioNode | null, trainBus: AudioNode | null): void {
    // Intermittent warning beeps before door closing + pneumatic hiss + soft rubber seal thud
    this.playTone(980, 0.09, 0.14, 'square', 0.0, sipBus);
    this.playTone(980, 0.09, 0.14, 'square', 0.15, sipBus);
    this.playTone(980, 0.09, 0.14, 'square', 0.3, sipBus);
    this.playNoiseBurst(0.32, 820, 0.1, 0.42, trainBus);
    this.playTone(72, 0.09, 0.11, 'sine', 0.68, trainBus);
  }

  private playAtpAlarm(bus: AudioNode | null): void {
    this.playTone(1120, 0.12, 0.18, 'sawtooth', 0.0, bus);
    this.playTone(840, 0.12, 0.18, 'sawtooth', 0.14, bus);
    this.playTone(1120, 0.18, 0.18, 'sawtooth', 0.28, bus);
    this.playNoiseBurst(0.45, 1400, 0.11, 0.05, bus);
  }

  private playRadioSquelch(): void {
    const bus = this.alertsRadioGain ?? this.masterGain;
    this.playNoiseBurst(0.14, 2400, 0.14, 0.0, bus);
    this.playTone(1750, 0.055, 0.09, 'sine', 0.06, bus);
    this.playNoiseBurst(0.11, 1900, 0.11, 0.15, bus);
  }

  private playRadioRogerBeep(): void {
    const bus = this.alertsRadioGain ?? this.masterGain;
    this.playTone(1180, 0.065, 0.12, 'triangle', 0.0, bus);
    this.playTone(1580, 0.095, 0.13, 'triangle', 0.075, bus);
    this.playNoiseBurst(0.05, 2200, 0.06, 0.16, bus);
  }

  private playWiperSwish(): void {
    // Crisp inside cab: gentle damped rubber-on-glass swish + subtle relay tick
    this.playNoiseBurst(0.22, 620, 0.048, 0.0, this.trainGain);
    this.playTone(145, 0.045, 0.028, 'sine', 0.0, this.trainGain);
  }

  private playElectricSparkCrackle(bus: AudioNode | null): void {
    this.playNoiseBurst(0.045, 4200, 0.13, 0.0, bus);
    this.playNoiseBurst(0.06, 2600, 0.09, 0.032, bus);
    this.playTone(185, 0.05, 0.065, 'sawtooth', 0.0, bus);
  }

  private playPaIntercomChime(): void {
    const target = this.voiceSipGain ?? this.masterGain;
    if (!this.ctx || !target) {
      return;
    }
    const band = this.ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1480;
    band.Q.value = 1.25;

    const echoDelay = this.ctx.createDelay(0.4);
    echoDelay.delayTime.value = 0.14;
    const echoFeedback = this.ctx.createGain();
    echoFeedback.gain.value = 0.34;

    const paOut = this.ctx.createGain();
    paOut.gain.value = 0.95;

    band.connect(paOut);
    band.connect(echoDelay);
    echoDelay.connect(echoFeedback);
    echoFeedback.connect(echoDelay);
    echoDelay.connect(paOut);
    paOut.connect(target);

    this.playNoiseBurst(0.04, 1800, 0.06, 0.0, paOut);
    this.playTone(587.33, 0.13, 0.15, 'triangle', 0.02, band);
    this.playTone(739.99, 0.14, 0.15, 'triangle', 0.15, band);
    this.playTone(880.0, 0.24, 0.16, 'sine', 0.28, band);
  }

  private playCabSwitchChime(): void {
    const bus = this.trainGain ?? this.masterGain;
    this.playNoiseBurst(0.07, 920, 0.09, 0.0, bus);
    this.playTone(440, 0.12, 0.12, 'triangle', 0.06, bus);
    this.playTone(659.25, 0.2, 0.13, 'sine', 0.18, bus);
  }

  private playTone(
    freq: number,
    durationSec: number,
    volume: number,
    type: OscillatorType,
    delaySec = 0,
    destination: AudioNode | null = null,
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
    destination: AudioNode | null = null,
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
