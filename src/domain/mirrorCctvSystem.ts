import type {
  CctvPreviewChannel,
  DoorSide,
  GraphicsQualityId,
  IStationSpec,
} from './types';

export type ResolvedCctvChannel = 'left' | 'right' | 'interior';

export interface IMirrorPerformancePolicy {
  readonly enabled: boolean;
  readonly updateEveryNFrames: number;
  readonly approxFpsLabel: string;
}

export interface IStationCameraResolution {
  readonly mode: 'station-ceiling' | 'tunnel-roof';
  readonly station: IStationSpec | null;
  readonly distanceToStationM: number | null;
}

export const STATION_CAMERA_MAX_RANGE_M = 135;

export function getMirrorUpdateInterval(
  quality: GraphicsQualityId,
  liveMirrorsEnabled: boolean,
): number {
  if (!liveMirrorsEnabled || quality === 'low') {
    return 0;
  }
  if (quality === 'medium') {
    return 4;
  }
  return 2;
}

export function getMirrorPerformancePolicy(
  quality: GraphicsQualityId,
  liveMirrorsEnabled: boolean,
): IMirrorPerformancePolicy {
  const interval = getMirrorUpdateInterval(quality, liveMirrorsEnabled);
  if (interval <= 0) {
    return {
      enabled: false,
      updateEveryNFrames: 0,
      approxFpsLabel: 'OFF',
    };
  }
  if (interval === 4) {
    return {
      enabled: true,
      updateEveryNFrames: 4,
      approxFpsLabel: '~15 FPS',
    };
  }
  return {
    enabled: true,
    updateEveryNFrames: 2,
    approxFpsLabel: '~30 FPS',
  };
}

export function shouldUpdateMirrorsOnFrame(
  frameIndex: number,
  quality: GraphicsQualityId,
  liveMirrorsEnabled: boolean,
): boolean {
  const interval = getMirrorUpdateInterval(quality, liveMirrorsEnabled);
  if (interval <= 0) {
    return false;
  }
  const safeIndex = Math.max(0, Math.floor(frameIndex));
  return safeIndex % interval === 0;
}

export function resolveCctvChannel(
  requested: CctvPreviewChannel,
  platformSide: DoorSide,
): ResolvedCctvChannel {
  if (requested === 'auto') {
    return platformSide;
  }
  return requested;
}

export function cycleCctvChannel(current: CctvPreviewChannel): CctvPreviewChannel {
  if (current === 'auto') {
    return 'left';
  }
  if (current === 'left') {
    return 'right';
  }
  if (current === 'right') {
    return 'interior';
  }
  return 'auto';
}

function findNearestStation(
  stations: readonly IStationSpec[],
  positionM: number,
): { readonly station: IStationSpec | null; readonly distance: number } {
  let nearest: IStationSpec | null = null;
  let nearestDist = Number.POSITIVE_INFINITY;
  for (const station of stations) {
    const dist = Math.abs(station.distanceM - positionM);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = station;
    }
  }
  return { station: nearest, distance: nearestDist };
}

export function resolveStationCameraMode(
  stations: readonly IStationSpec[],
  positionM: number,
  thresholdM: number = STATION_CAMERA_MAX_RANGE_M,
): IStationCameraResolution {
  const { station, distance } = findNearestStation(stations, positionM);
  if (station && distance <= thresholdM) {
    return { mode: 'station-ceiling', station, distanceToStationM: distance };
  }
  return { mode: 'tunnel-roof', station: null, distanceToStationM: station ? distance : null };
}
