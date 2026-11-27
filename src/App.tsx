import { useRef } from 'react';
import { AcademyGuidePanel } from './components/AcademyGuidePanel';
import { AchievementToast } from './components/AchievementToast';
import { AchievementsModal } from './components/AchievementsModal';
import { CabDashboardHud } from './components/CabDashboardHud';
import { CctvPreviewOverlay } from './components/CctvPreviewOverlay';
import { ControlsHelpModal } from './components/ControlsHelpModal';
import { CourseSummaryModal } from './components/CourseSummaryModal';
import { CustomLineBuilderModal } from './components/CustomLineBuilderModal';
import { DriverProfileModal } from './components/DriverProfileModal';
import { FpsCounterBadge } from './components/FpsCounterBadge';
import { GamepadToast } from './components/GamepadToast';
import { MobileTouchControls } from './components/MobileTouchControls';
import { PhotoModeOverlay } from './components/PhotoModeOverlay';
import { PortraitHintBanner } from './components/PortraitHintBanner';
import { SettingsModal } from './components/SettingsModal';
import { StatusModal } from './components/StatusModal';
import { TitleOverlay } from './components/TitleOverlay';
import { TopHudBar } from './components/TopHudBar';
import { getRankForXp } from './domain/driverProfile';
import { getPhotoFilterSpec } from './domain/photoMode';
import { formatClockTime, formatDeviationTime } from './domain/scheduleSystem';
import { getStationPlatformLayout, getStationPlatformSide } from './domain/trackGeometry';
import { useMetroGame } from './hooks/useMetroGame';
import { LanguageProvider } from './i18n/LanguageContext';

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const game = useMetroGame(mountRef);
  const { snapshot } = game;

  return (
    <LanguageProvider language={game.settings.language} onSetLanguage={game.setLanguage}>
    <main
      className="relative w-full h-full overflow-hidden bg-[#06080d]"
      data-testid="metro-simulator-root"
      data-phase={snapshot.phase}
      data-mode={snapshot.gameMode}
      data-ato={snapshot.atoEnabled ? '1' : '0'}
      data-ato-status={snapshot.atoStatus}
      data-lang={game.settings.language}
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
      data-headlights={snapshot.headlightMode}
      data-cab-light={snapshot.cabLightOn ? 'on' : 'off'}
      data-dim-prompt={snapshot.lightingEffects.dimHighBeamPromptActive ? '1' : '0'}
      data-spark-id={snapshot.lightingEffects.sparkEventId}
      data-night-service={snapshot.nightInspection.active ? '1' : '0'}
      data-night-crews={`${snapshot.nightInspection.passedCount}/${snapshot.nightInspection.totalCount}`}
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
      data-direction={snapshot.line.direction ?? 'normal'}
      data-start-station={snapshot.line.startStationIndex ?? 0}
      data-total-stations={snapshot.totalStations}
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
      data-academy-step={snapshot.academy?.currentStep ?? 0}
      data-academy-done={snapshot.academy?.completed ? '1' : '0'}
      data-gamepad={game.gamepadStatus.connected ? '1' : '0'}
      data-touch-controls={game.touchControlsActive ? '1' : '0'}
      data-live-mirrors={game.settings.liveMirrorsEnabled ? '1' : '0'}
      data-cctv-open={game.cctvPreviewOpen ? '1' : '0'}
      data-cctv-channel={game.cctvChannel}
      data-ghost-delta={
        game.ghostDelta?.hasSplitComparison
          ? `${game.ghostDelta.scoreDelta}:${game.ghostDelta.timeDeltaSec}`
          : game.ghostDelta
            ? `target:${game.ghostDelta.ghostBestScore}`
            : 'none'
      }
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
          baseLineSpec={game.baseLineSpec}
          routeDirection={game.routeDirection}
          startStationIndex={game.startStationIndex}
          customLines={game.customLines}
          driverProfile={game.driverProfile}
          gamepadStatus={game.gamepadStatus}
          selectedModelId={snapshot.trainModel.id}
          selectedTimeOfDayId={snapshot.timeOfDay.id}
          selectedWeatherMode={snapshot.weather.mode}
          selectedGameMode={snapshot.gameMode}
          selectedChallengeId={snapshot.challenge?.id ?? 'inverter_fault'}
          leaderboard={game.leaderboard}
          achievementsUnlocked={game.unlockedAchievements.length}
          achievementsTotal={game.achievementCatalog.length}
          onSelectLine={game.selectMetroLine}
          onSelectRouteDirection={game.selectRouteDirection}
          onSelectStartStation={game.selectStartStation}
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
          onStartAcademy={game.startAcademy}
          onStartPassengerAto={game.startPassengerAto}
          onStart={game.startGame}
        />
      )}

      {game.showPortraitHint && !game.photoModeActive && (
        <PortraitHintBanner onDismiss={game.dismissPortraitHint} />
      )}

      {snapshot.phase !== 'title' && !game.photoModeActive && (
        <>
          <TopHudBar
            snapshot={snapshot}
            ghostDelta={game.ghostDelta}
            muted={game.muted}
            cctvPreviewOpen={game.cctvPreviewOpen}
            onToggleMute={game.toggleMute}
            onToggleCctvPreview={game.toggleCctvPreview}
            onCycleCamera={game.cycleCamera}
            onToggleHelp={game.toggleHelp}
            onPause={game.pauseGame}
            onRestart={game.restartGame}
            onAcknowledgeRadio={game.acknowledgeRadio}
            onSandboxSpawnTrain={game.triggerSandboxOncomingTrain}
            onSandboxCycleSignal={game.cycleSandboxNextSignal}
          />
          {game.cctvPreviewOpen && (
            <CctvPreviewOverlay
              snapshot={snapshot}
              channel={game.cctvChannel}
              graphicsQuality={game.settings.graphicsQuality}
              liveMirrorsEnabled={game.settings.liveMirrorsEnabled}
              onSelectChannel={game.selectCctvChannel}
              onCanvasRef={game.registerCctvCanvas}
              onClose={game.closeCctvPreview}
            />
          )}
          {snapshot.gameMode === 'academy' && snapshot.academy && snapshot.phase === 'playing' && (
            <AcademyGuidePanel
              academy={snapshot.academy}
              gamepadConnected={game.gamepadStatus.connected}
            />
          )}
          {game.touchControlsActive && snapshot.phase === 'playing' && (
            <MobileTouchControls
              snapshot={snapshot}
              onLeverChange={game.setManualLeverAxis}
              onToggleDoorsLeft={game.toggleDoorsLeft}
              onToggleDoorsRight={game.toggleDoorsRight}
              onAcknowledgeCzuwak={game.acknowledgeCzuwak}
              onAcknowledgeRadio={game.acknowledgeRadio}
              onEmergencyBrake={game.triggerEmergencyBrake}
              onCycleCamera={game.cycleCamera}
              onToggleHeadlights={game.toggleHeadlights}
              onToggleCabLight={game.toggleCabLight}
              onToggleAto={game.toggleAto}
              onHornChange={game.setHornActive}
            />
          )}
          <CabDashboardHud
            snapshot={snapshot}
            compactTouchMode={game.touchControlsActive}
            onToggleDoorsLeft={game.toggleDoorsLeft}
            onToggleDoorsRight={game.toggleDoorsRight}
            onToggleHeadlights={game.toggleHeadlights}
            onToggleCabLight={game.toggleCabLight}
            onToggleWipers={game.toggleWipers}
            onToggleAto={game.toggleAto}
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
          gamepadStatus={game.gamepadStatus}
          onUpdate={game.updateSettings}
          onReset={game.resetSettings}
          onClose={game.closeSettings}
        />
      )}

      {!game.photoModeActive && <AchievementToast toast={game.achievementToast} />}
      <GamepadToast toast={game.gamepadToast} />
    </main>
    </LanguageProvider>
  );
}
