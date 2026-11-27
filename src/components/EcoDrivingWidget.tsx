import type { EcoDrivingGrade, IEcoDrivingState } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';

interface IEcoDrivingWidgetProps {
  readonly eco: IEcoDrivingState;
  readonly supportsRegen: boolean;
  readonly compact?: boolean;
}

const ECO_GRADE_BADGE_CLASSES: Record<EcoDrivingGrade, string> = {
  'A+': 'bg-emerald-500/25 border-emerald-400 text-emerald-200',
  A: 'bg-emerald-500/20 border-emerald-400/75 text-emerald-200',
  B: 'bg-sky-500/20 border-sky-400/75 text-sky-200',
  C: 'bg-amber-500/20 border-amber-400/75 text-amber-200',
  D: 'bg-red-500/20 border-red-400/75 text-red-200',
};

const MAX_DISPLAY_POWER_KW = 2850;

export function EcoDrivingWidget({
  eco,
  supportsRegen,
  compact = false,
}: IEcoDrivingWidgetProps) {
  const { tr } = useI18n();
  const powerKw = Math.round(eco.currentPowerKw);
  const absRatio = Math.min(1, Math.abs(eco.currentPowerKw) / MAX_DISPLAY_POWER_KW);
  const barPct = Math.round(absRatio * 100);
  const isDrawingPower = eco.currentPowerKw > 25;
  const isRegen = eco.regeneratingActive;
  const isCoasting = eco.coastingActive;

  const powerColorClass = isRegen
    ? 'text-emerald-300'
    : isCoasting
      ? 'text-cyan-300'
      : isDrawingPower
        ? eco.currentPowerKw > 1900
          ? 'text-red-400'
          : 'text-amber-300'
        : 'text-slate-300';

  const barColorClass = isRegen
    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.75)]'
    : isCoasting
      ? 'bg-cyan-400/80'
      : eco.currentPowerKw > 1900
        ? 'bg-gradient-to-r from-amber-500 to-red-500'
        : 'bg-amber-400';

  if (compact) {
    return (
      <div
        data-testid="eco-driving-widget-compact"
        data-eco-grade={eco.grade}
        className="flex items-center gap-1.5 font-mono-tabular text-[9.5px] shrink-0"
      >
        <span
          className={`px-1 py-0.5 rounded border font-bold ${ECO_GRADE_BADGE_CLASSES[eco.grade]}`}
        >
          ECO {eco.grade}
        </span>
        <div className="flex flex-col leading-tight">
          <span className={`font-bold ${powerColorClass}`}>
            {powerKw > 0 ? `+${powerKw}` : powerKw} kW
          </span>
          <span className="text-slate-400">{eco.netEnergyKwh.toFixed(1)} kWh</span>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="eco-driving-widget"
      data-eco-grade={eco.grade}
      data-eco-regen={isRegen ? '1' : '0'}
      data-eco-coast={isCoasting ? '1' : '0'}
      className="flex items-center justify-between gap-2 pt-0.5 border-t border-slate-800/80 font-mono-tabular text-[10px]"
    >
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-slate-400 uppercase tracking-wider">ECO</span>
        <span
          data-testid="eco-grade-badge"
          className={`px-1.5 py-0.5 rounded border text-[9.5px] font-bold leading-none ${ECO_GRADE_BADGE_CLASSES[eco.grade]}`}
        >
          {eco.grade}
        </span>
        {isRegen ? (
          <span
            data-testid="eco-regen-badge"
            className="px-1 py-0.5 rounded bg-emerald-500/25 border border-emerald-400/80 text-emerald-200 text-[8.5px] font-bold uppercase tracking-wide animate-pulse"
          >
            {tr('REKUPERACJA', 'REGEN')}
          </span>
        ) : isCoasting ? (
          <span
            data-testid="eco-coast-badge"
            className="px-1 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/70 text-cyan-200 text-[8.5px] font-bold uppercase tracking-wide"
          >
            {tr('WYBIEG', 'COAST')}
          </span>
        ) : !supportsRegen ? (
          <span className="text-[8.5px] text-slate-400 hidden xl:inline">
            {tr('BEZ REKUP.', 'NO REGEN')}
          </span>
        ) : null}
      </div>

      <div className="flex-1 max-w-[115px] h-1.5 bg-slate-900 rounded overflow-hidden border border-slate-800">
        <div
          data-testid="eco-power-bar"
          className={`h-full transition-all duration-150 ${barColorClass}`}
          style={{ width: `${isCoasting ? 18 : Math.max(4, barPct)}%` }}
        />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span data-testid="eco-power-kw" className={`font-bold ${powerColorClass}`}>
          {powerKw > 0 ? `+${powerKw}` : powerKw} kW
        </span>
        <span data-testid="eco-energy-kwh" className="text-slate-200 font-semibold">
          {eco.netEnergyKwh.toFixed(2)} kWh
        </span>
      </div>
    </div>
  );
}
