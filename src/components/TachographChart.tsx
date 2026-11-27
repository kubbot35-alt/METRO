import type { ITachographSnapshot } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';

interface ITachographChartProps {
  readonly tachograph: ITachographSnapshot;
}

const CHART_WIDTH = 560;
const CHART_HEIGHT = 152;
const PAD_LEFT = 36;
const PAD_RIGHT = 14;
const PAD_TOP = 16;
const PAD_BOTTOM = 24;
const PLOT_W = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_H = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
const MAX_SPEED_AXIS_KMH = 100;

function mapX(timeSec: number, totalDurationSec: number): number {
  const safeTotal = Math.max(totalDurationSec, 1);
  return PAD_LEFT + Math.max(0, Math.min(1, timeSec / safeTotal)) * PLOT_W;
}

function mapY(speedKmh: number): number {
  const ratio = Math.max(0, Math.min(1, speedKmh / MAX_SPEED_AXIS_KMH));
  return PAD_TOP + (1 - ratio) * PLOT_H;
}

function formatAxisTime(sec: number): string {
  const mins = Math.floor(sec / 60);
  const rem = Math.floor(sec % 60);
  return `${mins}:${String(rem).padStart(2, '0')}`;
}

export function TachographChart({ tachograph }: ITachographChartProps) {
  const { tr } = useI18n();
  const { samples, stationMarks, violationMarks, maxSpeedKmh, totalDurationSec } = tachograph;
  const durationAxis = Math.max(totalDurationSec, samples[samples.length - 1]?.timeSec ?? 1, 1);

  const speedPoints = samples
    .map((s) => `${mapX(s.timeSec, durationAxis).toFixed(1)},${mapY(s.speedKmh).toFixed(1)}`)
    .join(' ');

  const limitPoints = samples
    .map((s) => `${mapX(s.timeSec, durationAxis).toFixed(1)},${mapY(s.speedLimitKmh).toFixed(1)}`)
    .join(' ');

  const areaPath =
    samples.length >= 2
      ? `M ${mapX(samples[0].timeSec, durationAxis).toFixed(1)},${(PAD_TOP + PLOT_H).toFixed(1)} ` +
        samples
          .map((s) => `L ${mapX(s.timeSec, durationAxis).toFixed(1)},${mapY(s.speedKmh).toFixed(1)}`)
          .join(' ') +
        ` L ${mapX(samples[samples.length - 1].timeSec, durationAxis).toFixed(1)},${(PAD_TOP + PLOT_H).toFixed(1)} Z`
      : '';

  const gridLevels = [0, 30, 60, 90];

  return (
    <section
      aria-label={tr('Tachograf kolejowy — wykres prędkości', 'Rail Tachograph — speed chart')}
      data-testid="tachograph-chart"
      className="mb-4 rounded-md border border-slate-700/90 bg-[#080c13] p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div>
          <p className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-cyan-300 font-bold">
            {tr('Tachograf · Rejestrator prędkości (1 Hz)', 'Tachograph · Speed Recorder (1 Hz)')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono-tabular text-slate-300">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-sky-400 inline-block" />
            {tr(`Prędkość (maks. ${Math.round(maxSpeedKmh)} km/h)`, `Speed (max ${Math.round(maxSpeedKmh)} km/h)`)}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-red-400 inline-block" />
            {tr('Limit', 'Limit')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            {tr(`Wykroczenia (${violationMarks.length})`, `Violations (${violationMarks.length})`)}
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full h-auto block select-none"
        role="img"
        aria-label={tr(
          'Wykres prędkości pociągu względem limitu prędkości na trasie',
          'Train speed chart compared to route speed limits',
        )}
      >
        <defs>
          <linearGradient id="tachoSpeedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <rect
          x={PAD_LEFT}
          y={PAD_TOP}
          width={PLOT_W}
          height={PLOT_H}
          fill="#0b111c"
          stroke="#1e293b"
          strokeWidth={1}
        />

        {gridLevels.map((kmh) => {
          const y = mapY(kmh);
          return (
            <g key={kmh}>
              <line
                x1={PAD_LEFT}
                y1={y}
                x2={PAD_LEFT + PLOT_W}
                y2={y}
                stroke="#1e293b"
                strokeWidth={1}
              />
              <text
                x={PAD_LEFT - 5}
                y={y + 3}
                textAnchor="end"
                fill="#94a3b8"
                fontSize={9}
                fontFamily="JetBrains Mono, monospace"
              >
                {kmh}
              </text>
            </g>
          );
        })}

        {stationMarks.map((mark, idx) => {
          const x = mapX(mark.timeSec, durationAxis);
          return (
            <g key={`${mark.stationCode}-${idx}`} data-testid="tachograph-station-mark">
              <line
                x1={x}
                y1={PAD_TOP}
                x2={x}
                y2={PAD_TOP + PLOT_H}
                stroke="#f59e0b"
                strokeOpacity={0.55}
                strokeWidth={1}
                strokeDasharray="2 2"
              />
              <text
                x={x}
                y={PAD_TOP - 4}
                textAnchor="middle"
                fill="#fcd34d"
                fontSize={8.5}
                fontWeight="700"
                fontFamily="JetBrains Mono, monospace"
              >
                {mark.stationCode}
              </text>
            </g>
          );
        })}

        {areaPath && <path d={areaPath} fill="url(#tachoSpeedFill)" />}

        {limitPoints && (
          <polyline
            data-testid="tachograph-limit-line"
            points={limitPoints}
            fill="none"
            stroke="#ef4444"
            strokeWidth={1.6}
            strokeDasharray="5 4"
          />
        )}

        {speedPoints && (
          <polyline
            data-testid="tachograph-speed-line"
            points={speedPoints}
            fill="none"
            stroke="#38bdf8"
            strokeWidth={2.2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {violationMarks.map((v, idx) => (
          <circle
            key={`${v.kind}-${v.timeSec}-${idx}`}
            data-testid="tachograph-violation-dot"
            cx={mapX(v.timeSec, durationAxis)}
            cy={mapY(v.speedKmh)}
            r={3.8}
            fill="#ef4444"
            stroke="#fef2f2"
            strokeWidth={1.2}
          />
        ))}

        <text
          x={PAD_LEFT}
          y={CHART_HEIGHT - 6}
          textAnchor="start"
          fill="#64748b"
          fontSize={9}
          fontFamily="JetBrains Mono, monospace"
        >
          0:00
        </text>
        <text
          x={PAD_LEFT + PLOT_W / 2}
          y={CHART_HEIGHT - 6}
          textAnchor="middle"
          fill="#64748b"
          fontSize={9}
          fontFamily="JetBrains Mono, monospace"
        >
          {formatAxisTime(durationAxis / 2)}
        </text>
        <text
          x={PAD_LEFT + PLOT_W}
          y={CHART_HEIGHT - 6}
          textAnchor="end"
          fill="#64748b"
          fontSize={9}
          fontFamily="JetBrains Mono, monospace"
        >
          {formatAxisTime(durationAxis)}
        </text>
      </svg>
    </section>
  );
}
