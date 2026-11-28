import type { IRadioDispatchState } from '../domain/types';

interface IRadioDispatchModuleProps {
  readonly radio: IRadioDispatchState;
  readonly highlighted?: boolean;
  readonly onAcknowledge: () => void;
}

function getRadioButtonClass(isIncoming: boolean, highlighted: boolean): string {
  const tone = isIncoming
    ? 'bg-cyan-500 hover:bg-cyan-400 border-cyan-200 text-slate-950 font-bold shadow-[0_0_12px_rgba(34,211,238,0.65)]'
    : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800';
  const ring = highlighted ? 'ring-2 ring-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.85)] animate-pulse' : '';
  return `px-1 py-1 rounded text-[10px] font-mono-tabular font-semibold whitespace-nowrap cursor-pointer flex items-center justify-center gap-1 border transition-colors ${tone} ${ring}`;
}

export function RadioDispatchModule({ radio, highlighted = false, onAcknowledge }: IRadioDispatchModuleProps) {
  const isIncoming = radio.active;
  const dotCls = isIncoming ? 'bg-slate-950' : radio.slipperyRailsActive ? 'bg-amber-400' : 'bg-emerald-500/75';
  return (
    <button
      type="button" data-testid="radio-ack-btn" data-active={isIncoming ? '1' : '0'} data-academy-highlight={highlighted ? '1' : '0'}
      onClick={(e) => { e.currentTarget.blur(); onAcknowledge(); }}
      className={getRadioButtonClass(isIncoming, highlighted)}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}`} aria-hidden="true" />
      <span>{isIncoming ? `RADIO ${Math.ceil(radio.remainingSec)}s` : 'RADIO [R]'}</span>
    </button>
  );
}
