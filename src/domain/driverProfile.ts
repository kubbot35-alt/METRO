import type {
  DriverGrade,
  ICourseXpReward,
  IDriverProfileStats,
  IDriverRankSpec,
  ISimulationSnapshot,
} from './types';

export interface IDriverProfileStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface IRankProgressInfo {
  readonly currentRank: IDriverRankSpec;
  readonly nextRank: IDriverRankSpec | null;
  readonly progressRatio: number;
  readonly xpIntoRank: number;
  readonly xpRequiredForNext: number;
}

export interface IDriverProfileService {
  load(): IDriverProfileStats;
  recordCompletedCourse(snapshot: ISimulationSnapshot): {
    readonly profile: IDriverProfileStats;
    readonly reward: ICourseXpReward;
  };
  reset(): IDriverProfileStats;
}

export const DRIVER_PROFILE_STORAGE_KEY = 'warsaw_metro_driver_profile_v1';

export const DRIVER_RANKS: readonly IDriverRankSpec[] = [
  {
    id: 'trainee',
    title: 'Praktykant',
    minXp: 0,
    badgeColor: '#94a3b8',
    description: 'Początkujący kandydat na maszynistę metra warszawskiego.',
  },
  {
    id: 'junior',
    title: 'Młodszy Maszynista',
    minXp: 400,
    badgeColor: '#38bdf8',
    description: 'Samodzielne prowadzenie składów w normalnym ruchu pasażerskim.',
  },
  {
    id: 'driver',
    title: 'Maszynista',
    minXp: 1200,
    badgeColor: '#34d399',
    description: 'Pewne hamowanie w strefie STOP, punktualny rozkład i obsługa usterek.',
  },
  {
    id: 'senior',
    title: 'Starszy Maszynista',
    minXp: 2600,
    badgeColor: '#f59e0b',
    description: 'Doświadczony prowadzący w godzinach szczytu, deszczu i wyzwaniach.',
  },
  {
    id: 'instructor',
    title: 'Instruktor Ruchu',
    minXp: 4800,
    badgeColor: '#a78bfa',
    description: 'Autorytet techniczny szkolący nowe pokolenia maszynistów M1 i M2.',
  },
  {
    id: 'legend',
    title: 'Legenda Metra',
    minXp: 8000,
    badgeColor: '#facc15',
    description: 'Mistrz wszystkich linii i scenariuszy o nieskazitelnej punktualności.',
  },
];

export const EMPTY_DRIVER_PROFILE: IDriverProfileStats = {
  totalDistanceKm: 0,
  totalPassengers: 0,
  completedCourses: 0,
  totalDriveTimeSec: 0,
  highestGrade: null,
  punctualArrivals: 0,
  totalArrivals: 0,
  xp: 0,
};

const GRADE_ORDER: Record<DriverGrade, number> = {
  D: 1,
  C: 2,
  B: 3,
  A: 4,
  S: 5,
};

export function pickBetterGrade(a: DriverGrade | null, b: DriverGrade): DriverGrade {
  if (!a) {
    return b;
  }
  return GRADE_ORDER[b] > GRADE_ORDER[a] ? b : a;
}

export function getRankForXp(xp: number): IDriverRankSpec {
  const safeXp = Math.max(0, Number.isFinite(xp) ? xp : 0);
  let active = DRIVER_RANKS[0];
  for (let i = 0; i < DRIVER_RANKS.length; i += 1) {
    if (safeXp >= DRIVER_RANKS[i].minXp) {
      active = DRIVER_RANKS[i];
    }
  }
  return active;
}

export function getRankProgress(xp: number): IRankProgressInfo {
  const safeXp = Math.max(0, Number.isFinite(xp) ? xp : 0);
  const currentRank = getRankForXp(safeXp);
  const currentIdx = DRIVER_RANKS.findIndex((r) => r.id === currentRank.id);
  const nextRank = currentIdx >= 0 && currentIdx + 1 < DRIVER_RANKS.length
    ? DRIVER_RANKS[currentIdx + 1]
    : null;

  if (!nextRank) {
    return {
      currentRank,
      nextRank: null,
      progressRatio: 1,
      xpIntoRank: safeXp - currentRank.minXp,
      xpRequiredForNext: 0,
    };
  }

  const span = Math.max(1, nextRank.minXp - currentRank.minXp);
  const xpIntoRank = Math.max(0, safeXp - currentRank.minXp);
  return {
    currentRank,
    nextRank,
    progressRatio: Math.max(0, Math.min(1, xpIntoRank / span)),
    xpIntoRank,
    xpRequiredForNext: span,
  };
}

export function getPunctualityPercent(profile: IDriverProfileStats): number | null {
  if (profile.totalArrivals <= 0) {
    return null;
  }
  return Math.round((profile.punctualArrivals / profile.totalArrivals) * 100);
}

export function calculateCourseXp(
  snapshot: ISimulationSnapshot,
  currentXp: number,
): ICourseXpReward {
  const routeKm = Math.max(0.4, snapshot.kinematics.positionM / 1000);
  const isAcademyCompleted =
    snapshot.gameMode === 'academy' && snapshot.academy?.completed === true;
  const baseXp = isAcademyCompleted ? 250 : 80;
  const distanceXp = isAcademyCompleted ? 0 : Math.round(routeKm * 45);
  const scoreXp = isAcademyCompleted ? 0 : Math.max(0, Math.round(snapshot.score / 12));
  const isPassengerOrAto = snapshot.gameMode === 'passenger' || snapshot.atoEnabled;
  const modeMultiplier = isPassengerOrAto
    ? 0
    : isAcademyCompleted
      ? 1.0
      : snapshot.gameMode === 'sandbox'
        ? 0.55
        : snapshot.gameMode === 'challenge'
          ? snapshot.challengeOutcome?.passed
            ? 1.5
            : 1.15
          : 1.0;

  const gainedXp = isPassengerOrAto
    ? 0
    : isAcademyCompleted
      ? 250
      : Math.max(40, Math.round((baseXp + distanceXp + scoreXp) * modeMultiplier));
  const previousRank = getRankForXp(currentXp);
  const totalXpAfter = currentXp + gainedXp;
  const newRank = getRankForXp(totalXpAfter);

  return {
    gainedXp,
    baseXp,
    distanceXp,
    scoreXp,
    modeMultiplier,
    previousRank,
    newRank,
    rankedUp: newRank.id !== previousRank.id,
    totalXpAfter,
  };
}

function sanitizeGrade(value: unknown): DriverGrade | null {
  if (value === 'S' || value === 'A' || value === 'B' || value === 'C' || value === 'D') {
    return value;
  }
  return null;
}

function sanitizeNonNeg(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

export function sanitizeDriverProfile(raw: unknown): IDriverProfileStats {
  if (!raw || typeof raw !== 'object') {
    return { ...EMPTY_DRIVER_PROFILE };
  }
  const obj = raw as Record<string, unknown>;
  const totalArrivals = Math.round(sanitizeNonNeg(obj.totalArrivals));
  const punctualArrivals = Math.min(totalArrivals, Math.round(sanitizeNonNeg(obj.punctualArrivals)));
  return {
    totalDistanceKm: Number(sanitizeNonNeg(obj.totalDistanceKm).toFixed(2)),
    totalPassengers: Math.round(sanitizeNonNeg(obj.totalPassengers)),
    completedCourses: Math.round(sanitizeNonNeg(obj.completedCourses)),
    totalDriveTimeSec: Math.round(sanitizeNonNeg(obj.totalDriveTimeSec)),
    highestGrade: sanitizeGrade(obj.highestGrade),
    punctualArrivals,
    totalArrivals,
    xp: Math.round(sanitizeNonNeg(obj.xp)),
  };
}

export class DriverProfileService implements IDriverProfileService {
  private readonly storage: IDriverProfileStorage | null;

  public constructor(storage?: IDriverProfileStorage | null) {
    if (storage !== undefined) {
      this.storage = storage;
      return;
    }
    this.storage = typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  }

  public load(): IDriverProfileStats {
    if (!this.storage) {
      return { ...EMPTY_DRIVER_PROFILE };
    }
    try {
      const raw = this.storage.getItem(DRIVER_PROFILE_STORAGE_KEY);
      if (!raw) {
        return { ...EMPTY_DRIVER_PROFILE };
      }
      return sanitizeDriverProfile(JSON.parse(raw));
    } catch {
      return { ...EMPTY_DRIVER_PROFILE };
    }
  }

  public recordCompletedCourse(snapshot: ISimulationSnapshot): {
    readonly profile: IDriverProfileStats;
    readonly reward: ICourseXpReward;
  } {
    const prev = this.load();
    const reward = calculateCourseXp(snapshot, prev.xp);
    if (snapshot.gameMode === 'passenger' || snapshot.atoEnabled) {
      return { profile: prev, reward };
    }
    const routeKm = Math.max(0, snapshot.kinematics.positionM / 1000);
    const arrivalsThisRun = snapshot.schedule.punctualitySamples;
    const punctualThisRun = snapshot.schedule.punctualArrivalsCount ?? 0;

    const next: IDriverProfileStats = {
      totalDistanceKm: Number((prev.totalDistanceKm + routeKm).toFixed(2)),
      totalPassengers: prev.totalPassengers + Math.max(0, snapshot.passengersCarried),
      completedCourses: prev.completedCourses + 1,
      totalDriveTimeSec: prev.totalDriveTimeSec + Math.max(0, Math.round(snapshot.elapsedTimeSec)),
      highestGrade:
        snapshot.gameMode === 'sandbox'
          ? prev.highestGrade
          : pickBetterGrade(prev.highestGrade, snapshot.driverGrade),
      punctualArrivals: prev.punctualArrivals + punctualThisRun,
      totalArrivals: prev.totalArrivals + arrivalsThisRun,
      xp: reward.totalXpAfter,
    };

    this.persist(next);
    return { profile: next, reward };
  }

  public reset(): IDriverProfileStats {
    const empty = { ...EMPTY_DRIVER_PROFILE };
    this.persist(empty);
    return empty;
  }

  private persist(profile: IDriverProfileStats): void {
    if (!this.storage) {
      return;
    }
    try {
      this.storage.setItem(DRIVER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Ignore storage quota errors
    }
  }
}
