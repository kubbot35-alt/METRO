import type { IStationSpec } from './types';

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

function emptyRouteWindow(): ISlidingRouteWindow {
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

function buildRouteWindowBeads(
  stations: readonly IStationSpec[],
  startIndex: number,
  endIndex: number,
  safeCurrent: number,
  windowStartM: number,
  spanM: number,
): ISlidingRouteBead[] {
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
  return beads;
}

function computeWindowBounds(
  stations: readonly IStationSpec[],
  startIndex: number,
  endIndex: number,
): { readonly windowStartM: number; readonly windowEndM: number; readonly spanM: number } {
  const prevM = startIndex > 0 ? stations[startIndex - 1].distanceM : 0;
  const firstM = stations[startIndex].distanceM;
  const leadPaddingM = startIndex === 0 ? firstM : Math.min(260, (firstM - prevM) * 0.45);
  const windowStartM = Math.max(0, firstM - leadPaddingM);
  const windowEndM = stations[endIndex].distanceM + 80;
  return { windowStartM, windowEndM, spanM: Math.max(1, windowEndM - windowStartM) };
}

export function computeSlidingRouteWindow(
  stations: readonly IStationSpec[],
  currentStationIndex: number,
  positionM: number,
  maxVisible = 6,
): ISlidingRouteWindow {
  const total = stations.length;
  if (total === 0) return emptyRouteWindow();
  const safeCurrent = Math.max(0, Math.min(total - 1, currentStationIndex));
  const startIndex = Math.max(0, Math.min(Math.max(0, safeCurrent - 1), Math.max(0, total - maxVisible)));
  const endIndex = Math.min(total - 1, startIndex + maxVisible - 1);
  const { windowStartM, windowEndM, spanM } = computeWindowBounds(stations, startIndex, endIndex);
  const routeEndM = Math.max(1, stations[total - 1].distanceM);
  return {
    startIndex, endIndex, hasMoreBefore: startIndex > 0, hasMoreAfter: endIndex < total - 1,
    windowStartM, windowEndM,
    trainRatio: clamp01((positionM - windowStartM) / spanM),
    overallProgressRatio: clamp01(positionM / routeEndM),
    beads: buildRouteWindowBeads(stations, startIndex, endIndex, safeCurrent, windowStartM, spanM),
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
