import type { TrainModelId, TrainVisualTheme } from './coreTypes';
import type { DriverRankId } from './telemetryAndCareerTypes';

export interface ITrainAudioProfile {
  readonly baseFreqHz: number;
  readonly maxFreqSpanHz: number;
  readonly harmonicRatio: number;
  readonly gainScale: number;
  readonly waveMain: 'triangle' | 'sawtooth' | 'sine';
  readonly waveHarm: 'sawtooth' | 'sine';
  readonly regenerativeHum?: boolean;
  readonly brakeSquealScale?: number;
}

export type TrainLiveryId =
  | 'default'
  | 'retro_1995'
  | 'jubilee'
  | 'stealth_night'
  | 'golden_legend';

export interface ITrainVisualProfile {
  readonly bodyHex: number;
  readonly stripeHex: number;
  readonly roofHex: number;
  readonly noseHex: number;
  readonly cabAccentHex: number;
  readonly theme: TrainVisualTheme;
  readonly liveryId?: TrainLiveryId;
}

export interface ITrainLiverySpec {
  readonly id: TrainLiveryId;
  readonly name: string;
  readonly nameEn: string;
  readonly subtitle: string;
  readonly subtitleEn: string;
  readonly swatchColors: readonly [string, string, string];
  readonly requiredRankId: DriverRankId;
  readonly supportedTrains: readonly TrainModelId[];
  readonly visualOverrides: Partial<Record<TrainModelId, Partial<ITrainVisualProfile>>>;
}

export type EcoDrivingGrade = 'A+' | 'A' | 'B' | 'C' | 'D';

export interface IEcoDrivingState {
  readonly currentPowerKw: number;
  readonly consumedKwh: number;
  readonly regeneratedKwh: number;
  readonly netEnergyKwh: number;
  readonly coastingDistanceM: number;
  readonly coastingRatio: number;
  readonly ecoScorePercent: number;
  readonly grade: EcoDrivingGrade;
  readonly xpBonus: number;
  readonly regeneratingActive: boolean;
  readonly coastingActive: boolean;
}

export interface ITrainPhysicsConfig {
  readonly massKg: number;
  readonly maxTractionForceN: number;
  readonly maxServiceBrakeForceN: number;
  readonly emergencyBrakeForceN: number;
  readonly rollingResistanceCoeff: number;
  readonly aeroDragCoeff: number;
  readonly maxSpeedKmh: number;
  readonly throttleRatePerSec: number;
  readonly brakeRampPerSec: number;
}

export interface ITrainModelSpec {
  readonly id: TrainModelId;
  readonly name: string;
  readonly subtitle: string;
  readonly description: string;
  readonly massLabel: string;
  readonly accelLabel: string;
  readonly brakeLabel: string;
  readonly physics: ITrainPhysicsConfig;
  readonly audio: ITrainAudioProfile;
  readonly visual: ITrainVisualProfile;
}

export interface IControlInput {
  readonly throttleUp: boolean;
  readonly throttleDown: boolean;
  readonly serviceBrake: boolean;
  readonly emergencyBrakePressed: boolean;
  readonly forceEmergencyBrake?: boolean;
  readonly toggleDoorsPressed: boolean;
  readonly toggleDoorsLeftPressed?: boolean;
  readonly toggleDoorsRightPressed?: boolean;
  readonly toggleHeadlightsPressed?: boolean;
  readonly toggleCabLightPressed?: boolean;
  readonly toggleWipersPressed?: boolean;
  readonly acknowledgeCzuwakPressed?: boolean;
  readonly acknowledgeRadioPressed?: boolean;
  readonly cycleCameraPressed?: boolean;
  readonly toggleAtoPressed?: boolean;
  readonly manualLeverAxis?: number | null;
  readonly hornActive: boolean;
}

export interface ITrainKinematics {
  readonly positionM: number;
  readonly speedMs: number;
  readonly speedKmh: number;
  readonly throttle: number;
  readonly serviceBrake: number;
  readonly emergencyBrake: boolean;
  readonly netAccelerationMs2: number;
}

export interface ITrainPhysicsModel {
  setConfig?(config: ITrainPhysicsConfig): void;
  step(
    current: ITrainKinematics,
    input: IControlInput,
    doorsOpen: boolean,
    dtSec: number,
    gradeFraction?: number,
    tractionMultiplier?: number,
    brakeGripMultiplier?: number,
  ): ITrainKinematics;
}
