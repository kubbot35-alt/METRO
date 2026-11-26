import { useRef } from 'react';
import { CabDashboardHud } from './components/CabDashboardHud';
import { ControlsHelpModal } from './components/ControlsHelpModal';
import { CourseSummaryModal } from './components/CourseSummaryModal';
import { StatusModal } from './components/StatusModal';
import { TitleOverlay } from './components/TitleOverlay';
import { TopHudBar } from './components/TopHudBar';
import { formatClockTime, formatDeviationTime } from './domain/scheduleSystem';
import { useMetroGame } from './hooks/useMetroGame';

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const game = useMetroGame(mountRef);
  const { snapshot } = game;

  return (
    <main
      className="relative w-full h-full overflow-hidden bg-[#06080d]"
      data-testid="metro-simulator-root"
      data-phase={snapshot.phase}
      data-speed={Math.round(snapshot.kinematics.speedKmh)}
      data-position={Math.round(snapshot.kinematics.positionM)}
      data-score={Math.round(snapshot.score)}
      data-doors={snapshot.doorState}
      data-station={snapshot.currentStation.station.code}
      data-signal={snapshot.nextSignal?.signal.aspect ?? 'none'}
      data-atp={snapshot.atpActive ? '1' : '0'}
      data-headlights={snapshot.headlightsOn ? 'on' : 'off'}
      data-passengers={snapshot.passengersCarried}
      data-lever={snapshot.leverTarget.toFixed(2)}
      data-announcement={snapshot.announcement?.text ?? ''}
      data-clock={formatClockTime(snapshot.schedule.currentClockSec)}
      data-delay={formatDeviationTime(snapshot.schedule.deviationSec)}
      data-czuwak={snapshot.czuwak.active ? '1' : '0'}
      data-door-fault={snapshot.doorFault.phase}
      data-grade={snapshot.driverGrade}
      data-train={snapshot.trainModel.id}
      data-time-of-day={snapshot.timeOfDay.id}
      data-camera={snapshot.cameraMode}
      data-oncoming={snapshot.oncomingTrain.active ? '1' : '0'}
    >
      <div
        ref={mountRef}
        data-testid="three-canvas-mount"
        className="absolute inset-0 w-full h-full"
      />

      {snapshot.phase === 'title' && (
        <TitleOverlay
          selectedModelId={snapshot.trainModel.id}
          selectedTimeOfDayId={snapshot.timeOfDay.id}
          leaderboard={game.leaderboard}
          onSelectModel={game.selectTrainModel}
          onSelectTimeOfDay={game.selectTimeOfDay}
          onToggleHelp={game.toggleHelp}
          onStart={game.startGame}
        />
      )}

      {snapshot.phase !== 'title' && (
        <>
          <TopHudBar
            snapshot={snapshot}
            muted={game.muted}
            onToggleMute={game.toggleMute}
            onCycleCamera={game.cycleCamera}
            onToggleHelp={game.toggleHelp}
            onPause={game.pauseGame}
            onRestart={game.restartGame}
          />
          <CabDashboardHud
            snapshot={snapshot}
            onToggleDoors={game.toggleDoors}
            onToggleHeadlights={game.toggleHeadlights}
            onAcknowledgeCzuwak={game.acknowledgeCzuwak}
            onCycleCamera={game.cycleCamera}
            onEmergencyBrake={game.triggerEmergencyBrake}
            onHornChange={game.setHornActive}
            onLeverChange={game.setManualLeverAxis}
          />
        </>
      )}

      {snapshot.phase === 'paused' && !game.helpOpen && (
        <StatusModal
          snapshot={snapshot}
          onResume={game.resumeGame}
          onRestart={game.restartGame}
          onTitle={game.returnToTitle}
        />
      )}

      {snapshot.phase === 'gameover' && (
        <CourseSummaryModal
          snapshot={snapshot}
          isNewRecord={game.isNewRecord}
          onRestart={game.restartGame}
          onTitle={game.returnToTitle}
        />
      )}

      {game.helpOpen && <ControlsHelpModal onClose={game.closeHelp} />}
    </main>
  );
}
