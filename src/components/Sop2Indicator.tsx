import type { ISop2State, Sop2TargetReason } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';

interface ISop2IndicatorProps {
  readonly sop2: ISop2State;
  readonly compact?: boolean;
}

function getTargetReasonTag(reason: Sop2TargetReason, tr: (p: string, e: string) => string): string {
  if (reason === 'curve') return tr('ŁUK', 'CRV');
  if (reason === 'station') return tr('STAC', 'STN');
  if (reason === 'signal') return tr('SEM', 'SIG');
  if (reason === 'trackwork') return tr('ROB', 'WRK');
  return tr('LIM', 'LIM');
}

function getSop2ToneClasses(status: ISop2State['status']): { readonly box: string; readonly val: string; readonly badge: string } {
  if (status === 'intervention') {
    return {
      box: 'border-red-500 bg-red-950/95 shadow-[0_0_16px_rgba(239,68,68,0.45)] animate-pulse',
      val: 'text-red-100',
      badge: 'bg-red-500 text-white',
    };
  }
  if (status === 'warning') {
    return {
      box: 'border-orange-400 bg-orange-950/90 shadow-[0_0_12px_rgba(249,115,22,0.35)]',
      val: 'text-orange-200',
      badge: 'bg-orange-500 text-slate-950',
    };
  }
  return {
    box: 'border-slate-700/90 bg-[#0b1320]',
    val: 'text-amber-300',
    badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/45',
  };
}

function CompactSop2Badge({ sop2 }: { readonly sop2: ISop2State }) {
  const tone = getSop2ToneClasses(sop2.status);
  return (
    <div
      data-testid="sop2-indicator"
      data-status={sop2.status}
      className={`px-1.5 py-0.5 rounded border font-mono-tabular flex items-center gap-1 shrink-0 ${tone.box}`}
    >
      <span className="text-[8.5px] font-bold tracking-wider text-slate-300">SOP-2</span>
      <span className={`text-xs font-bold leading-none ${tone.val}`}>{sop2.currentLimitKmh}</span>
      {sop2.targetLimitKmh !== null && (
        <span className="text-[9px] text-sky-300 font-semibold">→{sop2.targetLimitKmh}</span>
      )}
    </div>
  );
}

export function Sop2Indicator({ sop2, compact = false }: ISop2IndicatorProps) {
  const { tr } = useI18n();
  if (compact) return <CompactSop2Badge sop2={sop2} />;
  const tone = getSop2ToneClasses(sop2.status);
  const badgeText = sop2.interventionActive
    ? tr('HAM!', 'BRK!')
    : sop2.status === 'warning'
      ? `+${Math.round(sop2.excessKmh)}`
      : sop2.interventionEnabled
        ? 'ATP'
        : tr('WYŁ', 'OFF');
  return (
    <div
      data-testid="sop2-indicator"
      data-status={sop2.status}
      aria-label={tr('System bezpieczeństwa SOP-2', 'SOP-2 ATP safety indicator')}
      className={`rounded-md border px-2 py-1.5 min-w-[94px] flex flex-col gap-0.5 font-mono-tabular shrink-0 transition-colors ${tone.box}`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-300">SOP-2</span>
        <span className={`px-1 py-0.25 rounded text-[8.5px] font-bold uppercase leading-tight ${tone.badge}`}>{badgeText}</span>
      </div>
      <div className="flex items-baseline justify-between gap-1">
        <span data-testid="sop2-current-limit" className={`text-xl font-bold leading-none ${tone.val}`}>{sop2.currentLimitKmh}</span>
        <span className="text-[9px] text-slate-400">km/h</span>
      </div>
      <div className="flex items-center justify-between gap-1 text-[9.5px] leading-none pt-0.5 border-t border-slate-800/80">
        {sop2.targetLimitKmh !== null ? (
          <>
            <span data-testid="sop2-target-limit" className="text-sky-300 font-bold">→ {sop2.targetLimitKmh}</span>
            <span className="text-slate-400">{getTargetReasonTag(sop2.targetReason, tr)} {sop2.targetDistanceM ?? 0}m</span>
          </>
        ) : (
          <span data-testid="sop2-target-limit" className="text-slate-500">{tr('Cel: brak', 'Target: —')}</span>
        )}
      </div>
    </div>
  );
}
