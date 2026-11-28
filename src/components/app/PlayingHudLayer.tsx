import type { IDepotZoneState } from '../../domain/depotHallSystem';
import type { IMetroGameController } from '../../hooks/useMetroGame';
import { useI18n } from '../../i18n/LanguageContext';
import { AcademyGuidePanel } from '../AcademyGuidePanel';
import { CabDashboardHud } from '../CabDashboardHud';
import { CctvPreviewOverlay } from '../CctvPreviewOverlay';
import { CabControlTooltip } from '../hud/CabControlTooltip';
import { PassengerHudOverlay } from '../hud/PassengerHudOverlay';
import { TrainspottingHudOverlay } from '../hud/TrainspottingHudOverlay';
import { LiveDispatchMapOverlay } from '../LiveDispatchMapOverlay';
import { MobileTouchControls } from '../MobileTouchControls';
import { PaIntercomPanel } from '../PaIntercomPanel';
import { TopHudBar } from '../TopHudBar';
import { TurnaroundOverlay } from '../TurnaroundOverlay';

function DepotZoneBanner({ depotZone }: { readonly depotZone: IDepotZoneState }) {
  const { tr } = useI18n();
  if (!depotZone.inHall && !depotZone.inTurnout && !depotZone.inWashZone) return null;
  const label = depotZone.inWashZone
    ? (depotZone.washSprayActive
      ? tr('MYJNIA AUTOMATYCZNA AKTYWNA · ZRASZANIE (≤ 10 km/h)', 'AUTOMATIC TRAIN WASH ACTIVE · SPRAYING (≤ 10 km/h)')
      : tr('STREFA MYJNI STP KABATY · ZWOLNIJ DO 10 km/h', 'STP KABATY TRAIN WASH · SLOW TO 10 km/h'))
    : depotZone.inTurnout
      ? tr('ROZJAZD WYJAZDOWY STP KABATY · LIMIT 20 km/h', 'STP KABATY EXIT TURNOUT · LIMIT 20 km/h')
      : tr('HALA POSTOJOWA STP KABATY · WYJAZD MAX 20 km/h', 'STP KABATY STABLING HALL · EXIT MAX 20 km/h');
  const style = depotZone.washSprayActive ? 'border-sky-400 bg-sky-950/90 text-sky-100' : 'border-amber-400/80 bg-[#1a1409]/92 text-amber-100';
  return (
    <div data-testid="depot-zone-banner" className={`fixed top-[82px] left-1/2 -translate-x-1/2 z-20 pointer-events-none px-3 py-1 rounded border text-[11px] font-mono-tabular font-bold tracking-wide shadow-lg ${style}`}>
      {label}
    </div>
  );
}

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
      {game.touchControlsActive && snapshot.phase === 'playing' && snapshot.gameMode !== 'passenger' && (
        <MobileTouchControls snapshot={snapshot} onLeverChange={game.setManualLeverAxis} onToggleDoorsLeft={game.toggleDoorsLeft} onToggleDoorsRight={game.toggleDoorsRight} onAcknowledgeCzuwak={game.acknowledgeCzuwak} onAcknowledgeRadio={game.acknowledgeRadio} onEmergencyBrake={game.triggerEmergencyBrake} onCycleCamera={game.cycleCamera} onToggleHeadlights={game.toggleHeadlights} onToggleCabLight={game.toggleCabLight} onToggleAto={game.toggleAto} onHornChange={game.setHornActive} />
      )}
      {game.dispatchMapOpen && snapshot.phase === 'playing' && (
        <LiveDispatchMapOverlay snapshot={snapshot} onClose={game.closeDispatchMap} />
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
  if (snapshot.gameMode === 'trainspotting') {
    return (
      <TrainspottingHudOverlay
        snapshot={snapshot} muted={game.muted} onSelectSpot={game.selectTrainspottingSpot}
        onWalkStep={game.stepTrainspottingWalk} onEnterPhotoMode={game.enterPhotoMode}
        onToggleMute={game.toggleMute} onReturnToTitle={game.returnToTitle}
      />
    );
  }
  const isPassenger = snapshot.gameMode === 'passenger';
  return (
    <>
      <TopHudBar snapshot={snapshot} ghostDelta={game.ghostDelta} muted={game.muted} cctvPreviewOpen={game.cctvPreviewOpen} dispatchMapOpen={game.dispatchMapOpen} onToggleMute={game.toggleMute} onToggleCctvPreview={game.toggleCctvPreview} onToggleDispatchMap={game.toggleDispatchMap} onCycleCamera={game.cycleCamera} onToggleHelp={game.toggleHelp} onPause={game.pauseGame} onRestart={game.restartGame} onAcknowledgeRadio={game.acknowledgeRadio} onSandboxSpawnTrain={game.triggerSandboxOncomingTrain} onSandboxCycleSignal={game.cycleSandboxNextSignal} />
      <DepotZoneBanner depotZone={snapshot.depotZone} />
      <ActiveOverlaysAndControls game={game} />
      <TurnaroundOverlay turnaround={snapshot.turnaround} speedKmh={snapshot.kinematics.speedKmh} onSwitchCab={game.triggerCabSwitch} />
      {snapshot.cameraMode === 'cab' && <CabControlTooltip tooltip={game.cabHoverTooltip} />}
      {isPassenger ? (
        <PassengerHudOverlay view={snapshot.passengerView} onSelectSeat={game.setPassengerSeat} onSelectCar={game.setPassengerCarIndex} onEnterPhotoMode={game.enterPhotoMode} />
      ) : (
        <CabDashboardHud snapshot={snapshot} compactTouchMode={game.touchControlsActive} paPanelOpen={game.paPanelOpen} onTogglePaPanel={game.togglePaPanel} onToggleDoorsLeft={game.toggleDoorsLeft} onToggleDoorsRight={game.toggleDoorsRight} onToggleHeadlights={game.toggleHeadlights} onToggleCabLight={game.toggleCabLight} onToggleWipers={game.toggleWipers} onToggleAto={game.toggleAto} onAcknowledgeCzuwak={game.acknowledgeCzuwak} onAcknowledgeRadio={game.acknowledgeRadio} onCycleCamera={game.cycleCamera} onEmergencyBrake={game.triggerEmergencyBrake} onHornChange={game.setHornActive} onLeverChange={game.setManualLeverAxis} />
      )}
    </>
  );
}
