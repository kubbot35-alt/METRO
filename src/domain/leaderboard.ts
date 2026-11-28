import {
  JsonStorageRepository,
  type IJsonRepository,
  type IKeyValueStorage,
} from './persistence/jsonStorageRepository';
import type { DriverGrade, ILeaderboardEntry, TimeOfDayId, TrainModelId } from './types';

export type ILeaderboardStorage = IKeyValueStorage;

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

function sanitizeLeaderboardEntries(raw: unknown): readonly ILeaderboardEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter(isValidEntry)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ENTRIES);
}

export class LeaderboardService implements ILeaderboardService {
  private readonly repo: IJsonRepository<readonly ILeaderboardEntry[]>;

  public constructor(storage?: ILeaderboardStorage | null) {
    this.repo = new JsonStorageRepository<readonly ILeaderboardEntry[]>(
      STORAGE_KEY,
      () => [],
      sanitizeLeaderboardEntries,
      storage,
    );
  }

  public getTopEntries(): readonly ILeaderboardEntry[] {
    return this.repo.load();
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
    const nextEntries = this.repo.save([...existing, newEntry]);
    return { entries: nextEntries, isNewRecord };
  }
}

export function formatLeaderboardDate(dateIso: string): string {
  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.getTime())) {
    return dateIso.slice(0, 10);
  }
  return parsed.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}
