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
  STATION_ENCOUNTER_PROBABILITY: 0.35,
  STATION_TRIGGER_MIN_AHEAD_M: 35,
  STATION_TRIGGER_MAX_AHEAD_M: 235,
  STATION_STOP_OFFSET_M: 68,
  STATION_ARRIVAL_START_OFFSET_M: 58,
  AI_BRAKE_DECEL_MS2: 1.05,
  AI_DEPART_ACCEL_MS2: 1.25,
  AI_CRUISE_MAX_SPEED_MS: 22.0,
  DOOR_CLOSE_LEAD_SEC: 1.0,
} as const;

export function pickRandomTrafficModel(rng: () => number): TrainModelId {
  const roll = rng();
  return roll < 0.34 ? 'seria81' : roll < 0.67 ? 'inspiro' : 'varsovia';
}
