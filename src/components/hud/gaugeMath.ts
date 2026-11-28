export const MAX_DIAL_KMH = 100;
export const START_ANGLE_DEG = -215;
export const SWEEP_DEG = 250;
export const RETRO_TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { readonly x: number; readonly y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const clampedEnd = Math.max(startAngle + 0.5, endAngle);
  const start = polarToCartesian(cx, cy, r, clampedEnd);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = clampedEnd - startAngle <= 180 ? '0' : '1';
  return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} A ${r} ${r} 0 ${largeArc} 0 ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
}

export function formatGradeDisplay(gradePercent: number): {
  readonly text: string;
  readonly colorClass: string;
} {
  const rounded = Math.round(gradePercent * 10) / 10;
  if (rounded >= 0.2) {
    return { text: `+${rounded.toFixed(1)}% ↗`, colorClass: 'bg-amber-500/20 border-amber-400/70 text-amber-200' };
  }
  if (rounded <= -0.2) {
    return { text: `${rounded.toFixed(1)}% ↘`, colorClass: 'bg-sky-500/20 border-sky-400/70 text-sky-200' };
  }
  return { text: '0.0% →', colorClass: 'bg-slate-800/90 border-slate-700 text-slate-300' };
}
