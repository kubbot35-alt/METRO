import {
  M1_CURVE_PATTERNS,
  M1_GRADE_PEAKS,
  M2_CURVE_PATTERNS,
  M2_GRADE_PEAKS,
  type ICurvePattern,
} from './trackAlignmentPatterns';
import {
  STATION_HALL_END_OFFSET_M,
  STATION_HALL_START_OFFSET_M,
} from './trackGeometry';
import type {
  ICurveZoneSpec,
  IStationSpec,
  MetroLineId,
  TrackAlignmentIntensity,
} from './types';

export const M1_TUNNEL_PORTAL_M = 300;
export const M1_SURFACE_ELEVATION_M = 4.8;
const STATION_FLAT_PAD_M = 12;
const CURVE_SPEED_LIMIT_KMH = 45;
const CURVE_SIGN_LEAD_M = 40;

export interface IGradeZoneSpec {
  readonly startM: number;
  readonly endM: number;
  readonly peakGrade: number;
}

export function raisedCosinePulse(u: number): number {
  if (u <= 0 || u >= 1) return 0;
  const s = Math.sin(Math.PI * u);
  return s * s;
}

export function smoothstep01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function buildOpeningCurve(
  stations: readonly IStationSpec[],
  hasSurfaceStart: boolean,
  scale: number,
): ICurveZoneSpec | null {
  if (hasSurfaceStart || stations.length === 0) return null;
  const firstHallStart = stations[0].distanceM - STATION_HALL_START_OFFSET_M - STATION_FLAT_PAD_M;
  if (firstHallStart <= 360) return null;
  return {
    startM: 150,
    endM: 370,
    direction: 'right',
    maxCurvatureRadPerM: 0.0044 * scale,
    speedLimitKmh: CURVE_SPEED_LIMIT_KMH,
    signDistanceM: 150 - CURVE_SIGN_LEAD_M,
  };
}

function buildInterStationCurve(
  prevStation: IStationSpec,
  nextStation: IStationSpec,
  pattern: ICurvePattern,
  intensity: TrackAlignmentIntensity,
  scale: number,
): ICurveZoneSpec | null {
  const prevEnd = prevStation.distanceM + STATION_HALL_END_OFFSET_M + STATION_FLAT_PAD_M;
  const nextStart = nextStation.distanceM - STATION_HALL_START_OFFSET_M - STATION_FLAT_PAD_M;
  const span = nextStart - prevEnd;
  if (span < 180) return null;
  const isSharp = pattern.sharp || intensity === 'curvy';
  const curveLen = Math.min(260, span - 80);
  const startM = Math.round(prevEnd + (span - curveLen) * 0.45);
  return {
    startM,
    endM: Math.round(startM + curveLen),
    direction: pattern.dir,
    maxCurvatureRadPerM: Math.min(0.0062, pattern.maxKappa * scale),
    speedLimitKmh: isSharp ? CURVE_SPEED_LIMIT_KMH : undefined,
    signDistanceM: isSharp ? startM - CURVE_SIGN_LEAD_M : undefined,
  };
}

export function buildCurveZones(
  lineId: MetroLineId,
  stations: readonly IStationSpec[],
  hasSurfaceStart: boolean,
  intensity: TrackAlignmentIntensity,
): readonly ICurveZoneSpec[] {
  if (intensity === 'flat') return [];
  const curves: ICurveZoneSpec[] = [];
  const scale = intensity === 'curvy' ? 1.24 : 1.0;
  const opening = buildOpeningCurve(stations, hasSurfaceStart, scale);
  if (opening) curves.push(opening);
  const patterns = lineId === 'M2' ? M2_CURVE_PATTERNS : M1_CURVE_PATTERNS;
  for (let i = 0; i < stations.length - 1; i += 1) {
    const zone = buildInterStationCurve(stations[i], stations[i + 1], patterns[i % patterns.length], intensity, scale);
    if (zone) curves.push(zone);
  }
  return curves;
}

function buildOpeningGrade(
  stations: readonly IStationSpec[],
  hasSurfaceStart: boolean,
  intensity: TrackAlignmentIntensity,
): IGradeZoneSpec | null {
  if (hasSurfaceStart) {
    return { startM: 215, endM: 475, peakGrade: -(2 * M1_SURFACE_ELEVATION_M) / 260 };
  }
  if (intensity === 'flat') return null;
  const firstHallStart = (stations[0]?.distanceM ?? 600) - STATION_HALL_START_OFFSET_M - STATION_FLAT_PAD_M;
  if (firstHallStart <= 360) return null;
  return {
    startM: 120,
    endM: Math.min(420, firstHallStart - 20),
    peakGrade: intensity === 'curvy' ? -0.031 : -0.024,
  };
}

function buildInterStationGrade(
  prev: IStationSpec,
  next: IStationSpec,
  rawPeak: number,
  gradeScale: number,
): IGradeZoneSpec | null {
  const prevEnd = prev.distanceM + STATION_HALL_END_OFFSET_M + STATION_FLAT_PAD_M;
  const nextStart = next.distanceM - STATION_HALL_START_OFFSET_M - STATION_FLAT_PAD_M;
  if (nextStart - prevEnd < 160) return null;
  return {
    startM: prevEnd + 18,
    endM: nextStart - 18,
    peakGrade: Math.max(-0.04, Math.min(0.04, rawPeak * gradeScale)),
  };
}

export function buildGradeZones(
  lineId: MetroLineId,
  stations: readonly IStationSpec[],
  hasSurfaceStart: boolean,
  intensity: TrackAlignmentIntensity,
): readonly IGradeZoneSpec[] {
  const grades: IGradeZoneSpec[] = [];
  const opening = buildOpeningGrade(stations, hasSurfaceStart, intensity);
  if (opening) grades.push(opening);
  if (intensity === 'flat') return grades;
  const gradeScale = intensity === 'curvy' ? 1.28 : 1.0;
  const interPeaks = lineId === 'M2' ? M2_GRADE_PEAKS : M1_GRADE_PEAKS;
  for (let i = 0; i < stations.length - 1; i += 1) {
    const zone = buildInterStationGrade(stations[i], stations[i + 1], interPeaks[i % interPeaks.length], gradeScale);
    if (zone) grades.push(zone);
  }
  return grades;
}
