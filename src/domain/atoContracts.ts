import type {
  AtoStatus,
  DoorFaultPhase,
  DoorSide,
  DoorState,
  GameModeId,
  ISemaphoreProgress,
  IStationProgress,
  ITrackworkZone,
} from './types';

export interface IAtoContext {
  readonly speedKmh: number;
  readonly speedLimitKmh: number;
  readonly gradePercent: number;
  readonly nextSignal: ISemaphoreProgress | null;
  readonly upcomingCurveLimitKmh: number | null;
  readonly upcomingCurveDistanceM: number | null;
  readonly upcomingTrackworkDistanceM: number | null;
  readonly activeTrackworkZone: ITrackworkZone | null;
  readonly currentStation: IStationProgress;
  readonly expectedPlatformSide: DoorSide;
  readonly doorState: DoorState;
  readonly openDoorSide: DoorSide | null;
  readonly canToggleDoors: boolean;
  readonly boardingCompletedForCurrent: boolean;
  readonly doorFaultPhase: DoorFaultPhase;
  readonly czuwakActive: boolean;
  readonly radioActive: boolean;
  readonly headlightsOn: boolean;
  readonly rainIntensity: number;
  readonly wipersOn: boolean;
  readonly skipStations: boolean;
  readonly isEveningOrTunnel: boolean;
}

export interface IAtoCommand {
  readonly leverAxis: number;
  readonly toggleDoorsLeft: boolean;
  readonly toggleDoorsRight: boolean;
  readonly acknowledgeCzuwak: boolean;
  readonly acknowledgeRadio: boolean;
  readonly toggleWipers: boolean;
  readonly toggleHeadlights: boolean;
  readonly status: AtoStatus;
}

export interface IAtoController {
  reset(): void;
  computeControl(ctx: IAtoContext): IAtoCommand;
}

export function canEnableAtoForMode(mode: GameModeId): boolean {
  return mode === 'sandbox' || mode === 'passenger';
}

export function computeKinematicTargetKmh(
  endSpeedKmh: number,
  distanceM: number,
  decelMs2: number,
): number {
  if (distanceM <= 0) return endSpeedKmh;
  const vEndMs = endSpeedKmh / 3.6;
  return Math.sqrt(vEndMs * vEndMs + 2 * decelMs2 * distanceM) * 3.6;
}
