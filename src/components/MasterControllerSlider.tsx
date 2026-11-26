import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { TrainVisualTheme } from '../domain/types';

interface IMasterControllerSliderProps {
  readonly leverTarget: number;
  readonly emergencyBrake: boolean;
  readonly theme: TrainVisualTheme;
  readonly highlighted?: boolean;
  readonly onLeverChange: (axis: number | null) => void;
}

export function MasterControllerSlider({
  leverTarget,
  emergencyBrake,
  theme,
  highlighted = false,
  onLeverChange,
}: IMasterControllerSliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<boolean>(false);

  const computeAxisFromClientY = (clientY: number): number => {
    const el = trackRef.current;
    if (!el) {
      return 0;
    }
    const rect = el.getBoundingClientRect();
    const ratio = (clientY - rect.top) / Math.max(rect.height, 1);
    const raw = 1 - Math.max(0, Math.min(1, ratio)) * 2;
    return Math.abs(raw) < 0.08 ? 0 : Math.max(-1, Math.min(1, raw));
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    onLeverChange(computeAxisFromClientY(e.clientY));
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (!draggingRef.current) {
      return;
    }
    onLeverChange(computeAxisFromClientY(e.clientY));
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (!draggingRef.current) {
      return;
    }
    draggingRef.current = false;
    const axis = computeAxisFromClientY(e.clientY);
    if (axis < -0.05) {
      onLeverChange(0);
    } else {
      onLeverChange(axis);
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const clamped = emergencyBrake ? -1 : Math.max(-1, Math.min(1, leverTarget));
  const thumbTopPct = ((1 - clamped) / 2) * 100;
  const isRetro = theme === 'retro';
  const railBorder = isRetro ? 'border-[#4c6b5f] bg-[#0b1310]' : 'border-slate-700 bg-[#090d14]';
  const handleColor = emergencyBrake
    ? 'bg-red-500 border-red-200'
    : clamped > 0.05
      ? 'bg-emerald-400 border-emerald-100'
      : clamped < -0.05
        ? 'bg-amber-400 border-amber-100'
        : 'bg-slate-200 border-white';

  return (
    <div className="flex flex-col items-center gap-1 select-none shrink-0">
      <span className="text-[9px] font-mono-tabular uppercase tracking-wider text-emerald-400">
        MOC
      </span>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Nastawnik jazdy i hamowania (przeciągnij góra lub dół)"
        aria-valuemin={-100}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped * 100)}
        data-testid="master-controller-slider"
        data-academy-highlight={highlighted ? '1' : '0'}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={() => onLeverChange(0)}
        className={`relative w-8 h-[72px] rounded-md border ${railBorder} cursor-ns-resize touch-none flex justify-center ${
          highlighted ? 'ring-2 ring-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.85)] animate-pulse' : ''
        }`}
      >
        <div className="absolute top-1.5 bottom-1/2 w-1.5 rounded-t bg-emerald-500/30" />
        <div className="absolute top-1/2 bottom-1.5 w-1.5 rounded-b bg-amber-500/30" />
        <div className="absolute top-1/2 inset-x-1 h-px bg-slate-500/80" />
        <div
          className={`absolute left-0.5 right-0.5 h-3.5 -translate-y-1/2 rounded-xs border shadow-md pointer-events-none ${handleColor}`}
          style={{ top: `${Math.max(10, Math.min(90, thumbTopPct))}%` }}
        />
      </div>
      <span className="text-[9px] font-mono-tabular uppercase tracking-wider text-amber-400">
        HAM
      </span>
    </div>
  );
}
