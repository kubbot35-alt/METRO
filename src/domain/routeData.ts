import type { ISpeedLimitZone, IStationSpec } from './types';

export const STATION_SPACING_M = 600;
export const BOARDING_DURATION_SEC = 5.0;
export const STOP_ZONE_HALF_WIDTH_M = 14;
export const PLATFORM_LENGTH_M = 110;
export const ROUTE_END_BUFFER_M = 45;

interface IStationSeed {
  readonly name: string;
  readonly accentHex: number;
  readonly waitingPassengers: number;
}

const WARSAW_M1_SEEDS: readonly IStationSeed[] = [
  { name: 'Kabaty', accentHex: 0xd97706, waitingPassengers: 14 },
  { name: 'Natolin', accentHex: 0x0284c7, waitingPassengers: 13 },
  { name: 'Imielin', accentHex: 0x059669, waitingPassengers: 15 },
  { name: 'Stokłosy', accentHex: 0x7c3aed, waitingPassengers: 12 },
  { name: 'Ursynów', accentHex: 0xe11d48, waitingPassengers: 16 },
  { name: 'Służew', accentHex: 0x0891b2, waitingPassengers: 14 },
  { name: 'Wilanowska', accentHex: 0xd97706, waitingPassengers: 16 },
  { name: 'Wierzbno', accentHex: 0x2563eb, waitingPassengers: 13 },
  { name: 'Racławicka', accentHex: 0x059669, waitingPassengers: 14 },
  { name: 'Pole Mokotowskie', accentHex: 0x9333ea, waitingPassengers: 15 },
  { name: 'Politechnika', accentHex: 0xe11d48, waitingPassengers: 16 },
  { name: 'Centrum', accentHex: 0x0284c7, waitingPassengers: 16 },
];

function buildStations(seeds: readonly IStationSeed[]): readonly IStationSpec[] {
  return seeds.map((seed, index) => ({
    id: index + 1,
    name: seed.name,
    code: `M1-${String(index + 1).padStart(2, '0')}`,
    distanceM: (index + 1) * STATION_SPACING_M,
    stopZoneHalfWidthM: STOP_ZONE_HALF_WIDTH_M,
    platformLengthM: PLATFORM_LENGTH_M,
    accentHex: seed.accentHex,
    waitingPassengers: seed.waitingPassengers,
  }));
}

function buildSpeedZones(stations: readonly IStationSpec[]): readonly ISpeedLimitZone[] {
  const cruiseLimits = [75, 80, 70, 80, 75, 80, 70, 80, 75, 80, 75, 70];
  const zones: ISpeedLimitZone[] = [{ startM: 0, endM: 150, limitKmh: 60 }];
  stations.forEach((station, idx) => {
    const cruiseStart = idx === 0 ? 150 : stations[idx - 1].distanceM + 40;
    const approachStart = station.distanceM - 170;
    const approachEnd = station.distanceM + 40;
    zones.push({ startM: cruiseStart, endM: approachStart, limitKmh: cruiseLimits[idx % cruiseLimits.length] });
    zones.push({ startM: approachStart, endM: approachEnd, limitKmh: 45 });
  });
  const lastDist = stations[stations.length - 1]?.distanceM ?? 7200;
  zones.push({ startM: lastDist + 40, endM: lastDist + 240, limitKmh: 45 });
  return zones;
}

export const LINE_M1_STATIONS: readonly IStationSpec[] = buildStations(WARSAW_M1_SEEDS);

export const LINE_M1_SPEED_ZONES: readonly ISpeedLimitZone[] = buildSpeedZones(LINE_M1_STATIONS);

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
