import { getStationPlatformSide } from './trackGeometry';
import type { DoorSide, IOncomingTrainState, IStationSpec, OncomingTrainMode, TrainModelId } from './types';
import {
  TRAFFIC_CONSTANTS as C,
  pickRandomTrafficModel,
  type ITrafficController,
  type ITrafficStepResult,
} from './trafficContracts';

export type { ITrafficController, ITrafficStepResult };

export class OppositeTrackTrafficSystem implements ITrafficController {
  private readonly rng: () => number;
  private stations: readonly IStationSpec[] = [];
  private readonly rolledStationIds = new Set<number>();
  private spawnMinSec: number = C.SPAWN_MIN_INTERVAL_SEC;
  private spawnMaxSec: number = C.SPAWN_MAX_INTERVAL_SEC;
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

  public constructor(rng: () => number = Math.random, stations: readonly IStationSpec[] = []) {
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

  public forceSpawnAtStation(station: IStationSpec, stationIndex: number, arriving = false): void {
    this.rolledStationIds.add(station.id);
    this.spawnStationTrain(station, stationIndex, arriving);
  }

  public reset(): void {
    this.active = false; this.mode = 'cruise'; this.stationIndex = null;
    this.positionM = 0; this.speedMs = 21; this.doorsOpen = false;
    this.doorSide = null; this.headlightsOn = true; this.dwellRemainingSec = 0;
    this.departHoldSec = 0; this.whooshTriggeredForPass = false;
    this.rolledStationIds.clear();
    this.nextSpawnCountdownSec = this.rollNextInterval();
  }

  public step(playerPositionM: number, dtSec: number): ITrafficStepResult {
    if (!this.active) {
      this.stepIdleSpawn(playerPositionM, dtSec);
      return { passingTrainWhoosh: false };
    }
    const prevDist = this.positionM - playerPositionM;
    this.advanceActiveTrain(dtSec);
    const nextDist = this.positionM - playerPositionM;
    const whoosh = this.checkPassWhoosh(prevDist, nextDist);
    if (nextDist < -C.DESPAWN_BEHIND_DIST_M) this.despawnTrain();
    return { passingTrainWhoosh: whoosh };
  }

  public getState(): IOncomingTrainState {
    return {
      active: this.active, mode: this.mode, stationIndex: this.stationIndex,
      positionM: this.positionM, speedMs: this.speedMs, modelId: this.modelId,
      doorsOpen: this.doorsOpen, doorSide: this.doorSide, headlightsOn: this.headlightsOn,
    };
  }

  private stepIdleSpawn(playerPositionM: number, dtSec: number): void {
    if (this.tryTriggerStationEncounter(playerPositionM)) return;
    this.nextSpawnCountdownSec -= dtSec;
    if (this.nextSpawnCountdownSec <= 0) this.spawnCruiseAhead(playerPositionM);
  }

  private checkPassWhoosh(prevDist: number, nextDist: number): boolean {
    if (this.whooshTriggeredForPass || this.speedMs <= 5) return false;
    if (prevDist > C.WHOOSH_TRIGGER_DIST_M && nextDist <= C.WHOOSH_TRIGGER_DIST_M) {
      this.whooshTriggeredForPass = true;
      return true;
    }
    return false;
  }

  private despawnTrain(): void {
    this.active = false; this.mode = 'cruise'; this.stationIndex = null;
    this.doorsOpen = false; this.doorSide = null; this.nextSpawnCountdownSec = this.rollNextInterval();
  }

  private tryTriggerStationEncounter(playerPositionM: number): boolean {
    for (let i = 0; i < this.stations.length; i += 1) {
      const st = this.stations[i];
      if (this.rolledStationIds.has(st.id)) continue;
      const distAhead = st.distanceM - playerPositionM;
      if (distAhead >= C.STATION_TRIGGER_MIN_AHEAD_M && distAhead <= C.STATION_TRIGGER_MAX_AHEAD_M) {
        this.rolledStationIds.add(st.id);
        if (this.rng() < C.STATION_ENCOUNTER_PROBABILITY) {
          this.spawnStationTrain(st, i, this.rng() < 0.5);
          return true;
        }
      }
    }
    return false;
  }

  private spawnStationTrain(station: IStationSpec, stationIndex: number, arriving: boolean): void {
    const stopPosM = station.distanceM - C.STATION_STOP_OFFSET_M;
    this.active = true; this.stationIndex = stationIndex; this.targetStopPosM = stopPosM;
    this.modelId = pickRandomTrafficModel(this.rng); this.doorSide = getStationPlatformSide(station);
    this.cruiseTargetSpeedMs = 19 + this.rng() * 4.5; this.dwellRemainingSec = 4.5 + this.rng() * 2.0;
    this.departHoldSec = C.DOOR_CLOSE_LEAD_SEC; this.whooshTriggeredForPass = false;
    this.mode = arriving ? 'station-arriving' : 'station-dwelling';
    this.positionM = arriving ? station.distanceM + C.STATION_ARRIVAL_START_OFFSET_M : stopPosM;
    this.speedMs = arriving ? 14.5 : 0; this.doorsOpen = !arriving; this.headlightsOn = arriving;
  }

  private advanceActiveTrain(dtSec: number): void {
    if (this.mode === 'cruise') { this.positionM -= this.speedMs * dtSec; return; }
    if (this.mode === 'station-arriving') { this.advanceArriving(dtSec); return; }
    if (this.mode === 'station-dwelling') { this.advanceDwelling(dtSec); return; }
    this.advanceDeparting(dtSec);
  }

  private advanceArriving(dtSec: number): void {
    const remainingM = Math.max(0, this.positionM - this.targetStopPosM);
    const desiredSpeed = Math.min(15.0, Math.sqrt(2 * C.AI_BRAKE_DECEL_MS2 * remainingM));
    this.speedMs = Math.max(0, Math.min(this.speedMs, desiredSpeed));
    this.positionM -= this.speedMs * dtSec;
    if (this.positionM <= this.targetStopPosM + 0.15 || this.speedMs <= 0.12) {
      this.positionM = this.targetStopPosM;
      this.speedMs = 0;
      this.mode = 'station-dwelling';
      this.doorsOpen = true;
      this.headlightsOn = false;
    }
  }

  private advanceDwelling(dtSec: number): void {
    this.speedMs = 0;
    this.dwellRemainingSec -= dtSec;
    if (this.dwellRemainingSec <= 0) {
      this.mode = 'station-departing';
      this.doorsOpen = false;
      this.headlightsOn = true;
      this.departHoldSec = C.DOOR_CLOSE_LEAD_SEC;
    }
  }

  private advanceDeparting(dtSec: number): void {
    if (this.departHoldSec > 0) {
      this.departHoldSec = Math.max(0, this.departHoldSec - dtSec);
      return;
    }
    const maxSpeed = Math.min(C.AI_CRUISE_MAX_SPEED_MS, this.cruiseTargetSpeedMs);
    this.speedMs = Math.min(maxSpeed, this.speedMs + C.AI_DEPART_ACCEL_MS2 * dtSec);
    this.positionM -= this.speedMs * dtSec;
  }

  private spawnCruiseAhead(playerPositionM: number): void {
    this.active = true; this.mode = 'cruise'; this.stationIndex = null;
    this.positionM = playerPositionM + C.SPAWN_AHEAD_DIST_M;
    this.speedMs = 19 + this.rng() * 5.5; this.cruiseTargetSpeedMs = this.speedMs;
    this.modelId = pickRandomTrafficModel(this.rng);
    this.doorsOpen = false; this.doorSide = null;
    this.headlightsOn = true; this.whooshTriggeredForPass = false;
  }

  private rollNextInterval(): number {
    return this.spawnMinSec + this.rng() * (this.spawnMaxSec - this.spawnMinSec);
  }
}
