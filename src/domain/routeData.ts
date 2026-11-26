import type {
  IMetroLineSpec,
  ISpeedLimitZone,
  IStationSpec,
  MetroLineId,
} from './types';

export const STATION_SPACING_M = 600;
export const BOARDING_DURATION_SEC = 5.0;
export const STOP_ZONE_HALF_WIDTH_M = 14;
export const PLATFORM_LENGTH_M = 110;
export const ROUTE_END_BUFFER_M = 45;

interface IStationSeed {
  readonly name: string;
  readonly platformLayout: 'island' | 'side';
  readonly accentHex: number;
  readonly wallBaseHex?: number;
  readonly waitingPassengers: number;
}

const WARSAW_M1_SEEDS: readonly IStationSeed[] = [
  { name: 'Kabaty', platformLayout: 'island', accentHex: 0xd97706, waitingPassengers: 14 },
  { name: 'Natolin', platformLayout: 'side', accentHex: 0x0284c7, waitingPassengers: 13 },
  { name: 'Imielin', platformLayout: 'island', accentHex: 0x059669, waitingPassengers: 15 },
  { name: 'Stokłosy', platformLayout: 'island', accentHex: 0x7c3aed, waitingPassengers: 12 },
  { name: 'Ursynów', platformLayout: 'island', accentHex: 0xe11d48, waitingPassengers: 16 },
  { name: 'Służew', platformLayout: 'island', accentHex: 0x0891b2, waitingPassengers: 14 },
  { name: 'Wilanowska', platformLayout: 'island', accentHex: 0xd97706, waitingPassengers: 16 },
  { name: 'Wierzbno', platformLayout: 'island', accentHex: 0x2563eb, waitingPassengers: 13 },
  { name: 'Racławicka', platformLayout: 'island', accentHex: 0x059669, waitingPassengers: 14 },
  { name: 'Pole Mokotowskie', platformLayout: 'island', accentHex: 0x9333ea, waitingPassengers: 15 },
  { name: 'Politechnika', platformLayout: 'side', accentHex: 0xe11d48, waitingPassengers: 16 },
  { name: 'Centrum', platformLayout: 'side', accentHex: 0x0284c7, waitingPassengers: 16 },
];

const WARSAW_M2_SEEDS: readonly IStationSeed[] = [
  { name: 'Rondo Daszyńskiego', platformLayout: 'island', accentHex: 0xef4444, wallBaseHex: 0x991b1b, waitingPassengers: 16 },
  { name: 'Rondo ONZ', platformLayout: 'side', accentHex: 0x94a3b8, wallBaseHex: 0xdbe2ea, waitingPassengers: 15 },
  { name: 'Świętokrzyska', platformLayout: 'island', accentHex: 0xfacc15, wallBaseHex: 0xca8a04, waitingPassengers: 18 },
  { name: 'Nowy Świat-Uniwersytet', platformLayout: 'island', accentHex: 0x8b5cf6, wallBaseHex: 0x5b21b6, waitingPassengers: 15 },
  { name: 'Centrum Nauki Kopernik', platformLayout: 'island', accentHex: 0x10b981, wallBaseHex: 0x047857, waitingPassengers: 14 },
  { name: 'Stadion Narodowy', platformLayout: 'side', accentHex: 0x0ea5e9, wallBaseHex: 0x0369a1, waitingPassengers: 16 },
  { name: 'Dworzec Wileński', platformLayout: 'island', accentHex: 0x2563eb, wallBaseHex: 0x1e3a8a, waitingPassengers: 17 },
];

function buildStations(
  prefix: MetroLineId,
  seeds: readonly IStationSeed[],
): readonly IStationSpec[] {
  return seeds.map((seed, index) => ({
    id: index + 1,
    name: seed.name,
    code: `${prefix}-${String(index + 1).padStart(2, '0')}`,
    distanceM: (index + 1) * STATION_SPACING_M,
    stopZoneHalfWidthM: STOP_ZONE_HALF_WIDTH_M,
    platformLengthM: PLATFORM_LENGTH_M,
    platformLayout: seed.platformLayout,
    platformSide: seed.platformLayout === 'side' ? 'right' : 'left',
    accentHex: seed.accentHex,
    wallBaseHex: seed.wallBaseHex,
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

export const LINE_M1_STATIONS: readonly IStationSpec[] = buildStations('M1', WARSAW_M1_SEEDS);
export const LINE_M1_SPEED_ZONES: readonly ISpeedLimitZone[] = buildSpeedZones(LINE_M1_STATIONS);

export const LINE_M2_STATIONS: readonly IStationSpec[] = buildStations('M2', WARSAW_M2_SEEDS);
export const LINE_M2_SPEED_ZONES: readonly ISpeedLimitZone[] = buildSpeedZones(LINE_M2_STATIONS);

export const METRO_LINE_M1: IMetroLineSpec = {
  id: 'M1',
  name: 'Linia M1',
  routeLabel: 'Kabaty — Centrum',
  destinationLed: 'MŁOCINY',
  oppositeDestinationLed: 'KABATY',
  colorHex: 0x2563eb,
  cssColor: '#2563eb',
  stations: LINE_M1_STATIONS,
  speedZones: LINE_M1_SPEED_ZONES,
};

export const METRO_LINE_M2: IMetroLineSpec = {
  id: 'M2',
  name: 'Linia M2',
  routeLabel: 'Rondo Daszyńskiego — Dworzec Wileński',
  destinationLed: 'BRÓDNO',
  oppositeDestinationLed: 'BEMOWO',
  colorHex: 0xdc2626,
  cssColor: '#dc2626',
  stations: LINE_M2_STATIONS,
  speedZones: LINE_M2_SPEED_ZONES,
};

export const METRO_LINE_CATALOG: readonly IMetroLineSpec[] = [METRO_LINE_M1, METRO_LINE_M2];

export function getMetroLineSpec(lineId: MetroLineId): IMetroLineSpec {
  return lineId === 'M2' ? METRO_LINE_M2 : METRO_LINE_M1;
}

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
