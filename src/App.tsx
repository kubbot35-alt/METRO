import { useRef } from 'react';
import { AchievementToast } from './components/AchievementToast';
import { AchievementsModal } from './components/AchievementsModal';
import { CabDashboardHud } from './components/CabDashboardHud';
import { ControlsHelpModal } from './components/ControlsHelpModal';
import { CourseSummaryModal } from './components/CourseSummaryModal';
import { CustomLineBuilderModal } from './components/CustomLineBuilderModal';
import { DriverProfileModal } from './components/DriverProfileModal';
import { FpsCounterBadge } from './components/FpsCounterBadge';
import { PhotoModeOverlay } from './components/PhotoModeOverlay';
import { SettingsModal } from './components/SettingsModal';
import { StatusModal } from './components/StatusModal';
import { TitleOverlay } from './components/TitleOverlay';
import { TopHudBar } from './components/TopHudBar';
import { getRankForXp } from './domain/driverProfile';
import { getPhotoFilterSpec } from './domain/photoMode';
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
      data-grade-pct={snapshot.trackProfile.gradePercent.toFixed(1)}
      data-elevation-m={snapshot.trackProfile.elevationM.toFixed(1)}
      data-outdoor={snapshot.trackProfile.outdoorBlend.toFixed(2)}
      data-challenge={snapshot.challenge?.id ?? 'none'}
      data-radio-active={snapshot.radio.active ? '1' : '0'}
      data-radio-ack={snapshot.radio.acknowledgedCount}
      data-weather={snapshot.weather.mode}
      data-wipers={snapshot.weather.wipersOn ? 'on' : 'off'}
      data-wet-rails={snapshot.weather.wetRailsActive ? '1' : '0'}
      data-wheel-slip={snapshot.weather.wheelSlipActive ? '1' : '0'}
      data-fov={game.settings.cabFovDeg}
      data-quality={game.settings.graphicsQuality}
      data-rank={getRankForXp(game.driverProfile.xp).id}
      data-xp={game.driverProfile.xp}
      data-custom-lines={game.customLines.length}
      data-photo-mode={game.photoModeActive ? '1' : '0'}
      data-photo-filter={game.photoState.filter}
      data-photo-fov={game.photoState.fovDeg}
      data-photo-tilt={game.photoState.rollDeg}
    >
      <div
        ref={mountRef}
        data-testid="three-canvas-mount"
        className="absolute inset-0 w-full h-full"
        style={
          game.photoModeActive
            ? { filter: getPhotoFilterSpec(game.photoState.filter).cssFilter }
            : undefined
        }
      />

      {game.settings.showFps && !game.photoModeActive && (
        <FpsCounterBadge fps={game.fps} quality={game.settings.graphicsQuality} />
      )}

      {snapshot.phase === 'title' && (
        <TitleOverlay
          activeLine={snapshot.line}
          customLines={game.customLines}
          driverProfile={game.driverProfile}
          selectedModelId={snapshot.trainModel.id}
          selectedTimeOfDayId={snapshot.timeOfDay.id}
          selectedWeatherMode={snapshot.weather.mode}
          selectedGameMode={snapshot.gameMode}
          selectedChallengeId={snapshot.challenge?.id ?? 'inverter_fault'}
          leaderboard={game.leaderboard}
          achievementsUnlocked={game.unlockedAchievements.length}
          achievementsTotal={game.achievementCatalog.length}
          onSelectLine={game.selectMetroLine}
          onOpenLineBuilder={() => game.openLineBuilder()}
          onEditCustomLine={(draft) => game.openLineBuilder(draft)}
          onDeleteCustomLine={game.deleteCustomLine}
          onSelectModel={game.selectTrainModel}
          onSelectTimeOfDay={game.selectTimeOfDay}
          onSelectWeatherMode={game.selectWeatherMode}
          onSelectGameMode={game.selectGameMode}
          onSelectChallenge={game.selectChallenge}
          onOpenProfile={game.openProfile}
          onOpenAchievements={game.openAchievements}
          onOpenSettings={game.openSettings}
          onToggleHelp={game.toggleHelp}
          onStart={game.startGame}
        />
      )}

      {snapshot.phase !== 'title' && !game.photoModeActive && (
        <>
          <TopHudBar
            snapshot={snapshot}
            muted={game.muted}
            onToggleMute={game.toggleMute}
            onCycleCamera={game.cycleCamera}
            onToggleHelp={game.toggleHelp}
            onPause={game.pauseGame}
            onRestart={game.restartGame}
            onAcknowledgeRadio={game.acknowledgeRadio}
            onSandboxSpawnTrain={game.triggerSandboxOncomingTrain}
            onSandboxCycleSignal={game.cycleSandboxNextSignal}
          />
          <CabDashboardHud
            snapshot={snapshot}
            onToggleDoorsLeft={game.toggleDoorsLeft}
            onToggleDoorsRight={game.toggleDoorsRight}
            onToggleHeadlights={game.toggleHeadlights}
            onToggleWipers={game.toggleWipers}
            onAcknowledgeCzuwak={game.acknowledgeCzuwak}
            onAcknowledgeRadio={game.acknowledgeRadio}
            onCycleCamera={game.cycleCamera}
            onEmergencyBrake={game.triggerEmergencyBrake}
            onHornChange={game.setHornActive}
            onLeverChange={game.setManualLeverAxis}
          />
        </>
      )}

      {game.photoModeActive && (
        <PhotoModeOverlay
          state={game.photoState}
          capturing={game.photoCapturing}
          savedNotice={game.photoSavedNotice}
          trainName={snapshot.trainModel.name}
          onFovChange={game.setPhotoFov}
          onTiltChange={game.setPhotoTilt}
          onFilterChange={game.setPhotoFilter}
          onResetCamera={game.resetPhotoCamera}
          onCapturePng={game.capturePhotoPng}
          onClose={game.exitPhotoMode}
        />
      )}

      {snapshot.phase === 'paused' && !game.photoModeActive && !game.helpOpen && !game.settingsOpen && (
        <StatusModal
          snapshot={snapshot}
          onResume={game.resumeGame}
          onRestart={game.restartGame}
          onOpenPhotoMode={game.enterPhotoMode}
          onOpenSettings={game.openSettings}
          onTitle={game.returnToTitle}
        />
      )}

      {snapshot.phase === 'gameover' && (
        <CourseSummaryModal
          snapshot={snapshot}
          isNewRecord={game.isNewRecord}
          xpReward={game.lastCourseXpReward}
          driverProfile={game.driverProfile}
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

      {game.profileOpen && (
        <DriverProfileModal
          profile={game.driverProfile}
          onReset={game.resetDriverProfile}
          onClose={game.closeProfile}
        />
      )}

      {game.lineBuilderDraft && (
        <CustomLineBuilderModal
          initialDraft={game.lineBuilderDraft}
          isEditing={game.lineBuilderEditing}
          onSave={game.saveCustomLine}
          onClose={game.closeLineBuilder}
        />
      )}

      {game.helpOpen && <ControlsHelpModal onClose={game.closeHelp} />}

      {game.settingsOpen && (
        <SettingsModal
          settings={game.settings}
          onUpdate={game.updateSettings}
          onReset={game.resetSettings}
          onClose={game.closeSettings}
        />
      )}

      {!game.photoModeActive && <AchievementToast toast={game.achievementToast} />}
    </main>
  );
}
