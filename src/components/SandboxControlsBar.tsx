import type { SignalAspect } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';

interface ISandboxControlsBarProps {
  readonly nextSignalAspect: SignalAspect | undefined;
  readonly oncomingActive: boolean;
  readonly onSpawnOncoming: () => void;
  readonly onCycleSignal: () => void;
}

export function SandboxControlsBar({ nextSignalAspect, oncomingActive, onSpawnOncoming, onCycleSignal }: ISandboxControlsBarProps) {
  const { tr } = useI18n();
  const aspectLabel = nextSignalAspect === 'red' ? tr('Czerwone', 'Red') : nextSignalAspect === 'yellow' ? tr('Żółte', 'Yellow') : tr('Zielone', 'Green');
  return (
    <div data-testid="sandbox-controls" className="pointer-events-auto mt-1.5 bg-[#0e1522]/94 border border-cyan-500/55 rounded-md px-2.5 py-1.5 flex items-center gap-2 shadow-lg">
      <span className="px-1.5 py-0.5 rounded-xs bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-mono-tabular text-[10px] font-bold tracking-wider uppercase">
        SANDBOX
      </span>
      <button type="button" tabIndex={-1} data-testid="sandbox-spawn-train-btn" onClick={(e) => { e.currentTarget.blur(); onSpawnOncoming(); }} className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[11px] font-mono-tabular font-semibold text-slate-100 cursor-pointer">
        {oncomingActive ? tr('Mijanka aktywna', 'AI Train Active') : tr('+ Wywołaj mijankę', '+ Spawn AI Train')}
      </button>
      <button type="button" tabIndex={-1} data-testid="sandbox-cycle-signal-btn" onClick={(e) => { e.currentTarget.blur(); onCycleSignal(); }} className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[11px] font-mono-tabular font-semibold text-amber-200 cursor-pointer">
        {tr('Semafor', 'Signal')}: {aspectLabel} ↻
      </button>
    </div>
  );
}
