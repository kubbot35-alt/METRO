import type { TrainVisualTheme } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';
import { ModernLedDial } from './hud/ModernLedDial';
import { RetroAnalogDial } from './hud/RetroAnalogDial';
import { MAX_DIAL_KMH, START_ANGLE_DEG, SWEEP_DEG, formatGradeDisplay } from './hud/gaugeMath';

interface ISpeedometerGaugeProps {
  readonly speedKmh: number;
  readonly limitKmh: number;
  readonly isOverspeeding: boolean;
  readonly gradePercent: number;
  readonly inCurveLimitZone?: boolean;
  readonly theme: TrainVisualTheme;
}

function SpeedLimitAndGradeBadge({
  limitKmh,
  isOverspeeding,
  gradePercent,
  inCurveLimitZone,
  theme,
}: Omit<ISpeedometerGaugeProps, 'speedKmh'>) {
  const { tr } = useI18n();
  const grade = formatGradeDisplay(gradePercent);
  const circleCls = inCurveLimitZone ? 'bg-amber-300 border-slate-900' : isOverspeeding ? 'bg-slate-100 border-red-500' : 'bg-slate-100 border-red-600';
  const labelCls = isOverspeeding ? 'text-red-400 font-bold' : inCurveLimitZone ? 'text-amber-300 font-bold' : theme === 'retro' ? 'text-[#9bb8ad]' : 'text-slate-400';
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-11 h-11 rounded-full border-4 flex items-center justify-center ${circleCls}`} aria-label={`${tr('Ograniczenie prędkości', 'Speed limit')} ${limitKmh} km/h`}>
        <span className="font-mono-tabular text-[15px] font-bold text-slate-950">{limitKmh}</span>
      </div>
      <span className={`text-[9px] font-mono-tabular uppercase tracking-wider leading-none ${labelCls}`}>
        {isOverspeeding ? tr('ZA SZYBKO', 'OVERSPEED') : inCurveLimitZone ? tr('ŁUK', 'CURVE') : 'LIMIT'}
      </span>
      <span data-testid="track-grade-indicator" aria-label={`${tr('Nachylenie toru', 'Track grade')} ${grade.text}`} className={`px-1.5 py-0.5 rounded text-[10px] font-mono-tabular font-bold leading-none whitespace-nowrap border ${grade.colorClass}`}>
        {grade.text}
      </span>
    </div>
  );
}

export function SpeedometerGauge({
  speedKmh,
  limitKmh,
  isOverspeeding,
  gradePercent,
  inCurveLimitZone = false,
  theme,
}: ISpeedometerGaugeProps) {
  const clamped = Math.max(0, Math.min(MAX_DIAL_KMH, speedKmh));
  const limitAngle = START_ANGLE_DEG + (Math.min(limitKmh, MAX_DIAL_KMH) / MAX_DIAL_KMH) * SWEEP_DEG;
  const speedAngle = START_ANGLE_DEG + (clamped / MAX_DIAL_KMH) * SWEEP_DEG;
  return (
    <div className="flex items-center gap-3 shrink-0">
      {theme === 'retro' ? (
        <RetroAnalogDial speedKmh={speedKmh} speedAngle={speedAngle} limitAngle={limitAngle} isOverspeeding={isOverspeeding} />
      ) : (
        <ModernLedDial speedKmh={speedKmh} clamped={clamped} speedAngle={speedAngle} limitAngle={limitAngle} isOverspeeding={isOverspeeding} accentHex={theme === 'varsovia' ? '#22d3ee' : '#38bdf8'} />
      )}
      <SpeedLimitAndGradeBadge limitKmh={limitKmh} isOverspeeding={isOverspeeding} gradePercent={gradePercent} inCurveLimitZone={inCurveLimitZone} theme={theme} />
    </div>
  );
}
