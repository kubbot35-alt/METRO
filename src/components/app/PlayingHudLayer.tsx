import type { IMetroGameController } from '../../hooks/useMetroGame';
import { AcademyGuidePanel } from '../AcademyGuidePanel';
import { CabDashboardHud } from '../CabDashboardHud';
import { CctvPreviewOverlay } from '../CctvPreviewOverlay';
import { MobileTouchControls } from '../MobileTouchControls';
import { PaIntercomPanel } from '../PaIntercomPanel';
import { TopHudBar } from '../TopHudBar';
import { TurnaroundOverlay } from '../TurnaroundOverlay';

function ActiveOverlaysAndControls({ game }: { readonly game: IMetroGameController }) {
  const { snapshot } = game;
  return (
    <>
      {game.cctvPreviewOpen && (
        <CctvPreviewOverlay snapshot={snapshot} channel={game.cctvChannel} graphicsQuality={game.settings.graphicsQuality} liveMirrorsEnabled={game.settings.liveMirrorsEnabled} onSelectChannel={game.selectCctvChannel} onCanvasRef={game.registerCctvCanvas} onClose={game.closeCctvPreview} />
      )}
      {snapshot.gameMode === 'academy' && snapshot.academy && snapshot.phase === 'playing' && (
        <AcademyGuidePanel academy={snapshot.academy} gamepadConnected={game.gamepadStatus.connected} />
      )}
      {game.touchControlsActive && snapshot.phase === 'playing' && (
        <MobileTouchControls snapshot={snapshot} onLeverChange={game.setManualLeverAxis} onToggleDoorsLeft={game.toggleDoorsLeft} onToggleDoorsRight={game.toggleDoorsRight} onAcknowledgeCzuwak={game.acknowledgeCzuwak} onAcknowledgeRadio={game.acknowledgeRadio} onEmergencyBrake={game.triggerEmergencyBrake} onCycleCamera={game.cycleCamera} onToggleHeadlights={game.toggleHeadlights} onToggleCabLight={game.toggleCabLight} onToggleAto={game.toggleAto} onHornChange={game.setHornActive} />
      )}
      {game.paPanelOpen && snapshot.phase === 'playing' && (
        <PaIntercomPanel snapshot={snapshot} onTriggerAnnouncement={game.triggerPaAnnouncement} onClose={game.closePaPanel} />
      )}
    </>
  );
}

export function PlayingHudLayer({ game }: { readonly game: IMetroGameController }) {
  const { snapshot } = game;
  if (snapshot.phase === 'title' || game.photoModeActive) return null;
  return (
    <>
      <TopHudBar snapshot={snapshot} ghostDelta={game.ghostDelta} muted={game.muted} cctvPreviewOpen={game.cctvPreviewOpen} onToggleMute={game.toggleMute} onToggleCctvPreview={game.toggleCctvPreview} onCycleCamera={game.cycleCamera} onToggleHelp={game.toggleHelp} onPause={game.pauseGame} onRestart={game.restartGame} onAcknowledgeRadio={game.acknowledgeRadio} onSandboxSpawnTrain={game.triggerSandboxOncomingTrain} onSandboxCycleSignal={game.cycleSandboxNextSignal} />
      <ActiveOverlaysAndControls game={game} />
      <TurnaroundOverlay turnaround={snapshot.turnaround} speedKmh={snapshot.kinematics.speedKmh} onSwitchCab={game.triggerCabSwitch} />
      <CabDashboardHud snapshot={snapshot} compactTouchMode={game.touchControlsActive} paPanelOpen={game.paPanelOpen} onTogglePaPanel={game.togglePaPanel} onToggleDoorsLeft={game.toggleDoorsLeft} onToggleDoorsRight={game.toggleDoorsRight} onToggleHeadlights={game.toggleHeadlights} onToggleCabLight={game.toggleCabLight} onToggleWipers={game.toggleWipers} onToggleAto={game.toggleAto} onAcknowledgeCzuwak={game.acknowledgeCzuwak} onAcknowledgeRadio={game.acknowledgeRadio} onCycleCamera={game.cycleCamera} onEmergencyBrake={game.triggerEmergencyBrake} onHornChange={game.setHornActive} onLeverChange={game.setManualLeverAxis} />
    </>
  );
}
