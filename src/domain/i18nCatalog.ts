import type {
  AcademyStepNumber,
  AchievementId,
  CameraMode,
  ChallengeId,
  DriverGrade,
  DriverRankId,
  GraphicsQualityId,
  LanguageId,
  PhotoFilterId,
  TimeOfDayId,
  TrainModelId,
} from './types';

export interface ILocalizedTitleDesc {
  readonly title: string;
  readonly description: string;
}

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

const TRAIN_EN: Record<TrainModelId, ILocalizedTrainSpec> = {
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

const CHALLENGE_EN: Record<ChallengeId, ILocalizedChallengeSpec> = {
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
};

const ACHIEVEMENT_EN: Record<AchievementId, ILocalizedTitleDesc> = {
  punctual_clockwork: {
    title: 'Swiss Precision',
    description: 'Finish a Duty run with average timetable deviation under 5 seconds.',
  },
  flawless_duty: {
    title: 'Flawless Duty',
    description: 'Complete a Duty run with Grade S and zero violations.',
  },
  classic_driver: {
    title: 'Classic Legend',
    description: 'Complete a full run operating the classic Seria 81 train.',
  },
  m2_master: {
    title: 'Line M2 Master',
    description: 'Complete a full run on Warsaw Metro Line M2.',
  },
  night_owl: {
    title: 'Night Owl',
    description: 'Complete a late-evening run starting at 23:30.',
  },
  nerves_of_steel: {
    title: 'Nerves of Steel',
    description: 'Acknowledge Czuwak 3+ times and resolve a door fault in one run.',
  },
  first_station_stop: {
    title: 'First Platform',
    description: 'Stop cleanly in the stop zone and complete passenger boarding.',
  },
  precision_stop: {
    title: 'Centimeter Precision',
    description: 'Stop within 2 meters of the platform STOP marker.',
  },
  passenger_carrier: {
    title: 'Rush Hour Carrier',
    description: 'Carry at least 100 passengers in a single run.',
  },
  challenge_inverter_fault: {
    title: 'Master of 60% Power',
    description: 'Complete the "Inverter Failure" challenge within 15s average delay.',
  },
  challenge_technical_run: {
    title: 'Technical Transfer',
    description: 'Complete the "Technical Non-Stop Run" without exceeding 40 km/h at platforms.',
  },
  challenge_black_series: {
    title: 'Black Series Survivor',
    description: 'Finish the "Black Series" challenge without SPAD or Czuwak violations.',
  },
  academy_license: {
    title: 'Train Driver License',
    description: 'Complete all 5 steps of the Driver Academy interactive tutorial.',
  },
};

const RANK_EN: Record<DriverRankId, ILocalizedTitleDesc> = {
  trainee: { title: 'Trainee', description: 'First kilometers in the Warsaw Metro cab.' },
  junior: { title: 'Junior Driver', description: 'Confident driving and clean platform stops.' },
  driver: { title: 'Metro Driver', description: 'Reliable passenger service on lines M1 and M2.' },
  senior: { title: 'Senior Driver', description: 'Precision handling in rush hour and faults.' },
  instructor: { title: 'Chief Instructor', description: 'Master of timetables, signals, and all consists.' },
  legend: { title: 'Warsaw Metro Legend', description: 'Elite career mastery across the entire network.' },
};

const QUALITY_EN: Record<GraphicsQualityId, { readonly label: string; readonly description: string }> = {
  low: {
    label: 'Low',
    description: 'Short tunnel draw distance, fewer passengers & rain, no shadows (max FPS).',
  },
  medium: {
    label: 'Medium',
    description: 'Balanced tunnel visibility, 75% passengers, moderate rain particles.',
  },
  high: {
    label: 'High',
    description: 'Full draw distance, full crowds, dense rain, shadows, and antialiasing.',
  },
};

const PHOTO_FILTER_EN: Record<PhotoFilterId, { readonly label: string; readonly shortDesc: string }> = {
  normal: { label: 'Normal', shortDesc: 'Natural colors' },
  cinematic: { label: 'Cinematic', shortDesc: 'Warm contrast' },
  vhs: { label: 'Retro VHS', shortDesc: 'Warm 90s film' },
  noir: { label: 'Noir B&W', shortDesc: 'Monochrome' },
};

const GRADE_TITLES_EN: Record<DriverGrade, string> = {
  S: 'Metro Master',
  A: 'Model Driver',
  B: 'Solid Run',
  C: 'Needs Improvement',
  D: 'Safety Hazard',
};

const CAMERA_LABEL_EN: Record<CameraMode, string> = {
  cab: 'Camera 1: Cab View (FPP)',
  mirror: 'Camera 2: Platform Mirror',
  exterior: 'Camera 3: Exterior Chase',
  interior: 'Camera 4: Passenger Interior',
};

const ACADEMY_STEP_EN: Record<
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

export function getLocalizedTrain(
  lang: LanguageId,
  id: TrainModelId,
  fallback: ILocalizedTrainSpec,
): ILocalizedTrainSpec {
  return lang === 'en' ? TRAIN_EN[id] : fallback;
}

export function getLocalizedChallenge(
  lang: LanguageId,
  id: ChallengeId,
  fallback: ILocalizedChallengeSpec,
): ILocalizedChallengeSpec {
  return lang === 'en' ? CHALLENGE_EN[id] : fallback;
}

export function getLocalizedAchievement(
  lang: LanguageId,
  id: AchievementId,
  fallback: ILocalizedTitleDesc,
): ILocalizedTitleDesc {
  return lang === 'en' ? ACHIEVEMENT_EN[id] : fallback;
}

export function getLocalizedRank(
  lang: LanguageId,
  id: DriverRankId,
  fallback: ILocalizedTitleDesc,
): ILocalizedTitleDesc {
  return lang === 'en' ? RANK_EN[id] : fallback;
}

export function getLocalizedQuality(
  lang: LanguageId,
  id: GraphicsQualityId,
  fallback: { readonly label: string; readonly description: string },
): { readonly label: string; readonly description: string } {
  return lang === 'en' ? QUALITY_EN[id] : fallback;
}

export function getLocalizedPhotoFilter(
  lang: LanguageId,
  id: PhotoFilterId,
  fallback: { readonly label: string; readonly shortDesc: string },
): { readonly label: string; readonly shortDesc: string } {
  return lang === 'en' ? PHOTO_FILTER_EN[id] : fallback;
}

export function getLocalizedGradeTitle(
  lang: LanguageId,
  grade: DriverGrade,
  fallbackPl: string,
): string {
  return lang === 'en' ? GRADE_TITLES_EN[grade] : fallbackPl;
}

export function getLocalizedCameraLabel(
  lang: LanguageId,
  mode: CameraMode,
  fallbackPl: string,
): string {
  return lang === 'en' ? CAMERA_LABEL_EN[mode] : fallbackPl;
}

export function getLocalizedTimeOfDay(
  lang: LanguageId,
  id: TimeOfDayId,
  fallback: { readonly name: string; readonly description: string },
): { readonly name: string; readonly description: string } {
  if (lang !== 'en') {
    return fallback;
  }
  if (id === 'rush') {
    return {
      name: 'Rush Hour',
      description:
        'Crowded platforms, frequent oncoming trains, higher red-signal risk, and longer boarding (7 s).',
    };
  }
  return {
    name: 'Late Evening',
    description:
      'Dimmed warm station lighting, sparse passengers on platforms, quieter traffic, and calmer tunnel signals.',
  };
}

export function getLocalizedAcademyStep(
  lang: LanguageId,
  step: AcademyStepNumber,
  fallback: { readonly title: string; readonly instruction: string; readonly gamepadHint: string },
): { readonly title: string; readonly instruction: string; readonly gamepadHint: string } {
  return lang === 'en' ? ACADEMY_STEP_EN[step] : fallback;
}
