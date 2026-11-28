import { LINE_M1_STATIONS } from './routeData';
import type { ICzuwakState, IDoorFaultState, IStationSpec, ITrackworkZone } from './types';
import {
  INCIDENT_LIMITS as L,
  generateTrackworkZones,
  type IDoorCloseAttemptResult,
  type IIncidentController,
  type IIncidentOverrides,
  type IIncidentStepResult,
} from './incidentCatalog';

export type { IDoorCloseAttemptResult, IIncidentController, IIncidentOverrides, IIncidentStepResult };

const IDLE_INCIDENT_STEP: IIncidentStepResult = {
  czuwakAlertTriggered: false, czuwakAckChime: false, czuwakTimedOut: false,
  doorFaultResolvedClose: false, enteredTrackworkWarning: null,
};

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
  private doorFaultProb: number = L.DOOR_FAULT_PROBABILITY;
  private czuwakMinSec: number = L.CZUWAK_MIN_INTERVAL_SEC;
  private czuwakMaxSec: number = L.CZUWAK_MAX_INTERVAL_SEC;
  private disableTrackwork = false;

  public constructor(stations: readonly IStationSpec[] = LINE_M1_STATIONS, rng: () => number = Math.random) {
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

  public configureOverrides(overrides: IIncidentOverrides): void {
    this.doorFaultProb = overrides.doorFaultProbability ?? L.DOOR_FAULT_PROBABILITY;
    this.czuwakMinSec = overrides.czuwakMinSec ?? L.CZUWAK_MIN_INTERVAL_SEC;
    this.czuwakMaxSec = overrides.czuwakMaxSec ?? L.CZUWAK_MAX_INTERVAL_SEC;
    this.disableTrackwork = Boolean(overrides.disableTrackwork);
    if (this.disableTrackwork) this.trackworkZones = [];
    this.czuwakCountdownSec = this.rollNextCzuwakInterval();
  }

  public forceTriggerCzuwak(windowSec = 12): boolean {
    if (this.czuwakActive) return false;
    this.czuwakActive = true;
    this.czuwakRemainingSec = Math.max(4, windowSec);
    return true;
  }

  public reset(): void {
    this.warnedZoneIds.clear();
    this.faultedStationIndices.clear();
    this.doorFaultPhase = 'none';
    this.doorFaultRemainingSec = 0;
    this.czuwakActive = false;
    this.czuwakRemainingSec = 0;
    this.czuwakCountdownSec = this.rollNextCzuwakInterval();
    this.trackworkZones = this.enabled && !this.disableTrackwork ? generateTrackworkZones(this.stations, this.rng) : [];
  }

  public step(
    positionM: number,
    speedKmh: number,
    doorsOpen: boolean,
    ackCzuwakPressed: boolean,
    dtSec: number,
  ): IIncidentStepResult {
    if (!this.enabled) return IDLE_INCIDENT_STEP;
    const doorFaultResolvedClose = this.stepDoorFault(doorsOpen, dtSec);
    const czuwakRes = this.stepCzuwak(speedKmh, doorsOpen, ackCzuwakPressed, dtSec);
    return {
      czuwakAlertTriggered: czuwakRes.alerted,
      czuwakAckChime: czuwakRes.acknowledged,
      czuwakTimedOut: czuwakRes.timedOut,
      doorFaultResolvedClose,
      enteredTrackworkWarning: this.checkTrackworkApproach(positionM),
    };
  }

  public attemptDoorClose(stationIndex: number, faultProbabilityScale = 1.0): IDoorCloseAttemptResult {
    if (!this.enabled) return { allowedToCloseNow: true, faultTriggered: false, retryStarted: false };
    if (this.doorFaultPhase === 'awaiting-retry') {
      this.doorFaultPhase = 'resetting';
      this.doorFaultRemainingSec = L.DOOR_FAULT_RESET_SEC;
      return { allowedToCloseNow: false, faultTriggered: false, retryStarted: true };
    }
    if (this.doorFaultPhase === 'resetting') {
      return { allowedToCloseNow: false, faultTriggered: false, retryStarted: false };
    }
    const effectiveProb = this.doorFaultProb * Math.max(0, Math.min(1, faultProbabilityScale));
    if (!this.faultedStationIndices.has(stationIndex) && this.rng() < effectiveProb) {
      this.faultedStationIndices.add(stationIndex);
      this.doorFaultPhase = 'awaiting-retry';
      this.doorFaultRemainingSec = L.DOOR_FAULT_RESET_SEC;
      return { allowedToCloseNow: false, faultTriggered: true, retryStarted: false };
    }
    return { allowedToCloseNow: true, faultTriggered: false, retryStarted: false };
  }

  public getTrackworkZones(): readonly ITrackworkZone[] { return this.trackworkZones; }
  public getActiveTrackworkZone(positionM: number): ITrackworkZone | null {
    return this.trackworkZones.find((z) => positionM >= z.startM && positionM <= z.endM) ?? null;
  }
  public getUpcomingTrackworkDistance(positionM: number): number | null {
    for (const z of this.trackworkZones) {
      const dist = z.startM - positionM;
      if (dist > 0 && dist <= L.TRACKWORK_WARN_AHEAD_M) return dist;
    }
    return null;
  }
  public getDoorFaultState(): IDoorFaultState { return { phase: this.doorFaultPhase, remainingSec: this.doorFaultRemainingSec }; }
  public getCzuwakState(): ICzuwakState {
    return { active: this.czuwakActive, remainingSec: this.czuwakRemainingSec, maxWindowSec: L.CZUWAK_RESPONSE_WINDOW_SEC };
  }

  private stepDoorFault(doorsOpen: boolean, dtSec: number): boolean {
    if (!doorsOpen || this.doorFaultPhase !== 'resetting') return false;
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
    if (this.czuwakActive) return this.stepActiveCzuwak(ackPressed, dtSec);
    if (!doorsOpen && speedKmh >= L.CZUWAK_ACTIVE_SPEED_KMH) {
      this.czuwakCountdownSec -= dtSec;
      if (this.czuwakCountdownSec <= 0) {
        this.czuwakActive = true;
        this.czuwakRemainingSec = L.CZUWAK_RESPONSE_WINDOW_SEC;
        return { alerted: true, acknowledged: false, timedOut: false };
      }
    }
    return { alerted: false, acknowledged: false, timedOut: false };
  }

  private stepActiveCzuwak(
    ackPressed: boolean,
    dtSec: number,
  ): { alerted: boolean; acknowledged: boolean; timedOut: boolean } {
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

  private checkTrackworkApproach(positionM: number): ITrackworkZone | null {
    for (const zone of this.trackworkZones) {
      const dist = zone.startM - positionM;
      if (!this.warnedZoneIds.has(zone.id) && dist <= L.TRACKWORK_WARN_AHEAD_M && dist > -20) {
        this.warnedZoneIds.add(zone.id);
        return zone;
      }
    }
    return null;
  }

  private rollNextCzuwakInterval(): number {
    return this.czuwakMinSec + this.rng() * (this.czuwakMaxSec - this.czuwakMinSec);
  }
}
