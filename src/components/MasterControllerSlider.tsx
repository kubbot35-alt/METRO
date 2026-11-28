import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { TrainVisualTheme } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';

interface IMasterControllerSliderProps {
  readonly leverTarget: number;
  readonly emergencyBrake: boolean;
  readonly theme: TrainVisualTheme;
  readonly highlighted?: boolean;
  readonly onLeverChange: (axis: number | null) => void;
}

function computeSliderAxis(el: HTMLDivElement | null, clientY: number): number {
  if (!el) return 0;
  const rect = el.getBoundingClientRect();
  const ratio = (clientY - rect.top) / Math.max(rect.height, 1);
  const raw = 1 - Math.max(0, Math.min(1, ratio)) * 2;
  return Math.abs(raw) < 0.08 ? 0 : Math.max(-1, Math.min(1, raw));
}

function getHandleColorClass(emergencyBrake: boolean, clamped: number): string {
  if (emergencyBrake) return 'bg-red-500 border-red-200';
  if (clamped > 0.05) return 'bg-emerald-400 border-emerald-100';
  return clamped < -0.05 ? 'bg-amber-400 border-amber-100' : 'bg-slate-200 border-white';
}

function useMasterSliderDrag(onLeverChange: (axis: number | null) => void) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<boolean>(false);
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    onLeverChange(computeSliderAxis(trackRef.current, e.clientY));
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (draggingRef.current) onLeverChange(computeSliderAxis(trackRef.current, e.clientY));
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const axis = computeSliderAxis(trackRef.current, e.clientY);
    onLeverChange(axis < -0.05 ? 0 : axis);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  return { trackRef, onPointerDown, onPointerMove, onPointerUp };
}

export function MasterControllerSlider({ leverTarget, emergencyBrake, theme, highlighted = false, onLeverChange }: IMasterControllerSliderProps) {
  const { tr } = useI18n();
  const drag = useMasterSliderDrag(onLeverChange);
  const clamped = emergencyBrake ? -1 : Math.max(-1, Math.min(1, leverTarget));
  const thumbTopPct = Math.max(10, Math.min(90, ((1 - clamped) / 2) * 100));
  const railBorder = theme === 'retro' ? 'border-[#4c6b5f] bg-[#0b1310]' : 'border-slate-700 bg-[#090d14]';
  const ringCls = highlighted ? 'ring-2 ring-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.85)] animate-pulse' : '';
  return (
    <div className="flex flex-col items-center gap-1 select-none shrink-0">
      <span className="text-[9px] font-mono-tabular uppercase tracking-wider text-emerald-400">{tr('MOC', 'PWR')}</span>
      <div
        ref={drag.trackRef} role="slider" tabIndex={0} aria-valuemin={-100} aria-valuemax={100} aria-valuenow={Math.round(clamped * 100)}
        aria-label={tr('Nastawnik jazdy i hamowania (przeciągnij góra lub dół)', 'Master controller throttle and brake (drag up or down)')}
        data-testid="master-controller-slider" data-academy-highlight={highlighted ? '1' : '0'}
        onPointerDown={drag.onPointerDown} onPointerMove={drag.onPointerMove} onPointerUp={drag.onPointerUp} onPointerCancel={drag.onPointerUp}
        onDoubleClick={() => onLeverChange(0)} className={`relative w-8 h-[72px] rounded-md border ${railBorder} cursor-ns-resize touch-none flex justify-center ${ringCls}`}
      >
        <div className="absolute top-1.5 bottom-1/2 w-1.5 rounded-t bg-emerald-500/30" /><div className="absolute top-1/2 bottom-1.5 w-1.5 rounded-b bg-amber-500/30" /><div className="absolute top-1/2 inset-x-1 h-px bg-slate-500/80" />
        <div className={`absolute left-0.5 right-0.5 h-3.5 -translate-y-1/2 rounded-xs border shadow-md pointer-events-none ${getHandleColorClass(emergencyBrake, clamped)}`} style={{ top: `${thumbTopPct}%` }} />
      </div>
      <span className="text-[9px] font-mono-tabular uppercase tracking-wider text-amber-400">{tr('HAM', 'BRK')}</span>
    </div>
  );
}
