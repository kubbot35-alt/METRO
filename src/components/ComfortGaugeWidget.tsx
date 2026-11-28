import type { IPassengerComfortState } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';

interface IComfortGaugeWidgetProps {
  readonly comfort: IPassengerComfortState;
  readonly compact?: boolean;
}

function ComfortCompactView({ pct, textColor, highG, totalG }: { readonly pct: number; readonly textColor: string; readonly highG: boolean; readonly totalG: number }) {
  return (
    <div data-testid="comfort-gauge-compact" className="flex flex-col leading-tight text-[9.5px] font-mono-tabular shrink-0">
      <span className={`font-bold ${textColor}`}>{pct}%</span>
      <span className={highG ? 'text-amber-300 font-bold' : 'text-slate-400'}>{totalG.toFixed(2)}G</span>
    </div>
  );
}

function ComfortPercentBar({ pct, barColor, textColor, smooth }: { readonly pct: number; readonly barColor: string; readonly textColor: string; readonly smooth: boolean }) {
  const { tr } = useI18n();
  return (
    <div className="flex items-center gap-1 flex-1 min-w-0">
      <span className="text-slate-400 uppercase whitespace-nowrap shrink-0">{tr('Komfort', 'Comfort')}</span>
      <div className="flex-1 h-1.5 bg-slate-800 rounded overflow-hidden min-w-[20px]">
        <div className={`h-full transition-all duration-150 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`font-bold whitespace-nowrap shrink-0 ${textColor}`}>{pct}%</span>
      {smooth && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title={tr('Płynna jazda', 'Smooth driving')} aria-hidden="true" />}
    </div>
  );
}

function ComfortGForceMeter({ dotLeftPct, highG, totalG }: { readonly dotLeftPct: number; readonly highG: boolean; readonly totalG: number }) {
  const { tr } = useI18n();
  return (
    <div className="flex items-center gap-1 shrink-0 pl-1.5 border-l border-slate-800" title={tr('Przeciążenie wzdłużne / poprzeczne (G-Force)', 'Longitudinal / lateral G-Force')}>
      <div className="relative w-7 h-1.5 bg-slate-800 rounded overflow-hidden">
        <div className="absolute inset-y-0 left-1/2 w-px bg-slate-600" />
        <div
          className={`absolute top-0 bottom-0 w-1.5 rounded -translate-x-1/2 ${highG ? 'bg-amber-400' : 'bg-cyan-300'}`}
          style={{ left: `${Math.max(8, Math.min(92, dotLeftPct))}%` }}
        />
      </div>
      <span className={`whitespace-nowrap font-semibold ${highG ? 'text-amber-300' : 'text-slate-300'}`}>{totalG.toFixed(2)}G</span>
    </div>
  );
}

export function ComfortGaugeWidget({ comfort, compact = false }: IComfortGaugeWidgetProps) {
  const pct = Math.max(0, Math.min(100, Math.round(comfort.currentPercent)));
  const barColor = pct >= 85 ? 'bg-emerald-400' : pct >= 60 ? 'bg-amber-400' : 'bg-red-500';
  const textColor = pct >= 85 ? 'text-emerald-300' : pct >= 60 ? 'text-amber-300' : 'text-red-300';
  const longGClamped = Math.max(-0.25, Math.min(0.25, comfort.longitudinalG));
  const dotLeftPct = 50 + (longGClamped / 0.25) * 44;
  const highG = comfort.totalG >= 0.13;
  if (compact) {
    return <ComfortCompactView pct={pct} textColor={textColor} highG={highG} totalG={comfort.totalG} />;
  }
  return (
    <div data-testid="comfort-gauge-widget" className="flex items-center justify-between gap-1.5 pt-0.5 text-[10px] font-mono-tabular min-w-0">
      <ComfortPercentBar pct={pct} barColor={barColor} textColor={textColor} smooth={comfort.smoothDrivingActive} />
      <ComfortGForceMeter dotLeftPct={dotLeftPct} highG={highG} totalG={comfort.totalG} />
    </div>
  );
}
