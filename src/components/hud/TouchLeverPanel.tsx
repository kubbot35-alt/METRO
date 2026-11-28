import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { canEnableAtoForMode } from '../../domain/atoSystem';
import { computeThumbSliderAxis, triggerSubtleTouchHaptic } from '../../domain/mobileTouch';
import type { ISimulationSnapshot } from '../../domain/types';
import { useI18n } from '../../i18n/LanguageContext';

interface ITouchLeverPanelProps {
  readonly snapshot: ISimulationSnapshot;
  readonly highlightRing: string;
  readonly academyHighlight: string | null;
  readonly onLeverChange: (axis: number | null) => void;
  readonly onToggleAto: () => void;
  readonly onToggleCabLight: () => void;
}

function getLeverLabel(emergency: boolean, clamped: number, tr: (p: string, e: string) => string): string {
  if (emergency) {
    return tr('AWAR.', 'E-BRK');
  }
  if (clamped > 0.04) {
    return `+${Math.round(clamped * 100)}%`;
  }
  return clamped < -0.04 ? `${Math.round(clamped * 100)}%` : tr('0 / LUZ', '0 / IDLE');
}

function getThumbClasses(emergency: boolean, clamped: number): string {
  if (emergency) {
    return 'bg-red-500 border-red-200';
  }
  if (clamped > 0.04) {
    return 'bg-emerald-400 border-emerald-100';
  }
  return clamped < -0.04 ? 'bg-amber-400 border-amber-100' : 'bg-slate-200 border-white';
}

function TouchLeverTopBar({
  atoEnabled, atoAllowed, cabLightOn, onToggleAto, onToggleCabLight,
}: {
  readonly atoEnabled: boolean; readonly atoAllowed: boolean; readonly cabLightOn: boolean;
  readonly onToggleAto: () => void; readonly onToggleCabLight: () => void;
}) {
  const { tr } = useI18n();
  const atoCls = atoEnabled ? 'bg-emerald-500 border-emerald-200 text-slate-950' : atoAllowed ? 'bg-slate-800 border-emerald-500/60 text-emerald-200 active:bg-slate-700' : 'bg-slate-900 border-slate-700 text-slate-500';
  const cabCls = cabLightOn ? 'bg-amber-400 border-amber-200 text-slate-950' : 'bg-slate-800 border-slate-600 text-slate-300';
  return (
    <div className="w-full flex items-center gap-1">
      <button type="button" data-testid="touch-ato-btn" aria-pressed={atoEnabled} onClick={() => { triggerSubtleTouchHaptic(15); onToggleAto(); }} className={`flex-1 px-1 py-1 rounded-md border text-[9px] font-mono-tabular font-bold whitespace-nowrap touch-none cursor-pointer ${atoCls}`}>
        ATO
      </button>
      <button type="button" data-testid="touch-cab-light-btn" aria-pressed={cabLightOn} onClick={() => { triggerSubtleTouchHaptic(15); onToggleCabLight(); }} className={`px-1.5 py-1 rounded-md border text-[9px] font-mono-tabular font-bold whitespace-nowrap touch-none cursor-pointer ${cabCls}`}>
        {tr('KAB', 'CAB')}
      </button>
    </div>
  );
}

function useSliderDragHandlers(onLeverChange: (axis: number | null) => void) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<boolean>(false);
  const applyAxis = (clientY: number): void => {
    const el = trackRef.current;
    if (el) onLeverChange(computeThumbSliderAxis((clientY - el.getBoundingClientRect().top) / Math.max(el.getBoundingClientRect().height, 1)));
  };
  const onDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
    e.currentTarget.setPointerCapture(e.pointerId); draggingRef.current = true; triggerSubtleTouchHaptic(15); applyAxis(e.clientY);
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>): void => { if (draggingRef.current) applyAxis(e.clientY); };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  return { trackRef, onDown, onMove, onUp };
}

function TouchLeverTrack({ emergency, clamped, highlighted, highlightRing, onLeverChange }: {
  readonly emergency: boolean; readonly clamped: number; readonly highlighted: boolean;
  readonly highlightRing: string; readonly onLeverChange: (axis: number | null) => void;
}) {
  const { tr } = useI18n();
  const drag = useSliderDragHandlers(onLeverChange);
  const thumbTopPct = Math.max(12, Math.min(88, ((1 - clamped) / 2) * 100));
  return (
    <div ref={drag.trackRef} role="slider" aria-label={tr('Dotykowy nastawnik jazdy i hamowania', 'Touch master controller')} aria-valuemin={-100} aria-valuemax={100} aria-valuenow={Math.round(clamped * 100)} data-testid="mobile-lever-slider" onPointerDown={drag.onDown} onPointerMove={drag.onMove} onPointerUp={drag.onUp} onPointerCancel={drag.onUp} className={`relative w-12 h-[112px] [@media(min-height:560px)]:h-[168px] rounded-lg border-2 border-slate-600/90 bg-[#060a10] touch-none flex justify-center cursor-ns-resize ${highlighted ? highlightRing : ''}`}>
      <div className="absolute top-2 bottom-1/2 w-2.5 rounded-t bg-emerald-500/25 pointer-events-none" /><div className="absolute top-1/2 bottom-2 w-2.5 rounded-b bg-amber-500/25 pointer-events-none" />
      <div className="absolute top-1/2 inset-x-1 h-0.5 bg-slate-300/80 pointer-events-none" />
      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] font-mono-tabular font-bold text-slate-300 bg-[#060a10]/90 px-1 rounded pointer-events-none">0</span>
      <div data-testid="mobile-lever-thumb" className={`absolute left-1 right-1 h-6 [@media(min-height:560px)]:h-7 -translate-y-1/2 rounded-md border-2 shadow-lg pointer-events-none flex items-center justify-center ${getThumbClasses(emergency, clamped)}`} style={{ top: `${thumbTopPct}%` }}><span className="w-5 h-0.5 bg-slate-950/70 rounded" /></div>
    </div>
  );
}

export function TouchLeverPanel({ snapshot, highlightRing, academyHighlight, onLeverChange, onToggleAto, onToggleCabLight }: ITouchLeverPanelProps) {
  const { tr } = useI18n();
  const emergency = snapshot.kinematics.emergencyBrake;
  const clamped = emergency ? -1 : Math.max(-1, Math.min(1, snapshot.leverTarget));
  return (
    <div className="pointer-events-auto flex flex-col items-center gap-1 bg-[#0a1019]/90 border border-slate-700/85 rounded-xl px-2 py-1.5 shadow-2xl touch-none">
      <TouchLeverTopBar atoEnabled={snapshot.atoEnabled} atoAllowed={canEnableAtoForMode(snapshot.gameMode)} cabLightOn={snapshot.cabLightOn} onToggleAto={onToggleAto} onToggleCabLight={onToggleCabLight} />
      <span className="text-[9px] font-mono-tabular font-bold uppercase tracking-wider text-emerald-300 leading-none">{tr('MOC +', 'PWR +')}</span>
      <TouchLeverTrack emergency={emergency} clamped={clamped} highlighted={academyHighlight === 'throttle'} highlightRing={highlightRing} onLeverChange={onLeverChange} />
      <span className="text-[9px] font-mono-tabular font-bold uppercase tracking-wider text-amber-300 leading-none">{tr('HAM −', 'BRK −')}</span>
      <button type="button" data-testid="mobile-lever-neutral" onClick={() => { triggerSubtleTouchHaptic(15); onLeverChange(0); }} className="w-full px-1.5 py-1 rounded-md bg-slate-800 active:bg-slate-700 border border-slate-600 text-[10px] font-mono-tabular font-bold text-slate-100 whitespace-nowrap touch-none cursor-pointer">{getLeverLabel(emergency, clamped, tr)}</button>
    </div>
  );
}
