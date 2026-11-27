import type { ISemaphoreProgress, SignalAspect } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';

interface ISignalIndicatorProps {
  readonly nextSignal: ISemaphoreProgress | null;
  readonly atpActive: boolean;
  readonly highlighted?: boolean;
}

function getAspectLabel(
  aspect: SignalAspect,
  waitSec: number | null,
  tr: (pl: string, en: string) => string,
): { text: string; toneClass: string } {
  if (aspect === 'red') {
    if (waitSec !== null) {
      return { text: `${tr('CZEKAJ', 'WAIT')} ${waitSec.toFixed(1)} s`, toneClass: 'text-amber-300 font-bold' };
    }
    return { text: tr('STÓJ · CZERWONE', 'STOP · RED'), toneClass: 'text-red-400 font-bold' };
  }
  if (aspect === 'yellow') {
    return { text: tr('UWAGA · 30 km/h', 'CAUTION · 30 km/h'), toneClass: 'text-amber-400 font-bold' };
  }
  return { text: tr('WOLNA DROGA', 'CLEAR TRACK'), toneClass: 'text-emerald-400 font-semibold' };
}

export function SignalIndicator({
  nextSignal,
  atpActive,
  highlighted = false,
}: ISignalIndicatorProps) {
  const { tr } = useI18n();
  const aspect: SignalAspect = nextSignal?.signal.aspect ?? 'green';
  const distM = nextSignal ? Math.max(0, Math.round(nextSignal.distanceAheadM)) : null;
  const status = getAspectLabel(aspect, nextSignal?.signal.waitRemainingSec ?? null, tr);

  return (
    <div
      data-academy-highlight={highlighted ? '1' : '0'}
      className={`border-l border-slate-800 pl-3.5 flex items-center gap-2.5 shrink-0 rounded-md py-1 pr-2 ${
        highlighted ? 'ring-2 ring-cyan-300 bg-cyan-500/10 shadow-[0_0_16px_rgba(34,211,238,0.65)] animate-pulse' : ''
      }`}
      aria-label={
        nextSignal
          ? tr(`Semafor ${aspect}, odległość ${distM} metrów`, `Signal ${aspect}, distance ${distM} meters`)
          : tr('Brak kolejnych semaforów', 'No further signals')
      }
    >
      <svg width="20" height="54" viewBox="0 0 20 54" aria-hidden="true" className="shrink-0">
        <rect x="1" y="1" width="18" height="52" rx="5" fill="#090c12" stroke="#334155" strokeWidth="1.5" />
        <circle cx="10" cy="12" r="5.2" fill={aspect === 'red' ? '#ef4444' : '#3f1d1d'} />
        <circle cx="10" cy="27" r="5.2" fill={aspect === 'yellow' ? '#f59e0b' : '#3b2d12'} />
        <circle cx="10" cy="42" r="5.2" fill={aspect === 'green' ? '#10b981' : '#123328'} />
      </svg>

      <div className="flex flex-col leading-tight min-w-[106px]">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
            {tr('Semafor', 'Signal')}
          </span>
          <span className="font-mono-tabular text-xs font-bold text-slate-100">
            {distM !== null ? `${distM} m` : '—'}
          </span>
        </div>
        <span className={`text-[11px] font-mono-tabular mt-1 whitespace-nowrap ${status.toneClass}`}>
          {atpActive ? tr('ATP HAMOWANIE', 'ATP BRAKING') : status.text}
        </span>
        <span className="text-[10px] font-mono-tabular text-slate-500 mt-0.5">
          {atpActive ? tr('System bezpieczeństwa', 'Safety interlock') : tr('Blokada tunelu', 'Tunnel block')}
        </span>
      </div>
    </div>
  );
}
