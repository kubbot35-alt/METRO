import { localizeAnnouncement, localizeRadioDispatch } from '../../domain/i18nDynamic';
import type {
  IAchievementRecord,
  IAchievementToast,
  IAudioEvents,
  ICourseXpReward,
  IDriverProfileStats,
  ILeaderboardEntry,
  ILineGhostRecord,
  IPhotoCameraState,
  ISimulationSnapshot,
  RouteDirection,
} from '../../domain/types';
import type { IGameRuntimeRefs } from './types';

export interface IFrameRunnerCallbacks {
  readonly setFps: (fps: number) => void;
  readonly setSnapshot: (snap: ISimulationSnapshot) => void;
  readonly setPhotoState: (pose: IPhotoCameraState) => void;
  readonly setRouteDirection: (dir: RouteDirection) => void;
  readonly setStartStationIndex: (idx: number) => void;
  readonly setActiveGhostRecord: (rec: ILineGhostRecord | null) => void;
  readonly setDriverProfile: (profile: IDriverProfileStats) => void;
  readonly setLastCourseXpReward: (reward: ICourseXpReward | null) => void;
  readonly setLeaderboard: (entries: readonly ILeaderboardEntry[]) => void;
  readonly setIsNewRecord: (isNew: boolean) => void;
  readonly setUnlockedAchievements: (records: readonly IAchievementRecord[]) => void;
  readonly setAchievementToast: (toast: IAchievementToast | null) => void;
  readonly handlePauseToggle: () => void;
}

const TOAST_DURATION_SEC = 4.0;

export function applyGamepadRumbleEffect(refs: IGameRuntimeRefs, snap: ISimulationSnapshot): void {
  const pad = refs.gamepad.current;
  if (!refs.settingsRef.current.gamepadVibration || snap.phase !== 'playing' || !pad) {
    return;
  }
  if (snap.weather.wheelSlipActive) {
    pad.triggerRumble(0.55, 0.78, 170);
  } else if ((snap.kinematics.emergencyBrake || snap.kinematics.serviceBrake > 0.72) && snap.kinematics.speedKmh > 6) {
    pad.triggerRumble(0.68, 0.35, 145);
  } else if (snap.trackProfile.turnoutSwayFactor > 0.28 && snap.kinematics.speedKmh > 8) {
    pad.triggerRumble(0.24, 0.48, 120);
  }
}

function recordDutyLeaderboardRun(refs: IGameRuntimeRefs, cb: IFrameRunnerCallbacks, snap: ISimulationSnapshot): void {
  if (snap.gameMode !== 'duty') {
    return;
  }
  const saved = refs.services.leaderboard.recordRun({
    score: snap.score,
    grade: snap.driverGrade,
    trainModelId: snap.trainModel.id,
    trainName: snap.trainModel.name,
    timeOfDayId: snap.timeOfDay.id,
    timeOfDayLabel: snap.timeOfDay.name,
  });
  cb.setLeaderboard(saved.entries);
  cb.setIsNewRecord(saved.isNewRecord);
}

export function recordGameOverEffects(refs: IGameRuntimeRefs, cb: IFrameRunnerCallbacks, snap: ISimulationSnapshot): void {
  if (snap.phase !== 'gameover' || refs.recordedGameOverRef.current) {
    return;
  }
  refs.recordedGameOverRef.current = true;
  cb.setActiveGhostRecord(refs.services.ghostRecords.recordIfBest(snap).record);
  const careerRes = refs.services.driverProfile.recordCompletedCourse(snap);
  cb.setDriverProfile(careerRes.profile);
  cb.setLastCourseXpReward(careerRes.reward);
  if (careerRes.reward.rankedUp) {
    refs.audio.current?.playAchievementChime();
  }
  recordDutyLeaderboardRun(refs, cb, snap);
}

export function processAchievementsAndToastEffects(
  refs: IGameRuntimeRefs,
  cb: IFrameRunnerCallbacks,
  snap: ISimulationSnapshot,
  dt: number,
): void {
  if (snap.phase === 'playing' || snap.phase === 'gameover') {
    const unlocked = refs.services.achievements.evaluateAndUnlock(snap);
    if (unlocked.length > 0) {
      cb.setUnlockedAchievements(refs.services.achievements.getUnlockedRecords());
      refs.toastQueueRef.current.push(...unlocked);
      refs.audio.current?.playAchievementChime();
    }
  }
  stepAchievementToastTimer(refs, cb, dt);
}

function stepAchievementToastTimer(refs: IGameRuntimeRefs, cb: IFrameRunnerCallbacks, dt: number): void {
  const activeToast = refs.activeToastRef.current;
  if (activeToast) {
    const nextRem = activeToast.remainingSec - dt;
    refs.activeToastRef.current = nextRem <= 0 ? null : { ...activeToast, remainingSec: nextRem };
    if (nextRem <= 0) {
      cb.setAchievementToast(null);
    }
  }
  if (!refs.activeToastRef.current && refs.toastQueueRef.current.length > 0) {
    const nextSpec = refs.toastQueueRef.current.shift()!;
    const created: IAchievementToast = { spec: nextSpec, remainingSec: TOAST_DURATION_SEC };
    refs.activeToastRef.current = created;
    cb.setAchievementToast(created);
  }
}

export function syncAudioAndSpeechEffects(refs: IGameRuntimeRefs, snap: ISimulationSnapshot, events: IAudioEvents): void {
  const audio = refs.audio.current;
  const speech = refs.speech.current;
  audio?.update(snap, events);
  if (snap.phase !== 'playing' || !audio || !speech) {
    return;
  }
  const s = refs.settingsRef.current;
  const radioVol = s.masterVolume * (s.alertsVolume ?? s.voiceVolume);
  if (events.radioDispatchTriggered && snap.radio.active) {
    const loc = localizeRadioDispatch(s.language, snap.radio);
    speech.announce(10000 + snap.radio.messageId, loc.spokenText, audio.isMuted(), radioVol, s.language);
  } else if (snap.announcement) {
    const loc = localizeAnnouncement(s.language, snap.announcement);
    const spoken = loc?.spokenText ?? snap.announcement.spokenText ?? snap.announcement.text;
    speech.announce(snap.announcement.id, spoken, audio.isMuted(), s.masterVolume * s.voiceVolume, s.language);
  }
}
