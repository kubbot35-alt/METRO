export interface ICurvePattern {
  readonly dir: 'left' | 'right';
  readonly maxKappa: number;
  readonly sharp: boolean;
}

export const M1_CURVE_PATTERNS: readonly ICurvePattern[] = [
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

export const M2_CURVE_PATTERNS: readonly ICurvePattern[] = [
  { dir: 'left', maxKappa: 0.0046, sharp: true },
  { dir: 'right', maxKappa: 0.0034, sharp: false },
  { dir: 'right', maxKappa: 0.0048, sharp: true },
  { dir: 'left', maxKappa: 0.0047, sharp: true },
  { dir: 'right', maxKappa: 0.0035, sharp: false },
  { dir: 'left', maxKappa: 0.0046, sharp: true },
];

export const M1_GRADE_PEAKS = [
  -0.028, 0.027, -0.025, 0.031, -0.030, 0.026, -0.027, 0.029, -0.026, 0.025, -0.028,
];
export const M2_GRADE_PEAKS = [0.026, -0.028, 0.030, -0.034, 0.032, -0.024];
