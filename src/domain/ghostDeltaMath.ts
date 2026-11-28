import type { IGhostDeltaSnapshot, IGhostStationSplit, ILineGhostRecord } from './types';

function emptyDelta(
  ghostRecord: ILineGhostRecord,
  lastStationCode: string | null,
): IGhostDeltaSnapshot {
  return {
    lineId: ghostRecord.lineId,
    ghostBestScore: Math.round(ghostRecord.finalScore),
    ghostTotalTimeSec: Math.round(ghostRecord.totalTimeSec),
    hasSplitComparison: false,
    lastStationCode,
    scoreDelta: 0,
    timeDeltaSec: 0,
    isScoreAhead: true,
    isTimeAhead: true,
  };
}

export function computeGhostDelta(
  currentSplits: readonly IGhostStationSplit[],
  ghostRecord: ILineGhostRecord | null,
): IGhostDeltaSnapshot | null {
  if (!ghostRecord) return null;
  if (currentSplits.length === 0) return emptyDelta(ghostRecord, null);
  const latestSplit = currentSplits[currentSplits.length - 1];
  const ghostSplit = ghostRecord.splits.find((s) => s.stationIndex === latestSplit.stationIndex);
  if (!ghostSplit) return emptyDelta(ghostRecord, latestSplit.stationCode);
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
