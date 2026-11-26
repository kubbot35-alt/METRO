import type { CameraMode, ITrainModelSpec, TrainModelId } from './types';

export const SERIA_81_SPEC: ITrainModelSpec = {
  id: 'seria81',
  name: 'Seria 81',
  subtitle: 'Klasyk · 1989',
  description:
    'Ciężki, stalowy skład klasyczny. Wolniejsze przyspieszenie, dłuższa droga hamowania, głębszy ryk silników i analogowy pulpit z zegarem wskazówkowym.',
  massLabel: '215 t',
  accelLabel: 'Umiarkowane',
  brakeLabel: 'Dłuższa droga',
  physics: {
    massKg: 215000,
    maxTractionForceN: 212000,
    maxServiceBrakeForceN: 242000,
    emergencyBrakeForceN: 405000,
    rollingResistanceCoeff: 0.0025,
    aeroDragCoeff: 20.5,
    maxSpeedKmh: 90,
    throttleRatePerSec: 0.78,
    brakeRampPerSec: 1.45,
  },
  audio: {
    baseFreqHz: 56,
    maxFreqSpanHz: 220,
    harmonicRatio: 2.0,
    gainScale: 1.32,
    waveMain: 'sawtooth',
    waveHarm: 'sawtooth',
  },
  visual: {
    bodyHex: 0x255387,
    stripeHex: 0xeab308,
    roofHex: 0x64748b,
    noseHex: 0x1e3a5f,
    cabAccentHex: 0x4b6b62,
    theme: 'retro',
  },
};

export const SIEMENS_INSPIRO_SPEC: ITrainModelSpec = {
  id: 'inspiro',
  name: 'Siemens Inspiro',
  subtitle: 'Nowoczesny · 2013',
  description:
    'Lekki, dynamiczny skład aluminiowy. Szybki rozruch, bardzo sprawne hamulce, płynny dźwięk falownika IGBT oraz cyfrowy kokpit LED/LCD.',
  massLabel: '162 t',
  accelLabel: 'Dynamiczne',
  brakeLabel: 'Bardzo sprawne',
  physics: {
    massKg: 162000,
    maxTractionForceN: 268000,
    maxServiceBrakeForceN: 328000,
    emergencyBrakeForceN: 515000,
    rollingResistanceCoeff: 0.0019,
    aeroDragCoeff: 16.5,
    maxSpeedKmh: 98,
    throttleRatePerSec: 1.15,
    brakeRampPerSec: 2.25,
  },
  audio: {
    baseFreqHz: 112,
    maxFreqSpanHz: 420,
    harmonicRatio: 2.5,
    gainScale: 0.92,
    waveMain: 'triangle',
    waveHarm: 'sine',
  },
  visual: {
    bodyHex: 0x2a313d,
    stripeHex: 0xdc2626,
    roofHex: 0xfacc15,
    noseHex: 0x111827,
    cabAccentHex: 0x0ea5e9,
    theme: 'modern',
  },
};

export const TRAIN_CATALOG: readonly ITrainModelSpec[] = [
  SERIA_81_SPEC,
  SIEMENS_INSPIRO_SPEC,
];

export function getTrainModelSpec(id: TrainModelId): ITrainModelSpec {
  return id === 'seria81' ? SERIA_81_SPEC : SIEMENS_INSPIRO_SPEC;
}

export const CAMERA_MODE_LABELS: Record<CameraMode, string> = {
  cab: 'Widok 1: Kabina maszynisty',
  mirror: 'Widok 2: Lusterko / Podgląd peronu',
  exterior: 'Widok 3: Kamera zewnętrzna',
};

export function getNextCameraMode(current: CameraMode): CameraMode {
  if (current === 'cab') {
    return 'mirror';
  }
  if (current === 'mirror') {
    return 'exterior';
  }
  return 'cab';
}
