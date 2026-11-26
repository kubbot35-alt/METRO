import type { ICzuwakState } from '../domain/types';

interface ICzuwakIndicatorProps {
  readonly czuwak: ICzuwakState;
  readonly onAcknowledge: () => void;
}

export function CzuwakIndicator({ czuwak, onAcknowledge }: ICzuwakIndicatorProps) {
  return (
    <button
      type="button"
      data-testid="czuwak-button"
      aria-pressed={czuwak.active}
      onClick={(e) => {
        e.currentTarget.blur();
        onAcknowledge();
      }}
      className={`flex-1 px-2 py-1 rounded text-[11px] font-mono-tabular font-semibold whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 border ${
        czuwak.active
          ? 'bg-orange-500 border-orange-300 text-slate-950 font-bold shadow-lg'
          : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${czuwak.active ? 'bg-slate-950' : 'bg-orange-900'}`}
        aria-hidden="true"
      />
      <span>
        {czuwak.active ? `CZUWAK [C] ${czuwak.remainingSec.toFixed(1)}s` : 'Czuwak [C]'}
      </span>
    </button>
  );
}
