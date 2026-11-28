import { getStationPlatformSide } from './trackGeometry';
import type {
  DoorSide,
  INightCrewCheckpoint,
  INightInspectionState,
  IStationSpec,
  NightCrewStatus,
} from './types';

export type NightCrewViolationReason = 'speed' | 'horn' | 'both' | null;

export interface INightInspectionStepResult {
  readonly clearedCheckpoint: INightCrewCheckpoint | null;
  readonly violatedCheckpoint: INightCrewCheckpoint | null;
  readonly violationReason: NightCrewViolationReason;
  readonly pointsDelta: number;
  readonly radioConfirmText: string | null;
}

export interface INightInspectionController {
  setStations(stations: readonly IStationSpec[]): void;
  setActive(active: boolean): void;
  reset(): void;
  step(positionM: number, speedKmh: number, hornActive: boolean): INightInspectionStepResult;
  getState(): INightInspectionState;
}

export const NIGHT_CREW_MAX_SPEED_KMH = 20;
export const NIGHT_CREW_SAFE_BONUS_PTS = 120;
export const NIGHT_CREW_VIOLATION_PENALTY_PTS = -90;

export interface IMutableCrewCheckpoint {
  readonly id: number;
  readonly distanceM: number;
  readonly side: DoorSide;
  readonly locationKind: 'tunnel' | 'station';
  readonly locationLabel: string;
  status: NightCrewStatus;
  hornSounded: boolean;
  maxPassSpeedKmh: number;
}

export function buildNightCrewCheckpoints(
  stations: readonly IStationSpec[],
  rng: () => number,
): IMutableCrewCheckpoint[] {
  const result: IMutableCrewCheckpoint[] = [];
  let nextId = 1;
  let lastDistM = 0;
  for (let i = 0; i < stations.length; i += 1) {
    const prevDist = i === 0 ? 0 : stations[i - 1].distanceM;
    const tunnelCrew = tryBuildTunnelCheckpoint(stations[i], prevDist, lastDistM, nextId, rng);
    if (tunnelCrew) {
      result.push(tunnelCrew);
      nextId += 1;
      lastDistM = tunnelCrew.distanceM;
    }
    const stationCrew = tryBuildStationCheckpoint(stations[i], i, stations.length, lastDistM, nextId, rng);
    if (stationCrew) {
      result.push(stationCrew);
      nextId += 1;
      lastDistM = stationCrew.distanceM;
    }
  }
  return result;
}

function tryBuildTunnelCheckpoint(
  station: IStationSpec,
  prevDist: number,
  lastDistM: number,
  id: number,
  rng: () => number,
): IMutableCrewCheckpoint | null {
  const segmentLen = station.distanceM - prevDist;
  if (segmentLen < 340) return null;
  const tunnelDistM = Math.round(prevDist + segmentLen * (0.42 + rng() * 0.18));
  if (tunnelDistM < 190 || tunnelDistM - lastDistM < 200) return null;
  return {
    id, distanceM: tunnelDistM, side: rng() < 0.5 ? 'left' : 'right',
    locationKind: 'tunnel', locationLabel: `Tunel przed ${station.name}`,
    status: 'upcoming', hornSounded: false, maxPassSpeedKmh: 0,
  };
}

function tryBuildStationCheckpoint(
  station: IStationSpec,
  idx: number,
  total: number,
  lastDistM: number,
  id: number,
  rng: () => number,
): IMutableCrewCheckpoint | null {
  const placeAtStation = idx % 2 === 0 || rng() < 0.45;
  const stationCrewDistM = Math.round(station.distanceM - 28);
  if (!placeAtStation || stationCrewDistM < 160 || stationCrewDistM - lastDistM < 190 || idx >= total - 1) {
    return null;
  }
  return {
    id, distanceM: stationCrewDistM, side: getStationPlatformSide(station),
    locationKind: 'station', locationLabel: `Stacja ${station.name}`,
    status: 'upcoming', hornSounded: false, maxPassSpeedKmh: 0,
  };
}
