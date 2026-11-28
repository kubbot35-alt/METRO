import type { ITachographSample, ITachographStationMark, ITachographViolationMark } from '../../domain/types';
import { useI18n } from '../../i18n/LanguageContext';

export const CHART_WIDTH = 560;
export const CHART_HEIGHT = 152;
export const PAD_LEFT = 36;
export const PAD_TOP = 16;
export const PLOT_W = CHART_WIDTH - PAD_LEFT - 14;
export const PLOT_H = CHART_HEIGHT - PAD_TOP - 24;

export function mapX(timeSec: number, totalDurationSec: number): number {
  return PAD_LEFT + Math.max(0, Math.min(1, timeSec / Math.max(totalDurationSec, 1))) * PLOT_W;
}

export function mapY(speedKmh: number): number {
  return PAD_TOP + (1 - Math.max(0, Math.min(1, speedKmh / 100))) * PLOT_H;
}

export function formatAxisTime(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}

export function buildTachographPaths(samples: readonly ITachographSample[], durationAxis: number) {
  const speedPoints = samples.map((s) => `${mapX(s.timeSec, durationAxis).toFixed(1)},${mapY(s.speedKmh).toFixed(1)}`).join(' ');
  const limitPoints = samples.map((s) => `${mapX(s.timeSec, durationAxis).toFixed(1)},${mapY(s.speedLimitKmh).toFixed(1)}`).join(' ');
  const baseY = (PAD_TOP + PLOT_H).toFixed(1);
  const areaPath = samples.length >= 2
    ? `M ${mapX(samples[0].timeSec, durationAxis).toFixed(1)},${baseY} ${samples.map((s) => `L ${mapX(s.timeSec, durationAxis).toFixed(1)},${mapY(s.speedKmh).toFixed(1)}`).join(' ')} L ${mapX(samples[samples.length - 1].timeSec, durationAxis).toFixed(1)},${baseY} Z`
    : '';
  return { speedPoints, limitPoints, areaPath };
}

export function TachographLegend({ maxSpeedKmh, violationCount }: { readonly maxSpeedKmh: number; readonly violationCount: number }) {
  const { tr } = useI18n();
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
      <p className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-cyan-300 font-bold">
        {tr('Tachograf · Rejestrator prędkości (1 Hz)', 'Tachograph · Speed Recorder (1 Hz)')}
      </p>
      <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono-tabular text-slate-300">
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-sky-400 inline-block" />{tr(`Prędkość (maks. ${Math.round(maxSpeedKmh)} km/h)`, `Speed (max ${Math.round(maxSpeedKmh)} km/h)`)}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 border-t-2 border-dashed border-red-400 inline-block" />{tr('Limit', 'Limit')}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />{tr(`Wykroczenia (${violationCount})`, `Violations (${violationCount})`)}</span>
      </div>
    </div>
  );
}

export function TachographGridLines() {
  return (
    <>
      {[0, 30, 60, 90].map((kmh) => {
        const y = mapY(kmh);
        return (
          <g key={kmh}>
            <line x1={PAD_LEFT} y1={y} x2={PAD_LEFT + PLOT_W} y2={y} stroke="#1e293b" strokeWidth={1} />
            <text x={PAD_LEFT - 5} y={y + 3} textAnchor="end" fill="#94a3b8" fontSize={9} fontFamily="JetBrains Mono, monospace">{kmh}</text>
          </g>
        );
      })}
    </>
  );
}

interface ITachographStationMarksProps {
  readonly marks: readonly ITachographStationMark[];
  readonly violations: readonly ITachographViolationMark[];
  readonly durationAxis: number;
}

export function TachographStationMarks({ marks, violations, durationAxis }: ITachographStationMarksProps) {
  return (
    <>
      {marks.map((mark, idx) => {
        const x = mapX(mark.timeSec, durationAxis);
        return (
          <g key={`${mark.stationCode}-${idx}`} data-testid="tachograph-station-mark">
            <line x1={x} y1={PAD_TOP} x2={x} y2={PAD_TOP + PLOT_H} stroke="#f59e0b" strokeOpacity={0.55} strokeWidth={1} strokeDasharray="2 2" />
            <text x={x} y={PAD_TOP - 4} textAnchor="middle" fill="#fcd34d" fontSize={8.5} fontWeight="700" fontFamily="JetBrains Mono, monospace">{mark.stationCode}</text>
          </g>
        );
      })}
      {violations.map((v, idx) => (
        <circle key={`${v.kind}-${v.timeSec}-${idx}`} data-testid="tachograph-violation-dot" cx={mapX(v.timeSec, durationAxis)} cy={mapY(v.speedKmh)} r={3.8} fill="#ef4444" stroke="#fef2f2" strokeWidth={1.2} />
      ))}
    </>
  );
}

export function TachographTimeAxis({ durationAxis }: { readonly durationAxis: number }) {
  const labels = [
    { x: PAD_LEFT, anchor: 'start' as const, text: '0:00' },
    { x: PAD_LEFT + PLOT_W / 2, anchor: 'middle' as const, text: formatAxisTime(durationAxis / 2) },
    { x: PAD_LEFT + PLOT_W, anchor: 'end' as const, text: formatAxisTime(durationAxis) },
  ];
  return (
    <>
      {labels.map((l) => (
        <text key={l.anchor} x={l.x} y={CHART_HEIGHT - 6} textAnchor={l.anchor} fill="#64748b" fontSize={9} fontFamily="JetBrains Mono, monospace">
          {l.text}
        </text>
      ))}
    </>
  );
}
