import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { computeThumbSliderAxis, triggerSubtleTouchHaptic } from '../domain/mobileTouch';
import { getStationPlatformSide } from '../domain/trackGeometry';
import type { ISimulationSnapshot } from '../domain/types';

interface IMobileTouchControlsProps {
  readonly snapshot: ISimulationSnapshot;
  readonly onLeverChange: (axis: number | null) => void;
  readonly onToggleDoorsLeft: () => void;
  readonly onToggleDoorsRight: () => void;
  readonly onAcknowledgeCzuwak: () => void;
  readonly onAcknowledgeRadio: () => void;
  readonly onEmergencyBrake: () => void;
  readonly onCycleCamera: () => void;
  readonly onToggleHeadlights: () => void;
  readonly onHornChange: (active: boolean) => void;
}

export function MobileTouchControls({
  snapshot,
  onLeverChange,
  onToggleDoorsLeft,
  onToggleDoorsRight,
  onAcknowledgeCzuwak,
  onAcknowledgeRadio,
  onEmergencyBrake,
  onCycleCamera,
  onToggleHeadlights,
  onHornChange,
}: IMobileTouchControlsProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<boolean>(false);

  const { kinematics, doorState, openDoorSide, canToggleDoors, currentStation } = snapshot;
  const isLeftPlatform = getStationPlatformSide(currentStation.station) === 'left';
  const leftRecommended = canToggleDoors && doorState === 'closed' && isLeftPlatform;
  const rightRecommended = canToggleDoors && doorState === 'closed' && !isLeftPlatform;
  const leftOpen = doorState === 'open' && openDoorSide === 'left';
  const rightOpen = doorState === 'open' && openDoorSide === 'right';
  const academyHighlight =
    snapshot.academy && !snapshot.academy.completed ? snapshot.academy.highlightTarget : null;
  const hlRing = 'ring-2 ring-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.85)] animate-pulse';

  const clampedLever = kinematics.emergencyBrake
    ? -1
    : Math.max(-1, Math.min(1, snapshot.leverTarget));
  const thumbTopPct = ((1 - clampedLever) / 2) * 100;
  const leverLabel = kinematics.emergencyBrake
    ? 'AWAR.'
    : clampedLever > 0.04
      ? `+${Math.round(clampedLever * 100)}%`
      : clampedLever < -0.04
        ? `${Math.round(clampedLever * 100)}%`
        : '0 / LUZ';

  const applyPointerAxis = (clientY: number): void => {
    const el = trackRef.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    const relY = (clientY - rect.top) / Math.max(rect.height, 1);
    onLeverChange(computeThumbSliderAxis(relY));
  };

  const handleSliderDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    triggerSubtleTouchHaptic(15);
    applyPointerAxis(e.clientY);
  };

  const handleSliderMove = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (!draggingRef.current) {
      return;
    }
    applyPointerAxis(e.clientY);
  };

  const handleSliderUp = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (!draggingRef.current) {
      return;
    }
    draggingRef.current = false;
    // Keep the chosen lever position upon release (realistic detent master controller)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const tapAction = (fn: () => void): void => {
    triggerSubtleTouchHaptic(15);
    fn();
  };

  return (
    <div
      data-testid="mobile-touch-controls"
      className="fixed inset-x-0 bottom-[58px] top-[100px] z-20 pointer-events-none flex items-end justify-between px-2 pb-1 sm:px-3 touch-none select-none"
    >
      {/* Left: Vertical Thumb Master Controller Slider */}
      <div className="pointer-events-auto flex flex-col items-center gap-1 bg-[#0a1019]/90 border border-slate-700/85 rounded-xl px-2 py-1.5 shadow-2xl touch-none">
        <span className="text-[9px] font-mono-tabular font-bold uppercase tracking-wider text-emerald-300 leading-none">
          MOC +
        </span>

        <div
          ref={trackRef}
          role="slider"
          aria-label="Dotykowy nastawnik jazdy i hamowania"
          aria-valuemin={-100}
          aria-valuemax={100}
          aria-valuenow={Math.round(clampedLever * 100)}
          data-testid="mobile-lever-slider"
          onPointerDown={handleSliderDown}
          onPointerMove={handleSliderMove}
          onPointerUp={handleSliderUp}
          onPointerCancel={handleSliderUp}
          className={`relative w-12 h-[126px] [@media(min-height:560px)]:h-[188px] rounded-lg border-2 border-slate-600/90 bg-[#060a10] touch-none flex justify-center cursor-ns-resize ${
            academyHighlight === 'throttle' ? hlRing : ''
          }`}
        >
          <div className="absolute top-2 bottom-1/2 w-2.5 rounded-t bg-emerald-500/25 pointer-events-none" />
          <div className="absolute top-1/2 bottom-2 w-2.5 rounded-b bg-amber-500/25 pointer-events-none" />
          <div className="absolute top-1/2 inset-x-1 h-0.5 bg-slate-300/80 pointer-events-none" />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] font-mono-tabular font-bold text-slate-300 bg-[#060a10]/90 px-1 rounded pointer-events-none">
            0
          </span>
          <div
            data-testid="mobile-lever-thumb"
            className={`absolute left-1 right-1 h-6 [@media(min-height:560px)]:h-7 -translate-y-1/2 rounded-md border-2 shadow-lg pointer-events-none flex items-center justify-center ${
              kinematics.emergencyBrake
                ? 'bg-red-500 border-red-200'
                : clampedLever > 0.04
                  ? 'bg-emerald-400 border-emerald-100'
                  : clampedLever < -0.04
                    ? 'bg-amber-400 border-amber-100'
                    : 'bg-slate-200 border-white'
            }`}
            style={{ top: `${Math.max(12, Math.min(88, thumbTopPct))}%` }}
          >
            <span className="w-5 h-0.5 bg-slate-950/70 rounded" />
          </div>
        </div>

        <span className="text-[9px] font-mono-tabular font-bold uppercase tracking-wider text-amber-300 leading-none">
          HAM −
        </span>

        <button
          type="button"
          data-testid="mobile-lever-neutral"
          onClick={() => tapAction(() => onLeverChange(0))}
          className="w-full px-1.5 py-1 rounded-md bg-slate-800 active:bg-slate-700 border border-slate-600 text-[10px] font-mono-tabular font-bold text-slate-100 whitespace-nowrap touch-none cursor-pointer"
        >
          {leverLabel}
        </button>
      </div>

      {/* Right: Ergonomic Touch Action Pad */}
      <div className="pointer-events-auto grid grid-cols-2 gap-1.5 w-[178px] sm:w-[190px] bg-[#0a1019]/90 border border-slate-700/85 rounded-xl p-1.5 shadow-2xl touch-none">
        <button
          type="button"
          data-testid="touch-doors-left"
          disabled={!canToggleDoors}
          onClick={() => tapAction(onToggleDoorsLeft)}
          className={`min-h-[38px] [@media(min-height:560px)]:min-h-[44px] px-1.5 py-1 rounded-lg border text-[10px] font-mono-tabular font-bold whitespace-nowrap touch-none cursor-pointer ${
            leftOpen || leftRecommended
              ? 'bg-emerald-500 border-emerald-200 text-slate-950'
              : canToggleDoors
                ? 'bg-slate-800 border-slate-600 text-slate-100 active:bg-slate-700'
                : 'bg-slate-900/90 border-slate-800 text-slate-500'
          } ${academyHighlight === 'doors-left' ? hlRing : ''}`}
        >
          ◀ DRZWI L
        </button>

        <button
          type="button"
          data-testid="touch-doors-right"
          disabled={!canToggleDoors}
          onClick={() => tapAction(onToggleDoorsRight)}
          className={`min-h-[38px] [@media(min-height:560px)]:min-h-[44px] px-1.5 py-1 rounded-lg border text-[10px] font-mono-tabular font-bold whitespace-nowrap touch-none cursor-pointer ${
            rightOpen || rightRecommended
              ? 'bg-emerald-500 border-emerald-200 text-slate-950'
              : canToggleDoors
                ? 'bg-slate-800 border-slate-600 text-slate-100 active:bg-slate-700'
                : 'bg-slate-900/90 border-slate-800 text-slate-500'
          } ${academyHighlight === 'doors-right' ? hlRing : ''}`}
        >
          DRZWI P ▶
        </button>

        <button
          type="button"
          data-testid="touch-czuwak"
          onClick={() => tapAction(onAcknowledgeCzuwak)}
          className={`min-h-[38px] [@media(min-height:560px)]:min-h-[44px] px-1.5 py-1 rounded-lg border text-[10px] font-mono-tabular font-bold whitespace-nowrap touch-none cursor-pointer ${
            snapshot.czuwak.active
              ? 'bg-orange-500 border-orange-200 text-slate-950 animate-pulse'
              : 'bg-slate-800 border-slate-600 text-slate-200 active:bg-slate-700'
          } ${academyHighlight === 'czuwak' ? hlRing : ''}`}
        >
          {snapshot.czuwak.active ? `CZUWAK ${Math.ceil(snapshot.czuwak.remainingSec)}s` : 'CZUWAK'}
        </button>

        <button
          type="button"
          data-testid="touch-radio"
          onClick={() => tapAction(onAcknowledgeRadio)}
          className={`min-h-[38px] [@media(min-height:560px)]:min-h-[44px] px-1.5 py-1 rounded-lg border text-[10px] font-mono-tabular font-bold whitespace-nowrap touch-none cursor-pointer ${
            snapshot.radio.active
              ? 'bg-cyan-400 border-cyan-100 text-slate-950 animate-pulse'
              : 'bg-slate-800 border-slate-600 text-slate-200 active:bg-slate-700'
          } ${academyHighlight === 'radio' ? hlRing : ''}`}
        >
          {snapshot.radio.active ? `RADIO ${Math.ceil(snapshot.radio.remainingSec)}s` : 'RADIO'}
        </button>

        <button
          type="button"
          data-testid="touch-headlights"
          onClick={() => tapAction(onToggleHeadlights)}
          className={`min-h-[38px] [@media(min-height:560px)]:min-h-[44px] px-1.5 py-1 rounded-lg border text-[10px] font-mono-tabular font-bold whitespace-nowrap touch-none cursor-pointer ${
            snapshot.headlightsOn
              ? 'bg-amber-500/25 border-amber-400 text-amber-200'
              : 'bg-slate-800 border-slate-600 text-slate-300'
          } ${academyHighlight === 'headlights' ? hlRing : ''}`}
        >
          ŚWIATŁA
        </button>

        <button
          type="button"
          data-testid="touch-horn"
          onPointerDown={() => {
            triggerSubtleTouchHaptic(15);
            onHornChange(true);
          }}
          onPointerUp={() => onHornChange(false)}
          onPointerLeave={() => onHornChange(false)}
          onPointerCancel={() => onHornChange(false)}
          className={`min-h-[38px] [@media(min-height:560px)]:min-h-[44px] px-1.5 py-1 rounded-lg border text-[10px] font-mono-tabular font-bold whitespace-nowrap touch-none cursor-pointer ${
            snapshot.hornActive
              ? 'bg-amber-400 border-amber-200 text-slate-950'
              : 'bg-slate-800 border-slate-600 text-slate-200 active:bg-slate-700'
          } ${academyHighlight === 'horn' ? hlRing : ''}`}
        >
          KLAKSON
        </button>

        <button
          type="button"
          data-testid="touch-camera"
          onClick={() => tapAction(onCycleCamera)}
          className="min-h-[38px] [@media(min-height:560px)]:min-h-[44px] px-1.5 py-1 rounded-lg border bg-slate-800 border-slate-600 text-sky-200 active:bg-slate-700 text-[10px] font-mono-tabular font-bold whitespace-nowrap touch-none cursor-pointer"
        >
          KAMERA
        </button>

        <button
          type="button"
          data-testid="touch-ebrake"
          onClick={() => tapAction(onEmergencyBrake)}
          className={`min-h-[38px] [@media(min-height:560px)]:min-h-[44px] px-1.5 py-1 rounded-lg border text-[10px] font-mono-tabular font-bold whitespace-nowrap touch-none cursor-pointer ${
            kinematics.emergencyBrake
              ? 'bg-red-600 border-red-200 text-white'
              : 'bg-red-950/90 border-red-500/75 text-red-200 active:bg-red-800'
          }`}
        >
          HAM. AWAR.
        </button>
      </div>
    </div>
  );
}
