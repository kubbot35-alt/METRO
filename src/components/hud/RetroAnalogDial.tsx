import { MAX_DIAL_KMH, RETRO_TICKS, START_ANGLE_DEG, SWEEP_DEG, polarToCartesian } from './gaugeMath';

interface IRetroAnalogDialProps {
  readonly speedKmh: number;
  readonly speedAngle: number;
  readonly limitAngle: number;
  readonly isOverspeeding: boolean;
}

function RetroDialTick({ tick }: { readonly tick: number }) {
  const deg = START_ANGLE_DEG + (tick / MAX_DIAL_KMH) * SWEEP_DEG;
  const major = tick % 20 === 0;
  const pOut = polarToCartesian(60, 56, 42, deg);
  const pIn = polarToCartesian(60, 56, major ? 33 : 37, deg);
  const lbl = polarToCartesian(60, 56, 25, deg);
  return (
    <g>
      <line x1={pIn.x} y1={pIn.y} x2={pOut.x} y2={pOut.y} stroke={tick >= 80 ? '#f87171' : '#cbd5c0'} strokeWidth={major ? '2.2' : '1.2'} />
      {major && (
        <text x={lbl.x} y={lbl.y + 3} textAnchor="middle" fill="#c7d7cf" fontSize="7.5" fontFamily="monospace">
          {tick}
        </text>
      )}
    </g>
  );
}

export function RetroAnalogDial({ speedKmh, speedAngle, limitAngle, isOverspeeding }: IRetroAnalogDialProps) {
  const tip = polarToCartesian(60, 56, 39, speedAngle);
  const tail = polarToCartesian(60, 56, 11, speedAngle + 180);
  const limitOut = polarToCartesian(60, 56, 46, limitAngle);
  const limitIn = polarToCartesian(60, 56, 36, limitAngle);
  return (
    <div data-testid="speedometer-retro" className="relative w-[114px] h-[98px] flex items-center justify-center">
      <svg viewBox="0 0 120 104" className="w-full h-full" aria-hidden="true">
        <circle cx="60" cy="56" r="48" fill="#182420" stroke="#5b7a6f" strokeWidth="3.5" />
        <circle cx="60" cy="56" r="43" fill="#0f1714" stroke="#2d433b" strokeWidth="1" />
        {RETRO_TICKS.map((tick) => <RetroDialTick key={tick} tick={tick} />)}
        <line x1={limitIn.x} y1={limitIn.y} x2={limitOut.x} y2={limitOut.y} stroke="#ef4444" strokeWidth="3" />
        <line x1={tail.x} y1={tail.y} x2={tip.x} y2={tip.y} stroke={isOverspeeding ? '#ef4444' : '#fb923c'} strokeWidth="3" strokeLinecap="round" />
        <circle cx="60" cy="56" r="5" fill="#94a3b8" stroke="#0f1714" strokeWidth="1.5" />
        <rect x="38" y="75" width="44" height="16" rx="2.5" fill="#09100e" stroke="#456156" strokeWidth="1" />
        <text x="60" y="86.5" textAnchor="middle" fill={isOverspeeding ? '#f87171' : '#e2f1e8'} fontSize="11" fontWeight="bold" fontFamily="monospace">
          {Math.round(speedKmh)} km/h
        </text>
      </svg>
    </div>
  );
}
