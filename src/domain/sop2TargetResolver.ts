import type {
  ISemaphoreProgress,
  ISpeedLimitZone,
  IStationProgress,
  Sop2TargetReason,
} from './types';

export const SOP2_LOOKAHEAD_M = 360;

export interface ISop2TargetCandidate {
  readonly limitKmh: number;
  readonly distanceM: number;
  readonly reason: Exclude<Sop2TargetReason, null>;
}

export interface ISop2TargetQuery {
  readonly positionM: number;
  readonly currentLimitKmh: number;
  readonly speedZones: readonly ISpeedLimitZone[];
  readonly upcomingCurve: { readonly limitKmh: number; readonly distanceAheadM: number } | null;
  readonly upcomingTrackworkDistanceM: number | null;
  readonly nextSignal: ISemaphoreProgress | null;
  readonly currentStation: IStationProgress;
  readonly skipStations: boolean;
  readonly stationPassLimitKmh: number | null;
}

export interface ISop2TargetResolution {
  readonly targetLimitKmh: number | null;
  readonly targetDistanceM: number | null;
  readonly targetReason: Sop2TargetReason;
}

function findNextLowerZone(
  positionM: number,
  currentLimitKmh: number,
  zones: readonly ISpeedLimitZone[],
): ISop2TargetCandidate | null {
  for (let i = 0; i < zones.length; i += 1) {
    const z = zones[i];
    if (z.startM <= positionM) continue;
    const dist = z.startM - positionM;
    if (dist > SOP2_LOOKAHEAD_M) break;
    if (z.limitKmh < currentLimitKmh) {
      return { limitKmh: z.limitKmh, distanceM: dist, reason: 'zone' };
    }
  }
  return null;
}

function buildSignalCandidate(
  nextSignal: ISemaphoreProgress | null,
  currentLimitKmh: number,
): ISop2TargetCandidate | null {
  if (!nextSignal || nextSignal.distanceAheadM < 0 || nextSignal.distanceAheadM > SOP2_LOOKAHEAD_M) {
    return null;
  }
  if (nextSignal.signal.aspect === 'red') {
    return { limitKmh: 0, distanceM: nextSignal.distanceAheadM, reason: 'signal' };
  }
  if (nextSignal.signal.aspect === 'yellow' && 30 < currentLimitKmh) {
    return { limitKmh: 30, distanceM: nextSignal.distanceAheadM, reason: 'signal' };
  }
  return null;
}

function buildStationCandidate(query: ISop2TargetQuery): ISop2TargetCandidate | null {
  const dist = query.currentStation.distanceToTargetM;
  if (dist <= 12 || dist > 230) return null;
  if (query.skipStations) {
    const passLimit = query.stationPassLimitKmh;
    if (passLimit !== null && passLimit < query.currentLimitKmh) {
      return { limitKmh: passLimit, distanceM: Math.max(0, dist - 108), reason: 'station' };
    }
    return null;
  }
  return { limitKmh: 0, distanceM: dist, reason: 'station' };
}

function pickMostUrgentTarget(candidates: readonly ISop2TargetCandidate[]): ISop2TargetResolution {
  if (candidates.length === 0) {
    return { targetLimitKmh: null, targetDistanceM: null, targetReason: null };
  }
  let best = candidates[0];
  for (let i = 1; i < candidates.length; i += 1) {
    const c = candidates[i];
    if (c.limitKmh < best.limitKmh || (c.limitKmh === best.limitKmh && c.distanceM < best.distanceM)) {
      best = c;
    }
  }
  return {
    targetLimitKmh: best.limitKmh,
    targetDistanceM: Math.round(best.distanceM),
    targetReason: best.reason,
  };
}

export function resolveSop2Target(query: ISop2TargetQuery): ISop2TargetResolution {
  const candidates: ISop2TargetCandidate[] = [];
  const zone = findNextLowerZone(query.positionM, query.currentLimitKmh, query.speedZones);
  if (zone) candidates.push(zone);
  if (query.upcomingCurve && query.upcomingCurve.limitKmh < query.currentLimitKmh) {
    candidates.push({ limitKmh: query.upcomingCurve.limitKmh, distanceM: query.upcomingCurve.distanceAheadM, reason: 'curve' });
  }
  if (query.upcomingTrackworkDistanceM !== null && 25 < query.currentLimitKmh) {
    candidates.push({ limitKmh: 25, distanceM: query.upcomingTrackworkDistanceM, reason: 'trackwork' });
  }
  const sig = buildSignalCandidate(query.nextSignal, query.currentLimitKmh);
  if (sig) candidates.push(sig);
  const st = buildStationCandidate(query);
  if (st) candidates.push(st);
  return pickMostUrgentTarget(candidates);
}
