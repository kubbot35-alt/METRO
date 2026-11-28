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
  { name: 'Kabaty', platformLayout: 'island', accentHex: 0xd97706, wallBaseHex: 0x3b2f23, waitingPassengers: 9 },
  { name: 'Natolin', platformLayout: 'island', accentHex: 0x0284c7, wallBaseHex: 0x2a3b4c, waitingPassengers: 11 },
  { name: 'Imielin', platformLayout: 'island', accentHex: 0x059669, wallBaseHex: 0x264137, waitingPassengers: 13 },
  { name: 'Stokłosy', platformLayout: 'island', accentHex: 0xd97706, wallBaseHex: 0x453528, waitingPassengers: 11 },
  { name: 'Ursynów', platformLayout: 'island', accentHex: 0xe11d48, wallBaseHex: 0x462831, waitingPassengers: 14 },
  { name: 'Służew', platformLayout: 'island', accentHex: 0x0891b2, wallBaseHex: 0x2b3e46, waitingPassengers: 15 },
  { name: 'Wilanowska', platformLayout: 'island', accentHex: 0xd97706, wallBaseHex: 0x3a322a, waitingPassengers: 19 },
  { name: 'Wierzbno', platformLayout: 'island', accentHex: 0x2563eb, wallBaseHex: 0x263552, waitingPassengers: 13 },
  { name: 'Racławicka', platformLayout: 'island', accentHex: 0x059669, wallBaseHex: 0x2b3f36, waitingPassengers: 14 },
  { name: 'Pole Mokotowskie', platformLayout: 'island', accentHex: 0x16a34a, wallBaseHex: 0xdcfce7, waitingPassengers: 17 },
  { name: 'Politechnika', platformLayout: 'island', accentHex: 0xe11d48, wallBaseHex: 0x4c2832, waitingPassengers: 24 },
  { name: 'Centrum', platformLayout: 'side', accentHex: 0x94a3b8, wallBaseHex: 0xcbd5e1, waitingPassengers: 28 },
  { name: 'Świętokrzyska', platformLayout: 'island', accentHex: 0xf59e0b, wallBaseHex: 0x334155, waitingPassengers: 28 },
  { name: 'Ratusz Arsenał', platformLayout: 'island', accentHex: 0x64748b, wallBaseHex: 0x94a3b8, waitingPassengers: 20 },
  { name: 'Dworzec Gdański', platformLayout: 'island', accentHex: 0x0284c7, wallBaseHex: 0x475569, waitingPassengers: 19 },
  { name: 'Plac Wilsona', platformLayout: 'island', accentHex: 0xf59e0b, wallBaseHex: 0x1e3a8a, waitingPassengers: 15 },
  { name: 'Marymont', platformLayout: 'island', accentHex: 0x38bdf8, wallBaseHex: 0x334155, waitingPassengers: 13 },
  { name: 'Słodowiec', platformLayout: 'side', accentHex: 0xd97706, wallBaseHex: 0x6b5344, waitingPassengers: 11 },
  { name: 'Stare Bielany', platformLayout: 'side', accentHex: 0xc2410c, wallBaseHex: 0x7c2d12, waitingPassengers: 11 },
  { name: 'Wawrzyszew', platformLayout: 'side', accentHex: 0xb45309, wallBaseHex: 0x5c4033, waitingPassengers: 10 },
  { name: 'Młociny', platformLayout: 'side', accentHex: 0x2563eb, wallBaseHex: 0x64748b, waitingPassengers: 10 },
];

const WARSAW_M2_SEEDS: readonly IStationSeed[] = [
  { name: 'Bródno', platformLayout: 'island', accentHex: 0xe2e8f0, wallBaseHex: 0xdbe2ea, waitingPassengers: 9 },
  { name: 'Kondratowicza', platformLayout: 'island', accentHex: 0x60a5fa, wallBaseHex: 0x64748b, waitingPassengers: 12 },
  { name: 'Zacisze', platformLayout: 'island', accentHex: 0x10b981, wallBaseHex: 0x92400e, waitingPassengers: 10 },
  { name: 'Trocka', platformLayout: 'island', accentHex: 0x3b82f6, wallBaseHex: 0x1e3a8a, waitingPassengers: 13 },
  { name: 'Targówek Mieszkaniowy', platformLayout: 'island', accentHex: 0xcbd5e1, wallBaseHex: 0x94a3b8, waitingPassengers: 13 },
  { name: 'Szwedzka', platformLayout: 'island', accentHex: 0xc2410c, wallBaseHex: 0x57534e, waitingPassengers: 12 },
  { name: 'Dworzec Wileński', platformLayout: 'island', accentHex: 0x2563eb, wallBaseHex: 0x1e3a8a, waitingPassengers: 25 },
  { name: 'Stadion Narodowy', platformLayout: 'island', accentHex: 0x0ea5e9, wallBaseHex: 0x0f766e, waitingPassengers: 18 },
  { name: 'Centrum Nauki Kopernik', platformLayout: 'island', accentHex: 0x34d399, wallBaseHex: 0x059669, waitingPassengers: 15 },
  { name: 'Nowy Świat-Uniwersytet', platformLayout: 'island', accentHex: 0x8b5cf6, wallBaseHex: 0x5b21b6, waitingPassengers: 19 },
  { name: 'Świętokrzyska', platformLayout: 'island', accentHex: 0xfacc15, wallBaseHex: 0xca8a04, waitingPassengers: 28 },
  { name: 'Rondo ONZ', platformLayout: 'island', accentHex: 0x94a3b8, wallBaseHex: 0xdbe2ea, waitingPassengers: 20 },
  { name: 'Rondo Daszyńskiego', platformLayout: 'island', accentHex: 0xef4444, wallBaseHex: 0x991b1b, waitingPassengers: 25 },
  { name: 'Płocka', platformLayout: 'island', accentHex: 0xf97316, wallBaseHex: 0x9a3412, waitingPassengers: 14 },
  { name: 'Młynów', platformLayout: 'island', accentHex: 0x38bdf8, wallBaseHex: 0x0284c7, waitingPassengers: 13 },
  { name: 'Księcia Janusza', platformLayout: 'island', accentHex: 0xd97706, wallBaseHex: 0x78350f, waitingPassengers: 13 },
  { name: 'Ulrychów', platformLayout: 'island', accentHex: 0x22c55e, wallBaseHex: 0x92400e, waitingPassengers: 11 },
  { name: 'Bemowo', platformLayout: 'island', accentHex: 0xef4444, wallBaseHex: 0x64748b, waitingPassengers: 10 },
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

export function buildSpeedZonesForStations(
  stations: readonly IStationSpec[],
): readonly ISpeedLimitZone[] {
  const cruiseLimits = [75, 80, 70, 80, 75, 80, 70, 80, 75, 80, 75, 70];
  const zones: ISpeedLimitZone[] = [{ startM: 0, endM: 150, limitKmh: 60 }];
  stations.forEach((station, idx) => {
    const cruiseStart = idx === 0 ? 150 : stations[idx - 1].distanceM + 40;
    const approachStart = Math.max(cruiseStart + 40, station.distanceM - 170);
    const approachEnd = station.distanceM + 40;
    zones.push({
      startM: cruiseStart,
      endM: approachStart,
      limitKmh: cruiseLimits[idx % cruiseLimits.length],
    });
    zones.push({ startM: approachStart, endM: approachEnd, limitKmh: 45 });
  });
  const lastDist = stations[stations.length - 1]?.distanceM ?? 7200;
  zones.push({ startM: lastDist + 40, endM: lastDist + 240, limitKmh: 45 });
  return zones;
}

export const LINE_M1_STATIONS: readonly IStationSpec[] = buildStations('M1', WARSAW_M1_SEEDS);
export const LINE_M1_SPEED_ZONES: readonly ISpeedLimitZone[] = buildSpeedZonesForStations(LINE_M1_STATIONS);

export const LINE_M2_STATIONS: readonly IStationSpec[] = buildStations('M2', WARSAW_M2_SEEDS);
export const LINE_M2_SPEED_ZONES: readonly ISpeedLimitZone[] = buildSpeedZonesForStations(LINE_M2_STATIONS);

export const METRO_LINE_M1: IMetroLineSpec = {
  id: 'M1',
  badgeCode: 'M1',
  name: 'Linia M1',
  routeLabel: 'STP Kabaty — Młociny',
  destinationLed: 'MŁOCINY',
  oppositeDestinationLed: 'KABATY',
  colorHex: 0x2563eb,
  cssColor: '#2563eb',
  hasSurfaceStart: true,
  tunnelPortalDistanceM: 300,
  alignmentIntensity: 'moderate',
  direction: 'normal',
  startStationIndex: 0,
  fullStationCount: LINE_M1_STATIONS.length,
  stations: LINE_M1_STATIONS,
  speedZones: LINE_M1_SPEED_ZONES,
};

export const METRO_LINE_M2: IMetroLineSpec = {
  id: 'M2',
  badgeCode: 'M2',
  name: 'Linia M2',
  routeLabel: 'Bródno — Bemowo',
  destinationLed: 'BEMOWO',
  oppositeDestinationLed: 'BRÓDNO',
  colorHex: 0xdc2626,
  cssColor: '#dc2626',
  hasSurfaceStart: false,
  tunnelPortalDistanceM: null,
  alignmentIntensity: 'moderate',
  direction: 'normal',
  startStationIndex: 0,
  fullStationCount: LINE_M2_STATIONS.length,
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
