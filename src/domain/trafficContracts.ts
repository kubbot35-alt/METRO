import type { IOncomingTrainState, IStationSpec, TrainModelId } from './types';

export interface ITrafficStepResult {
  readonly passingTrainWhoosh: boolean;
}

export interface ITrafficController {
  setSpawnIntervalRange?(minSec: number, maxSec: number): void;
  setStations?(stations: readonly IStationSpec[]): void;
  forceSpawnAhead?(playerPositionM: number): void;
  forceSpawnAtStation?(station: IStationSpec, stationIndex: number, arriving?: boolean): void;
  reset(): void;
  step(playerPositionM: number, dtSec: number): ITrafficStepResult;
  getState(): IOncomingTrainState;
}

export const TRAFFIC_CONSTANTS = {
  SPAWN_MIN_INTERVAL_SEC: 40,
  SPAWN_MAX_INTERVAL_SEC: 70,
  SPAWN_AHEAD_DIST_M: 270,
  DESPAWN_BEHIND_DIST_M: 125,
  WHOOSH_TRIGGER_DIST_M: 20,
  STATION_ENCOUNTER_PROBABILITY: 0.55,
  STATION_TRIGGER_MIN_AHEAD_M: 35,
  STATION_TRIGGER_MAX_AHEAD_M: 255,
  STATION_STOP_OFFSET_M: 116,
  STATION_ARRIVAL_START_OFFSET_M: 35,
  AI_BRAKE_DECEL_MS2: 1.05,
  AI_DEPART_ACCEL_MS2: 1.25,
  AI_CRUISE_MAX_SPEED_MS: 22.0,
  DOOR_CLOSE_LEAD_SEC: 1.0,
} as const;

export function pickRandomTrafficModel(rng: () => number): TrainModelId {
  const roll = rng();
  return roll < 0.34 ? 'seria81' : roll < 0.67 ? 'inspiro' : 'varsovia';
}

export interface IApproachingOppositeStation {
  readonly station: IStationSpec;
  readonly index: number;
  readonly stopPosM: number;
}

export function findApproachingOppositeStation(
  positionM: number,
  stations: readonly IStationSpec[],
  servedIds: ReadonlySet<number>,
): IApproachingOppositeStation | null {
  for (let i = 0; i < stations.length; i += 1) {
    const station = stations[i];
    if (servedIds.has(station.id)) continue;
    const stopPosM = station.distanceM - TRAFFIC_CONSTANTS.STATION_STOP_OFFSET_M;
    const distToStop = positionM - stopPosM;
    if (distToStop > 18 && distToStop <= 145) {
      return { station, index: i, stopPosM };
    }
  }
  return null;
}
