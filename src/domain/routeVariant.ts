import { buildSpeedZonesForStations, STATION_SPACING_M } from './routeData';
import type { IMetroLineSpec, IStationSpec, RouteDirection } from './types';

export interface IRouteStartOption {
  readonly startIndex: number;
  readonly labelPl: string;
  readonly labelEn: string;
  readonly remainingStations: number;
}

export interface ISlidingRouteBead {
  readonly station: IStationSpec;
  readonly stationIndex: number;
  readonly ratioInWindow: number;
  readonly state: 'passed' | 'current' | 'upcoming';
}

export interface ISlidingRouteWindow {
  readonly startIndex: number;
  readonly endIndex: number;
  readonly hasMoreBefore: boolean;
  readonly hasMoreAfter: boolean;
  readonly windowStartM: number;
  readonly windowEndM: number;
  readonly trainRatio: number;
  readonly overallProgressRatio: number;
  readonly beads: readonly ISlidingRouteBead[];
}

export const DEFAULT_SCENE_CULL_RANGE_M = 1200;

export function getOrderedStationsForDirection(
  baseLine: IMetroLineSpec,
  direction: RouteDirection,
): readonly IStationSpec[] {
  return direction === 'reverse' ? [...baseLine.stations].reverse() : baseLine.stations;
}

export function getRouteStartOptions(
  baseLine: IMetroLineSpec,
  direction: RouteDirection,
): readonly IRouteStartOption[] {
  const ordered = getOrderedStationsForDirection(baseLine, direction);
  const total = ordered.length;
  const maxStart = Math.max(0, total - 2);
  const options: IRouteStartOption[] = [];

  for (let idx = 0; idx <= maxStart; idx += 1) {
    const remaining = total - idx;
    if (idx === 0) {
      const isM1Depot = baseLine.hasSurfaceStart && direction === 'normal';
      options.push({
        startIndex: 0,
        labelPl: isM1Depot
          ? `STP Kabaty — początek linii (${remaining} st.)`
          : `${ordered[0].name} — początek linii (${remaining} st.)`,
        labelEn: isM1Depot
          ? `STP Kabaty — full line (${remaining} st.)`
          : `${ordered[0].name} — full line (${remaining} st.)`,
        remainingStations: remaining,
      });
    } else {
      options.push({
        startIndex: idx,
        labelPl: `${idx + 1}. ${ordered[idx].name} (${remaining} st.)`,
        labelEn: `${idx + 1}. ${ordered[idx].name} (${remaining} st.)`,
        remainingStations: remaining,
      });
    }
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
    const stepM = idx === 0 ? STATION_SPACING_M : spacings[origIdx] ?? STATION_SPACING_M;
    cumulativeM += stepM;
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
  if (direction === 'normal') {
    return forward;
  }
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
  const maxStart = Math.max(0, ordered.length - 2);
  const clampedStart = Math.max(0, Math.min(maxStart, Math.floor(startStationIndex)));
  const isNormal = direction === 'normal';
  const keepSurface = isNormal && clampedStart === 0 && baseLine.hasSurfaceStart;

  const stations = reindexSlicedStations(baseLine, ordered, clampedStart, direction);
  const speedZones = buildSpeedZonesForStations(stations);
  const firstName = keepSurface ? 'STP Kabaty' : stations[0]?.name ?? baseLine.name;
  const lastName = stations[stations.length - 1]?.name ?? '';
  const destinationLed = isNormal ? baseLine.destinationLed : baseLine.oppositeDestinationLed;
  const oppositeDestinationLed = isNormal ? baseLine.oppositeDestinationLed : baseLine.destinationLed;

  return {
    ...baseLine,
    routeLabel: `${firstName} — ${lastName}`,
    destinationLed,
    oppositeDestinationLed,
    hasSurfaceStart: keepSurface,
    tunnelPortalDistanceM: keepSurface ? baseLine.tunnelPortalDistanceM : null,
    direction,
    startStationIndex: clampedStart,
    fullStationCount: baseLine.stations.length,
    stations,
    speedZones,
  };
}

export function computeSlidingRouteWindow(
  stations: readonly IStationSpec[],
  currentStationIndex: number,
  positionM: number,
  maxVisible = 6,
): ISlidingRouteWindow {
  const total = stations.length;
  if (total === 0) {
    return {
      startIndex: 0,
      endIndex: 0,
      hasMoreBefore: false,
      hasMoreAfter: false,
      windowStartM: 0,
      windowEndM: 600,
      trainRatio: 0,
      overallProgressRatio: 0,
      beads: [],
    };
  }
  const safeCurrent = Math.max(0, Math.min(total - 1, currentStationIndex));
  const desiredStart = Math.max(0, safeCurrent - 1);
  const startIndex = Math.max(0, Math.min(desiredStart, Math.max(0, total - maxVisible)));
  const endIndex = Math.min(total - 1, startIndex + maxVisible - 1);

  const prevStationM = startIndex > 0 ? stations[startIndex - 1].distanceM : 0;
  const firstVisibleM = stations[startIndex].distanceM;
  const lastVisibleM = stations[endIndex].distanceM;
  const leadPaddingM = startIndex === 0 ? firstVisibleM : Math.min(260, (firstVisibleM - prevStationM) * 0.45);
  const windowStartM = Math.max(0, firstVisibleM - leadPaddingM);
  const windowEndM = lastVisibleM + 80;
  const spanM = Math.max(1, windowEndM - windowStartM);

  const beads: ISlidingRouteBead[] = [];
  for (let idx = startIndex; idx <= endIndex; idx += 1) {
    const st = stations[idx];
    beads.push({
      station: st,
      stationIndex: idx,
      ratioInWindow: clamp01((st.distanceM - windowStartM) / spanM),
      state: idx < safeCurrent ? 'passed' : idx === safeCurrent ? 'current' : 'upcoming',
    });
  }

  const routeEndM = Math.max(1, stations[total - 1].distanceM);
  return {
    startIndex,
    endIndex,
    hasMoreBefore: startIndex > 0,
    hasMoreAfter: endIndex < total - 1,
    windowStartM,
    windowEndM,
    trainRatio: clamp01((positionM - windowStartM) / spanM),
    overallProgressRatio: clamp01(positionM / routeEndM),
    beads,
  };
}

export function isWithinCullingRange(
  targetDistanceM: number,
  playerPositionM: number,
  cullRangeM = DEFAULT_SCENE_CULL_RANGE_M,
): boolean {
  return Math.abs(targetDistanceM - playerPositionM) <= cullRangeM;
}

export function isSpanWithinCullingRange(
  spanStartM: number,
  spanEndM: number,
  playerPositionM: number,
  aheadRangeM = DEFAULT_SCENE_CULL_RANGE_M,
  behindRangeM = 750,
): boolean {
  return spanEndM >= playerPositionM - behindRangeM && spanStartM <= playerPositionM + aheadRangeM;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
