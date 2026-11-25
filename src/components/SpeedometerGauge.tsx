interface ISpeedometerGaugeProps {
  readonly speedKmh: number;
  readonly limitKmh: number;
  readonly isOverspeeding: boolean;
}

const MAX_DIAL_KMH = 100;
const START_ANGLE_DEG = -215;
const SWEEP_DEG = 250;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const clampedEnd = Math.max(startAngle + 0.5, endAngle);
  const start = polarToCartesian(cx, cy, r, clampedEnd);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = clampedEnd - startAngle <= 180 ? '0' : '1';
  return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} A ${r} ${r} 0 ${largeArc} 0 ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
}

export function SpeedometerGauge({ speedKmh, limitKmh, isOverspeeding }: ISpeedometerGaugeProps) {
  const clamped = Math.max(0, Math.min(MAX_DIAL_KMH, speedKmh));
  const limitAngle = START_ANGLE_DEG + (Math.min(limitKmh, MAX_DIAL_KMH) / MAX_DIAL_KMH) * SWEEP_DEG;
  const speedAngle = START_ANGLE_DEG + (clamped / MAX_DIAL_KMH) * SWEEP_DEG;
  const endAngle = START_ANGLE_DEG + SWEEP_DEG;
  const pointerOuter = polarToCartesian(60, 58, 49, speedAngle);
  const pointerInner = polarToCartesian(60, 58, 37, speedAngle);

  return (
    <div className="flex items-center gap-3.5 shrink-0">
      <div className="relative w-[112px] h-[96px] flex items-center justify-center">
        <svg viewBox="0 0 120 104" className="w-full h-full" aria-hidden="true">
          <path
            d={describeArc(60, 58, 44, START_ANGLE_DEG, endAngle)}
            fill="none"
            stroke="#222b38"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d={describeArc(60, 58, 44, limitAngle, endAngle)}
            fill="none"
            stroke="#991b1b"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {clamped > 0.4 && (
            <path
              d={describeArc(60, 58, 44, START_ANGLE_DEG, speedAngle)}
              fill="none"
              stroke={isOverspeeding ? '#ef4444' : '#f59e0b'}
              strokeWidth="8"
              strokeLinecap="round"
            />
          )}
          <line
            x1={pointerInner.x}
            y1={pointerInner.y}
            x2={pointerOuter.x}
            y2={pointerOuter.y}
            stroke="#f8fafc"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-1.5 leading-none">
          <span
            className={`font-mono-tabular text-[26px] font-bold tracking-tight ${
              isOverspeeding ? 'text-red-400' : 'text-slate-50'
            }`}
          >
            {Math.round(speedKmh)}
          </span>
          <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400 mt-0.5">
            km/h
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1">
        <div
          className={`w-12 h-12 rounded-full border-4 flex items-center justify-center bg-slate-100 ${
            isOverspeeding ? 'border-red-500' : 'border-red-600'
          }`}
          aria-label={`Ograniczenie prędkości ${limitKmh} km/h`}
        >
          <span className="font-mono-tabular text-base font-bold text-slate-950">{limitKmh}</span>
        </div>
        <span
          className={`text-[10px] font-mono-tabular uppercase tracking-wider ${
            isOverspeeding ? 'text-red-400 font-bold' : 'text-slate-400'
          }`}
        >
          {isOverspeeding ? 'ZA SZYBKO' : 'LIMIT'}
        </span>
      </div>
    </div>
  );
}
