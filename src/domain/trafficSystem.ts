import { getStationPlatformSide } from './trackGeometry';
import type {
  DoorSide,
  IOncomingTrainState,
  IStationSpec,
  OncomingTrainMode,
  TrainModelId,
} from './types';

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

const SPAWN_MIN_INTERVAL_SEC = 40;
const SPAWN_MAX_INTERVAL_SEC = 70;
const SPAWN_AHEAD_DIST_M = 270;
const DESPAWN_BEHIND_DIST_M = 125;
const WHOOSH_TRIGGER_DIST_M = 20;

const STATION_ENCOUNTER_PROBABILITY = 0.35;
const STATION_TRIGGER_MIN_AHEAD_M = 35;
const STATION_TRIGGER_MAX_AHEAD_M = 235;
const STATION_STOP_OFFSET_M = 68;
const STATION_ARRIVAL_START_OFFSET_M = 58;
const AI_BRAKE_DECEL_MS2 = 1.05;
const AI_DEPART_ACCEL_MS2 = 1.25;
const AI_CRUISE_MAX_SPEED_MS = 22.0;
const DOOR_CLOSE_LEAD_SEC = 1.0;

export class OppositeTrackTrafficSystem implements ITrafficController {
  private readonly rng: () => number;
  private stations: readonly IStationSpec[] = [];
  private readonly rolledStationIds = new Set<number>();
  private spawnMinSec = SPAWN_MIN_INTERVAL_SEC;
  private spawnMaxSec = SPAWN_MAX_INTERVAL_SEC;
  private nextSpawnCountdownSec = 45;

  private active = false;
  private mode: OncomingTrainMode = 'cruise';
  private stationIndex: number | null = null;
  private targetStopPosM = 0;
  private positionM = 0;
  private speedMs = 21;
  private cruiseTargetSpeedMs = 21;
  private modelId: TrainModelId = 'inspiro';
  private doorsOpen = false;
  private doorSide: DoorSide | null = null;
  private headlightsOn = true;
  private dwellRemainingSec = 0;
  private departHoldSec = 0;
  private whooshTriggeredForPass = false;

  public constructor(
    rng: () => number = Math.random,
    stations: readonly IStationSpec[] = [],
  ) {
    this.rng = rng;
    this.stations = stations;
    this.reset();
  }

  public setStations(stations: readonly IStationSpec[]): void {
    this.stations = stations;
    this.rolledStationIds.clear();
  }

  public setSpawnIntervalRange(minSec: number, maxSec: number): void {
    this.spawnMinSec = Math.max(10, minSec);
    this.spawnMaxSec = Math.max(this.spawnMinSec, maxSec);
    this.reset();
  }

  public forceSpawnAhead(playerPositionM: number): void {
    this.spawnCruiseAhead(playerPositionM);
    this.positionM = playerPositionM + 200;
  }

  public forceSpawnAtStation(
    station: IStationSpec,
    stationIndex: number,
    arriving = false,
  ): void {
    this.rolledStationIds.add(station.id);
    this.spawnStationTrain(station, stationIndex, arriving);
  }

  public reset(): void {
    this.active = false;
    this.mode = 'cruise';
    this.stationIndex = null;
    this.positionM = 0;
    this.speedMs = 21;
    this.doorsOpen = false;
    this.doorSide = null;
    this.headlightsOn = true;
    this.dwellRemainingSec = 0;
    this.departHoldSec = 0;
    this.whooshTriggeredForPass = false;
    this.rolledStationIds.clear();
    this.nextSpawnCountdownSec = this.rollNextInterval();
  }

  public step(playerPositionM: number, dtSec: number): ITrafficStepResult {
    if (!this.active) {
      if (this.tryTriggerStationEncounter(playerPositionM)) {
        return { passingTrainWhoosh: false };
      }
      this.nextSpawnCountdownSec -= dtSec;
      if (this.nextSpawnCountdownSec <= 0) {
        this.spawnCruiseAhead(playerPositionM);
      }
      return { passingTrainWhoosh: false };
    }

    const prevDist = this.positionM - playerPositionM;
    this.advanceActiveTrain(dtSec);
    const nextDist = this.positionM - playerPositionM;

    let whoosh = false;
    if (
      !this.whooshTriggeredForPass &&
      this.speedMs > 5 &&
      prevDist > WHOOSH_TRIGGER_DIST_M &&
      nextDist <= WHOOSH_TRIGGER_DIST_M
    ) {
      this.whooshTriggeredForPass = true;
      whoosh = true;
    }

    if (nextDist < -DESPAWN_BEHIND_DIST_M) {
      this.active = false;
      this.mode = 'cruise';
      this.stationIndex = null;
      this.doorsOpen = false;
      this.doorSide = null;
      this.nextSpawnCountdownSec = this.rollNextInterval();
    }
    return { passingTrainWhoosh: whoosh };
  }

  public getState(): IOncomingTrainState {
    return {
      active: this.active,
      mode: this.mode,
      stationIndex: this.stationIndex,
      positionM: this.positionM,
      speedMs: this.speedMs,
      modelId: this.modelId,
      doorsOpen: this.doorsOpen,
      doorSide: this.doorSide,
      headlightsOn: this.headlightsOn,
    };
  }

  private tryTriggerStationEncounter(playerPositionM: number): boolean {
    for (let i = 0; i < this.stations.length; i += 1) {
      const st = this.stations[i];
      if (this.rolledStationIds.has(st.id)) {
        continue;
      }
      const distAhead = st.distanceM - playerPositionM;
      if (distAhead >= STATION_TRIGGER_MIN_AHEAD_M && distAhead <= STATION_TRIGGER_MAX_AHEAD_M) {
        this.rolledStationIds.add(st.id);
        if (this.rng() < STATION_ENCOUNTER_PROBABILITY) {
          const arriving = this.rng() < 0.5;
          this.spawnStationTrain(st, i, arriving);
          return true;
        }
      }
    }
    return false;
  }

  private spawnStationTrain(
    station: IStationSpec,
    stationIndex: number,
    arriving: boolean,
  ): void {
    const stopPosM = station.distanceM - STATION_STOP_OFFSET_M;
    this.active = true;
    this.stationIndex = stationIndex;
    this.targetStopPosM = stopPosM;
    this.modelId = this.rng() < 0.5 ? 'seria81' : 'inspiro';
    this.doorSide = getStationPlatformSide(station);
    this.cruiseTargetSpeedMs = 19 + this.rng() * 4.5;
    this.dwellRemainingSec = 4.5 + this.rng() * 2.0;
    this.departHoldSec = DOOR_CLOSE_LEAD_SEC;
    this.whooshTriggeredForPass = false;

    if (arriving) {
      this.mode = 'station-arriving';
      this.positionM = station.distanceM + STATION_ARRIVAL_START_OFFSET_M;
      this.speedMs = 14.5;
      this.doorsOpen = false;
      this.headlightsOn = true;
    } else {
      this.mode = 'station-dwelling';
      this.positionM = stopPosM;
      this.speedMs = 0;
      this.doorsOpen = true;
      this.headlightsOn = false;
    }
  }

  private advanceActiveTrain(dtSec: number): void {
    if (this.mode === 'cruise') {
      this.positionM -= this.speedMs * dtSec;
      return;
    }

    if (this.mode === 'station-arriving') {
      const remainingM = Math.max(0, this.positionM - this.targetStopPosM);
      const desiredSpeed = Math.min(
        15.0,
        Math.sqrt(2 * AI_BRAKE_DECEL_MS2 * remainingM),
      );
      this.speedMs = Math.max(0, Math.min(this.speedMs, desiredSpeed));
      this.positionM -= this.speedMs * dtSec;
      if (this.positionM <= this.targetStopPosM + 0.15 || this.speedMs <= 0.12) {
        this.positionM = this.targetStopPosM;
        this.speedMs = 0;
        this.mode = 'station-dwelling';
        this.doorsOpen = true;
        this.headlightsOn = false;
      }
      return;
    }

    if (this.mode === 'station-dwelling') {
      this.speedMs = 0;
      this.dwellRemainingSec -= dtSec;
      if (this.dwellRemainingSec <= 0) {
        this.mode = 'station-departing';
        this.doorsOpen = false;
        this.headlightsOn = true;
        this.departHoldSec = DOOR_CLOSE_LEAD_SEC;
      }
      return;
    }

    // station-departing: wait briefly for doors to finish closing, then smoothly accelerate out
    if (this.departHoldSec > 0) {
      this.departHoldSec = Math.max(0, this.departHoldSec - dtSec);
      return;
    }
    this.speedMs = Math.min(
      Math.min(AI_CRUISE_MAX_SPEED_MS, this.cruiseTargetSpeedMs),
      this.speedMs + AI_DEPART_ACCEL_MS2 * dtSec,
    );
    this.positionM -= this.speedMs * dtSec;
  }

  private spawnCruiseAhead(playerPositionM: number): void {
    this.active = true;
    this.mode = 'cruise';
    this.stationIndex = null;
    this.positionM = playerPositionM + SPAWN_AHEAD_DIST_M;
    this.speedMs = 19 + this.rng() * 5.5;
    this.cruiseTargetSpeedMs = this.speedMs;
    this.modelId = this.rng() < 0.5 ? 'seria81' : 'inspiro';
    this.doorsOpen = false;
    this.doorSide = null;
    this.headlightsOn = true;
    this.whooshTriggeredForPass = false;
  }

  private rollNextInterval(): number {
    return this.spawnMinSec + this.rng() * (this.spawnMaxSec - this.spawnMinSec);
  }
}
