import type { IGhostDeltaSnapshot, ISimulationSnapshot, TrainVisualTheme } from '../domain/types';
import { TopHudActionButtons } from './hud/TopHudActionButtons';
import { TopHudCenterAlerts } from './hud/TopHudCenterAlerts';
import { TopHudLeftTelemetry } from './hud/TopHudLeftTelemetry';

interface ITopHudBarProps {
  readonly snapshot: ISimulationSnapshot;
  readonly ghostDelta: IGhostDeltaSnapshot | null;
  readonly muted: boolean;
  readonly cctvPreviewOpen: boolean;
  readonly onToggleMute: () => void;
  readonly onToggleCctvPreview: () => void;
  readonly onCycleCamera: () => void;
  readonly onToggleHelp: () => void;
  readonly onPause: () => void;
  readonly onRestart: () => void;
  readonly onSandboxSpawnTrain: () => void;
  readonly onSandboxCycleSignal: () => void;
  readonly onAcknowledgeRadio: () => void;
}

function getThemeBarClasses(theme: TrainVisualTheme): string {
  if (theme === 'retro') {
    return 'bg-[#15201c]/92 border-[#4c6b5f]';
  }
  return theme === 'varsovia'
    ? 'bg-[#09101a]/92 border-cyan-500/45'
    : 'bg-[#10141c]/90 border-slate-700/75';
}

export function TopHudBar(props: ITopHudBarProps) {
  const barClasses = getThemeBarClasses(props.snapshot.trainModel.visual.theme);
  return (
    <div className="fixed top-0 inset-x-0 z-10 pointer-events-none px-2 sm:px-4 pt-2 sm:pt-3 flex items-start justify-between gap-2 sm:gap-3">
      <TopHudLeftTelemetry
        snapshot={props.snapshot} ghostDelta={props.ghostDelta} barClasses={barClasses}
        onSandboxSpawnTrain={props.onSandboxSpawnTrain} onSandboxCycleSignal={props.onSandboxCycleSignal}
      />
      <TopHudCenterAlerts snapshot={props.snapshot} onAcknowledgeRadio={props.onAcknowledgeRadio} />
      <TopHudActionButtons
        muted={props.muted} cctvPreviewOpen={props.cctvPreviewOpen}
        onToggleMute={props.onToggleMute} onToggleCctvPreview={props.onToggleCctvPreview}
        onCycleCamera={props.onCycleCamera} onToggleHelp={props.onToggleHelp}
        onPause={props.onPause} onRestart={props.onRestart}
      />
    </div>
  );
}
