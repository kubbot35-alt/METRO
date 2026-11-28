import type { ITrackSample } from './types';

export const LUT_SAMPLE_STEP_M = 2.0;
export const LUT_START_M = -140;

export interface ILutPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  readonly pitch: number;
  readonly gradeFraction: number;
  readonly curvature: number;
}

export interface ILutEvaluator {
  evaluateCurvature(distanceM: number): number;
  evaluateGrade(distanceM: number): number;
}

export function interpolateLutSample(
  a: ILutPoint,
  b: ILutPoint,
  frac: number,
  distanceM: number,
  turnoutSwayFactor: number,
  outdoorBlend: number,
): ITrackSample {
  const gradeFraction = a.gradeFraction + (b.gradeFraction - a.gradeFraction) * frac;
  const curvatureRadPerM = a.curvature + (b.curvature - a.curvature) * frac;
  return {
    distanceM,
    x: a.x + (b.x - a.x) * frac,
    y: a.y + (b.y - a.y) * frac,
    z: a.z + (b.z - a.z) * frac,
    yaw: a.yaw + (b.yaw - a.yaw) * frac,
    pitch: a.pitch + (b.pitch - a.pitch) * frac,
    gradeFraction,
    gradePercent: gradeFraction * 100,
    curvatureRadPerM,
    cantRollRad: curvatureRadPerM * 9.5,
    turnoutSwayFactor,
    outdoorBlend,
  };
}

function integrateForwardLut(pts: ILutPoint[], zeroIdx: number, count: number, evaluator: ILutEvaluator): void {
  for (let i = zeroIdx + 1; i < count; i += 1) {
    const prev = pts[i - 1];
    const sMid = LUT_START_M + (i - 0.5) * LUT_SAMPLE_STEP_M;
    const sCurr = LUT_START_M + i * LUT_SAMPLE_STEP_M;
    const kMid = evaluator.evaluateCurvature(sMid);
    const gMid = evaluator.evaluateGrade(sMid);
    const yawMid = prev.yaw + kMid * LUT_SAMPLE_STEP_M * 0.5;
    const cosPitch = 1 / Math.sqrt(1 + gMid * gMid);
    const gCurr = evaluator.evaluateGrade(sCurr);
    pts[i] = {
      x: prev.x - Math.sin(yawMid) * cosPitch * LUT_SAMPLE_STEP_M,
      y: prev.y + gMid * cosPitch * LUT_SAMPLE_STEP_M,
      z: prev.z - Math.cos(yawMid) * cosPitch * LUT_SAMPLE_STEP_M,
      yaw: prev.yaw + kMid * LUT_SAMPLE_STEP_M,
      pitch: Math.atan(gCurr),
      gradeFraction: gCurr,
      curvature: evaluator.evaluateCurvature(sCurr),
    };
  }
}

function integrateBackwardLut(pts: ILutPoint[], zeroIdx: number): void {
  for (let i = zeroIdx - 1; i >= 0; i -= 1) {
    const next = pts[i + 1];
    pts[i] = {
      x: next.x,
      y: next.y,
      z: next.z + LUT_SAMPLE_STEP_M,
      yaw: 0,
      pitch: 0,
      gradeFraction: 0,
      curvature: 0,
    };
  }
}

export function buildTrackLut(
  maxDistM: number,
  startY: number,
  evaluator: ILutEvaluator,
): readonly ILutPoint[] {
  const count = Math.ceil((maxDistM - LUT_START_M) / LUT_SAMPLE_STEP_M) + 1;
  const pts: ILutPoint[] = new Array(count);
  const zeroIdx = Math.round((0 - LUT_START_M) / LUT_SAMPLE_STEP_M);
  const grade0 = evaluator.evaluateGrade(0);
  pts[zeroIdx] = {
    x: 0,
    y: startY,
    z: 0,
    yaw: 0,
    pitch: Math.atan(grade0),
    gradeFraction: grade0,
    curvature: evaluator.evaluateCurvature(0),
  };
  integrateForwardLut(pts, zeroIdx, count, evaluator);
  integrateBackwardLut(pts, zeroIdx);
  return pts;
}
