import type { ISpeedLimitZone, IStationSpec } from './types';

export const STATION_SPACING_M = 600;
export const BOARDING_DURATION_SEC = 5.0;
export const STOP_ZONE_HALF_WIDTH_M = 14;
export const PLATFORM_LENGTH_M = 110;
export const ROUTE_END_BUFFER_M = 45;

export const LINE_M1_STATIONS: readonly IStationSpec[] = [
  {
    id: 1,
    name: 'Centrum',
    code: 'M1-01',
    distanceM: 600,
    stopZoneHalfWidthM: STOP_ZONE_HALF_WIDTH_M,
    platformLengthM: PLATFORM_LENGTH_M,
    accentHex: 0xd97706,
  },
  {
    id: 2,
    name: 'Politechnika',
    code: 'M1-02',
    distanceM: 1200,
    stopZoneHalfWidthM: STOP_ZONE_HALF_WIDTH_M,
    platformLengthM: PLATFORM_LENGTH_M,
    accentHex: 0x0284c7,
  },
  {
    id: 3,
    name: 'Ratusz Arsenał',
    code: 'M1-03',
    distanceM: 1800,
    stopZoneHalfWidthM: STOP_ZONE_HALF_WIDTH_M,
    platformLengthM: PLATFORM_LENGTH_M,
    accentHex: 0x059669,
  },
  {
    id: 4,
    name: 'Dworzec Gdański',
    code: 'M1-04',
    distanceM: 2400,
    stopZoneHalfWidthM: STOP_ZONE_HALF_WIDTH_M,
    platformLengthM: PLATFORM_LENGTH_M,
    accentHex: 0x7c3aed,
  },
  {
    id: 5,
    name: 'Młociny',
    code: 'M1-05',
    distanceM: 3000,
    stopZoneHalfWidthM: STOP_ZONE_HALF_WIDTH_M,
    platformLengthM: PLATFORM_LENGTH_M,
    accentHex: 0xe11d48,
  },
];

export const LINE_M1_SPEED_ZONES: readonly ISpeedLimitZone[] = [
  { startM: 0, endM: 150, limitKmh: 60 },
  { startM: 150, endM: 430, limitKmh: 75 },
  { startM: 430, endM: 640, limitKmh: 45 },
  { startM: 640, endM: 1020, limitKmh: 80 },
  { startM: 1020, endM: 1240, limitKmh: 45 },
  { startM: 1240, endM: 1620, limitKmh: 70 },
  { startM: 1620, endM: 1840, limitKmh: 45 },
  { startM: 1840, endM: 2220, limitKmh: 80 },
  { startM: 2220, endM: 2440, limitKmh: 45 },
  { startM: 2440, endM: 2800, limitKmh: 75 },
  { startM: 2800, endM: 3200, limitKmh: 45 },
];

export function getSpeedLimitAt(
  positionM: number,
  zones: readonly ISpeedLimitZone[] = LINE_M1_SPEED_ZONES,
): number {
  for (let i = 0; i < zones.length; i += 1) {
    const zone = zones[i];
    if (positionM >= zone.startM && positionM < zone.endM) {
      return zone.limitKmh;
    }
  }
  return zones[zones.length - 1]?.limitKmh ?? 50;
}
