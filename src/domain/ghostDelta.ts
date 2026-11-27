import type {
  IGhostDeltaSnapshot,
  IGhostStationSplit,
  ILineGhostRecord,
  ISimulationSnapshot,
  MetroLineId,
} from './types';

export interface IGhostStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface IGhostRecordService {
  getRecordForLine(lineId: MetroLineId): ILineGhostRecord | null;
  recordIfBest(snapshot: ISimulationSnapshot): {
    readonly updated: boolean;
    readonly record: ILineGhostRecord | null;
  };
  clear(): void;
}

export const GHOST_RECORDS_STORAGE_KEY = 'warsaw_metro_ghost_records_v1';

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

export function computeGhostDelta(
  currentSplits: readonly IGhostStationSplit[],
  ghostRecord: ILineGhostRecord | null,
): IGhostDeltaSnapshot | null {
  if (!ghostRecord) {
    return null;
  }
  if (currentSplits.length === 0) {
    return {
      lineId: ghostRecord.lineId,
      ghostBestScore: Math.round(ghostRecord.finalScore),
      ghostTotalTimeSec: Math.round(ghostRecord.totalTimeSec),
      hasSplitComparison: false,
      lastStationCode: null,
      scoreDelta: 0,
      timeDeltaSec: 0,
      isScoreAhead: true,
      isTimeAhead: true,
    };
  }
  const latestSplit = currentSplits[currentSplits.length - 1];
  const ghostSplit = ghostRecord.splits.find((s) => s.stationIndex === latestSplit.stationIndex);
  if (!ghostSplit) {
    return {
      lineId: ghostRecord.lineId,
      ghostBestScore: Math.round(ghostRecord.finalScore),
      ghostTotalTimeSec: Math.round(ghostRecord.totalTimeSec),
      hasSplitComparison: false,
      lastStationCode: latestSplit.stationCode,
      scoreDelta: 0,
      timeDeltaSec: 0,
      isScoreAhead: true,
      isTimeAhead: true,
    };
  }

  const scoreDelta = Math.round(latestSplit.score - ghostSplit.score);
  const timeDeltaSec = Math.round(latestSplit.elapsedTimeSec - ghostSplit.elapsedTimeSec);
  return {
    lineId: ghostRecord.lineId,
    ghostBestScore: Math.round(ghostRecord.finalScore),
    ghostTotalTimeSec: Math.round(ghostRecord.totalTimeSec),
    hasSplitComparison: true,
    lastStationCode: latestSplit.stationCode,
    scoreDelta,
    timeDeltaSec,
    isScoreAhead: scoreDelta >= 0,
    isTimeAhead: timeDeltaSec <= 0,
  };
}

export function formatGhostScoreDelta(delta: number): string {
  const rounded = Math.round(delta);
  return rounded >= 0 ? `+${rounded} pkt` : `${rounded} pkt`;
}

export function formatGhostTimeDelta(deltaSec: number): string {
  const rounded = Math.round(deltaSec);
  if (rounded === 0) {
    return '0s';
  }
  return rounded > 0 ? `+${rounded}s` : `${rounded}s`;
}

export class GhostRecordStorageService implements IGhostRecordService {
  private readonly storage: IGhostStorage | null;

  public constructor(storage?: IGhostStorage | null) {
    if (storage !== undefined) {
      this.storage = storage;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
    } else {
      this.storage = null;
    }
  }

  public getRecordForLine(lineId: MetroLineId): ILineGhostRecord | null {
    const all = this.loadMap();
    return all[lineId] ?? null;
  }

  public recordIfBest(snapshot: ISimulationSnapshot): {
    readonly updated: boolean;
    readonly record: ILineGhostRecord | null;
  } {
    if (
      snapshot.gameMode === 'sandbox' ||
      snapshot.gameMode === 'academy' ||
      snapshot.gameMode === 'passenger' ||
      snapshot.atoEnabled ||
      snapshot.stationSplits.length === 0
    ) {
      return { updated: false, record: this.getRecordForLine(snapshot.line.id) };
    }
    const all = this.loadMap();
    const existing = all[snapshot.line.id] ?? null;
    const roundedScore = Math.round(snapshot.score);
    const totalTime = Number(snapshot.elapsedTimeSec.toFixed(1));
    const isBetter =
      !existing ||
      roundedScore > Math.round(existing.finalScore) ||
      (roundedScore === Math.round(existing.finalScore) && totalTime < existing.totalTimeSec);

    if (!isBetter) {
      return { updated: false, record: existing };
    }

    const nextRecord: ILineGhostRecord = {
      lineId: snapshot.line.id,
      finalScore: roundedScore,
      totalTimeSec: totalTime,
      recordedAtIso: new Date().toISOString(),
      splits: snapshot.stationSplits.map((s) => ({
        stationIndex: s.stationIndex,
        stationCode: s.stationCode,
        elapsedTimeSec: Number(s.elapsedTimeSec.toFixed(1)),
        score: Math.round(s.score),
      })),
    };
    all[snapshot.line.id] = nextRecord;
    this.saveMap(all);
    return { updated: true, record: nextRecord };
  }

  public clear(): void {
    this.saveMap({});
  }

  private loadMap(): Record<string, ILineGhostRecord> {
    if (!this.storage) {
      return {};
    }
    try {
      const raw = this.storage.getItem(GHOST_RECORDS_STORAGE_KEY);
      if (!raw) {
        return {};
      }
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {};
      }
      const clean: Record<string, ILineGhostRecord> = {};
      for (const [key, val] of Object.entries(parsed as Record<string, unknown>)) {
        if (isValidGhostRecord(val)) {
          clean[key] = val;
        }
      }
      return clean;
    } catch {
      return {};
    }
  }

  private saveMap(map: Record<string, ILineGhostRecord>): void {
    if (!this.storage) {
      return;
    }
    try {
      this.storage.setItem(GHOST_RECORDS_STORAGE_KEY, JSON.stringify(map));
    } catch {
      // Ignore storage quota errors
    }
  }
}
