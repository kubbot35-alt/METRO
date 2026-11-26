import { LINE_M1_STATIONS } from './routeData';
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

export interface IIncidentController {
  setStations?(stations: readonly IStationSpec[]): void;
  setEnabled?(enabled: boolean): void;
  reset(): void;
  step(
    positionM: number,
    speedKmh: number,
    doorsOpen: boolean,
    ackCzuwakPressed: boolean,
    dtSec: number,
  ): IIncidentStepResult;
  attemptDoorClose(stationIndex: number): IDoorCloseAttemptResult;
  getTrackworkZones(): readonly ITrackworkZone[];
  getActiveTrackworkZone(positionM: number): ITrackworkZone | null;
  getUpcomingTrackworkDistance(positionM: number): number | null;
  getDoorFaultState(): IDoorFaultState;
  getCzuwakState(): ICzuwakState;
}

const TRACKWORK_LIMIT_KMH = 25;
const TRACKWORK_LENGTH_M = 200;
const TRACKWORK_WARN_AHEAD_M = 135;
const DOOR_FAULT_PROBABILITY = 0.28;
const DOOR_FAULT_RESET_SEC = 3.0;
const CZUWAK_MIN_INTERVAL_SEC = 40;
const CZUWAK_MAX_INTERVAL_SEC = 60;
const CZUWAK_RESPONSE_WINDOW_SEC = 4.0;
const CZUWAK_ACTIVE_SPEED_KMH = 5.0;

export class MetroIncidentSystem implements IIncidentController {
  private stations: readonly IStationSpec[];
  private readonly rng: () => number;
  private enabled = true;
  private trackworkZones: ITrackworkZone[] = [];
  private warnedZoneIds = new Set<number>();
  private faultedStationIndices = new Set<number>();
  private doorFaultPhase: IDoorFaultState['phase'] = 'none';
  private doorFaultRemainingSec = 0;
  private czuwakCountdownSec = 45;
  private czuwakActive = false;
  private czuwakRemainingSec = 0;

  public constructor(
    stations: readonly IStationSpec[] = LINE_M1_STATIONS,
    rng: () => number = Math.random,
  ) {
    this.stations = stations;
    this.rng = rng;
    this.reset();
  }

  public setStations(stations: readonly IStationSpec[]): void {
    this.stations = stations;
    this.reset();
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.reset();
  }

  public reset(): void {
    this.warnedZoneIds.clear();
    this.faultedStationIndices.clear();
    this.doorFaultPhase = 'none';
    this.doorFaultRemainingSec = 0;
    this.czuwakActive = false;
    this.czuwakRemainingSec = 0;
    this.czuwakCountdownSec = this.rollNextCzuwakInterval();
    this.trackworkZones = this.enabled ? this.generateTrackworkZones() : [];
  }

  public step(
    positionM: number,
    speedKmh: number,
    doorsOpen: boolean,
    ackCzuwakPressed: boolean,
    dtSec: number,
  ): IIncidentStepResult {
    if (!this.enabled) {
      return {
        czuwakAlertTriggered: false,
        czuwakAckChime: false,
        czuwakTimedOut: false,
        doorFaultResolvedClose: false,
        enteredTrackworkWarning: null,
      };
    }
    const doorFaultResolvedClose = this.stepDoorFault(doorsOpen, dtSec);
    const czuwakRes = this.stepCzuwak(speedKmh, doorsOpen, ackCzuwakPressed, dtSec);
    const enteredTrackworkWarning = this.checkTrackworkApproach(positionM);
    return {
      czuwakAlertTriggered: czuwakRes.alerted,
      czuwakAckChime: czuwakRes.acknowledged,
      czuwakTimedOut: czuwakRes.timedOut,
      doorFaultResolvedClose,
      enteredTrackworkWarning,
    };
  }

  public attemptDoorClose(stationIndex: number): IDoorCloseAttemptResult {
    if (!this.enabled) {
      return { allowedToCloseNow: true, faultTriggered: false, retryStarted: false };
    }
    if (this.doorFaultPhase === 'awaiting-retry') {
      this.doorFaultPhase = 'resetting';
      this.doorFaultRemainingSec = DOOR_FAULT_RESET_SEC;
      return { allowedToCloseNow: false, faultTriggered: false, retryStarted: true };
    }
    if (this.doorFaultPhase === 'resetting') {
      return { allowedToCloseNow: false, faultTriggered: false, retryStarted: false };
    }
    if (!this.faultedStationIndices.has(stationIndex) && this.rng() < DOOR_FAULT_PROBABILITY) {
      this.faultedStationIndices.add(stationIndex);
      this.doorFaultPhase = 'awaiting-retry';
      this.doorFaultRemainingSec = DOOR_FAULT_RESET_SEC;
      return { allowedToCloseNow: false, faultTriggered: true, retryStarted: false };
    }
    return { allowedToCloseNow: true, faultTriggered: false, retryStarted: false };
  }

  public getTrackworkZones(): readonly ITrackworkZone[] {
    return this.trackworkZones;
  }

  public getActiveTrackworkZone(positionM: number): ITrackworkZone | null {
    for (let i = 0; i < this.trackworkZones.length; i += 1) {
      const zone = this.trackworkZones[i];
      if (positionM >= zone.startM && positionM <= zone.endM) {
        return zone;
      }
    }
    return null;
  }

  public getUpcomingTrackworkDistance(positionM: number): number | null {
    for (let i = 0; i < this.trackworkZones.length; i += 1) {
      const dist = this.trackworkZones[i].startM - positionM;
      if (dist > 0 && dist <= TRACKWORK_WARN_AHEAD_M) {
        return dist;
      }
    }
    return null;
  }

  public getDoorFaultState(): IDoorFaultState {
    return { phase: this.doorFaultPhase, remainingSec: this.doorFaultRemainingSec };
  }

  public getCzuwakState(): ICzuwakState {
    return {
      active: this.czuwakActive,
      remainingSec: this.czuwakRemainingSec,
      maxWindowSec: CZUWAK_RESPONSE_WINDOW_SEC,
    };
  }

  private generateTrackworkZones(): ITrackworkZone[] {
    if (this.stations.length < 2) {
      return [];
    }
    const candidates: number[] = [];
    for (let i = 1; i < this.stations.length; i += 1) {
      candidates.push(i);
    }
    const picked = new Set<number>();
    const firstPick = candidates[Math.floor(this.rng() * Math.min(3, candidates.length))];
    if (firstPick !== undefined) {
      picked.add(firstPick);
    }
    candidates.forEach((idx) => {
      if (!picked.has(idx) && !picked.has(idx - 1) && picked.size < 3 && this.rng() < 0.28) {
        picked.add(idx);
      }
    });
    return Array.from(picked)
      .sort((a, b) => a - b)
      .map((stationIdx, idIdx) => {
        const startM = this.stations[stationIdx].distanceM - 445;
        return {
          id: idIdx + 1,
          startM,
          endM: startM + TRACKWORK_LENGTH_M,
          limitKmh: TRACKWORK_LIMIT_KMH,
        };
      });
  }

  private stepDoorFault(doorsOpen: boolean, dtSec: number): boolean {
    if (!doorsOpen || this.doorFaultPhase !== 'resetting') {
      return false;
    }
    this.doorFaultRemainingSec = Math.max(0, this.doorFaultRemainingSec - dtSec);
    if (this.doorFaultRemainingSec <= 0) {
      this.doorFaultPhase = 'none';
      return true;
    }
    return false;
  }

  private stepCzuwak(
    speedKmh: number,
    doorsOpen: boolean,
    ackPressed: boolean,
    dtSec: number,
  ): { alerted: boolean; acknowledged: boolean; timedOut: boolean } {
    if (this.czuwakActive) {
      if (ackPressed) {
        this.czuwakActive = false;
        this.czuwakRemainingSec = 0;
        this.czuwakCountdownSec = this.rollNextCzuwakInterval();
        return { alerted: false, acknowledged: true, timedOut: false };
      }
      this.czuwakRemainingSec = Math.max(0, this.czuwakRemainingSec - dtSec);
      if (this.czuwakRemainingSec <= 0) {
        this.czuwakActive = false;
        this.czuwakCountdownSec = this.rollNextCzuwakInterval();
        return { alerted: false, acknowledged: false, timedOut: true };
      }
      return { alerted: false, acknowledged: false, timedOut: false };
    }
    if (!doorsOpen && speedKmh >= CZUWAK_ACTIVE_SPEED_KMH) {
      this.czuwakCountdownSec -= dtSec;
      if (this.czuwakCountdownSec <= 0) {
        this.czuwakActive = true;
        this.czuwakRemainingSec = CZUWAK_RESPONSE_WINDOW_SEC;
        return { alerted: true, acknowledged: false, timedOut: false };
      }
    }
    return { alerted: false, acknowledged: false, timedOut: false };
  }

  private checkTrackworkApproach(positionM: number): ITrackworkZone | null {
    for (let i = 0; i < this.trackworkZones.length; i += 1) {
      const zone = this.trackworkZones[i];
      const dist = zone.startM - positionM;
      if (!this.warnedZoneIds.has(zone.id) && dist <= TRACKWORK_WARN_AHEAD_M && dist > -20) {
        this.warnedZoneIds.add(zone.id);
        return zone;
      }
    }
    return null;
  }

  private rollNextCzuwakInterval(): number {
    return (
      CZUWAK_MIN_INTERVAL_SEC +
      this.rng() * (CZUWAK_MAX_INTERVAL_SEC - CZUWAK_MIN_INTERVAL_SEC)
    );
  }
}
