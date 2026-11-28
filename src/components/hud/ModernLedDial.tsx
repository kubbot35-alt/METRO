import { START_ANGLE_DEG, SWEEP_DEG, describeArc, polarToCartesian } from './gaugeMath';

interface IModernLedDialProps {
  readonly speedKmh: number;
  readonly clamped: number;
  readonly speedAngle: number;
  readonly limitAngle: number;
  readonly isOverspeeding: boolean;
  readonly accentHex: string;
}

export function ModernLedDial({ speedKmh, clamped, speedAngle, limitAngle, isOverspeeding, accentHex }: IModernLedDialProps) {
  const endAngle = START_ANGLE_DEG + SWEEP_DEG;
  const pointerOuter = polarToCartesian(60, 58, 49, speedAngle);
  const pointerInner = polarToCartesian(60, 58, 37, speedAngle);
  return (
    <div data-testid="speedometer-modern" className="relative w-[112px] h-[96px] flex items-center justify-center">
      <svg viewBox="0 0 120 104" className="w-full h-full" aria-hidden="true">
        <path d={describeArc(60, 58, 44, START_ANGLE_DEG, endAngle)} fill="none" stroke="#222b38" strokeWidth="8" strokeLinecap="round" />
        <path d={describeArc(60, 58, 44, limitAngle, endAngle)} fill="none" stroke="#991b1b" strokeWidth="8" strokeLinecap="round" />
        {clamped > 0.4 && <path d={describeArc(60, 58, 44, START_ANGLE_DEG, speedAngle)} fill="none" stroke={isOverspeeding ? '#ef4444' : accentHex} strokeWidth="8" strokeLinecap="round" />}
        <line x1={pointerInner.x} y1={pointerInner.y} x2={pointerOuter.x} y2={pointerOuter.y} stroke="#f8fafc" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-1.5 leading-none">
        <span className={`font-mono-tabular text-[26px] font-bold tracking-tight ${isOverspeeding ? 'text-red-400' : 'text-slate-50'}`}>{Math.round(speedKmh)}</span>
        <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400 mt-0.5">km/h</span>
      </div>
    </div>
  );
}
