import type { IAudioEvents, ISimulationSnapshot } from '../domain/types';
import {
  playAtpAlarm,
  playContactorClick,
  playDoorCloseBeeps,
  playNoiseBurst,
  playPaChime,
  playRadioRogerBeep,
  playRadioSquelch,
  playRailJointTaDam,
  playTone,
  playTurnoutThud,
} from './oneShotMechanicalSounds';
import { playPassingTrainWhoosh } from './squealAndEchoLayers';

export interface IAudioMixerBuses {
  readonly ctx: AudioContext | null;
  readonly trainBus: AudioNode | null;
  readonly trainGain: GainNode | null;
  readonly sipBus: AudioNode | null;
  readonly alertsBus: AudioNode | null;
}

export interface IOneShotAudioPlayer {
  triggerAll(snapshot: ISimulationSnapshot, events: IAudioEvents, buses: IAudioMixerBuses): void;
  playAchievementChime(buses: IAudioMixerBuses): void;
}

export class OneShotAudioPlayer implements IOneShotAudioPlayer {
  public playAchievementChime(buses: IAudioMixerBuses): void {
    playTone(buses.ctx, 523.25, 0.14, 0.14, 'triangle', 0.0, buses.alertsBus);
    playTone(buses.ctx, 659.25, 0.14, 0.14, 'triangle', 0.11, buses.alertsBus);
    playTone(buses.ctx, 783.99, 0.28, 0.16, 'sine', 0.22, buses.alertsBus);
    playTone(buses.ctx, 1046.5, 0.34, 0.11, 'sine', 0.24, buses.alertsBus);
  }

  public triggerAll(snapshot: ISimulationSnapshot, events: IAudioEvents, buses: IAudioMixerBuses): void {
    this.triggerDoorAndMechanical(snapshot, events, buses);
    this.triggerSafetyAndRadio(events, buses);
    this.triggerWeatherAndAlerts(events, buses);
    this.triggerCabAndPaChimes(events, buses);
  }

  private triggerDoorAndMechanical(snapshot: ISimulationSnapshot, events: IAudioEvents, buses: IAudioMixerBuses): void {
    const { ctx, sipBus, trainBus } = buses;
    if (events.doorToggledTo === 'open') {
      playTone(ctx, 587, 0.16, 0.14, 'sine', 0, sipBus);
      playNoiseBurst(ctx, 0.28, 1150, 0.1, 0.02, trainBus);
      playTone(ctx, 84, 0.075, 0.09, 'sine', 0.24, trainBus);
    } else if (events.doorToggledTo === 'closed') {
      playDoorCloseBeeps(ctx, sipBus, trainBus);
    }
    if (events.brakeStopHiss || events.airReleaseHiss) {
      const s81 = snapshot.trainModel.id === 'seria81';
      playNoiseBurst(ctx, s81 ? 0.68 : 0.48, s81 ? 1950 : 1550, s81 ? 0.16 : 0.1, 0, trainBus);
    }
    if (events.contactorClick) playContactorClick(ctx, trainBus);
    if (events.railJointPulse) playRailJointTaDam(ctx, snapshot.kinematics.speedKmh, trainBus);
    if (events.turnoutThud) playTurnoutThud(ctx, snapshot.kinematics.speedKmh, trainBus);
    if (events.passingTrainWhoosh && ctx && trainBus) playPassingTrainWhoosh(ctx, trainBus);
  }

  private triggerSafetyAndRadio(events: IAudioEvents, buses: IAudioMixerBuses): void {
    const { ctx, sipBus, alertsBus } = buses;
    if (events.boardingCompleteChime || events.signalClearedChime) {
      playTone(ctx, 659, 0.14, 0.15, 'triangle', 0, sipBus);
      playTone(ctx, 880, 0.22, 0.14, 'triangle', 0.14, sipBus);
    }
    if (events.atpTriggered || events.sop2InterventionTriggered) playAtpAlarm(ctx, alertsBus);
    else if (events.sop2WarningBeep) {
      playTone(ctx, 1180, 0.09, 0.14, 'triangle', 0, alertsBus);
      playTone(ctx, 1420, 0.08, 0.12, 'triangle', 0.11, alertsBus);
    } else if (events.overspeedWarning || events.emergencyBrakeTriggered) {
      playTone(ctx, 920, 0.14, 0.16, 'square', 0, alertsBus);
    }
    if (events.czuwakAlertTriggered) {
      playTone(ctx, 1320, 0.14, 0.18, 'triangle', 0, alertsBus);
      playTone(ctx, 1320, 0.14, 0.18, 'triangle', 0.2, alertsBus);
    }
    if (events.czuwakAckChime) playTone(ctx, 760, 0.07, 0.13, 'sine', 0, alertsBus);
    if (events.doorFaultBeep) {
      playTone(ctx, 340, 0.14, 0.17, 'sawtooth', 0, alertsBus);
      playTone(ctx, 300, 0.18, 0.17, 'sawtooth', 0.18, alertsBus);
    }
    if (events.radioDispatchTriggered) playRadioSquelch(ctx, alertsBus);
    if (events.radioAckChime) playRadioRogerBeep(ctx, alertsBus);
  }

  private triggerWeatherAndAlerts(events: IAudioEvents, buses: IAudioMixerBuses): void {
    const { ctx, trainBus, trainGain, alertsBus } = buses;
    if (events.wiperSweepTick) {
      playNoiseBurst(ctx, 0.22, 620, 0.048, 0, trainGain);
      playTone(ctx, 145, 0.045, 0.028, 'sine', 0, trainGain);
    }
    if (events.thirdRailSparkCrackle) {
      playNoiseBurst(ctx, 0.045, 4200, 0.13, 0, trainBus);
      playNoiseBurst(ctx, 0.06, 2600, 0.09, 0.032, trainBus);
      playTone(ctx, 185, 0.05, 0.065, 'sawtooth', 0, trainBus);
    }
    if (events.highBeamDimBonusChime) {
      playTone(ctx, 740, 0.09, 0.11, 'sine', 0, alertsBus);
      playTone(ctx, 987.77, 0.16, 0.12, 'sine', 0.085, alertsBus);
    }
  }

  private triggerCabAndPaChimes(events: IAudioEvents, buses: IAudioMixerBuses): void {
    const { ctx, trainGain, alertsBus, sipBus } = buses;
    if (events.nightCrewClearedChime) {
      playTone(ctx, 659.25, 0.1, 0.13, 'triangle', 0, alertsBus);
      playTone(ctx, 880, 0.12, 0.13, 'triangle', 0.09, alertsBus);
      playTone(ctx, 1174.66, 0.2, 0.14, 'sine', 0.18, alertsBus);
    }
    if (events.nightCrewViolationBuzz) {
      playTone(ctx, 220, 0.18, 0.18, 'sawtooth', 0, alertsBus);
      playTone(ctx, 185, 0.26, 0.18, 'sawtooth', 0.18, alertsBus);
    }
    if (events.paAnnouncementTriggered) playPaChime(ctx, sipBus);
    if (events.cabSwitchChime) {
      playNoiseBurst(ctx, 0.07, 920, 0.09, 0, trainGain);
      playTone(ctx, 440, 0.12, 0.12, 'triangle', 0.06, trainGain);
      playTone(ctx, 659.25, 0.2, 0.13, 'sine', 0.18, trainGain);
    }
  }
}
