import type { IRadioDispatchState } from '../domain/types';

interface IRadioDispatchModuleProps {
  readonly radio: IRadioDispatchState;
  readonly highlighted?: boolean;
  readonly onAcknowledge: () => void;
}

export function RadioDispatchModule({
  radio,
  highlighted = false,
  onAcknowledge,
}: IRadioDispatchModuleProps) {
  const isIncoming = radio.active;
  return (
    <button
      type="button"
      data-testid="radio-ack-btn"
      data-active={isIncoming ? '1' : '0'}
      data-academy-highlight={highlighted ? '1' : '0'}
      onClick={(e) => {
        e.currentTarget.blur();
        onAcknowledge();
      }}
      className={`px-1 py-1 rounded text-[10px] font-mono-tabular font-semibold whitespace-nowrap cursor-pointer flex items-center justify-center gap-1 border transition-colors ${
        isIncoming
          ? 'bg-cyan-500 hover:bg-cyan-400 border-cyan-200 text-slate-950 font-bold shadow-[0_0_12px_rgba(34,211,238,0.65)]'
          : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
      } ${highlighted ? 'ring-2 ring-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.85)] animate-pulse' : ''}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          isIncoming ? 'bg-slate-950' : radio.slipperyRailsActive ? 'bg-amber-400' : 'bg-emerald-500/75'
        }`}
        aria-hidden="true"
      />
      <span>{isIncoming ? `RADIO ${Math.ceil(radio.remainingSec)}s` : 'RADIO [R]'}</span>
    </button>
  );
}
