import type { DriverGrade, ILeaderboardEntry, TimeOfDayId, TrainModelId } from './types';

export interface ILeaderboardStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface ILeaderboardRecordInput {
  readonly score: number;
  readonly grade: DriverGrade;
  readonly trainModelId: TrainModelId;
  readonly trainName: string;
  readonly timeOfDayId: TimeOfDayId;
  readonly timeOfDayLabel: string;
  readonly dateIso?: string;
}

export interface ILeaderboardSaveResult {
  readonly entries: readonly ILeaderboardEntry[];
  readonly isNewRecord: boolean;
}

export interface ILeaderboardService {
  getTopEntries(): readonly ILeaderboardEntry[];
  recordRun(input: ILeaderboardRecordInput): ILeaderboardSaveResult;
}

const STORAGE_KEY = 'metro_m1_leaderboard_v1';
const MAX_ENTRIES = 5;

function isValidEntry(candidate: unknown): candidate is ILeaderboardEntry {
  if (typeof candidate !== 'object' || candidate === null) {
    return false;
  }
  const obj = candidate as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.score === 'number' &&
    typeof obj.grade === 'string' &&
    typeof obj.trainModelId === 'string' &&
    typeof obj.trainName === 'string' &&
    typeof obj.timeOfDayId === 'string' &&
    typeof obj.timeOfDayLabel === 'string' &&
    typeof obj.dateIso === 'string'
  );
}

export class LocalStorageLeaderboardStore implements ILeaderboardStorage {
  public getItem(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  public setItem(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore storage quota or privacy-mode write errors gracefully
    }
  }
}

export class LeaderboardService implements ILeaderboardService {
  private readonly storage: ILeaderboardStorage;

  public constructor(storage: ILeaderboardStorage = new LocalStorageLeaderboardStore()) {
    this.storage = storage;
  }

  public getTopEntries(): readonly ILeaderboardEntry[] {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .filter(isValidEntry)
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_ENTRIES);
    } catch {
      return [];
    }
  }

  public recordRun(input: ILeaderboardRecordInput): ILeaderboardSaveResult {
    const existing = this.getTopEntries();
    const roundedScore = Math.round(input.score);
    const previousBest = existing.length > 0 ? existing[0].score : null;
    const isNewRecord = previousBest === null || roundedScore > previousBest;
    const dateIso = input.dateIso ?? new Date().toISOString();
    const newEntry: ILeaderboardEntry = {
      id: `${dateIso}-${roundedScore}-${Math.floor(Math.random() * 10000)}`,
      score: roundedScore,
      grade: input.grade,
      trainModelId: input.trainModelId,
      trainName: input.trainName,
      timeOfDayId: input.timeOfDayId,
      timeOfDayLabel: input.timeOfDayLabel,
      dateIso,
    };
    const nextEntries = [...existing, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_ENTRIES);
    this.storage.setItem(STORAGE_KEY, JSON.stringify(nextEntries));
    return { entries: nextEntries, isNewRecord };
  }
}

export function formatLeaderboardDate(dateIso: string): string {
  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.getTime())) {
    return dateIso.slice(0, 10);
  }
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();
  return `${day}.${month}.${year}`;
}
