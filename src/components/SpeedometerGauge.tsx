import type { TrainVisualTheme } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';

interface ISpeedometerGaugeProps {
  readonly speedKmh: number;
  readonly limitKmh: number;
  readonly isOverspeeding: boolean;
  readonly gradePercent: number;
  readonly inCurveLimitZone?: boolean;
  readonly theme: TrainVisualTheme;
}

const MAX_DIAL_KMH = 100;
const START_ANGLE_DEG = -215;
const SWEEP_DEG = 250;
const RETRO_TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

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

function formatGradeDisplay(gradePercent: number): {
  readonly text: string;
  readonly colorClass: string;
} {
  const rounded = Math.round(gradePercent * 10) / 10;
  if (rounded >= 0.2) {
    return {
      text: `+${rounded.toFixed(1)}% ↗`,
      colorClass: 'bg-amber-500/20 border-amber-400/70 text-amber-200',
    };
  }
  if (rounded <= -0.2) {
    return {
      text: `${rounded.toFixed(1)}% ↘`,
      colorClass: 'bg-sky-500/20 border-sky-400/70 text-sky-200',
    };
  }
  return {
    text: '0.0% →',
    colorClass: 'bg-slate-800/90 border-slate-700 text-slate-300',
  };
}

export function SpeedometerGauge({
  speedKmh,
  limitKmh,
  isOverspeeding,
  gradePercent,
  inCurveLimitZone = false,
  theme,
}: ISpeedometerGaugeProps) {
  const { tr } = useI18n();
  const clamped = Math.max(0, Math.min(MAX_DIAL_KMH, speedKmh));
  const limitAngle = START_ANGLE_DEG + (Math.min(limitKmh, MAX_DIAL_KMH) / MAX_DIAL_KMH) * SWEEP_DEG;
  const speedAngle = START_ANGLE_DEG + (clamped / MAX_DIAL_KMH) * SWEEP_DEG;
  const grade = formatGradeDisplay(gradePercent);

  return (
    <div className="flex items-center gap-3 shrink-0">
      {theme === 'retro' ? (
        <RetroAnalogDial
          speedKmh={speedKmh}
          speedAngle={speedAngle}
          limitAngle={limitAngle}
          isOverspeeding={isOverspeeding}
        />
      ) : (
        <ModernLedDial
          speedKmh={speedKmh}
          clamped={clamped}
          speedAngle={speedAngle}
          limitAngle={limitAngle}
          isOverspeeding={isOverspeeding}
          accentHex={theme === 'varsovia' ? '#22d3ee' : '#38bdf8'}
        />
      )}

      <div className="flex flex-col items-center gap-1">
        <div
          className={`w-11 h-11 rounded-full border-4 flex items-center justify-center ${
            inCurveLimitZone ? 'bg-amber-300 border-slate-900' : 'bg-slate-100'
          } ${!inCurveLimitZone ? (isOverspeeding ? 'border-red-500' : 'border-red-600') : ''}`}
          aria-label={`${tr('Ograniczenie prędkości', 'Speed limit')} ${limitKmh} km/h`}
        >
          <span className="font-mono-tabular text-[15px] font-bold text-slate-950">{limitKmh}</span>
        </div>
        <span
          className={`text-[9px] font-mono-tabular uppercase tracking-wider leading-none ${
            isOverspeeding
              ? 'text-red-400 font-bold'
              : inCurveLimitZone
                ? 'text-amber-300 font-bold'
                : theme === 'retro'
                  ? 'text-[#9bb8ad]'
                  : 'text-slate-400'
          }`}
        >
          {isOverspeeding ? tr('ZA SZYBKO', 'OVERSPEED') : inCurveLimitZone ? tr('ŁUK', 'CURVE') : 'LIMIT'}
        </span>
        <span
          data-testid="track-grade-indicator"
          aria-label={`${tr('Nachylenie toru', 'Track grade')} ${grade.text}`}
          className={`px-1.5 py-0.5 rounded text-[10px] font-mono-tabular font-bold leading-none whitespace-nowrap border ${grade.colorClass}`}
        >
          {grade.text}
        </span>
      </div>
    </div>
  );
}

interface IRetroDialProps {
  readonly speedKmh: number;
  readonly speedAngle: number;
  readonly limitAngle: number;
  readonly isOverspeeding: boolean;
}

function RetroAnalogDial({ speedKmh, speedAngle, limitAngle, isOverspeeding }: IRetroDialProps) {
  const tip = polarToCartesian(60, 56, 39, speedAngle);
  const tail = polarToCartesian(60, 56, 11, speedAngle + 180);
  const limitMarkOuter = polarToCartesian(60, 56, 46, limitAngle);
  const limitMarkInner = polarToCartesian(60, 56, 36, limitAngle);

  return (
    <div
      data-testid="speedometer-retro"
      className="relative w-[114px] h-[98px] flex items-center justify-center"
    >
      <svg viewBox="0 0 120 104" className="w-full h-full" aria-hidden="true">
        <circle cx="60" cy="56" r="48" fill="#182420" stroke="#5b7a6f" strokeWidth="3.5" />
        <circle cx="60" cy="56" r="43" fill="#0f1714" stroke="#2d433b" strokeWidth="1" />
        {RETRO_TICKS.map((tick) => {
          const deg = START_ANGLE_DEG + (tick / MAX_DIAL_KMH) * SWEEP_DEG;
          const major = tick % 20 === 0;
          const pOut = polarToCartesian(60, 56, 42, deg);
          const pIn = polarToCartesian(60, 56, major ? 33 : 37, deg);
          const lbl = polarToCartesian(60, 56, 25, deg);
          return (
            <g key={tick}>
              <line
                x1={pIn.x}
                y1={pIn.y}
                x2={pOut.x}
                y2={pOut.y}
                stroke={tick >= 80 ? '#f87171' : '#cbd5c0'}
                strokeWidth={major ? '2.2' : '1.2'}
              />
              {major && (
                <text
                  x={lbl.x}
                  y={lbl.y + 3}
                  textAnchor="middle"
                  fill="#c7d7cf"
                  fontSize="7.5"
                  fontFamily="monospace"
                >
                  {tick}
                </text>
              )}
            </g>
          );
        })}
        <line
          x1={limitMarkInner.x}
          y1={limitMarkInner.y}
          x2={limitMarkOuter.x}
          y2={limitMarkOuter.y}
          stroke="#ef4444"
          strokeWidth="3"
        />
        <line
          x1={tail.x}
          y1={tail.y}
          x2={tip.x}
          y2={tip.y}
          stroke={isOverspeeding ? '#ef4444' : '#fb923c'}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="60" cy="56" r="5" fill="#94a3b8" stroke="#0f1714" strokeWidth="1.5" />
        <rect x="38" y="75" width="44" height="16" rx="2.5" fill="#09100e" stroke="#456156" strokeWidth="1" />
        <text
          x="60"
          y="86.5"
          textAnchor="middle"
          fill={isOverspeeding ? '#f87171' : '#e2f1e8'}
          fontSize="11"
          fontWeight="bold"
          fontFamily="monospace"
        >
          {Math.round(speedKmh)} km/h
        </text>
      </svg>
    </div>
  );
}

interface IModernDialProps {
  readonly speedKmh: number;
  readonly clamped: number;
  readonly speedAngle: number;
  readonly limitAngle: number;
  readonly isOverspeeding: boolean;
  readonly accentHex: string;
}

function ModernLedDial({
  speedKmh,
  clamped,
  speedAngle,
  limitAngle,
  isOverspeeding,
  accentHex,
}: IModernDialProps) {
  const endAngle = START_ANGLE_DEG + SWEEP_DEG;
  const pointerOuter = polarToCartesian(60, 58, 49, speedAngle);
  const pointerInner = polarToCartesian(60, 58, 37, speedAngle);

  return (
    <div
      data-testid="speedometer-modern"
      className="relative w-[112px] h-[96px] flex items-center justify-center"
    >
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
            stroke={isOverspeeding ? '#ef4444' : accentHex}
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
  );
}
