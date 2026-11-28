import type { IMetroGameController } from '../../hooks/useMetroGame';
import { AchievementToast } from '../AchievementToast';
import { AchievementsModal } from '../AchievementsModal';
import { ControlsHelpModal } from '../ControlsHelpModal';
import { CourseSummaryModal } from '../CourseSummaryModal';
import { CustomLineBuilderModal } from '../CustomLineBuilderModal';
import { DriverProfileModal } from '../DriverProfileModal';
import { GamepadToast } from '../GamepadToast';
import { PhotoModeOverlay } from '../PhotoModeOverlay';
import { SettingsModal } from '../SettingsModal';
import { StatusModal } from '../StatusModal';

function GamePhaseModals({ game }: { readonly game: IMetroGameController }) {
  const { snapshot } = game;
  return (
    <>
      {game.photoModeActive && (
        <PhotoModeOverlay state={game.photoState} capturing={game.photoCapturing} savedNotice={game.photoSavedNotice} trainName={snapshot.trainModel.name} onFovChange={game.setPhotoFov} onTiltChange={game.setPhotoTilt} onFilterChange={game.setPhotoFilter} onResetCamera={game.resetPhotoCamera} onCapturePng={game.capturePhotoPng} onClose={game.exitPhotoMode} />
      )}
      {snapshot.phase === 'paused' && !game.photoModeActive && !game.helpOpen && !game.settingsOpen && (
        <StatusModal snapshot={snapshot} onResume={game.resumeGame} onRestart={game.restartGame} onOpenPhotoMode={game.enterPhotoMode} onOpenSettings={game.openSettings} onTitle={game.returnToTitle} />
      )}
      {snapshot.phase === 'gameover' && (
        <CourseSummaryModal snapshot={snapshot} isNewRecord={game.isNewRecord} xpReward={game.lastCourseXpReward} driverProfile={game.driverProfile} onEnterTurnaroundSiding={game.enterTurnaroundSiding} onRestart={game.restartGame} onTitle={game.returnToTitle} />
      )}
    </>
  );
}

export function ModalsAndToastsLayer({ game }: { readonly game: IMetroGameController }) {
  return (
    <>
      <GamePhaseModals game={game} />
      {game.achievementsOpen && <AchievementsModal catalog={game.achievementCatalog} unlockedRecords={game.unlockedAchievements} onClose={game.closeAchievements} />}
      {game.profileOpen && <DriverProfileModal profile={game.driverProfile} onReset={game.resetDriverProfile} onClose={game.closeProfile} />}
      {game.lineBuilderDraft && <CustomLineBuilderModal initialDraft={game.lineBuilderDraft} isEditing={game.lineBuilderEditing} onSave={game.saveCustomLine} onClose={game.closeLineBuilder} />}
      {game.helpOpen && <ControlsHelpModal onClose={game.closeHelp} />}
      {game.settingsOpen && <SettingsModal settings={game.settings} gamepadStatus={game.gamepadStatus} onUpdate={game.updateSettings} onReset={game.resetSettings} onClose={game.closeSettings} />}
      {!game.photoModeActive && <AchievementToast toast={game.achievementToast} />}
      <GamepadToast toast={game.gamepadToast} />
    </>
  );
}
