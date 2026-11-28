import type { DoorSide, IStationSpec, PlatformLayout } from './types';

export const STANDARD_OPPOSITE_TRACK_X = -4.4;
export const ISLAND_OPPOSITE_TRACK_X = -9.8;
export const ISLAND_TRANSITION_LEN_M = 72;
export const STATION_HALL_START_OFFSET_M = 132;
export const STATION_HALL_END_OFFSET_M = 16;

export function getStationPlatformLayout(station: IStationSpec): PlatformLayout {
  return station.platformLayout ?? 'island';
}

export function getStationPlatformSide(station: IStationSpec): DoorSide {
  if (station.platformSide) {
    return station.platformSide;
  }
  return getStationPlatformLayout(station) === 'side' ? 'right' : 'left';
}

export function isWithinStationHall(
  distanceM: number,
  stations: readonly IStationSpec[],
): boolean {
  for (let i = 0; i < stations.length; i += 1) {
    const s = stations[i];
    if (
      distanceM >= s.distanceM - STATION_HALL_START_OFFSET_M &&
      distanceM <= s.distanceM + STATION_HALL_END_OFFSET_M
    ) {
      return true;
    }
  }
  return false;
}

function smoothstep01(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * (3 - 2 * clamped);
}

function getStationIslandBlend(distanceM: number, station: IStationSpec): number {
  if (getStationPlatformLayout(station) !== 'island') return 0;
  const hallStart = station.distanceM - STATION_HALL_START_OFFSET_M;
  const hallEnd = station.distanceM + STATION_HALL_END_OFFSET_M;
  const rampInStart = hallStart - ISLAND_TRANSITION_LEN_M;
  const rampOutEnd = hallEnd + ISLAND_TRANSITION_LEN_M;
  if (distanceM <= rampInStart || distanceM >= rampOutEnd) return 0;
  if (distanceM >= hallStart && distanceM <= hallEnd) return 1;
  const distFromEdge = distanceM < hallStart ? distanceM - rampInStart : rampOutEnd - distanceM;
  return smoothstep01(distFromEdge / ISLAND_TRANSITION_LEN_M);
}

/**
 * Returns world X center of the parallel opposite track at route distance `distanceM`.
 * Standard tunnels and Type B (side-platform) stations keep the opposite track at X = -4.4.
 * Type A (island-platform) stations flare the opposite track smoothly to X = -9.8 so a
 * wide 6.6m central island platform sits cleanly between the two tracks.
 */
export function getOppositeTrackX(
  distanceM: number,
  stations: readonly IStationSpec[],
): number {
  let maxBlend = 0;
  for (let i = 0; i < stations.length; i += 1) {
    maxBlend = Math.max(maxBlend, getStationIslandBlend(distanceM, stations[i]));
    if (maxBlend >= 1) return ISLAND_OPPOSITE_TRACK_X;
  }
  return STANDARD_OPPOSITE_TRACK_X + (ISLAND_OPPOSITE_TRACK_X - STANDARD_OPPOSITE_TRACK_X) * maxBlend;
}

/**
 * Returns Y-axis yaw offset (radians) for an oncoming train moving in decreasing `distanceM`
 * (+Z world direction) so its body smoothly aligns with the opposite track S-curve.
 */
export function getOppositeTrackYaw(
  distanceM: number,
  stations: readonly IStationSpec[],
): number {
  const eps = 1.0;
  const xPrev = getOppositeTrackX(distanceM + eps, stations);
  const xNext = getOppositeTrackX(distanceM - eps, stations);
  const dx = xNext - xPrev;
  const dz = 2 * eps;
  return Math.atan2(dx, dz);
}
