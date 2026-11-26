import {
  STATION_HALL_END_OFFSET_M,
  STATION_HALL_START_OFFSET_M,
} from './trackGeometry';
import type {
  ICurveZoneSpec,
  IStationSpec,
  ITrackSample,
  MetroLineId,
} from './types';

export const M1_TUNNEL_PORTAL_M = 300;
export const M1_SURFACE_ELEVATION_M = 4.8;
const SAMPLE_STEP_M = 2.0;
const START_LUT_M = -140;
const STATION_FLAT_PAD_M = 12;
const CURVE_SPEED_LIMIT_KMH = 45;
const CURVE_SIGN_LEAD_M = 40;

interface IGradeZoneSpec {
  readonly startM: number;
  readonly endM: number;
  readonly peakGrade: number;
}

interface ILutPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  readonly pitch: number;
  readonly gradeFraction: number;
  readonly curvature: number;
}

function raisedCosinePulse(u: number): number {
  if (u <= 0 || u >= 1) {
    return 0;
  }
  const s = Math.sin(Math.PI * u);
  return s * s;
}

function smoothstep01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function buildCurveZones(
  lineId: MetroLineId,
  stations: readonly IStationSpec[],
): readonly ICurveZoneSpec[] {
  const curves: ICurveZoneSpec[] = [];
  // Deterministic pattern of gentle and sharper tunnel curves strictly between station halls
  const m1Patterns: ReadonlyArray<{
    readonly dir: 'left' | 'right';
    readonly maxKappa: number;
    readonly sharp: boolean;
  }> = [
    { dir: 'right', maxKappa: 0.0046, sharp: true },
    { dir: 'left', maxKappa: 0.0031, sharp: false },
    { dir: 'left', maxKappa: 0.0048, sharp: true },
    { dir: 'right', maxKappa: 0.0034, sharp: false },
    { dir: 'right', maxKappa: 0.0045, sharp: true },
    { dir: 'left', maxKappa: 0.0032, sharp: false },
    { dir: 'left', maxKappa: 0.0047, sharp: true },
    { dir: 'right', maxKappa: 0.0030, sharp: false },
    { dir: 'right', maxKappa: 0.0046, sharp: true },
    { dir: 'left', maxKappa: 0.0033, sharp: false },
    { dir: 'right', maxKappa: 0.0045, sharp: true },
  ];

  const m2Patterns: ReadonlyArray<{
    readonly dir: 'left' | 'right';
    readonly maxKappa: number;
    readonly sharp: boolean;
  }> = [
    { dir: 'left', maxKappa: 0.0046, sharp: true },
    { dir: 'right', maxKappa: 0.0034, sharp: false },
    { dir: 'right', maxKappa: 0.0048, sharp: true },
    { dir: 'left', maxKappa: 0.0047, sharp: true },
    { dir: 'right', maxKappa: 0.0035, sharp: false },
    { dir: 'left', maxKappa: 0.0046, sharp: true },
  ];

  // Opening curve on M2 before Rondo Daszyńskiego (M1 stays straight out of STP Kabaty into portal)
  if (lineId === 'M2' && stations.length > 0) {
    const firstHallStart = stations[0].distanceM - STATION_HALL_START_OFFSET_M - STATION_FLAT_PAD_M;
    if (firstHallStart > 360) {
      curves.push({
        startM: 150,
        endM: 370,
        direction: 'right',
        maxCurvatureRadPerM: 0.0044,
        speedLimitKmh: CURVE_SPEED_LIMIT_KMH,
        signDistanceM: 150 - CURVE_SIGN_LEAD_M,
      });
    }
  }

  const patterns = lineId === 'M2' ? m2Patterns : m1Patterns;
  for (let i = 0; i < stations.length - 1; i += 1) {
    const prevEnd = stations[i].distanceM + STATION_HALL_END_OFFSET_M + STATION_FLAT_PAD_M;
    const nextStart = stations[i + 1].distanceM - STATION_HALL_START_OFFSET_M - STATION_FLAT_PAD_M;
    const span = nextStart - prevEnd;
    if (span < 180) {
      continue;
    }
    const pat = patterns[i % patterns.length];
    const curveLen = Math.min(240, span - 80);
    const startM = Math.round(prevEnd + (span - curveLen) * 0.45);
    const endM = Math.round(startM + curveLen);
    curves.push({
      startM,
      endM,
      direction: pat.dir,
      maxCurvatureRadPerM: pat.maxKappa,
      speedLimitKmh: pat.sharp ? CURVE_SPEED_LIMIT_KMH : undefined,
      signDistanceM: pat.sharp ? startM - CURVE_SIGN_LEAD_M : undefined,
    });
  }
  return curves;
}

function buildGradeZones(
  lineId: MetroLineId,
  stations: readonly IStationSpec[],
): readonly IGradeZoneSpec[] {
  const grades: IGradeZoneSpec[] = [];

  if (lineId === 'M1') {
    // M1 STP Kabaty surface descent ramp: starts gently at 215 m, passes through portal at 300 m,
    // levels out at 475 m before Kabaty station hall (492..628 m).
    // Integral of sin^2(pi*u) over length L is L/2 -> deltaY = peakGrade * L / 2.
    // L = 260 m, desired deltaY = -4.8 m -> peakGrade = -9.6 / 260 = -0.0369 (-3.7% peak, ~-2.5% avg)
    grades.push({
      startM: 215,
      endM: 475,
      peakGrade: -(2 * M1_SURFACE_ELEVATION_M) / 260,
    });
  } else {
    // M2 starts underground with a gentle downhill dip toward Rondo Daszyńskiego
    grades.push({
      startM: 120,
      endM: 420,
      peakGrade: -0.024,
    });
  }

  // Alternating climbs and descents between stations (stations remain strictly 0.0% flat!)
  const interPeaks =
    lineId === 'M2'
      ? [0.026, -0.028, 0.030, -0.034, 0.032, -0.024]
      : [-0.028, 0.027, -0.025, 0.031, -0.030, 0.026, -0.027, 0.029, -0.026, 0.025, -0.028];

  for (let i = 0; i < stations.length - 1; i += 1) {
    const prevEnd = stations[i].distanceM + STATION_HALL_END_OFFSET_M + STATION_FLAT_PAD_M;
    const nextStart = stations[i + 1].distanceM - STATION_HALL_START_OFFSET_M - STATION_FLAT_PAD_M;
    const span = nextStart - prevEnd;
    if (span < 160) {
      continue;
    }
    const peak = interPeaks[i % interPeaks.length];
    grades.push({
      startM: prevEnd + 18,
      endM: nextStart - 18,
      peakGrade: peak,
    });
  }
  return grades;
}

export class TrackAlignment {
  public readonly lineId: MetroLineId;
  public readonly hasSurfaceStart: boolean;
  public readonly tunnelPortalDistanceM: number | null;
  public readonly curveZones: readonly ICurveZoneSpec[];
  private readonly stations: readonly IStationSpec[];
  private readonly gradeZones: readonly IGradeZoneSpec[];
  private readonly lut: readonly ILutPoint[];
  private readonly maxDistM: number;

  public constructor(lineId: MetroLineId, stations: readonly IStationSpec[]) {
    this.lineId = lineId;
    this.stations = stations;
    this.hasSurfaceStart = lineId === 'M1';
    this.tunnelPortalDistanceM = lineId === 'M1' ? M1_TUNNEL_PORTAL_M : null;
    this.curveZones = buildCurveZones(lineId, stations);
    this.gradeZones = buildGradeZones(lineId, stations);

    const lastStationM = stations[stations.length - 1]?.distanceM ?? 3000;
    this.maxDistM = lastStationM + 320;
    this.lut = this.buildLut();
  }

  public sample(distanceM: number): ITrackSample {
    const clamped = Math.max(START_LUT_M, Math.min(this.maxDistM, distanceM));
    const idxFloat = (clamped - START_LUT_M) / SAMPLE_STEP_M;
    const idx0 = Math.min(this.lut.length - 2, Math.max(0, Math.floor(idxFloat)));
    const frac = Math.max(0, Math.min(1, idxFloat - idx0));
    const a = this.lut[idx0];
    const b = this.lut[idx0 + 1];

    const x = a.x + (b.x - a.x) * frac;
    const y = a.y + (b.y - a.y) * frac;
    const z = a.z + (b.z - a.z) * frac;
    const yaw = a.yaw + (b.yaw - a.yaw) * frac;
    const pitch = a.pitch + (b.pitch - a.pitch) * frac;
    const gradeFraction = a.gradeFraction + (b.gradeFraction - a.gradeFraction) * frac;
    const curvatureRadPerM = a.curvature + (b.curvature - a.curvature) * frac;
    const cantRollRad = curvatureRadPerM * 9.5; // ~0.045 rad (~2.6 deg) at max curve

    return {
      distanceM: clamped,
      x,
      y,
      z,
      yaw,
      pitch,
      gradeFraction,
      gradePercent: gradeFraction * 100,
      curvatureRadPerM,
      cantRollRad,
      turnoutSwayFactor: this.evaluateTurnoutSway(clamped),
      outdoorBlend: this.evaluateOutdoorBlend(clamped),
    };
  }

  /**
   * Transforms a point in local track coordinates (rightOffsetX, upOffsetY) at route distance `distanceM`
   * into world 3D coordinates, optionally applying superelevation roll around the track centerline.
   */
  public toWorldPoint(
    distanceM: number,
    rightOffsetX: number,
    upOffsetY: number,
    applyCant = false,
  ): { readonly x: number; readonly y: number; readonly z: number } {
    const s = this.sample(distanceM);
    const cosY = Math.cos(s.yaw);
    const sinY = Math.sin(s.yaw);
    let rx = rightOffsetX;
    let ry = upOffsetY;
    if (applyCant && Math.abs(s.cantRollRad) > 1e-5) {
      const cosR = Math.cos(s.cantRollRad);
      const sinR = Math.sin(s.cantRollRad);
      rx = rightOffsetX * cosR - upOffsetY * sinR;
      ry = rightOffsetX * sinR + upOffsetY * cosR;
    }
    return {
      x: s.x + cosY * rx,
      y: s.y + ry,
      z: s.z - sinY * rx,
    };
  }

  public getCurveSpeedLimitAt(distanceM: number): number | null {
    for (let i = 0; i < this.curveZones.length; i += 1) {
      const c = this.curveZones[i];
      if (c.speedLimitKmh !== undefined && distanceM >= c.startM && distanceM <= c.endM) {
        return c.speedLimitKmh;
      }
    }
    return null;
  }

  public getUpcomingCurveLimit(
    distanceM: number,
    lookaheadM = 120,
  ): { readonly limitKmh: number; readonly distanceAheadM: number } | null {
    for (let i = 0; i < this.curveZones.length; i += 1) {
      const c = this.curveZones[i];
      if (c.speedLimitKmh === undefined) {
        continue;
      }
      const ahead = c.startM - distanceM;
      if (ahead > 0 && ahead <= lookaheadM) {
        return { limitKmh: c.speedLimitKmh, distanceAheadM: ahead };
      }
    }
    return null;
  }

  private evaluateCurvature(distanceM: number): number {
    for (let i = 0; i < this.curveZones.length; i += 1) {
      const c = this.curveZones[i];
      if (distanceM > c.startM && distanceM < c.endM) {
        const u = (distanceM - c.startM) / (c.endM - c.startM);
        const sign = c.direction === 'left' ? 1 : -1;
        return sign * c.maxCurvatureRadPerM * raisedCosinePulse(u);
      }
    }
    return 0;
  }

  private evaluateGrade(distanceM: number): number {
    for (let i = 0; i < this.gradeZones.length; i += 1) {
      const g = this.gradeZones[i];
      if (distanceM > g.startM && distanceM < g.endM) {
        const u = (distanceM - g.startM) / (g.endM - g.startM);
        return g.peakGrade * raisedCosinePulse(u);
      }
    }
    return 0;
  }

  private evaluateTurnoutSway(distanceM: number): number {
    // Depot yard throat switches on M1 around 135..175 m
    if (this.hasSurfaceStart && distanceM >= 135 && distanceM <= 175) {
      const u = (distanceM - 135) / 40;
      return Math.sin(u * Math.PI * 3) * raisedCosinePulse(u);
    }
    // Station approach turnout / crossover zones (~152..114 m before each station target)
    for (let i = 0; i < this.stations.length; i += 1) {
      const startM = this.stations[i].distanceM - 152;
      const endM = this.stations[i].distanceM - 114;
      if (distanceM >= startM && distanceM <= endM) {
        const u = (distanceM - startM) / (endM - startM);
        const dirSign = i % 2 === 0 ? 1 : -1;
        return dirSign * Math.sin(u * Math.PI * 2.5) * raisedCosinePulse(u);
      }
    }
    return 0;
  }

  private evaluateOutdoorBlend(distanceM: number): number {
    if (!this.hasSurfaceStart || this.tunnelPortalDistanceM === null) {
      return 0;
    }
    const fadeStart = this.tunnelPortalDistanceM - 14;
    const fadeEnd = this.tunnelPortalDistanceM + 36;
    if (distanceM <= fadeStart) {
      return 1;
    }
    if (distanceM >= fadeEnd) {
      return 0;
    }
    return 1 - smoothstep01((distanceM - fadeStart) / (fadeEnd - fadeStart));
  }

  private buildLut(): readonly ILutPoint[] {
    const count = Math.ceil((this.maxDistM - START_LUT_M) / SAMPLE_STEP_M) + 1;
    const pts: ILutPoint[] = new Array(count);

    // Integrate backward from s = 0 and forward from s = 0 so s = 0 is exactly (0, startY, 0, yaw=0)
    const zeroIdx = Math.round((0 - START_LUT_M) / SAMPLE_STEP_M);
    const startY = this.hasSurfaceStart ? M1_SURFACE_ELEVATION_M : 0;

    pts[zeroIdx] = {
      x: 0,
      y: startY,
      z: 0,
      yaw: 0,
      pitch: Math.atan(this.evaluateGrade(0)),
      gradeFraction: this.evaluateGrade(0),
      curvature: this.evaluateCurvature(0),
    };

    // Forward integration (s > 0)
    for (let i = zeroIdx + 1; i < count; i += 1) {
      const prev = pts[i - 1];
      const sMid = START_LUT_M + (i - 0.5) * SAMPLE_STEP_M;
      const sCurr = START_LUT_M + i * SAMPLE_STEP_M;
      const kMid = this.evaluateCurvature(sMid);
      const gMid = this.evaluateGrade(sMid);
      const yawMid = prev.yaw + kMid * SAMPLE_STEP_M * 0.5;
      const nextYaw = prev.yaw + kMid * SAMPLE_STEP_M;
      const cosPitch = 1 / Math.sqrt(1 + gMid * gMid);
      const dx = -Math.sin(yawMid) * cosPitch * SAMPLE_STEP_M;
      const dz = -Math.cos(yawMid) * cosPitch * SAMPLE_STEP_M;
      const dy = gMid * cosPitch * SAMPLE_STEP_M;
      const gCurr = this.evaluateGrade(sCurr);
      pts[i] = {
        x: prev.x + dx,
        y: prev.y + dy,
        z: prev.z + dz,
        yaw: nextYaw,
        pitch: Math.atan(gCurr),
        gradeFraction: gCurr,
        curvature: this.evaluateCurvature(sCurr),
      };
    }

    // Backward integration (s < 0, flat straight tail behind spawn)
    for (let i = zeroIdx - 1; i >= 0; i -= 1) {
      const next = pts[i + 1];
      const sCurr = START_LUT_M + i * SAMPLE_STEP_M;
      pts[i] = {
        x: next.x,
        y: next.y,
        z: next.z + SAMPLE_STEP_M,
        yaw: 0,
        pitch: 0,
        gradeFraction: 0,
        curvature: 0,
      };
      void sCurr;
    }

    return pts;
  }
}

const alignmentCache = new Map<string, TrackAlignment>();

export function getLineTrackAlignment(
  lineId: MetroLineId,
  stations: readonly IStationSpec[],
): TrackAlignment {
  const key = `${lineId}:${stations.length}:${stations[0]?.distanceM ?? 0}:${stations[stations.length - 1]?.distanceM ?? 0}`;
  const cached = alignmentCache.get(key);
  if (cached) {
    return cached;
  }
  const created = new TrackAlignment(lineId, stations);
  alignmentCache.set(key, created);
  return created;
}
