import type { ILeadingTrainState, ISemaphoreState, IStationSpec } from './types';

export interface ILeadingTrainStepResult {
  readonly headwayWarningTriggeredNow: boolean;
}

export interface ILeadingTrainController {
  setStations(stations: readonly IStationSpec[]): void;
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
  forcePosition?(positionM: number, speedMs?: number): void;
  reset(): void;
  step(
    playerPosM: number,
    playerSpeedKmh: number,
    signals: readonly ISemaphoreState[],
    dtSec: number,
  ): ILeadingTrainStepResult;
  getState(): ILeadingTrainState;
}

export const LEADING_TRAIN_CONSTANTS = {
  INITIAL_SPAWN_M: 840,
  CRUISE_SPEED_MS: 14.4,
  BRAKE_DECEL_MS2: 0.92,
  ACCEL_MS2: 1.05,
  APPROACH_DIST_M: 160,
  DWELL_MIN_SEC: 8.5,
  DWELL_RANGE_SEC: 3.0,
  DOOR_HOLD_SEC: 1.0,
  WARNING_BLOCKS: 2,
  WARNING_DIST_M: 540,
  WARNING_MIN_SPEED_KMH: 25,
  WARNING_COOLDOWN_SEC: 32,
  CONSIST_LENGTH_M: 118,
} as const;
