import type { ISimulationSnapshot } from '../domain/types';
import { TouchActionKeypad } from './hud/TouchActionKeypad';
import { TouchLeverPanel } from './hud/TouchLeverPanel';

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
  readonly onToggleCabLight: () => void;
  readonly onToggleAto: () => void;
  readonly onHornChange: (active: boolean) => void;
}

const HL_RING = 'ring-2 ring-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.85)] animate-pulse';

export function MobileTouchControls(props: IMobileTouchControlsProps) {
  const { snapshot } = props;
  const academyHighlight = snapshot.academy && !snapshot.academy.completed ? snapshot.academy.highlightTarget : null;
  return (
    <div data-testid="mobile-touch-controls" className="fixed inset-x-0 bottom-[58px] top-[100px] z-20 pointer-events-none flex items-end justify-between px-2 pb-1 sm:px-3 touch-none select-none">
      <TouchLeverPanel
        snapshot={snapshot} highlightRing={HL_RING} academyHighlight={academyHighlight}
        onLeverChange={props.onLeverChange} onToggleAto={props.onToggleAto} onToggleCabLight={props.onToggleCabLight}
      />
      <TouchActionKeypad
        snapshot={snapshot} highlightRing={HL_RING} academyHighlight={academyHighlight}
        onToggleDoorsLeft={props.onToggleDoorsLeft} onToggleDoorsRight={props.onToggleDoorsRight}
        onAcknowledgeCzuwak={props.onAcknowledgeCzuwak} onAcknowledgeRadio={props.onAcknowledgeRadio}
        onEmergencyBrake={props.onEmergencyBrake} onCycleCamera={props.onCycleCamera}
        onToggleHeadlights={props.onToggleHeadlights} onHornChange={props.onHornChange}
      />
    </div>
  );
}
