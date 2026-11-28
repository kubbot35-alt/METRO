import type { ITachographSnapshot } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';
import {
  CHART_HEIGHT,
  CHART_WIDTH,
  PAD_LEFT,
  PAD_TOP,
  PLOT_H,
  PLOT_W,
  TachographGridLines,
  TachographLegend,
  TachographStationMarks,
  TachographTimeAxis,
  buildTachographPaths,
} from './modals/TachographSvgContent';

interface ITachographChartProps {
  readonly tachograph: ITachographSnapshot;
}

function TachographFillGradient() {
  return (
    <defs>
      <linearGradient id="tachoSpeedFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
        <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
      </linearGradient>
    </defs>
  );
}

export function TachographChart({ tachograph }: ITachographChartProps) {
  const { tr } = useI18n();
  const { samples, stationMarks, violationMarks, maxSpeedKmh, totalDurationSec } = tachograph;
  const durationAxis = Math.max(totalDurationSec, samples[samples.length - 1]?.timeSec ?? 1, 1);
  const { speedPoints, limitPoints, areaPath } = buildTachographPaths(samples, durationAxis);
  return (
    <section aria-label={tr('Tachograf kolejowy — wykres prędkości', 'Rail Tachograph — speed chart')} data-testid="tachograph-chart" className="mb-4 rounded-md border border-slate-700/90 bg-[#080c13] p-3">
      <TachographLegend maxSpeedKmh={maxSpeedKmh} violationCount={violationMarks.length} />
      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="w-full h-auto block select-none" role="img" aria-label={tr('Wykres prędkości pociągu względem limitu prędkości na trasie', 'Train speed chart compared to route speed limits')}>
        <TachographFillGradient />
        <rect x={PAD_LEFT} y={PAD_TOP} width={PLOT_W} height={PLOT_H} fill="#0b111c" stroke="#1e293b" strokeWidth={1} />
        <TachographGridLines />
        <TachographStationMarks marks={stationMarks} violations={violationMarks} durationAxis={durationAxis} />
        {areaPath && <path d={areaPath} fill="url(#tachoSpeedFill)" />}
        {limitPoints && <polyline data-testid="tachograph-limit-line" points={limitPoints} fill="none" stroke="#ef4444" strokeWidth={1.6} strokeDasharray="5 4" />}
        {speedPoints && <polyline data-testid="tachograph-speed-line" points={speedPoints} fill="none" stroke="#38bdf8" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />}
        <TachographTimeAxis durationAxis={durationAxis} />
      </svg>
    </section>
  );
}
