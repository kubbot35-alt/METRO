import {
  computeGhostDelta,
  formatGhostScoreDelta,
  formatGhostTimeDelta,
} from './ghostDeltaMath';
import {
  JsonStorageRepository,
  type IJsonRepository,
  type IKeyValueStorage,
} from './persistence/jsonStorageRepository';
import type { IGhostStationSplit, ILineGhostRecord, ISimulationSnapshot, MetroLineId } from './types';

export type IGhostStorage = IKeyValueStorage;

export interface IGhostRecordService {
  getRecordForLine(lineId: MetroLineId): ILineGhostRecord | null;
  recordIfBest(snapshot: ISimulationSnapshot): {
    readonly updated: boolean;
    readonly record: ILineGhostRecord | null;
  };
  clear(): void;
}

export const GHOST_RECORDS_STORAGE_KEY = 'warsaw_metro_ghost_records_v1';
export { computeGhostDelta, formatGhostScoreDelta, formatGhostTimeDelta };

function isValidSplit(raw: unknown): raw is IGhostStationSplit {
  if (!raw || typeof raw !== 'object') {
    return false;
  }
  const obj = raw as Record<string, unknown>;
  return (
    typeof obj.stationIndex === 'number' &&
    Number.isFinite(obj.stationIndex) &&
    typeof obj.stationCode === 'string' &&
    typeof obj.elapsedTimeSec === 'number' &&
    Number.isFinite(obj.elapsedTimeSec) &&
    typeof obj.score === 'number' &&
    Number.isFinite(obj.score)
  );
}

function isValidGhostRecord(raw: unknown): raw is ILineGhostRecord {
  if (!raw || typeof raw !== 'object') {
    return false;
  }
  const obj = raw as Record<string, unknown>;
  return (
    typeof obj.lineId === 'string' &&
    typeof obj.finalScore === 'number' &&
    Number.isFinite(obj.finalScore) &&
    typeof obj.totalTimeSec === 'number' &&
    Number.isFinite(obj.totalTimeSec) &&
    typeof obj.recordedAtIso === 'string' &&
    Array.isArray(obj.splits) &&
    obj.splits.every(isValidSplit)
  );
}

function sanitizeGhostMap(raw: unknown): Record<string, ILineGhostRecord> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const clean: Record<string, ILineGhostRecord> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (isValidGhostRecord(val)) {
      clean[key] = val;
    }
  }
  return clean;
}

function isRecordEligible(snapshot: ISimulationSnapshot): boolean {
  return (
    snapshot.gameMode !== 'sandbox' &&
    snapshot.gameMode !== 'academy' &&
    snapshot.gameMode !== 'passenger' &&
    !snapshot.atoEnabled &&
    snapshot.stationSplits.length > 0
  );
}

function buildGhostRecord(snapshot: ISimulationSnapshot): ILineGhostRecord {
  return {
    lineId: snapshot.line.id,
    finalScore: Math.round(snapshot.score),
    totalTimeSec: Number(snapshot.elapsedTimeSec.toFixed(1)),
    recordedAtIso: new Date().toISOString(),
    splits: snapshot.stationSplits.map((s) => ({
      stationIndex: s.stationIndex,
      stationCode: s.stationCode,
      elapsedTimeSec: Number(s.elapsedTimeSec.toFixed(1)),
      score: Math.round(s.score),
    })),
  };
}

export class GhostRecordStorageService implements IGhostRecordService {
  private readonly repo: IJsonRepository<Record<string, ILineGhostRecord>>;

  public constructor(storage?: IGhostStorage | null) {
    this.repo = new JsonStorageRepository<Record<string, ILineGhostRecord>>(
      GHOST_RECORDS_STORAGE_KEY,
      () => ({}),
      sanitizeGhostMap,
      storage,
    );
  }

  public getRecordForLine(lineId: MetroLineId): ILineGhostRecord | null {
    return this.repo.load()[lineId] ?? null;
  }

  public recordIfBest(snapshot: ISimulationSnapshot): {
    readonly updated: boolean;
    readonly record: ILineGhostRecord | null;
  } {
    if (!isRecordEligible(snapshot)) {
      return { updated: false, record: this.getRecordForLine(snapshot.line.id) };
    }
    const all = { ...this.repo.load() };
    const existing = all[snapshot.line.id] ?? null;
    const candidate = buildGhostRecord(snapshot);
    const isBetter =
      !existing ||
      candidate.finalScore > Math.round(existing.finalScore) ||
      (candidate.finalScore === Math.round(existing.finalScore) &&
        candidate.totalTimeSec < existing.totalTimeSec);
    if (!isBetter) {
      return { updated: false, record: existing };
    }
    all[snapshot.line.id] = candidate;
    this.repo.save(all);
    return { updated: true, record: candidate };
  }

  public clear(): void {
    this.repo.save({});
  }
}
