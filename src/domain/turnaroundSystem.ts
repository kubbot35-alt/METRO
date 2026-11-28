import { buildSpeedZonesForStations } from './routeData';
import { compileRouteVariant } from './routeVariant';
import type { IMetroLineSpec, IStationSpec, ITurnaroundState, RouteDirection, TurnaroundPhase } from './types';

export const TURNAROUND_SIDING_LENGTH_M = 250;
export const TURNAROUND_SPEED_LIMIT_KMH = 20;
export const TURNAROUND_BUFFER_OFFSET_M = 240;
export const TURNAROUND_STOP_MIN_OFFSET_M = 155;
export const TURNAROUND_STOP_MAX_OFFSET_M = 236;
export const TURNAROUND_BUFFER_CLEARANCE_M = 3.5;
export const CAB_SWITCH_DURATION_SEC = 0.85;
export const RETURN_LEG_FIRST_STATION_M = 190;

export interface ITurnaroundStepResult {
  readonly bufferCollision: boolean;
  readonly clampedPositionM: number | null;
  readonly cabSwitchMidpointReached: boolean;
  readonly cabSwitchFinished: boolean;
}

export interface ITurnaroundController {
  reset(): void;
  setStations(stations: readonly IStationSpec[]): void;
  setCanEnterSiding(canEnter: boolean): void;
  enterSiding(): boolean;
  beginCabSwitch(): boolean;
  finishLegSwap(completedLegDistanceM: number): void;
  step(positionM: number, speedKmh: number, dtSec: number): ITurnaroundStepResult;
  getState(positionM: number): ITurnaroundState;
}

export function buildReturnLegLineSpec(
  baseLine: IMetroLineSpec,
  currentDirection: RouteDirection,
): { readonly spec: IMetroLineSpec; readonly nextDirection: RouteDirection } {
  const nextDirection: RouteDirection = currentDirection === 'normal' ? 'reverse' : 'normal';
  const compiled = compileRouteVariant(baseLine, nextDirection, 0);
  const firstDist = compiled.stations[0]?.distanceM ?? 600;
  const shiftM = Math.max(0, firstDist - RETURN_LEG_FIRST_STATION_M);
  const adjustedStations = compiled.stations.map((station) => ({
    ...station,
    distanceM: Math.max(RETURN_LEG_FIRST_STATION_M, station.distanceM - shiftM),
  }));
  const speedZones = buildSpeedZonesForStations(adjustedStations);
  return {
    nextDirection,
    spec: {
      ...compiled,
      hasSurfaceStart: false,
      tunnelPortalDistanceM: null,
      stations: adjustedStations,
      speedZones,
    },
  };
}

export class TerminusTurnaroundSystem implements ITurnaroundController {
  private phase: TurnaroundPhase = 'inactive';
  private canEnterSidingFlag = false;
  private sidingStartM = 3000;
  private bufferStopM = 3240;
  private switchTimerSec = 0;
  private midpointTriggered = false;
  private legsCompleted = 0;
  private cumulativeDistanceM = 0;

  public setStations(stations: readonly IStationSpec[]): void {
    const lastDist = stations[stations.length - 1]?.distanceM ?? 3000;
    this.sidingStartM = lastDist;
    this.bufferStopM = lastDist + TURNAROUND_BUFFER_OFFSET_M;
  }

  public reset(): void {
    this.phase = 'inactive';
    this.canEnterSidingFlag = false;
    this.switchTimerSec = 0;
    this.midpointTriggered = false;
    this.legsCompleted = 0;
    this.cumulativeDistanceM = 0;
  }

  public setCanEnterSiding(canEnter: boolean): void {
    this.canEnterSidingFlag = canEnter;
  }

  public enterSiding(): boolean {
    if (!this.canEnterSidingFlag) {
      return false;
    }
    this.phase = 'entering_siding';
    this.canEnterSidingFlag = false;
    this.switchTimerSec = 0;
    this.midpointTriggered = false;
    return true;
  }

  public beginCabSwitch(): boolean {
    if (this.phase !== 'ready_to_switch') {
      return false;
    }
    this.phase = 'switching_cab';
    this.switchTimerSec = 0;
    this.midpointTriggered = false;
    return true;
  }

  public finishLegSwap(completedLegDistanceM: number): void {
    this.legsCompleted += 1;
    this.cumulativeDistanceM += Math.max(0, completedLegDistanceM);
    this.canEnterSidingFlag = false;
  }

  public step(positionM: number, speedKmh: number, dtSec: number): ITurnaroundStepResult {
    if (this.phase === 'inactive') {
      return { bufferCollision: false, clampedPositionM: null, cabSwitchMidpointReached: false, cabSwitchFinished: false };
    }
    if (this.phase === 'switching_cab') {
      return this.stepCabSwitch(dtSec);
    }
    return this.stepSidingEntry(positionM, speedKmh);
  }

  public getState(positionM: number): ITurnaroundState {
    const distanceToBufferM = Math.max(0, this.bufferStopM - positionM);
    const switchProgress = this.phase === 'switching_cab' ? Math.min(1, this.switchTimerSec / CAB_SWITCH_DURATION_SEC) : 0;
    return {
      phase: this.phase,
      canEnterSiding: this.canEnterSidingFlag,
      sidingStartM: this.sidingStartM,
      bufferStopM: this.bufferStopM,
      distanceToBufferM,
      inStopZone: this.isInTurnaroundStopZone(positionM),
      maxSidingSpeedKmh: TURNAROUND_SPEED_LIMIT_KMH,
      switchProgress,
      legsCompleted: this.legsCompleted,
      cumulativeDistanceM: this.cumulativeDistanceM,
    };
  }

  private stepCabSwitch(dtSec: number): ITurnaroundStepResult {
    this.switchTimerSec += Math.max(0, dtSec);
    let midpointNow = false;
    if (!this.midpointTriggered && this.switchTimerSec >= CAB_SWITCH_DURATION_SEC * 0.5) {
      this.midpointTriggered = true;
      midpointNow = true;
    }
    const finished = this.switchTimerSec >= CAB_SWITCH_DURATION_SEC;
    if (finished) {
      this.phase = 'inactive';
      this.switchTimerSec = 0;
      this.midpointTriggered = false;
    }
    return { bufferCollision: false, clampedPositionM: null, cabSwitchMidpointReached: midpointNow, cabSwitchFinished: finished };
  }

  private stepSidingEntry(positionM: number, speedKmh: number): ITurnaroundStepResult {
    const maxAllowedPos = this.bufferStopM - TURNAROUND_BUFFER_CLEARANCE_M;
    const hitBuffer = positionM >= maxAllowedPos;
    const clampedPos = hitBuffer ? maxAllowedPos : null;
    const effectivePos = clampedPos ?? positionM;
    this.phase = this.isInTurnaroundStopZone(effectivePos) && speedKmh <= 0.35 ? 'ready_to_switch' : 'entering_siding';
    return { bufferCollision: hitBuffer && speedKmh > 1.2, clampedPositionM: clampedPos, cabSwitchMidpointReached: false, cabSwitchFinished: false };
  }

  private isInTurnaroundStopZone(positionM: number): boolean {
    const offset = positionM - this.sidingStartM;
    return offset >= TURNAROUND_STOP_MIN_OFFSET_M && offset <= TURNAROUND_STOP_MAX_OFFSET_M;
  }
}
