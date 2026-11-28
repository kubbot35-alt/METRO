import {
  LEADING_TRAIN_CONSTANTS as C,
  type ILeadingTrainController,
  type ILeadingTrainStepResult,
} from './leadingTrainContracts';
import { getStationPlatformSide } from './trackGeometry';
import { pickRandomTrafficModel } from './trafficContracts';
import type {
  DoorSide,
  ILeadingTrainState,
  ISemaphoreState,
  IStationSpec,
  OncomingTrainMode,
  TrainModelId,
} from './types';

export type { ILeadingTrainController, ILeadingTrainStepResult };

export class LeadingTrainSystem implements ILeadingTrainController {
  private readonly rng: () => number;
  private stations: readonly IStationSpec[] = [];
  private enabled = false;
  private active = false;
  private mode: OncomingTrainMode = 'cruise';
  private nextStationIndex = 0;
  private positionM = 0;
  private speedMs = 0;
  private modelId: TrainModelId = 'varsovia';
  private doorsOpen = false;
  private doorSide: DoorSide | null = null;
  private dwellRemainingSec = 0;
  private departHoldSec = 0;
  private warningCooldownSec = 0;
  private distanceAheadM: number | null = null;
  private blocksAhead: number | null = null;

  public constructor(stations: readonly IStationSpec[] = [], rng: () => number = Math.random) {
    this.stations = stations;
    this.rng = rng;
    this.reset();
  }

  public setStations(stations: readonly IStationSpec[]): void {
    this.stations = stations;
    this.reset();
  }

  public setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    this.reset();
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public forcePosition(positionM: number, speedMs: number = C.CRUISE_SPEED_MS): void {
    this.enabled = true; this.active = true; this.mode = 'cruise';
    this.positionM = positionM; this.speedMs = speedMs;
    this.doorsOpen = false; this.doorSide = null;
    this.nextStationIndex = this.findNextStationIndexAfter(positionM);
  }

  public reset(): void {
    this.warningCooldownSec = 0; this.doorsOpen = false; this.doorSide = null;
    this.dwellRemainingSec = 0; this.departHoldSec = 0;
    this.distanceAheadM = null; this.blocksAhead = null;
    if (!this.enabled || this.stations.length === 0) {
      this.active = false; this.mode = 'cruise'; this.positionM = 0; this.speedMs = 0; this.nextStationIndex = 0;
      return;
    }
    this.spawnInitialLeadingTrain();
  }

  public step(
    playerPosM: number, playerSpeedKmh: number, signals: readonly ISemaphoreState[], dtSec: number,
  ): ILeadingTrainStepResult {
    if (!this.enabled || !this.active) {
      this.distanceAheadM = null; this.blocksAhead = null;
      return { headwayWarningTriggeredNow: false };
    }
    this.warningCooldownSec = Math.max(0, this.warningCooldownSec - dtSec);
    this.advanceMotion(dtSec);
    this.checkTerminusDespawn();
    return this.evaluateHeadway(playerPosM, playerSpeedKmh, signals);
  }

  public getState(): ILeadingTrainState {
    return {
      active: this.active, mode: this.mode,
      stationIndex: this.active && this.nextStationIndex < this.stations.length ? this.nextStationIndex : null,
      positionM: this.positionM, speedMs: this.speedMs, speedKmh: this.speedMs * 3.6,
      modelId: this.modelId, doorsOpen: this.doorsOpen, doorSide: this.doorSide,
      headlightsOn: this.active, delayed: true,
      distanceAheadM: this.distanceAheadM, blocksAhead: this.blocksAhead,
    };
  }

  private spawnInitialLeadingTrain(): void {
    this.active = true; this.mode = 'cruise';
    this.modelId = pickRandomTrafficModel(this.rng);
    const lastDist = this.stations[this.stations.length - 1].distanceM;
    this.positionM = Math.max(460, Math.min(C.INITIAL_SPAWN_M, lastDist - 240));
    this.speedMs = C.CRUISE_SPEED_MS;
    this.nextStationIndex = this.findNextStationIndexAfter(this.positionM);
    this.distanceAheadM = this.positionM;
    this.blocksAhead = Math.max(1, Math.round(this.positionM / 280));
  }

  private findNextStationIndexAfter(posM: number): number {
    for (let i = 0; i < this.stations.length; i += 1) {
      if (this.stations[i].distanceM >= posM - 2) return i;
    }
    return this.stations.length;
  }

  private advanceMotion(dtSec: number): void {
    if (this.mode === 'cruise') { this.advanceCruise(dtSec); return; }
    if (this.mode === 'station-arriving') { this.advanceArriving(dtSec); return; }
    if (this.mode === 'station-dwelling') { this.advanceDwelling(dtSec); return; }
    this.advanceDeparting(dtSec);
  }

  private advanceCruise(dtSec: number): void {
    this.speedMs = Math.min(C.CRUISE_SPEED_MS, this.speedMs + C.ACCEL_MS2 * dtSec);
    this.positionM += this.speedMs * dtSec;
    const st = this.stations[this.nextStationIndex];
    if (st && st.distanceM - this.positionM <= C.APPROACH_DIST_M) {
      this.mode = 'station-arriving';
      this.doorSide = getStationPlatformSide(st);
    }
  }

  private advanceArriving(dtSec: number): void {
    const st = this.stations[this.nextStationIndex];
    if (!st) { this.mode = 'cruise'; return; }
    const remaining = Math.max(0, st.distanceM - this.positionM);
    const desired = Math.min(C.CRUISE_SPEED_MS, Math.sqrt(2 * C.BRAKE_DECEL_MS2 * remaining));
    this.speedMs = Math.max(0, Math.min(this.speedMs, desired));
    this.positionM += this.speedMs * dtSec;
    if (remaining <= 0.2 || this.speedMs <= 0.12) {
      this.positionM = st.distanceM; this.speedMs = 0;
      this.mode = 'station-dwelling'; this.doorsOpen = true;
      this.dwellRemainingSec = C.DWELL_MIN_SEC + this.rng() * C.DWELL_RANGE_SEC;
    }
  }

  private advanceDwelling(dtSec: number): void {
    this.speedMs = 0;
    this.dwellRemainingSec -= dtSec;
    if (this.dwellRemainingSec <= 0) {
      this.mode = 'station-departing'; this.doorsOpen = false;
      this.departHoldSec = C.DOOR_HOLD_SEC; this.nextStationIndex += 1;
    }
  }

  private advanceDeparting(dtSec: number): void {
    if (this.departHoldSec > 0) { this.departHoldSec = Math.max(0, this.departHoldSec - dtSec); return; }
    this.speedMs = Math.min(C.CRUISE_SPEED_MS, this.speedMs + C.ACCEL_MS2 * dtSec);
    this.positionM += this.speedMs * dtSec;
    if (this.speedMs >= C.CRUISE_SPEED_MS - 0.15) this.mode = 'cruise';
  }

  private checkTerminusDespawn(): void {
    const lastDist = this.stations[this.stations.length - 1]?.distanceM ?? 0;
    if (this.positionM > lastDist + 160) { this.active = false; this.speedMs = 0; }
  }

  private evaluateHeadway(
    playerPosM: number, playerSpeedKmh: number, signals: readonly ISemaphoreState[],
  ): ILeadingTrainStepResult {
    if (!this.active) { this.distanceAheadM = null; this.blocksAhead = null; return { headwayWarningTriggeredNow: false }; }
    const dist = Math.max(0, this.positionM - playerPosM);
    let blocks = 0;
    for (let i = 0; i < signals.length; i += 1) {
      if (signals[i].distanceM > playerPosM && signals[i].distanceM <= this.positionM) blocks += 1;
    }
    this.distanceAheadM = dist;
    this.blocksAhead = blocks;
    const shouldWarn = this.warningCooldownSec <= 0 && dist > 15 && dist <= C.WARNING_DIST_M
      && blocks <= C.WARNING_BLOCKS && playerSpeedKmh >= C.WARNING_MIN_SPEED_KMH;
    if (shouldWarn) this.warningCooldownSec = C.WARNING_COOLDOWN_SEC;
    return { headwayWarningTriggeredNow: shouldWarn };
  }
}
