import type {
  ICzuwakState,
  IDoorFaultState,
  IStationSpec,
  ITrackworkZone,
} from './types';

export interface IIncidentStepResult {
  readonly czuwakAlertTriggered: boolean;
  readonly czuwakAckChime: boolean;
  readonly czuwakTimedOut: boolean;
  readonly doorFaultResolvedClose: boolean;
  readonly enteredTrackworkWarning: ITrackworkZone | null;
}

export interface IDoorCloseAttemptResult {
  readonly allowedToCloseNow: boolean;
  readonly faultTriggered: boolean;
  readonly retryStarted: boolean;
}

export interface IIncidentOverrides {
  readonly doorFaultProbability?: number | null;
  readonly czuwakMinSec?: number | null;
  readonly czuwakMaxSec?: number | null;
  readonly disableTrackwork?: boolean;
}

export interface IIncidentController {
  setStations?(stations: readonly IStationSpec[]): void;
  setEnabled?(enabled: boolean): void;
  configureOverrides?(overrides: IIncidentOverrides): void;
  forceTriggerCzuwak?(windowSec?: number): boolean;
  reset(): void;
  step(
    positionM: number,
    speedKmh: number,
    doorsOpen: boolean,
    ackCzuwakPressed: boolean,
    dtSec: number,
  ): IIncidentStepResult;
  attemptDoorClose(stationIndex: number, faultProbabilityScale?: number): IDoorCloseAttemptResult;
  getTrackworkZones(): readonly ITrackworkZone[];
  getActiveTrackworkZone(positionM: number): ITrackworkZone | null;
  getUpcomingTrackworkDistance(positionM: number): number | null;
  getDoorFaultState(): IDoorFaultState;
  getCzuwakState(): ICzuwakState;
}

export const INCIDENT_LIMITS = {
  TRACKWORK_LIMIT_KMH: 25,
  TRACKWORK_LENGTH_M: 200,
  TRACKWORK_WARN_AHEAD_M: 135,
  DOOR_FAULT_PROBABILITY: 0.28,
  DOOR_FAULT_RESET_SEC: 3.0,
  CZUWAK_MIN_INTERVAL_SEC: 40,
  CZUWAK_MAX_INTERVAL_SEC: 60,
  CZUWAK_RESPONSE_WINDOW_SEC: 4.0,
  CZUWAK_ACTIVE_SPEED_KMH: 5.0,
} as const;

function buildTrackworkZone(station: IStationSpec, index: number): ITrackworkZone {
  const startM = station.distanceM - 445;
  return {
    id: index + 1,
    startM,
    endM: startM + INCIDENT_LIMITS.TRACKWORK_LENGTH_M,
    limitKmh: INCIDENT_LIMITS.TRACKWORK_LIMIT_KMH,
  };
}

export function generateTrackworkZones(
  stations: readonly IStationSpec[],
  rng: () => number,
): ITrackworkZone[] {
  if (stations.length < 2) return [];
  const candidates = stations.slice(1).map((_, idx) => idx + 1);
  const picked = new Set<number>();
  const firstPick = candidates[Math.floor(rng() * Math.min(3, candidates.length))];
  if (firstPick !== undefined) picked.add(firstPick);
  for (const idx of candidates) {
    if (!picked.has(idx) && !picked.has(idx - 1) && picked.size < 3 && rng() < 0.28) {
      picked.add(idx);
    }
  }
  return Array.from(picked)
    .sort((a, b) => a - b)
    .map((stationIdx, idIdx) => buildTrackworkZone(stations[stationIdx], idIdx));
}
