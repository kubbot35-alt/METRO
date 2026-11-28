import type { ILocalizedTitleDesc } from './i18nAchievementData';
import type {
  AcademyStepNumber,
  CameraMode,
  ChallengeId,
  DriverGrade,
  DriverRankId,
  GraphicsQualityId,
  PhotoFilterId,
  TimeOfDayId,
  TrainModelId,
} from './types';

export interface ILocalizedTrainSpec {
  readonly subtitle: string;
  readonly description: string;
  readonly accelLabel: string;
  readonly brakeLabel: string;
}

export interface ILocalizedChallengeSpec {
  readonly title: string;
  readonly shortLabel: string;
  readonly badge: string;
  readonly description: string;
  readonly objectiveSummary: string;
}

export const TRAIN_EN: Record<TrainModelId, ILocalizedTrainSpec> = {
  seria81: {
    subtitle: 'Classic · 1989',
    description:
      'Heavy steel classic consist. Slower acceleration, longer braking distance, deep motor roar, and an analog cab gauge.',
    accelLabel: 'Moderate',
    brakeLabel: 'Longer distance',
  },
  inspiro: {
    subtitle: 'Modern · 2013',
    description:
      'Lightweight aluminum consist. Dynamic acceleration, crisp brakes, smooth IGBT inverter hum, and digital LED/LCD cockpit.',
    accelLabel: 'Dynamic',
    brakeLabel: 'Very responsive',
  },
  varsovia: {
    subtitle: 'Flagship · 2022',
    description:
      'Newest open-gangway Warsaw train. Ultra-smooth launch, quiet regenerative braking, futuristic inverter, and 3-screen glass cab.',
    accelLabel: 'Ultra-smooth',
    brakeLabel: 'Regenerative',
  },
};

export const CHALLENGE_EN: Record<ChallengeId, ILocalizedChallengeSpec> = {
  inverter_fault: {
    title: 'Inverter Failure',
    shortLabel: '60% Power · On Time',
    badge: '60% POWER',
    description:
      'Reduced traction power (60% max) on M1. Reach the terminus with average delay under 15 seconds.',
    objectiveSummary: 'Power capped at 60% · Target: avg. delay ≤ 15 s',
  },
  technical_run: {
    title: 'Technical Non-Stop Run',
    shortLabel: 'No Stops · ≤ 40 km/h',
    badge: 'NON-STOP',
    description:
      'Empty technical transfer across the line. Pass every station without stopping at ≤ 40 km/h.',
    objectiveSummary: 'No boarding · Pass platforms ≤ 40 km/h',
  },
  black_series: {
    title: 'Black Series',
    shortLabel: 'Rush Hour · Faults',
    badge: 'EXTREME',
    description:
      'Peak rush hour, frequent red signals, double door-fault chance, and faster Czuwak vigilance checks.',
    objectiveSummary: 'Rush hour · Frequent red signals, door faults & Czuwak',
  },
  night_service: {
    title: 'Night Service (Inspection)',
    shortLabel: '02:30 · Crews ≤20 km/h + Horn',
    badge: '02:30 SERVICE',
    description:
      'Overnight maintenance window with no passengers, dimmed stations with warning beacons, and track crews. Pass every crew at ≤ 20 km/h after sounding the horn [H].',
    objectiveSummary: '02:30 · No passengers · Track crews: ≤ 20 km/h + Horn [H]',
  },
};

export const RANK_EN: Record<DriverRankId, ILocalizedTitleDesc> = {
  trainee: { title: 'Trainee', description: 'First kilometers in the Warsaw Metro cab.' },
  junior: { title: 'Junior Driver', description: 'Confident driving and clean platform stops.' },
  driver: { title: 'Metro Driver', description: 'Reliable passenger service on lines M1 and M2.' },
  senior: { title: 'Senior Driver', description: 'Precision handling in rush hour and faults.' },
  instructor: { title: 'Chief Instructor', description: 'Master of timetables, signals, and all consists.' },
  legend: { title: 'Warsaw Metro Legend', description: 'Elite career mastery across the entire network.' },
};

export const QUALITY_EN: Record<GraphicsQualityId, { readonly label: string; readonly description: string }> = {
  low: {
    label: 'Low',
    description: 'Short tunnel draw distance, fewer passengers, live mirrors off & no shadows (max FPS).',
  },
  medium: {
    label: 'Medium',
    description: 'Balanced tunnel visibility, 75% passengers, live mirrors/CCTV ~15 FPS.',
  },
  high: {
    label: 'High',
    description: 'Full draw distance, full crowds, live mirrors/CCTV ~30 FPS, shadows & AA.',
  },
};

export const PHOTO_FILTER_EN: Record<PhotoFilterId, { readonly label: string; readonly shortDesc: string }> = {
  normal: { label: 'Normal', shortDesc: 'Natural colors' },
  cinematic: { label: 'Cinematic', shortDesc: 'Warm contrast' },
  vhs: { label: 'Retro VHS', shortDesc: 'Warm 90s film' },
  noir: { label: 'Noir B&W', shortDesc: 'Monochrome' },
};

export const GRADE_TITLES_EN: Record<DriverGrade, string> = {
  S: 'Metro Master',
  A: 'Model Driver',
  B: 'Solid Run',
  C: 'Needs Improvement',
  D: 'Safety Hazard',
};

export const CAMERA_LABEL_EN: Record<CameraMode, string> = {
  cab: 'Camera 1: Cab View (FPP)',
  mirror: 'Camera 2: Platform Mirror',
  exterior: 'Camera 3: Exterior Chase',
  interior: 'Camera 4: Passenger Interior',
  bogie: 'Camera 5: Bogie / Track Cam',
  station: 'Camera 6: Station Platform Cam',
};

export const ACADEMY_STEP_EN: Record<
  AcademyStepNumber,
  { readonly title: string; readonly instruction: string; readonly gamepadHint: string }
> = {
  1: {
    title: 'Cab Preparation',
    instruction: 'Switch on headlights [L] and sound the horn [H].',
    gamepadHint: 'Controller: D-Pad Up (Headlights) · B / Circle (Horn)',
  },
  2: {
    title: 'Smooth Departure',
    instruction: 'Accelerate smoothly [W] above 20 km/h while staying under 60 km/h.',
    gamepadHint: 'Controller: RT / R2 or Left Stick Up (Throttle)',
  },
  3: {
    title: 'Yellow & Red Semaphores',
    instruction: 'Slow down for yellow (≤ 30 km/h), stop before red, and wait for green.',
    gamepadHint: 'Controller: LT / L2 or Left Stick Down (Brake)',
  },
  4: {
    title: 'Czuwak Vigilance & Dispatch Radio',
    instruction: 'Acknowledge the Czuwak alarm [C] and confirm the dispatcher radio call [R].',
    gamepadHint: 'Controller: Y / Triangle (Czuwak) · X / Square (Radio)',
  },
  5: {
    title: 'Precision Station Stop & Doors',
    instruction: 'Brake inside the STOP zone, open platform doors [Q], wait for boarding, and close [Q].',
    gamepadHint: 'Controller: LB / L1 (Left Doors) · RB / R1 (Right Doors)',
  },
};

export const TIME_OF_DAY_EN: Record<TimeOfDayId, { readonly name: string; readonly description: string }> = {
  rush: {
    name: 'Rush Hour',
    description:
      'Crowded platforms, frequent oncoming trains, higher red-signal risk, and longer boarding (7 s).',
  },
  night_service: {
    name: 'Night Service',
    description:
      '02:30 maintenance window: empty dark stations with emergency beacons and track crews (≤ 20 km/h + horn).',
  },
  evening: {
    name: 'Late Evening',
    description:
      'Dimmed warm station lighting, sparse passengers on platforms, quieter traffic, and calmer tunnel signals.',
  },
};
