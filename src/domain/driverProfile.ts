import {
  DRIVER_RANKS,
  calculateCourseXp,
  getPunctualityPercent,
  getRankForXp,
  getRankProgress,
  pickBetterGrade,
  type IRankProgressInfo,
} from './driverRankCatalog';
import {
  JsonStorageRepository,
  type IJsonRepository,
  type IKeyValueStorage,
} from './persistence/jsonStorageRepository';
import type { DriverGrade, ICourseXpReward, IDriverProfileStats, ISimulationSnapshot } from './types';

export type IDriverProfileStorage = IKeyValueStorage;

export interface IDriverProfileService {
  load(): IDriverProfileStats;
  recordCompletedCourse(snapshot: ISimulationSnapshot): {
    readonly profile: IDriverProfileStats;
    readonly reward: ICourseXpReward;
  };
  reset(): IDriverProfileStats;
}

export const DRIVER_PROFILE_STORAGE_KEY = 'warsaw_metro_driver_profile_v1';
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

export {
  DRIVER_RANKS,
  calculateCourseXp,
  getPunctualityPercent,
  getRankForXp,
  getRankProgress,
  pickBetterGrade,
  type IRankProgressInfo,
};

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
  private readonly repo: IJsonRepository<IDriverProfileStats>;

  public constructor(storage?: IDriverProfileStorage | null) {
    this.repo = new JsonStorageRepository<IDriverProfileStats>(
      DRIVER_PROFILE_STORAGE_KEY,
      () => ({ ...EMPTY_DRIVER_PROFILE }),
      sanitizeDriverProfile,
      storage,
    );
  }

  public load(): IDriverProfileStats {
    return this.repo.load();
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
    const next: IDriverProfileStats = {
      totalDistanceKm: Number((prev.totalDistanceKm + routeKm).toFixed(2)),
      totalPassengers: prev.totalPassengers + Math.max(0, snapshot.passengersCarried),
      completedCourses: prev.completedCourses + 1,
      totalDriveTimeSec: prev.totalDriveTimeSec + Math.max(0, Math.round(snapshot.elapsedTimeSec)),
      highestGrade:
        snapshot.gameMode === 'sandbox' ? prev.highestGrade : pickBetterGrade(prev.highestGrade, snapshot.driverGrade),
      punctualArrivals: prev.punctualArrivals + (snapshot.schedule.punctualArrivalsCount ?? 0),
      totalArrivals: prev.totalArrivals + snapshot.schedule.punctualitySamples,
      xp: reward.totalXpAfter,
    };
    this.repo.save(next);
    return { profile: next, reward };
  }

  public reset(): IDriverProfileStats {
    return this.repo.save({ ...EMPTY_DRIVER_PROFILE });
  }
}
