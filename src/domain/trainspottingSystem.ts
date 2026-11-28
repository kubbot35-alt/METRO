import { getStationPlatformSide } from './trackGeometry';
import type { DoorSide, IMetroLineSpec, IStationSpec } from './types';

export interface ITrainspottingSpot {
  readonly id: string;
  readonly stationIndex: number;
  readonly namePl: string;
  readonly nameEn: string;
  readonly distanceM: number;
  readonly platformSide: DoorSide;
  readonly isDepot: boolean;
}

export interface ITrainspottingState {
  readonly active: boolean;
  readonly spotId: string;
  readonly spotIndex: number;
  readonly stationNamePl: string;
  readonly stationNameEn: string;
  readonly baseDistanceM: number;
  readonly walkOffsetM: number;
  readonly platformSide: DoorSide;
  readonly isDepot: boolean;
}

export const TRAINSPOTTING_WALK_MIN_M = -52;
export const TRAINSPOTTING_WALK_MAX_M = 52;
export const TRAINSPOTTING_WALK_SPEED_MS = 6.8;

export function buildTrainspottingSpots(
  line: IMetroLineSpec,
  stations: readonly IStationSpec[],
): readonly ITrainspottingSpot[] {
  const spots: ITrainspottingSpot[] = [];
  if (line.hasSurfaceStart) {
    spots.push({
      id: 'stp_kabaty',
      stationIndex: -1,
      namePl: 'STP Kabaty (Zajezdnia i myjnia)',
      nameEn: 'STP Kabaty (Depot & train wash)',
      distanceM: -28,
      platformSide: 'right',
      isDepot: true,
    });
  }
  for (let i = 0; i < stations.length; i += 1) {
    const st = stations[i];
    spots.push({
      id: `st_${i}_${st.name.toLowerCase().replace(/\s+/g, '_')}`,
      stationIndex: i,
      namePl: st.name,
      nameEn: st.name,
      distanceM: st.distanceM,
      platformSide: getStationPlatformSide(st),
      isDepot: false,
    });
  }
  return spots;
}

export function pickDefaultTrainspottingSpotIndex(spots: readonly ITrainspottingSpot[]): number {
  const preferredNames = ['Centrum', 'Świętokrzyska', 'Politechnika', 'Rondo Daszyńskiego'];
  for (let p = 0; p < preferredNames.length; p += 1) {
    const idx = spots.findIndex((s) => s.namePl === preferredNames[p]);
    if (idx >= 0) return idx;
  }
  const firstStation = spots.findIndex((s) => !s.isDepot);
  return firstStation >= 0 ? firstStation : 0;
}

export function clampTrainspottingWalkOffset(offsetM: number): number {
  return Math.max(TRAINSPOTTING_WALK_MIN_M, Math.min(TRAINSPOTTING_WALK_MAX_M, offsetM));
}

export function buildTrainspottingState(
  active: boolean,
  spots: readonly ITrainspottingSpot[],
  spotIndex: number,
  walkOffsetM: number,
): ITrainspottingState {
  const safeIdx = Math.max(0, Math.min(Math.max(0, spots.length - 1), spotIndex));
  const spot = spots[safeIdx] ?? {
    id: 'st_0',
    stationIndex: 0,
    namePl: 'Kabaty',
    nameEn: 'Kabaty',
    distanceM: 600,
    platformSide: 'left' as DoorSide,
    isDepot: false,
  };
  return {
    active,
    spotId: spot.id,
    spotIndex: safeIdx,
    stationNamePl: spot.namePl,
    stationNameEn: spot.nameEn,
    baseDistanceM: spot.distanceM,
    walkOffsetM: clampTrainspottingWalkOffset(walkOffsetM),
    platformSide: spot.platformSide,
    isDepot: spot.isDepot,
  };
}
