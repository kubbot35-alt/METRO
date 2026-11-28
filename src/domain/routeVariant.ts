import { buildSpeedZonesForStations, STATION_SPACING_M } from './routeData';
import type { IMetroLineSpec, IStationSpec, RouteDirection } from './types';
export {
  DEFAULT_SCENE_CULL_RANGE_M,
  computeSlidingRouteWindow,
  isSpanWithinCullingRange,
  isWithinCullingRange,
  type ISlidingRouteBead,
  type ISlidingRouteWindow,
} from './routeWindow';

export interface IRouteStartOption {
  readonly startIndex: number;
  readonly labelPl: string;
  readonly labelEn: string;
  readonly remainingStations: number;
}

export function getOrderedStationsForDirection(
  baseLine: IMetroLineSpec,
  direction: RouteDirection,
): readonly IStationSpec[] {
  return direction === 'reverse' ? [...baseLine.stations].reverse() : baseLine.stations;
}

function buildStartOption(
  stationName: string,
  idx: number,
  remaining: number,
  isM1Depot: boolean,
): IRouteStartOption {
  if (idx === 0) {
    return {
      startIndex: 0,
      labelPl: isM1Depot ? `STP Kabaty — początek linii (${remaining} st.)` : `${stationName} — początek linii (${remaining} st.)`,
      labelEn: isM1Depot ? `STP Kabaty — full line (${remaining} st.)` : `${stationName} — full line (${remaining} st.)`,
      remainingStations: remaining,
    };
  }
  return {
    startIndex: idx,
    labelPl: `${idx + 1}. ${stationName} (${remaining} st.)`,
    labelEn: `${idx + 1}. ${stationName} (${remaining} st.)`,
    remainingStations: remaining,
  };
}

export function getRouteStartOptions(
  baseLine: IMetroLineSpec,
  direction: RouteDirection,
): readonly IRouteStartOption[] {
  const ordered = getOrderedStationsForDirection(baseLine, direction);
  const total = ordered.length;
  const maxStart = Math.max(0, total - 2);
  const isM1Depot = baseLine.hasSurfaceStart && direction === 'normal';
  const options: IRouteStartOption[] = [];
  for (let idx = 0; idx <= maxStart; idx += 1) {
    options.push(buildStartOption(ordered[idx].name, idx, total - idx, isM1Depot));
  }
  return options;
}

function reindexSlicedStations(
  baseLine: IMetroLineSpec,
  ordered: readonly IStationSpec[],
  startIndex: number,
  direction: RouteDirection,
): readonly IStationSpec[] {
  const sliced = ordered.slice(startIndex);
  const spacings = computeOriginalSpacings(baseLine.stations, direction);
  const prefix = baseLine.badgeCode ?? baseLine.id;
  let cumulativeM = 0;
  return sliced.map((station, idx) => {
    const origIdx = startIndex + idx;
    cumulativeM += idx === 0 ? STATION_SPACING_M : spacings[origIdx] ?? STATION_SPACING_M;
    return {
      ...station,
      id: idx + 1,
      code: `${prefix}-${String(origIdx + 1).padStart(2, '0')}`,
      distanceM: cumulativeM,
    };
  });
}

function computeOriginalSpacings(
  stations: readonly IStationSpec[],
  direction: RouteDirection,
): readonly number[] {
  const forward: number[] = stations.map((s, i) =>
    i === 0 ? s.distanceM : Math.max(400, s.distanceM - stations[i - 1].distanceM),
  );
  if (direction === 'normal') return forward;
  const reversedSpacings: number[] = [STATION_SPACING_M];
  for (let i = stations.length - 1; i > 0; i -= 1) {
    reversedSpacings.push(forward[i]);
  }
  return reversedSpacings;
}

export function compileRouteVariant(
  baseLine: IMetroLineSpec,
  direction: RouteDirection,
  startStationIndex: number,
): IMetroLineSpec {
  const ordered = getOrderedStationsForDirection(baseLine, direction);
  const clampedStart = Math.max(0, Math.min(Math.max(0, ordered.length - 2), Math.floor(startStationIndex)));
  const isNormal = direction === 'normal';
  const keepSurface = isNormal && clampedStart === 0 && baseLine.hasSurfaceStart;
  const stations = reindexSlicedStations(baseLine, ordered, clampedStart, direction);
  const firstName = keepSurface ? 'STP Kabaty' : stations[0]?.name ?? baseLine.name;
  const lastName = stations[stations.length - 1]?.name ?? '';
  return {
    ...baseLine,
    routeLabel: `${firstName} — ${lastName}`,
    destinationLed: isNormal ? baseLine.destinationLed : baseLine.oppositeDestinationLed,
    oppositeDestinationLed: isNormal ? baseLine.oppositeDestinationLed : baseLine.destinationLed,
    hasSurfaceStart: keepSurface,
    tunnelPortalDistanceM: keepSurface ? baseLine.tunnelPortalDistanceM : null,
    direction, startStationIndex: clampedStart, fullStationCount: baseLine.stations.length,
    stations, speedZones: buildSpeedZonesForStations(stations),
  };
}
