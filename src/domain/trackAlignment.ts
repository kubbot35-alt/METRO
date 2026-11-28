import {
  LUT_SAMPLE_STEP_M,
  LUT_START_M,
  buildTrackLut,
  interpolateLutSample,
  type ILutPoint,
} from './trackAlignmentLut';
import {
  M1_SURFACE_ELEVATION_M,
  M1_TUNNEL_PORTAL_M,
  buildCurveZones,
  buildGradeZones,
  raisedCosinePulse,
  smoothstep01,
  type IGradeZoneSpec,
} from './trackAlignmentZones';
import type {
  ICurveZoneSpec,
  IStationSpec,
  ITrackSample,
  MetroLineId,
  TrackAlignmentIntensity,
} from './types';

export { M1_SURFACE_ELEVATION_M, M1_TUNNEL_PORTAL_M } from './trackAlignmentZones';

export interface ITrackAlignmentOptions {
  readonly hasSurfaceStart?: boolean;
  readonly tunnelPortalDistanceM?: number | null;
  readonly alignmentIntensity?: TrackAlignmentIntensity;
}

export class TrackAlignment {
  public readonly lineId: MetroLineId;
  public readonly hasSurfaceStart: boolean;
  public readonly tunnelPortalDistanceM: number | null;
  public readonly alignmentIntensity: TrackAlignmentIntensity;
  public readonly curveZones: readonly ICurveZoneSpec[];
  private readonly stations: readonly IStationSpec[];
  private readonly gradeZones: readonly IGradeZoneSpec[];
  private readonly lut: readonly ILutPoint[];
  private readonly maxDistM: number;

  public constructor(lineId: MetroLineId, stations: readonly IStationSpec[], options?: ITrackAlignmentOptions) {
    this.lineId = lineId;
    this.stations = stations;
    this.hasSurfaceStart = options?.hasSurfaceStart ?? lineId === 'M1';
    this.tunnelPortalDistanceM =
      options?.tunnelPortalDistanceM !== undefined
        ? options.tunnelPortalDistanceM
        : this.hasSurfaceStart
          ? M1_TUNNEL_PORTAL_M
          : null;
    this.alignmentIntensity = options?.alignmentIntensity ?? 'moderate';
    this.curveZones = buildCurveZones(lineId, stations, this.hasSurfaceStart, this.alignmentIntensity);
    this.gradeZones = buildGradeZones(lineId, stations, this.hasSurfaceStart, this.alignmentIntensity);
    this.maxDistM = (stations[stations.length - 1]?.distanceM ?? 3000) + 320;
    this.lut = buildTrackLut(this.maxDistM, this.hasSurfaceStart ? M1_SURFACE_ELEVATION_M : 0, {
      evaluateCurvature: (d) => this.evaluateCurvature(d),
      evaluateGrade: (d) => this.evaluateGrade(d),
    });
  }

  public sample(distanceM: number): ITrackSample {
    const clamped = Math.max(LUT_START_M, Math.min(this.maxDistM, distanceM));
    const idxFloat = (clamped - LUT_START_M) / LUT_SAMPLE_STEP_M;
    const idx0 = Math.min(this.lut.length - 2, Math.max(0, Math.floor(idxFloat)));
    const frac = Math.max(0, Math.min(1, idxFloat - idx0));
    return interpolateLutSample(
      this.lut[idx0],
      this.lut[idx0 + 1],
      frac,
      clamped,
      this.evaluateTurnoutSway(clamped),
      this.evaluateOutdoorBlend(clamped),
    );
  }

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
    return { x: s.x + cosY * rx, y: s.y + ry, z: s.z - sinY * rx };
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
        return (c.direction === 'left' ? 1 : -1) * c.maxCurvatureRadPerM * raisedCosinePulse(u);
      }
    }
    return 0;
  }

  private evaluateGrade(distanceM: number): number {
    for (let i = 0; i < this.gradeZones.length; i += 1) {
      const g = this.gradeZones[i];
      if (distanceM > g.startM && distanceM < g.endM) {
        return g.peakGrade * raisedCosinePulse((distanceM - g.startM) / (g.endM - g.startM));
      }
    }
    return 0;
  }

  private evaluateTurnoutSway(distanceM: number): number {
    if (this.hasSurfaceStart && distanceM >= 135 && distanceM <= 175) {
      const u = (distanceM - 135) / 40;
      return Math.sin(u * Math.PI * 3) * raisedCosinePulse(u);
    }
    for (let i = 0; i < this.stations.length; i += 1) {
      const startM = this.stations[i].distanceM - 152;
      const endM = this.stations[i].distanceM - 114;
      if (distanceM >= startM && distanceM <= endM) {
        const u = (distanceM - startM) / (endM - startM);
        return (i % 2 === 0 ? 1 : -1) * Math.sin(u * Math.PI * 2.5) * raisedCosinePulse(u);
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
}

const alignmentCache = new Map<string, TrackAlignment>();

export function getLineTrackAlignment(
  lineId: MetroLineId,
  stations: readonly IStationSpec[],
  options?: ITrackAlignmentOptions,
): TrackAlignment {
  const surface = options?.hasSurfaceStart ?? lineId === 'M1';
  const intensity = options?.alignmentIntensity ?? 'moderate';
  const key = `${lineId}:${surface ? 1 : 0}:${intensity}:${stations.map((s) => s.distanceM).join(',')}`;
  const cached = alignmentCache.get(key);
  if (cached) {
    return cached;
  }
  const created = new TrackAlignment(lineId, stations, options);
  alignmentCache.set(key, created);
  return created;
}
