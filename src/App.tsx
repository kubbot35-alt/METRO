import { useRef } from 'react';
import { AchievementToast } from './components/AchievementToast';
import { AchievementsModal } from './components/AchievementsModal';
import { CabDashboardHud } from './components/CabDashboardHud';
import { ControlsHelpModal } from './components/ControlsHelpModal';
import { CourseSummaryModal } from './components/CourseSummaryModal';
import { StatusModal } from './components/StatusModal';
import { TitleOverlay } from './components/TitleOverlay';
import { TopHudBar } from './components/TopHudBar';
import { formatClockTime, formatDeviationTime } from './domain/scheduleSystem';
import { getStationPlatformLayout, getStationPlatformSide } from './domain/trackGeometry';
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
      data-mode={snapshot.gameMode}
      data-speed={Math.round(snapshot.kinematics.speedKmh)}
      data-position={Math.round(snapshot.kinematics.positionM)}
      data-score={Math.round(snapshot.score)}
      data-doors={snapshot.doorState}
      data-door-side={snapshot.openDoorSide ?? 'none'}
      data-station={snapshot.currentStation.station.code}
      data-platform-side={getStationPlatformSide(snapshot.currentStation.station)}
      data-platform-layout={getStationPlatformLayout(snapshot.currentStation.station)}
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
      data-line={snapshot.line.id}
      data-time-of-day={snapshot.timeOfDay.id}
      data-camera={snapshot.cameraMode}
      data-oncoming={snapshot.oncomingTrain.active ? '1' : '0'}
      data-oncoming-mode={snapshot.oncomingTrain.mode}
    >
      <div
        ref={mountRef}
        data-testid="three-canvas-mount"
        className="absolute inset-0 w-full h-full"
      />

      {snapshot.phase === 'title' && (
        <TitleOverlay
          selectedLineId={snapshot.line.id}
          selectedModelId={snapshot.trainModel.id}
          selectedTimeOfDayId={snapshot.timeOfDay.id}
          selectedGameMode={snapshot.gameMode}
          leaderboard={game.leaderboard}
          achievementsUnlocked={game.unlockedAchievements.length}
          achievementsTotal={game.achievementCatalog.length}
          onSelectLine={game.selectMetroLine}
          onSelectModel={game.selectTrainModel}
          onSelectTimeOfDay={game.selectTimeOfDay}
          onSelectGameMode={game.selectGameMode}
          onOpenAchievements={game.openAchievements}
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
            onSandboxSpawnTrain={game.triggerSandboxOncomingTrain}
            onSandboxCycleSignal={game.cycleSandboxNextSignal}
          />
          <CabDashboardHud
            snapshot={snapshot}
            onToggleDoorsLeft={game.toggleDoorsLeft}
            onToggleDoorsRight={game.toggleDoorsRight}
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

      {game.achievementsOpen && (
        <AchievementsModal
          catalog={game.achievementCatalog}
          unlockedRecords={game.unlockedAchievements}
          onClose={game.closeAchievements}
        />
      )}

      {game.helpOpen && <ControlsHelpModal onClose={game.closeHelp} />}

      <AchievementToast toast={game.achievementToast} />
    </main>
  );
}
