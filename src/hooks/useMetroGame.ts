import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { MetroAudioEngine } from '../audio/metroAudioEngine';
import { WebSpeechAnnouncer, type ISpeechAnnouncer } from '../audio/speechAnnouncer';
import type { IAudioEngine } from '../audio/types';
import { AchievementService, type IAchievementService } from '../domain/achievements';
import { LeaderboardService, type ILeaderboardService } from '../domain/leaderboard';
import { MetroSimulationEngine } from '../domain/metroSimulation';
import { MetroScoringRules } from '../domain/scoringRules';
import { MetroTrainPhysics } from '../domain/trainPhysics';
import type {
  GameModeId,
  IAchievementRecord,
  IAchievementSpec,
  IAchievementToast,
  ILeaderboardEntry,
  IMetroSimulation,
  ISimulationSnapshot,
  MetroLineId,
  TimeOfDayId,
  TrainModelId,
} from '../domain/types';
import { KeyboardInputController } from '../input/keyboardInputController';
import type { IInputController } from '../input/types';
import { MetroSceneRenderer } from '../scene/metroSceneRenderer';
import type { IMetroSceneRenderer } from '../scene/types';

export interface IMetroGameController {
  readonly snapshot: ISimulationSnapshot;
  readonly muted: boolean;
  readonly helpOpen: boolean;
  readonly achievementsOpen: boolean;
  readonly achievementCatalog: readonly IAchievementSpec[];
  readonly unlockedAchievements: readonly IAchievementRecord[];
  readonly achievementToast: IAchievementToast | null;
  readonly leaderboard: readonly ILeaderboardEntry[];
  readonly isNewRecord: boolean;
  selectMetroLine: (lineId: MetroLineId) => void;
  selectGameMode: (mode: GameModeId) => void;
  selectTrainModel: (modelId: TrainModelId) => void;
  selectTimeOfDay: (timeOfDayId: TimeOfDayId) => void;
  triggerSandboxOncomingTrain: () => void;
  cycleSandboxNextSignal: () => void;
  openAchievements: () => void;
  closeAchievements: () => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  returnToTitle: () => void;
  toggleMute: () => void;
  toggleHelp: () => void;
  closeHelp: () => void;
  toggleDoors: () => void;
  toggleDoorsLeft: () => void;
  toggleDoorsRight: () => void;
  toggleHeadlights: () => void;
  acknowledgeCzuwak: () => void;
  cycleCamera: () => void;
  triggerEmergencyBrake: () => void;
  setHornActive: (active: boolean) => void;
  setManualLeverAxis: (axis: number | null) => void;
}

const HUD_SYNC_INTERVAL_MS = 100;

function hasAutostartParam(): boolean {
  return new URLSearchParams(window.location.search).get('autostart') === '1';
}

export function useMetroGame(mountRef: RefObject<HTMLDivElement | null>): IMetroGameController {
  const simRef = useRef<IMetroSimulation | null>(null);
  const leaderboardServiceRef = useRef<ILeaderboardService | null>(null);
  const achievementServiceRef = useRef<IAchievementService | null>(null);
  const rendererRef = useRef<IMetroSceneRenderer | null>(null);
  const audioRef = useRef<IAudioEngine | null>(null);
  const speechRef = useRef<ISpeechAnnouncer | null>(null);
  const inputRef = useRef<IInputController | null>(null);
  const helpPausedGameRef = useRef<boolean>(false);
  const helpOpenRef = useRef<boolean>(false);
  const recordedGameOverRef = useRef<boolean>(false);
  const toastQueueRef = useRef<IAchievementSpec[]>([]);
  const activeToastRef = useRef<IAchievementToast | null>(null);

  if (!leaderboardServiceRef.current) {
    leaderboardServiceRef.current = new LeaderboardService();
  }
  if (!achievementServiceRef.current) {
    achievementServiceRef.current = new AchievementService();
  }
  if (!simRef.current) {
    const initialSim = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
    initialSim.setTimeOfDay('rush');
    if (hasAutostartParam()) {
      initialSim.start();
    }
    simRef.current = initialSim;
  }

  const [snapshot, setSnapshot] = useState<ISimulationSnapshot>(() => simRef.current!.getSnapshot());
  const [muted, setMuted] = useState<boolean>(false);
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const [achievementsOpen, setAchievementsOpen] = useState<boolean>(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState<readonly IAchievementRecord[]>(
    () => achievementServiceRef.current!.getUnlockedRecords(),
  );
  const [achievementToast, setAchievementToast] = useState<IAchievementToast | null>(null);
  const [leaderboard, setLeaderboard] = useState<readonly ILeaderboardEntry[]>(() =>
    leaderboardServiceRef.current!.getTopEntries(),
  );
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);

  const syncNow = useCallback((): void => {
    const sim = simRef.current;
    if (!sim) {
      return;
    }
    const next = sim.getSnapshot();
    document.body.dataset.state = next.phase;
    setSnapshot(next);
  }, []);

  const selectMetroLine = useCallback(
    (lineId: MetroLineId): void => {
      simRef.current?.setMetroLine(lineId);
      syncNow();
    },
    [syncNow],
  );

  const selectGameMode = useCallback(
    (mode: GameModeId): void => {
      simRef.current?.setGameMode(mode);
      syncNow();
    },
    [syncNow],
  );

  const triggerSandboxOncomingTrain = useCallback((): void => {
    simRef.current?.triggerSandboxOncomingTrain();
    syncNow();
  }, [syncNow]);

  const cycleSandboxNextSignal = useCallback((): void => {
    simRef.current?.cycleSandboxNextSignal();
    syncNow();
  }, [syncNow]);

  const openAchievements = useCallback((): void => {
    setUnlockedAchievements(achievementServiceRef.current!.getUnlockedRecords());
    setAchievementsOpen(true);
  }, []);

  const closeAchievements = useCallback((): void => {
    setAchievementsOpen(false);
  }, []);

  const selectTrainModel = useCallback(
    (modelId: TrainModelId): void => {
      simRef.current?.setTrainModel(modelId);
      syncNow();
    },
    [syncNow],
  );

  const selectTimeOfDay = useCallback(
    (timeOfDayId: TimeOfDayId): void => {
      simRef.current?.setTimeOfDay(timeOfDayId);
      syncNow();
    },
    [syncNow],
  );

  const startGame = useCallback((): void => {
    audioRef.current?.unlock();
    inputRef.current?.clearHeld();
    recordedGameOverRef.current = false;
    setIsNewRecord(false);
    helpOpenRef.current = false;
    setHelpOpen(false);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    simRef.current?.start();
    syncNow();
  }, [syncNow]);

  const pauseGame = useCallback((): void => {
    simRef.current?.pause();
    audioRef.current?.silence();
    speechRef.current?.stop();
    inputRef.current?.clearHeld();
    syncNow();
  }, [syncNow]);

  const resumeGame = useCallback((): void => {
    audioRef.current?.unlock();
    inputRef.current?.clearHeld();
    simRef.current?.resume();
    syncNow();
  }, [syncNow]);

  const restartGame = useCallback((): void => {
    audioRef.current?.unlock();
    speechRef.current?.stop();
    inputRef.current?.clearHeld();
    recordedGameOverRef.current = false;
    setIsNewRecord(false);
    helpOpenRef.current = false;
    setHelpOpen(false);
    simRef.current?.reset();
    syncNow();
  }, [syncNow]);

  const returnToTitle = useCallback((): void => {
    const currentSnap = simRef.current?.getSnapshot();
    const currentLineId = currentSnap?.line.id ?? 'M1';
    const currentMode = currentSnap?.gameMode ?? 'duty';
    const currentModelId = currentSnap?.trainModel.id ?? 'inspiro';
    const currentTimeOfDayId = currentSnap?.timeOfDay.id ?? 'rush';
    simRef.current?.reset();
    audioRef.current?.silence();
    speechRef.current?.stop();
    inputRef.current?.clearHeld();
    recordedGameOverRef.current = false;
    setIsNewRecord(false);
    helpOpenRef.current = false;
    setHelpOpen(false);
    const freshSim = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
    freshSim.setMetroLine(currentLineId);
    freshSim.setGameMode(currentMode);
    freshSim.setTrainModel(currentModelId);
    freshSim.setTimeOfDay(currentTimeOfDayId);
    simRef.current = freshSim;
    setLeaderboard(leaderboardServiceRef.current!.getTopEntries());
    syncNow();
  }, [syncNow]);

  const closeHelp = useCallback((): void => {
    if (!helpOpenRef.current) {
      return;
    }
    helpOpenRef.current = false;
    setHelpOpen(false);
    if (helpPausedGameRef.current) {
      helpPausedGameRef.current = false;
      resumeGame();
    }
  }, [resumeGame]);

  const toggleHelp = useCallback((): void => {
    if (helpOpenRef.current) {
      closeHelp();
      return;
    }
    helpOpenRef.current = true;
    setHelpOpen(true);
    if (simRef.current?.getSnapshot().phase === 'playing') {
      helpPausedGameRef.current = true;
      pauseGame();
    } else {
      helpPausedGameRef.current = false;
    }
  }, [closeHelp, pauseGame]);

  const toggleMute = useCallback((): void => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    const nextMuted = !audio.isMuted();
    audio.setMuted(nextMuted);
    if (nextMuted) {
      speechRef.current?.stop();
    }
    setMuted(nextMuted);
  }, []);

  const toggleDoors = useCallback((): void => {
    inputRef.current?.triggerDoorToggle();
  }, []);

  const toggleDoorsLeft = useCallback((): void => {
    inputRef.current?.triggerDoorLeftToggle();
  }, []);

  const toggleDoorsRight = useCallback((): void => {
    inputRef.current?.triggerDoorRightToggle();
  }, []);

  const toggleHeadlights = useCallback((): void => {
    inputRef.current?.triggerHeadlightsToggle();
  }, []);

  const acknowledgeCzuwak = useCallback((): void => {
    inputRef.current?.triggerCzuwakAck();
  }, []);

  const cycleCamera = useCallback((): void => {
    inputRef.current?.triggerCameraCycle();
  }, []);

  const triggerEmergencyBrake = useCallback((): void => {
    inputRef.current?.triggerEmergencyBrake();
  }, []);

  const setHornActive = useCallback((active: boolean): void => {
    inputRef.current?.setVirtualHorn(active);
  }, []);

  const setManualLeverAxis = useCallback((axis: number | null): void => {
    inputRef.current?.setVirtualLeverAxis(axis);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) {
      return undefined;
    }
    const sceneRenderer = new MetroSceneRenderer();
    const audio = new MetroAudioEngine();
    const speech = new WebSpeechAnnouncer();
    const input = new KeyboardInputController();
    rendererRef.current = sceneRenderer;
    audioRef.current = audio;
    speechRef.current = speech;
    inputRef.current = input;

    sceneRenderer.mount(container);
    input.attach({
      onStartRequested: () => startGame(),
      onHelpToggle: () => toggleHelp(),
      onPauseToggle: () => {
        if (helpOpenRef.current) {
          closeHelp();
          return;
        }
        const phase = simRef.current?.getSnapshot().phase;
        if (phase === 'playing') {
          pauseGame();
        } else if (phase === 'paused') {
          resumeGame();
        }
      },
      onMuteToggle: () => toggleMute(),
      onRestartRequested: () => {
        if (simRef.current?.getSnapshot().phase !== 'title') {
          restartGame();
        }
      },
      onFirstInteraction: () => audio.unlock(),
    });

    document.body.dataset.state = simRef.current!.getSnapshot().phase;
    let active = true;
    let frameHandle = 0;
    let lastTime = performance.now();
    let lastHudSync = 0;
    let lastPhase = simRef.current!.getSnapshot().phase;
    let lastScore = 0;
    let lastDoor = simRef.current!.getSnapshot().doorState;
    let lastDoorSide = simRef.current!.getSnapshot().openDoorSide;
    let lastHeadlights = simRef.current!.getSnapshot().headlightsOn;
    let lastPassengers = 0;
    let lastAnnId = -1;
    let lastCzuwak = false;
    let lastDoorFault = 'none';
    let lastCameraMode = simRef.current!.getSnapshot().cameraMode;
    let lastCameraNoticeId = -1;
    let lastLineId = simRef.current!.getSnapshot().line.id;
    let lastTrainModelId = simRef.current!.getSnapshot().trainModel.id;
    let lastTimeOfDayId = simRef.current!.getSnapshot().timeOfDay.id;

    const tick = (): void => {
      if (!active) {
        return;
      }
      const now = performance.now();
      const rawDt = Math.min(Math.max((now - lastTime) / 1000, 0), 0.35);
      lastTime = now;

      const sim = simRef.current!;
      const control = input.sampleControlInput();
      let remaining = rawDt > 0 ? rawDt : 0.016;
      let latestAudio = sim.step(control, Math.min(remaining, 0.05));
      remaining -= 0.05;
      const heldOnlyControl = {
        ...control,
        emergencyBrakePressed: false,
        toggleDoorsPressed: false,
        toggleDoorsLeftPressed: false,
        toggleDoorsRightPressed: false,
        toggleHeadlightsPressed: false,
        acknowledgeCzuwakPressed: false,
        cycleCameraPressed: false,
      };
      while (remaining > 0.001) {
        const subDt = Math.min(remaining, 0.05);
        const nextAudio = sim.step(heldOnlyControl, subDt);
        latestAudio = {
          hornActive: latestAudio.hornActive || nextAudio.hornActive,
          doorToggledTo: latestAudio.doorToggledTo ?? nextAudio.doorToggledTo,
          boardingCompleteChime: latestAudio.boardingCompleteChime || nextAudio.boardingCompleteChime,
          overspeedWarning: latestAudio.overspeedWarning || nextAudio.overspeedWarning,
          emergencyBrakeTriggered: latestAudio.emergencyBrakeTriggered || nextAudio.emergencyBrakeTriggered,
          railJointPulse: latestAudio.railJointPulse || nextAudio.railJointPulse,
          brakeStopHiss: latestAudio.brakeStopHiss || nextAudio.brakeStopHiss,
          atpTriggered: latestAudio.atpTriggered || nextAudio.atpTriggered,
          signalClearedChime: latestAudio.signalClearedChime || nextAudio.signalClearedChime,
          czuwakAlertTriggered: latestAudio.czuwakAlertTriggered || nextAudio.czuwakAlertTriggered,
          czuwakAckChime: latestAudio.czuwakAckChime || nextAudio.czuwakAckChime,
          doorFaultBeep: latestAudio.doorFaultBeep || nextAudio.doorFaultBeep,
          passingTrainWhoosh: latestAudio.passingTrainWhoosh || nextAudio.passingTrainWhoosh,
        };
        remaining -= subDt;
      }
      const snap = sim.getSnapshot();

      if (snap.phase === 'gameover' && !recordedGameOverRef.current) {
        recordedGameOverRef.current = true;
        if (snap.gameMode === 'duty') {
          const saved = leaderboardServiceRef.current!.recordRun({
            score: snap.score,
            grade: snap.driverGrade,
            trainModelId: snap.trainModel.id,
            trainName: snap.trainModel.name,
            timeOfDayId: snap.timeOfDay.id,
            timeOfDayLabel: snap.timeOfDay.name,
          });
          setLeaderboard(saved.entries);
          setIsNewRecord(saved.isNewRecord);
        }
      }

      if (snap.phase === 'playing' || snap.phase === 'gameover') {
        const newlyUnlocked = achievementServiceRef.current!.evaluateAndUnlock(snap);
        if (newlyUnlocked.length > 0) {
          setUnlockedAchievements(achievementServiceRef.current!.getUnlockedRecords());
          toastQueueRef.current.push(...newlyUnlocked);
          audio.playAchievementChime();
        }
      }

      const toastDt = rawDt > 0 ? rawDt : 0.016;
      if (activeToastRef.current) {
        const nextRem = activeToastRef.current.remainingSec - toastDt;
        if (nextRem <= 0) {
          activeToastRef.current = null;
          setAchievementToast(null);
        } else {
          activeToastRef.current = { ...activeToastRef.current, remainingSec: nextRem };
        }
      }
      if (!activeToastRef.current && toastQueueRef.current.length > 0) {
        const nextSpec = toastQueueRef.current.shift()!;
        activeToastRef.current = { spec: nextSpec, remainingSec: 4.0 };
        setAchievementToast(activeToastRef.current);
      }

      audio.update(snap, latestAudio);
      if (snap.announcement && snap.phase === 'playing') {
        speech.announce(
          snap.announcement.id,
          snap.announcement.spokenText ?? snap.announcement.text,
          audio.isMuted(),
        );
      }
      sceneRenderer.update(snap, rawDt);
      sceneRenderer.render();

      const annId = snap.announcement?.id ?? -1;
      const camNoticeId = snap.cameraNotice?.id ?? -1;
      const discreteChanged =
        snap.phase !== lastPhase ||
        snap.score !== lastScore ||
        snap.doorState !== lastDoor ||
        snap.openDoorSide !== lastDoorSide ||
        snap.headlightsOn !== lastHeadlights ||
        snap.passengersCarried !== lastPassengers ||
        annId !== lastAnnId ||
        snap.czuwak.active !== lastCzuwak ||
        snap.doorFault.phase !== lastDoorFault ||
        snap.cameraMode !== lastCameraMode ||
        camNoticeId !== lastCameraNoticeId ||
        snap.line.id !== lastLineId ||
        snap.trainModel.id !== lastTrainModelId ||
        snap.timeOfDay.id !== lastTimeOfDayId;
      if (discreteChanged || now - lastHudSync >= HUD_SYNC_INTERVAL_MS) {
        lastHudSync = now;
        lastPhase = snap.phase;
        lastScore = snap.score;
        lastDoor = snap.doorState;
        lastDoorSide = snap.openDoorSide;
        lastHeadlights = snap.headlightsOn;
        lastPassengers = snap.passengersCarried;
        lastAnnId = annId;
        lastCzuwak = snap.czuwak.active;
        lastDoorFault = snap.doorFault.phase;
        lastCameraMode = snap.cameraMode;
        lastCameraNoticeId = camNoticeId;
        lastLineId = snap.line.id;
        lastTrainModelId = snap.trainModel.id;
        lastTimeOfDayId = snap.timeOfDay.id;
        document.body.dataset.state = snap.phase;
        setSnapshot(snap);
      }

      frameHandle = sceneRenderer.scheduleNextFrame(tick);
    };

    frameHandle = sceneRenderer.scheduleNextFrame(tick);

    return () => {
      active = false;
      sceneRenderer.cancelScheduledFrame(frameHandle);
      input.detach();
      speech.dispose();
      audio.dispose();
      sceneRenderer.dispose();
    };
  }, [closeHelp, mountRef, pauseGame, restartGame, resumeGame, startGame, toggleHelp, toggleMute]);

  return {
    snapshot,
    muted,
    helpOpen,
    achievementsOpen,
    achievementCatalog: achievementServiceRef.current!.getCatalog(),
    unlockedAchievements,
    achievementToast,
    leaderboard,
    isNewRecord,
    selectMetroLine,
    selectGameMode,
    selectTrainModel,
    selectTimeOfDay,
    triggerSandboxOncomingTrain,
    cycleSandboxNextSignal,
    openAchievements,
    closeAchievements,
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    returnToTitle,
    toggleMute,
    toggleHelp,
    closeHelp,
    toggleDoors,
    toggleDoorsLeft,
    toggleDoorsRight,
    toggleHeadlights,
    acknowledgeCzuwak,
    cycleCamera,
    triggerEmergencyBrake,
    setHornActive,
    setManualLeverAxis,
  };
}
