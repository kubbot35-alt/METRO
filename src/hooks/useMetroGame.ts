import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { MetroAudioEngine } from '../audio/metroAudioEngine';
import { WebSpeechAnnouncer, type ISpeechAnnouncer } from '../audio/speechAnnouncer';
import type { IAudioEngine } from '../audio/types';
import { AchievementService, type IAchievementService } from '../domain/achievements';
import {
  compileCustomLineSpec,
  createDefaultCustomLineDraft,
  CustomLineStorageService,
  type ICustomLineService,
} from '../domain/customLines';
import { DriverProfileService, type IDriverProfileService } from '../domain/driverProfile';
import {
  computeGhostDelta,
  GhostRecordStorageService,
  type IGhostRecordService,
} from '../domain/ghostDelta';
import { localizeAnnouncement, localizeRadioDispatch } from '../domain/i18nDynamic';
import { LeaderboardService, type ILeaderboardService } from '../domain/leaderboard';
import { MetroSimulationEngine } from '../domain/metroSimulation';
import {
  detectTouchDevice,
  resolveTouchControlsActive,
  shouldShowPortraitHint,
} from '../domain/mobileTouch';
import { PhotoCameraController } from '../domain/photoMode';
import { getMetroLineSpec, METRO_LINE_M1 } from '../domain/routeData';
import { compileRouteVariant } from '../domain/routeVariant';
import { MetroScoringRules } from '../domain/scoringRules';
import { SettingsStorageService, type ISettingsService } from '../domain/settingsService';
import { MetroTrainPhysics } from '../domain/trainPhysics';
import type {
  CctvPreviewChannel,
  ChallengeId,
  DoorSide,
  GameModeId,
  GamepadBrand,
  IAchievementRecord,
  IAchievementSpec,
  IAchievementToast,
  ICourseXpReward,
  ICustomLineDraft,
  IDriverProfileStats,
  IGamepadStatus,
  IGameSettings,
  IGhostDeltaSnapshot,
  ILeaderboardEntry,
  ILineGhostRecord,
  IMetroLineSpec,
  IMetroSimulation,
  IPhotoCameraState,
  IPhotoMoveInput,
  ISimulationSnapshot,
  LanguageId,
  MetroLineId,
  PhotoFilterId,
  RouteDirection,
  TimeOfDayId,
  TrainModelId,
  WeatherModeId,
} from '../domain/types';
import { BrowserGamepadController, type IGamepadController } from '../input/gamepadController';
import { KeyboardInputController } from '../input/keyboardInputController';
import type { IInputController } from '../input/types';
import { MetroSceneRenderer } from '../scene/metroSceneRenderer';
import type { IMetroSceneRenderer } from '../scene/types';

export interface IGamepadToastState {
  readonly name: string;
  readonly brand: GamepadBrand;
}

export interface IMetroGameController {
  readonly snapshot: ISimulationSnapshot;
  readonly settings: IGameSettings;
  readonly fps: number;
  readonly muted: boolean;
  readonly helpOpen: boolean;
  readonly settingsOpen: boolean;
  readonly achievementsOpen: boolean;
  readonly profileOpen: boolean;
  readonly customLines: readonly ICustomLineDraft[];
  readonly baseLineSpec: IMetroLineSpec;
  readonly routeDirection: RouteDirection;
  readonly startStationIndex: number;
  readonly lineBuilderDraft: ICustomLineDraft | null;
  readonly lineBuilderEditing: boolean;
  readonly driverProfile: IDriverProfileStats;
  readonly lastCourseXpReward: ICourseXpReward | null;
  readonly achievementCatalog: readonly IAchievementSpec[];
  readonly unlockedAchievements: readonly IAchievementRecord[];
  readonly achievementToast: IAchievementToast | null;
  readonly leaderboard: readonly ILeaderboardEntry[];
  readonly isNewRecord: boolean;
  readonly photoModeActive: boolean;
  readonly photoState: IPhotoCameraState;
  readonly photoCapturing: boolean;
  readonly photoSavedNotice: boolean;
  readonly gamepadStatus: IGamepadStatus;
  readonly gamepadToast: IGamepadToastState | null;
  readonly touchControlsActive: boolean;
  readonly showPortraitHint: boolean;
  readonly ghostDelta: IGhostDeltaSnapshot | null;
  readonly cctvPreviewOpen: boolean;
  readonly cctvChannel: CctvPreviewChannel;
  toggleCctvPreview: () => void;
  closeCctvPreview: () => void;
  selectCctvChannel: (channel: CctvPreviewChannel) => void;
  registerCctvCanvas: (canvas: HTMLCanvasElement | null) => void;
  dismissPortraitHint: () => void;
  selectMetroLine: (lineId: MetroLineId) => void;
  selectRouteDirection: (direction: RouteDirection) => void;
  selectStartStation: (startIndex: number) => void;
  selectGameMode: (mode: GameModeId) => void;
  selectChallenge: (challengeId: ChallengeId) => void;
  selectWeatherMode: (mode: WeatherModeId) => void;
  selectTrainModel: (modelId: TrainModelId) => void;
  selectTimeOfDay: (timeOfDayId: TimeOfDayId) => void;
  triggerSandboxOncomingTrain: () => void;
  cycleSandboxNextSignal: () => void;
  openAchievements: () => void;
  closeAchievements: () => void;
  openProfile: () => void;
  closeProfile: () => void;
  resetDriverProfile: () => void;
  openLineBuilder: (editDraft?: ICustomLineDraft) => void;
  closeLineBuilder: () => void;
  saveCustomLine: (draft: ICustomLineDraft) => void;
  deleteCustomLine: (id: string) => void;
  openSettings: () => void;
  closeSettings: () => void;
  updateSettings: (partial: Partial<IGameSettings>) => void;
  setLanguage: (language: LanguageId) => void;
  resetSettings: () => void;
  startGame: () => void;
  startAcademy: () => void;
  startPassengerAto: () => void;
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
  toggleCabLight: () => void;
  toggleWipers: () => void;
  toggleAto: () => void;
  acknowledgeCzuwak: () => void;
  acknowledgeRadio: () => void;
  cycleCamera: () => void;
  triggerEmergencyBrake: () => void;
  setHornActive: (active: boolean) => void;
  setManualLeverAxis: (axis: number | null) => void;
  enterPhotoMode: () => void;
  exitPhotoMode: () => void;
  togglePhotoMode: () => void;
  setPhotoFov: (fovDeg: number) => void;
  setPhotoTilt: (rollDeg: number) => void;
  setPhotoFilter: (filter: PhotoFilterId) => void;
  resetPhotoCamera: () => void;
  capturePhotoPng: () => void;
}

const HUD_SYNC_INTERVAL_MS = 100;

function hasAutostartParam(): boolean {
  return new URLSearchParams(window.location.search).get('autostart') === '1';
}

export function useMetroGame(mountRef: RefObject<HTMLDivElement | null>): IMetroGameController {
  const simRef = useRef<IMetroSimulation | null>(null);
  const leaderboardServiceRef = useRef<ILeaderboardService | null>(null);
  const achievementServiceRef = useRef<IAchievementService | null>(null);
  const settingsServiceRef = useRef<ISettingsService | null>(null);
  const customLineServiceRef = useRef<ICustomLineService | null>(null);
  const driverProfileServiceRef = useRef<IDriverProfileService | null>(null);
  const ghostRecordServiceRef = useRef<IGhostRecordService | null>(null);
  const rendererRef = useRef<IMetroSceneRenderer | null>(null);
  const audioRef = useRef<IAudioEngine | null>(null);
  const speechRef = useRef<ISpeechAnnouncer | null>(null);
  const inputRef = useRef<IInputController | null>(null);
  const gamepadRef = useRef<IGamepadController | null>(null);
  const gamepadToastTimerRef = useRef<number | null>(null);
  const preAcademyLineRef = useRef<IMetroLineSpec | null>(null);
  const preAcademyModeRef = useRef<GameModeId>('duty');
  const helpPausedGameRef = useRef<boolean>(false);
  const helpOpenRef = useRef<boolean>(false);
  const settingsOpenRef = useRef<boolean>(false);
  const recordedGameOverRef = useRef<boolean>(false);
  const toastQueueRef = useRef<IAchievementSpec[]>([]);
  const activeToastRef = useRef<IAchievementToast | null>(null);
  const photoControllerRef = useRef<PhotoCameraController>(new PhotoCameraController());
  const photoModeActiveRef = useRef<boolean>(false);
  const photoKeepInteriorRef = useRef<boolean>(false);
  const photoKeysRef = useRef<Set<string>>(new Set());
  const photoNoticeTimerRef = useRef<number | null>(null);

  if (!leaderboardServiceRef.current) {
    leaderboardServiceRef.current = new LeaderboardService();
  }
  if (!achievementServiceRef.current) {
    achievementServiceRef.current = new AchievementService();
  }
  if (!settingsServiceRef.current) {
    settingsServiceRef.current = new SettingsStorageService();
  }
  if (!customLineServiceRef.current) {
    customLineServiceRef.current = new CustomLineStorageService();
  }
  if (!driverProfileServiceRef.current) {
    driverProfileServiceRef.current = new DriverProfileService();
  }
  if (!ghostRecordServiceRef.current) {
    ghostRecordServiceRef.current = new GhostRecordStorageService();
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
  const [settings, setSettings] = useState<IGameSettings>(() => settingsServiceRef.current!.load());
  const settingsRef = useRef<IGameSettings>(settings);
  const [customLines, setCustomLines] = useState<readonly ICustomLineDraft[]>(() =>
    customLineServiceRef.current!.list(),
  );
  const customLinesRef = useRef<readonly ICustomLineDraft[]>(customLines);
  const [baseLineSpec, setBaseLineSpec] = useState<IMetroLineSpec>(METRO_LINE_M1);
  const baseLineRef = useRef<IMetroLineSpec>(METRO_LINE_M1);
  const [routeDirection, setRouteDirection] = useState<RouteDirection>('normal');
  const routeDirectionRef = useRef<RouteDirection>('normal');
  const [startStationIndex, setStartStationIndex] = useState<number>(0);
  const startStationIndexRef = useRef<number>(0);
  const [lineBuilderDraft, setLineBuilderDraft] = useState<ICustomLineDraft | null>(null);
  const [lineBuilderEditing, setLineBuilderEditing] = useState<boolean>(false);
  const [driverProfile, setDriverProfile] = useState<IDriverProfileStats>(() =>
    driverProfileServiceRef.current!.load(),
  );
  const [profileOpen, setProfileOpen] = useState<boolean>(false);
  const [lastCourseXpReward, setLastCourseXpReward] = useState<ICourseXpReward | null>(null);
  const [fps, setFps] = useState<number>(60);
  const [muted, setMuted] = useState<boolean>(false);
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [achievementsOpen, setAchievementsOpen] = useState<boolean>(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState<readonly IAchievementRecord[]>(
    () => achievementServiceRef.current!.getUnlockedRecords(),
  );
  const [achievementToast, setAchievementToast] = useState<IAchievementToast | null>(null);
  const [leaderboard, setLeaderboard] = useState<readonly ILeaderboardEntry[]>(() =>
    leaderboardServiceRef.current!.getTopEntries(),
  );
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [photoModeActive, setPhotoModeActive] = useState<boolean>(false);
  const [photoState, setPhotoState] = useState<IPhotoCameraState>(() =>
    photoControllerRef.current.getState(),
  );
  const [photoCapturing, setPhotoCapturing] = useState<boolean>(false);
  const [photoSavedNotice, setPhotoSavedNotice] = useState<boolean>(false);
  const [gamepadStatus, setGamepadStatus] = useState<IGamepadStatus>({
    connected: false,
    name: '',
    brand: 'generic',
    supportsVibration: false,
  });
  const [gamepadToast, setGamepadToast] = useState<IGamepadToastState | null>(null);
  const [isTouchHardware, setIsTouchHardware] = useState<boolean>(() =>
    detectTouchDevice({
      maxTouchPoints: typeof navigator !== 'undefined' ? navigator.maxTouchPoints ?? 0 : 0,
      hasCoarsePointer:
        typeof window !== 'undefined' && typeof window.matchMedia === 'function'
          ? window.matchMedia('(pointer: coarse)').matches
          : false,
      hasTouchStartEvent: typeof window !== 'undefined' && 'ontouchstart' in window,
    }),
  );
  const [viewportSize, setViewportSize] = useState<{ readonly w: number; readonly h: number }>(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 720,
  }));
  const [portraitDismissed, setPortraitDismissed] = useState<boolean>(false);
  const [activeGhostRecord, setActiveGhostRecord] = useState<ILineGhostRecord | null>(() =>
    ghostRecordServiceRef.current!.getRecordForLine(simRef.current!.getSnapshot().line.id),
  );
  const [cctvPreviewOpen, setCctvPreviewOpen] = useState<boolean>(false);
  const [cctvChannel, setCctvChannel] = useState<CctvPreviewChannel>('auto');
  const cctvPreviewOpenRef = useRef<boolean>(false);
  const cctvChannelRef = useRef<CctvPreviewChannel>('auto');
  const cctvCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const syncCctvToRenderer = useCallback(
    (open: boolean, channel: CctvPreviewChannel, canvas: HTMLCanvasElement | null): void => {
      rendererRef.current?.setCctvPreviewState?.(open, channel, canvas);
    },
    [],
  );

  const toggleCctvPreview = useCallback((): void => {
    const next = !cctvPreviewOpenRef.current;
    cctvPreviewOpenRef.current = next;
    setCctvPreviewOpen(next);
    syncCctvToRenderer(next, cctvChannelRef.current, cctvCanvasRef.current);
  }, [syncCctvToRenderer]);

  const closeCctvPreview = useCallback((): void => {
    cctvPreviewOpenRef.current = false;
    setCctvPreviewOpen(false);
    syncCctvToRenderer(false, cctvChannelRef.current, cctvCanvasRef.current);
  }, [syncCctvToRenderer]);

  const selectCctvChannel = useCallback(
    (channel: CctvPreviewChannel): void => {
      cctvChannelRef.current = channel;
      setCctvChannel(channel);
      syncCctvToRenderer(cctvPreviewOpenRef.current, channel, cctvCanvasRef.current);
    },
    [syncCctvToRenderer],
  );

  const registerCctvCanvas = useCallback(
    (canvas: HTMLCanvasElement | null): void => {
      cctvCanvasRef.current = canvas;
      syncCctvToRenderer(cctvPreviewOpenRef.current, cctvChannelRef.current, canvas);
    },
    [syncCctvToRenderer],
  );

  const handle3dMonitorClick = useCallback(
    (side: DoorSide): void => {
      if (cctvPreviewOpenRef.current && cctvChannelRef.current === side) {
        cctvPreviewOpenRef.current = false;
        setCctvPreviewOpen(false);
        syncCctvToRenderer(false, side, cctvCanvasRef.current);
        return;
      }
      cctvPreviewOpenRef.current = true;
      cctvChannelRef.current = side;
      setCctvPreviewOpen(true);
      setCctvChannel(side);
      syncCctvToRenderer(true, side, cctvCanvasRef.current);
    },
    [syncCctvToRenderer],
  );

  useEffect(() => {
    const onResize = (): void => {
      setViewportSize({ w: window.innerWidth, h: window.innerHeight });
      setIsTouchHardware(
        detectTouchDevice({
          maxTouchPoints: navigator.maxTouchPoints ?? 0,
          hasCoarsePointer:
            typeof window.matchMedia === 'function'
              ? window.matchMedia('(pointer: coarse)').matches
              : false,
          hasTouchStartEvent: 'ontouchstart' in window,
        }),
      );
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  useEffect(() => {
    setActiveGhostRecord(ghostRecordServiceRef.current!.getRecordForLine(snapshot.line.id));
  }, [snapshot.line.id]);

  const touchControlsActive = resolveTouchControlsActive(
    settings.touchControlsMode,
    isTouchHardware,
  );
  const showPortraitHint = shouldShowPortraitHint(
    viewportSize.w,
    viewportSize.h,
    isTouchHardware || touchControlsActive || viewportSize.w <= 640,
    portraitDismissed,
  );
  const dismissPortraitHint = useCallback((): void => {
    setPortraitDismissed(true);
  }, []);

  const ghostDelta =
    snapshot.gameMode === 'duty' || snapshot.gameMode === 'challenge'
      ? computeGhostDelta(snapshot.stationSplits, activeGhostRecord)
      : null;

  useEffect(() => {
    document.body.dataset.modalOpen =
      helpOpen || achievementsOpen || settingsOpen || profileOpen || lineBuilderDraft !== null
        ? '1'
        : '0';
  }, [helpOpen, achievementsOpen, settingsOpen, profileOpen, lineBuilderDraft]);

  useEffect(() => {
    document.body.dataset.photoMode = photoModeActive ? '1' : '0';
  }, [photoModeActive]);

  const syncNow = useCallback((): void => {
    const sim = simRef.current;
    if (!sim) {
      return;
    }
    const next = sim.getSnapshot();
    document.body.dataset.state = next.phase;
    setSnapshot(next);
    setActiveGhostRecord(ghostRecordServiceRef.current!.getRecordForLine(next.line.id));
    if (rendererRef.current) {
      rendererRef.current.update(next, 0);
      rendererRef.current.render();
    }
  }, []);

  const applyRouteVariant = useCallback(
    (baseLine: IMetroLineSpec, direction: RouteDirection, startIdx: number): void => {
      const compiled = compileRouteVariant(baseLine, direction, startIdx);
      baseLineRef.current = baseLine;
      routeDirectionRef.current = direction;
      startStationIndexRef.current = compiled.startStationIndex ?? 0;
      setBaseLineSpec(baseLine);
      setRouteDirection(direction);
      setStartStationIndex(compiled.startStationIndex ?? 0);
      simRef.current?.setMetroLineSpec?.(compiled);
      syncNow();
    },
    [syncNow],
  );

  const selectMetroLine = useCallback(
    (lineId: MetroLineId): void => {
      if (lineId === 'M1' || lineId === 'M2') {
        applyRouteVariant(getMetroLineSpec(lineId), 'normal', 0);
      } else {
        const custom = customLinesRef.current.find((item) => item.id === lineId);
        const base = custom ? compileCustomLineSpec(custom) : METRO_LINE_M1;
        applyRouteVariant(base, 'normal', 0);
      }
    },
    [applyRouteVariant],
  );

  const selectRouteDirection = useCallback(
    (direction: RouteDirection): void => {
      applyRouteVariant(baseLineRef.current, direction, 0);
    },
    [applyRouteVariant],
  );

  const selectStartStation = useCallback(
    (startIdx: number): void => {
      applyRouteVariant(baseLineRef.current, routeDirectionRef.current, startIdx);
    },
    [applyRouteVariant],
  );

  const selectGameMode = useCallback(
    (mode: GameModeId): void => {
      simRef.current?.setGameMode(mode);
      syncNow();
    },
    [syncNow],
  );

  const selectChallenge = useCallback(
    (challengeId: ChallengeId): void => {
      simRef.current?.setChallenge?.(challengeId);
      syncNow();
    },
    [syncNow],
  );

  const selectWeatherMode = useCallback(
    (mode: WeatherModeId): void => {
      simRef.current?.setWeatherMode?.(mode);
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

  const openProfile = useCallback((): void => {
    setDriverProfile(driverProfileServiceRef.current!.load());
    setProfileOpen(true);
  }, []);

  const closeProfile = useCallback((): void => {
    setProfileOpen(false);
  }, []);

  const resetDriverProfile = useCallback((): void => {
    const cleared = driverProfileServiceRef.current!.reset();
    setDriverProfile(cleared);
    setLastCourseXpReward(null);
  }, []);

  const openLineBuilder = useCallback((editDraft?: ICustomLineDraft): void => {
    if (editDraft) {
      setLineBuilderDraft(editDraft);
      setLineBuilderEditing(true);
    } else {
      setLineBuilderDraft(createDefaultCustomLineDraft());
      setLineBuilderEditing(false);
    }
  }, []);

  const closeLineBuilder = useCallback((): void => {
    setLineBuilderDraft(null);
    setLineBuilderEditing(false);
  }, []);

  const saveCustomLine = useCallback(
    (draft: ICustomLineDraft): void => {
      const updated = customLineServiceRef.current!.save(draft);
      customLinesRef.current = updated;
      setCustomLines(updated);
      setLineBuilderDraft(null);
      setLineBuilderEditing(false);
      const saved = updated.find((item) => item.id === draft.id) ?? updated[updated.length - 1];
      if (saved) {
        applyRouteVariant(compileCustomLineSpec(saved), 'normal', 0);
      }
    },
    [applyRouteVariant],
  );

  const deleteCustomLine = useCallback(
    (id: string): void => {
      const updated = customLineServiceRef.current!.remove(id);
      customLinesRef.current = updated;
      setCustomLines(updated);
      if (simRef.current?.getSnapshot().line.id === id || baseLineRef.current.id === id) {
        applyRouteVariant(METRO_LINE_M1, 'normal', 0);
      }
    },
    [applyRouteVariant],
  );

  const openSettings = useCallback((): void => {
    settingsOpenRef.current = true;
    setSettingsOpen(true);
  }, []);

  const closeSettings = useCallback((): void => {
    settingsOpenRef.current = false;
    setSettingsOpen(false);
  }, []);

  const applyAndPersistSettings = useCallback(
    (next: IGameSettings): void => {
      const saved = settingsServiceRef.current!.save(next);
      settingsRef.current = saved;
      setSettings(saved);
      audioRef.current?.setAudioSettings?.(saved.masterVolume, saved.trainVolume, saved.voiceVolume);
      rendererRef.current?.applySettings?.(saved);
      const snap = simRef.current?.getSnapshot();
      if (snap && rendererRef.current) {
        rendererRef.current.update(snap, 0.016);
        rendererRef.current.render();
      }
    },
    [],
  );

  const updateSettings = useCallback(
    (partial: Partial<IGameSettings>): void => {
      applyAndPersistSettings({ ...settingsRef.current, ...partial });
    },
    [applyAndPersistSettings],
  );

  const setLanguage = useCallback(
    (language: LanguageId): void => {
      updateSettings({ language });
    },
    [updateSettings],
  );

  const resetSettings = useCallback((): void => {
    const defaults = settingsServiceRef.current!.reset();
    applyAndPersistSettings(defaults);
  }, [applyAndPersistSettings]);

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
    setLastCourseXpReward(null);
    helpOpenRef.current = false;
    setHelpOpen(false);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    simRef.current?.start();
    syncNow();
  }, [syncNow]);

  const startAcademy = useCallback((): void => {
    const sim = simRef.current;
    if (!sim) {
      return;
    }
    const currentSnap = sim.getSnapshot();
    if (currentSnap.gameMode !== 'academy') {
      preAcademyLineRef.current = currentSnap.line;
      preAcademyModeRef.current = currentSnap.gameMode;
    }
    audioRef.current?.unlock();
    inputRef.current?.clearHeld();
    recordedGameOverRef.current = false;
    setIsNewRecord(false);
    setLastCourseXpReward(null);
    helpOpenRef.current = false;
    setHelpOpen(false);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    sim.setGameMode('academy');
    sim.start();
    syncNow();
  }, [syncNow]);

  const startPassengerAto = useCallback((): void => {
    const sim = simRef.current;
    if (!sim) {
      return;
    }
    const currentSnap = sim.getSnapshot();
    if (currentSnap.gameMode !== 'passenger' && currentSnap.gameMode !== 'academy') {
      preAcademyModeRef.current = currentSnap.gameMode;
    }
    audioRef.current?.unlock();
    inputRef.current?.clearHeld();
    recordedGameOverRef.current = false;
    setIsNewRecord(false);
    setLastCourseXpReward(null);
    helpOpenRef.current = false;
    setHelpOpen(false);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    sim.setGameMode('passenger');
    sim.start();
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
    setLastCourseXpReward(null);
    helpOpenRef.current = false;
    setHelpOpen(false);
    simRef.current?.reset();
    syncNow();
  }, [syncNow]);

  const returnToTitle = useCallback((): void => {
    const currentSnap = simRef.current?.getSnapshot();
    const isAcademy = currentSnap?.gameMode === 'academy';
    const isPassenger = currentSnap?.gameMode === 'passenger';
    const restoredLine = isAcademy ? preAcademyLineRef.current : currentSnap?.line;
    const restoredMode: GameModeId =
      isAcademy || isPassenger
        ? preAcademyModeRef.current === 'academy' || preAcademyModeRef.current === 'passenger'
          ? 'duty'
          : preAcademyModeRef.current
        : currentSnap?.gameMode ?? 'duty';
    const currentChallengeId = currentSnap?.challenge?.id ?? 'inverter_fault';
    const currentWeatherMode = currentSnap?.weather.mode ?? 'clear';
    const currentModelId = currentSnap?.trainModel.id ?? 'inspiro';
    const currentTimeOfDayId = currentSnap?.timeOfDay.id ?? 'rush';
    simRef.current?.reset();
    audioRef.current?.silence();
    speechRef.current?.stop();
    inputRef.current?.clearHeld();
    recordedGameOverRef.current = false;
    setIsNewRecord(false);
    setLastCourseXpReward(null);
    helpOpenRef.current = false;
    setHelpOpen(false);
    settingsOpenRef.current = false;
    setSettingsOpen(false);
    cctvPreviewOpenRef.current = false;
    setCctvPreviewOpen(false);
    syncCctvToRenderer(false, cctvChannelRef.current, null);
    const freshSim = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
    if (restoredLine && restoredLine.id !== 'ACADEMY') {
      freshSim.setMetroLineSpec(restoredLine);
    } else {
      const fallback = compileRouteVariant(
        baseLineRef.current,
        routeDirectionRef.current,
        startStationIndexRef.current,
      );
      freshSim.setMetroLineSpec(fallback);
    }
    freshSim.setChallenge?.(currentChallengeId);
    freshSim.setWeatherMode?.(currentWeatherMode);
    freshSim.setGameMode(restoredMode);
    freshSim.setTrainModel(currentModelId);
    freshSim.setTimeOfDay(currentTimeOfDayId);
    simRef.current = freshSim;
    setLeaderboard(leaderboardServiceRef.current!.getTopEntries());
    setDriverProfile(driverProfileServiceRef.current!.load());
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
    audioRef.current?.unlock();
    simRef.current?.cycleHeadlightMode?.();
    syncNow();
  }, [syncNow]);

  const toggleCabLight = useCallback((): void => {
    audioRef.current?.unlock();
    simRef.current?.toggleCabLight?.();
    syncNow();
  }, [syncNow]);

  const toggleWipers = useCallback((): void => {
    inputRef.current?.triggerWipersToggle();
  }, []);

  const toggleAto = useCallback((): void => {
    audioRef.current?.unlock();
    simRef.current?.toggleAto?.();
    syncNow();
  }, [syncNow]);

  const acknowledgeCzuwak = useCallback((): void => {
    inputRef.current?.triggerCzuwakAck();
  }, []);

  const acknowledgeRadio = useCallback((): void => {
    inputRef.current?.triggerRadioAck();
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

  const renderCurrentPhotoFrame = useCallback((nextPose: IPhotoCameraState): void => {
    const snap = simRef.current?.getSnapshot();
    const renderer = rendererRef.current;
    if (!snap || !renderer) {
      return;
    }
    renderer.setPhotoModePose?.(nextPose, snap, photoKeepInteriorRef.current);
    renderer.render();
  }, []);

  const enterPhotoMode = useCallback((): void => {
    const sim = simRef.current;
    const renderer = rendererRef.current;
    if (!sim || !renderer) {
      return;
    }
    const snap = sim.getSnapshot();
    if (snap.phase === 'title' || snap.phase === 'gameover') {
      return;
    }
    if (snap.phase === 'playing') {
      sim.pause();
    }
    audioRef.current?.silence();
    speechRef.current?.stop();
    inputRef.current?.clearHeld();
    photoKeysRef.current.clear();

    const anchor = renderer.getPhotoAnchorPose?.(snap);
    photoKeepInteriorRef.current = anchor?.keepInteriorVisible ?? false;
    const initial = anchor
      ? photoControllerRef.current.initializeFromPose(
          anchor.x,
          anchor.y,
          anchor.z,
          anchor.yaw,
          anchor.pitch,
          anchor.fovDeg,
        )
      : photoControllerRef.current.getState();

    photoModeActiveRef.current = true;
    document.body.dataset.photoMode = '1';
    setPhotoModeActive(true);
    setPhotoState(initial);
    setSnapshot(sim.getSnapshot());
    renderCurrentPhotoFrame(initial);
  }, [renderCurrentPhotoFrame]);

  const exitPhotoMode = useCallback((): void => {
    if (!photoModeActiveRef.current) {
      return;
    }
    photoModeActiveRef.current = false;
    photoKeepInteriorRef.current = false;
    photoKeysRef.current.clear();
    document.body.dataset.photoMode = '0';
    setPhotoModeActive(false);
    setPhotoCapturing(false);
    const sim = simRef.current;
    if (sim && sim.getSnapshot().phase === 'paused') {
      sim.resume();
    }
    audioRef.current?.unlock();
    inputRef.current?.clearHeld();
    const snap = sim?.getSnapshot();
    if (snap) {
      rendererRef.current?.setPhotoModePose?.(null, snap, false);
    }
    syncNow();
  }, [syncNow]);

  const togglePhotoMode = useCallback((): void => {
    if (photoModeActiveRef.current) {
      exitPhotoMode();
    } else {
      enterPhotoMode();
    }
  }, [enterPhotoMode, exitPhotoMode]);

  const setPhotoFov = useCallback(
    (fovDeg: number): void => {
      const next = photoControllerRef.current.setFov(fovDeg);
      setPhotoState(next);
      renderCurrentPhotoFrame(next);
    },
    [renderCurrentPhotoFrame],
  );

  const setPhotoTilt = useCallback(
    (rollDeg: number): void => {
      const next = photoControllerRef.current.setTilt(rollDeg);
      setPhotoState(next);
      renderCurrentPhotoFrame(next);
    },
    [renderCurrentPhotoFrame],
  );

  const setPhotoFilter = useCallback((filter: PhotoFilterId): void => {
    const next = photoControllerRef.current.setFilter(filter);
    setPhotoState(next);
  }, []);

  const resetPhotoCamera = useCallback((): void => {
    const next = photoControllerRef.current.resetToInitial();
    setPhotoState(next);
    renderCurrentPhotoFrame(next);
  }, [renderCurrentPhotoFrame]);

  const capturePhotoPng = useCallback((): void => {
    const renderer = rendererRef.current;
    if (!renderer || !photoModeActiveRef.current) {
      return;
    }
    const current = photoControllerRef.current.getState();
    setPhotoCapturing(true);
    window.requestAnimationFrame(() => {
      const dataUrl = renderer.captureScreenshotPng?.(current.filter) ?? null;
      if (dataUrl) {
        const snap = simRef.current?.getSnapshot();
        const modelSlug = snap?.trainModel.id ?? 'metro';
        const lineSlug = (snap?.line.badgeCode ?? snap?.line.id ?? 'M1').replace(/[^a-zA-Z0-9_-]/g, '');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `metro-${lineSlug}-${modelSlug}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setPhotoSavedNotice(true);
        if (photoNoticeTimerRef.current !== null) {
          window.clearTimeout(photoNoticeTimerRef.current);
        }
        photoNoticeTimerRef.current = window.setTimeout(() => {
          setPhotoSavedNotice(false);
        }, 2400);
      }
      setPhotoCapturing(false);
    });
  }, []);

  useEffect(() => {
    if (!photoModeActive) {
      return undefined;
    }
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const onKeyDown = (e: KeyboardEvent): void => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
        photoKeysRef.current.add(e.code);
      }
    };
    const onKeyUp = (e: KeyboardEvent): void => {
      photoKeysRef.current.delete(e.code);
    };
    const onPointerDown = (e: PointerEvent): void => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-testid="photo-mode-panel"]')) {
        return;
      }
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent): void => {
      if (!dragging) {
        return;
      }
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      const next = photoControllerRef.current.applyLookDelta(dx, dy);
      setPhotoState(next);
      renderCurrentPhotoFrame(next);
    };
    const onPointerUp = (): void => {
      dragging = false;
    };
    const onWheel = (e: WheelEvent): void => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-testid="photo-mode-panel"]')) {
        return;
      }
      e.preventDefault();
      const next = photoControllerRef.current.applyWheelZoom(e.deltaY);
      setPhotoState(next);
      renderCurrentPhotoFrame(next);
    };
    const onBlur = (): void => {
      dragging = false;
      photoKeysRef.current.clear();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('blur', onBlur);
      photoKeysRef.current.clear();
    };
  }, [photoModeActive, renderCurrentPhotoFrame]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) {
      return undefined;
    }
    const sceneRenderer = new MetroSceneRenderer();
    const audio = new MetroAudioEngine();
    const speech = new WebSpeechAnnouncer();
    const input = new KeyboardInputController();
    const gamepad = new BrowserGamepadController();
    rendererRef.current = sceneRenderer;
    audioRef.current = audio;
    speechRef.current = speech;
    inputRef.current = input;
    gamepadRef.current = gamepad;

    const handlePauseToggle = (): void => {
      if (photoModeActiveRef.current) {
        exitPhotoMode();
        return;
      }
      if (settingsOpenRef.current) {
        closeSettings();
        return;
      }
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
    };

    gamepad.attach({
      onStatusChanged: (nextStatus, justConnected) => {
        setGamepadStatus(nextStatus);
        if (justConnected && nextStatus.connected) {
          setGamepadToast({ name: nextStatus.name, brand: nextStatus.brand });
          if (gamepadToastTimerRef.current !== null) {
            window.clearTimeout(gamepadToastTimerRef.current);
          }
          gamepadToastTimerRef.current = window.setTimeout(() => {
            setGamepadToast(null);
          }, 4200);
        }
      },
    });

    sceneRenderer.applySettings?.(settingsRef.current);
    sceneRenderer.setOnCctvMonitorClick?.(handle3dMonitorClick);
    sceneRenderer.setCctvPreviewState?.(
      cctvPreviewOpenRef.current,
      cctvChannelRef.current,
      cctvCanvasRef.current,
    );
    audio.setAudioSettings?.(
      settingsRef.current.masterVolume,
      settingsRef.current.trainVolume,
      settingsRef.current.voiceVolume,
    );
    sceneRenderer.mount(container);
    input.attach({
      onStartRequested: () => startGame(),
      onHelpToggle: () => toggleHelp(),
      onPhotoModeToggle: () => togglePhotoMode(),
      onCctvPreviewToggle: () => toggleCctvPreview(),
      onPauseToggle: handlePauseToggle,
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
    let fpsFrameCount = 0;
    let fpsWindowStart = performance.now();
    let lastPhase = simRef.current!.getSnapshot().phase;
    let lastScore = 0;
    let lastDoor = simRef.current!.getSnapshot().doorState;
    let lastDoorSide = simRef.current!.getSnapshot().openDoorSide;
    let lastHeadlightMode = simRef.current!.getSnapshot().headlightMode;
    let lastCabLightOn = simRef.current!.getSnapshot().cabLightOn;
    let lastDimPrompt = simRef.current!.getSnapshot().lightingEffects.dimHighBeamPromptActive;
    let lastNightPassed = simRef.current!.getSnapshot().nightInspection.passedCount;
    let lastNightViolated = simRef.current!.getSnapshot().nightInspection.violatedCount;
    let lastNightApproachId = simRef.current!.getSnapshot().nightInspection.activeApproachCrew?.id ?? -1;
    let lastWipersOn = simRef.current!.getSnapshot().weather.wipersOn;
    let lastWheelSlip = simRef.current!.getSnapshot().weather.wheelSlipActive;
    let lastPassengers = 0;
    let lastAnnId = -1;
    let lastCzuwak = false;
    let lastRadioActive = false;
    let lastRadioId = -1;
    let lastDoorFault = 'none';
    let lastCameraMode = simRef.current!.getSnapshot().cameraMode;
    let lastCameraNoticeId = -1;
    let lastLineId = simRef.current!.getSnapshot().line.id;
    let lastTrainModelId = simRef.current!.getSnapshot().trainModel.id;
    let lastTimeOfDayId = simRef.current!.getSnapshot().timeOfDay.id;
    let lastAcademyStep = simRef.current!.getSnapshot().academy?.currentStep ?? 0;
    let lastAcademyHighlight = simRef.current!.getSnapshot().academy?.highlightTarget ?? null;
    let lastSplitsCount = simRef.current!.getSnapshot().stationSplits.length;
    let lastAtoEnabled = simRef.current!.getSnapshot().atoEnabled;
    let lastAtoStatus = simRef.current!.getSnapshot().atoStatus;

    const tick = (): void => {
      if (!active) {
        return;
      }
      const now = performance.now();
      const rawDt = Math.min(Math.max((now - lastTime) / 1000, 0), 0.35);
      lastTime = now;

      fpsFrameCount += 1;
      if (now - fpsWindowStart >= 450) {
        if (settingsRef.current.showFps) {
          const measured = Math.round((fpsFrameCount * 1000) / Math.max(1, now - fpsWindowStart));
          setFps(measured);
        }
        fpsFrameCount = 0;
        fpsWindowStart = now;
      }

      const sim = simRef.current!;
      if (photoModeActiveRef.current) {
        audio.silence();
        const keys = photoKeysRef.current;
        const moveInput: IPhotoMoveInput = {
          forward: keys.has('KeyW'),
          backward: keys.has('KeyS'),
          left: keys.has('KeyA'),
          right: keys.has('KeyD'),
          up: keys.has('KeyE'),
          down: keys.has('KeyQ'),
          boost: keys.has('ShiftLeft') || keys.has('ShiftRight'),
        };
        const prevPose = photoControllerRef.current.getState();
        const nextPose = photoControllerRef.current.stepMovement(moveInput, rawDt > 0 ? rawDt : 0.016);
        const snap = sim.getSnapshot();
        sceneRenderer.setPhotoModePose?.(nextPose, snap, photoKeepInteriorRef.current);
        sceneRenderer.render();
        if (
          nextPose.x !== prevPose.x ||
          nextPose.y !== prevPose.y ||
          nextPose.z !== prevPose.z
        ) {
          setPhotoState(nextPose);
        }
        frameHandle = sceneRenderer.scheduleNextFrame(tick);
        return;
      }

      const padSample = gamepad.poll();
      if (padSample?.pauseTogglePressed) {
        handlePauseToggle();
      }
      const keyControl = input.sampleControlInput();
      const control = padSample
        ? {
            ...keyControl,
            manualLeverAxis:
              padSample.analogLeverAxis !== null
                ? padSample.analogLeverAxis
                : keyControl.manualLeverAxis,
            hornActive: keyControl.hornActive || padSample.hornActive,
            toggleDoorsLeftPressed:
              Boolean(keyControl.toggleDoorsLeftPressed) || padSample.toggleDoorsLeftPressed,
            toggleDoorsRightPressed:
              Boolean(keyControl.toggleDoorsRightPressed) || padSample.toggleDoorsRightPressed,
            acknowledgeCzuwakPressed:
              Boolean(keyControl.acknowledgeCzuwakPressed) || padSample.acknowledgeCzuwakPressed,
            acknowledgeRadioPressed:
              Boolean(keyControl.acknowledgeRadioPressed) || padSample.acknowledgeRadioPressed,
            emergencyBrakePressed:
              keyControl.emergencyBrakePressed || padSample.emergencyBrakePressed,
            cycleCameraPressed:
              Boolean(keyControl.cycleCameraPressed) || padSample.cycleCameraPressed,
            toggleHeadlightsPressed:
              Boolean(keyControl.toggleHeadlightsPressed) || padSample.toggleHeadlightsPressed,
            toggleWipersPressed:
              Boolean(keyControl.toggleWipersPressed) || padSample.toggleWipersPressed,
          }
        : keyControl;

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
        toggleCabLightPressed: false,
        toggleWipersPressed: false,
        toggleAtoPressed: false,
        acknowledgeCzuwakPressed: false,
        acknowledgeRadioPressed: false,
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
          radioDispatchTriggered:
            Boolean(latestAudio.radioDispatchTriggered) || Boolean(nextAudio.radioDispatchTriggered),
          radioAckChime: Boolean(latestAudio.radioAckChime) || Boolean(nextAudio.radioAckChime),
          wiperSweepTick: Boolean(latestAudio.wiperSweepTick) || Boolean(nextAudio.wiperSweepTick),
          academyStepCompleted:
            Boolean(latestAudio.academyStepCompleted) || Boolean(nextAudio.academyStepCompleted),
          thirdRailSparkCrackle:
            Boolean(latestAudio.thirdRailSparkCrackle) || Boolean(nextAudio.thirdRailSparkCrackle),
          highBeamDimBonusChime:
            Boolean(latestAudio.highBeamDimBonusChime) || Boolean(nextAudio.highBeamDimBonusChime),
          nightCrewClearedChime:
            Boolean(latestAudio.nightCrewClearedChime) || Boolean(nextAudio.nightCrewClearedChime),
          nightCrewViolationBuzz:
            Boolean(latestAudio.nightCrewViolationBuzz) || Boolean(nextAudio.nightCrewViolationBuzz),
        };
        remaining -= subDt;
      }
      const snap = sim.getSnapshot();

      if (latestAudio.academyStepCompleted) {
        audio.playAchievementChime();
      }

      if (settingsRef.current.gamepadVibration && snap.phase === 'playing') {
        if (snap.weather.wheelSlipActive) {
          gamepad.triggerRumble(0.55, 0.78, 170);
        } else if (
          (snap.kinematics.emergencyBrake || snap.kinematics.serviceBrake > 0.72) &&
          snap.kinematics.speedKmh > 6
        ) {
          gamepad.triggerRumble(0.68, 0.35, 145);
        } else if (snap.trackProfile.turnoutSwayFactor > 0.28 && snap.kinematics.speedKmh > 8) {
          gamepad.triggerRumble(0.24, 0.48, 120);
        }
      }

      if (snap.phase === 'gameover' && !recordedGameOverRef.current) {
        recordedGameOverRef.current = true;
        const ghostRes = ghostRecordServiceRef.current!.recordIfBest(snap);
        setActiveGhostRecord(ghostRes.record);
        const careerRes = driverProfileServiceRef.current!.recordCompletedCourse(snap);
        setDriverProfile(careerRes.profile);
        setLastCourseXpReward(careerRes.reward);
        if (careerRes.reward.rankedUp) {
          audio.playAchievementChime();
        }
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
      if (snap.phase === 'playing') {
        const activeLang = settingsRef.current.language;
        const speechVol = settingsRef.current.masterVolume * settingsRef.current.voiceVolume;
        if (latestAudio.radioDispatchTriggered && snap.radio.active) {
          const localizedRadio = localizeRadioDispatch(activeLang, snap.radio);
          speech.announce(
            10000 + snap.radio.messageId,
            localizedRadio.spokenText,
            audio.isMuted(),
            speechVol,
            activeLang,
          );
        } else if (snap.announcement) {
          const localizedAnn = localizeAnnouncement(activeLang, snap.announcement);
          speech.announce(
            snap.announcement.id,
            localizedAnn?.spokenText ?? snap.announcement.spokenText ?? snap.announcement.text,
            audio.isMuted(),
            speechVol,
            activeLang,
          );
        }
      }
      sceneRenderer.update(snap, rawDt);
      sceneRenderer.render();

      const annId = snap.announcement?.id ?? -1;
      const camNoticeId = snap.cameraNotice?.id ?? -1;
      const academyStep = snap.academy?.currentStep ?? 0;
      const academyHighlight = snap.academy?.highlightTarget ?? null;
      const nightApproachId = snap.nightInspection.activeApproachCrew?.id ?? -1;
      const discreteChanged =
        snap.phase !== lastPhase ||
        snap.score !== lastScore ||
        snap.doorState !== lastDoor ||
        snap.openDoorSide !== lastDoorSide ||
        snap.headlightMode !== lastHeadlightMode ||
        snap.cabLightOn !== lastCabLightOn ||
        snap.lightingEffects.dimHighBeamPromptActive !== lastDimPrompt ||
        snap.nightInspection.passedCount !== lastNightPassed ||
        snap.nightInspection.violatedCount !== lastNightViolated ||
        nightApproachId !== lastNightApproachId ||
        snap.weather.wipersOn !== lastWipersOn ||
        snap.weather.wheelSlipActive !== lastWheelSlip ||
        snap.passengersCarried !== lastPassengers ||
        annId !== lastAnnId ||
        snap.czuwak.active !== lastCzuwak ||
        snap.radio.active !== lastRadioActive ||
        snap.radio.messageId !== lastRadioId ||
        snap.doorFault.phase !== lastDoorFault ||
        snap.cameraMode !== lastCameraMode ||
        camNoticeId !== lastCameraNoticeId ||
        snap.line.id !== lastLineId ||
        snap.trainModel.id !== lastTrainModelId ||
        snap.timeOfDay.id !== lastTimeOfDayId ||
        academyStep !== lastAcademyStep ||
        academyHighlight !== lastAcademyHighlight ||
        snap.stationSplits.length !== lastSplitsCount ||
        snap.atoEnabled !== lastAtoEnabled ||
        snap.atoStatus !== lastAtoStatus;
      if (discreteChanged || now - lastHudSync >= HUD_SYNC_INTERVAL_MS) {
        lastHudSync = now;
        lastPhase = snap.phase;
        lastScore = snap.score;
        lastDoor = snap.doorState;
        lastDoorSide = snap.openDoorSide;
        lastHeadlightMode = snap.headlightMode;
        lastCabLightOn = snap.cabLightOn;
        lastDimPrompt = snap.lightingEffects.dimHighBeamPromptActive;
        lastNightPassed = snap.nightInspection.passedCount;
        lastNightViolated = snap.nightInspection.violatedCount;
        lastNightApproachId = nightApproachId;
        lastWipersOn = snap.weather.wipersOn;
        lastWheelSlip = snap.weather.wheelSlipActive;
        lastPassengers = snap.passengersCarried;
        lastAnnId = annId;
        lastCzuwak = snap.czuwak.active;
        lastRadioActive = snap.radio.active;
        lastRadioId = snap.radio.messageId;
        lastDoorFault = snap.doorFault.phase;
        lastCameraMode = snap.cameraMode;
        lastCameraNoticeId = camNoticeId;
        lastLineId = snap.line.id;
        lastTrainModelId = snap.trainModel.id;
        lastTimeOfDayId = snap.timeOfDay.id;
        lastAcademyStep = academyStep;
        lastAcademyHighlight = academyHighlight;
        lastSplitsCount = snap.stationSplits.length;
        lastAtoEnabled = snap.atoEnabled;
        lastAtoStatus = snap.atoStatus;
        document.body.dataset.state = snap.phase;
        setSnapshot(snap);
      }

      frameHandle = sceneRenderer.scheduleNextFrame(tick);
    };

    frameHandle = sceneRenderer.scheduleNextFrame(tick);

    return () => {
      active = false;
      sceneRenderer.cancelScheduledFrame(frameHandle);
      if (gamepadToastTimerRef.current !== null) {
        window.clearTimeout(gamepadToastTimerRef.current);
      }
      gamepad.detach();
      input.detach();
      speech.dispose();
      audio.dispose();
      sceneRenderer.dispose();
    };
  }, [
    closeHelp,
    closeSettings,
    exitPhotoMode,
    handle3dMonitorClick,
    mountRef,
    pauseGame,
    restartGame,
    resumeGame,
    startGame,
    toggleCctvPreview,
    toggleHelp,
    toggleMute,
    togglePhotoMode,
  ]);

  return {
    snapshot,
    settings,
    fps,
    muted,
    helpOpen,
    settingsOpen,
    achievementsOpen,
    profileOpen,
    customLines,
    baseLineSpec,
    routeDirection,
    startStationIndex,
    lineBuilderDraft,
    lineBuilderEditing,
    driverProfile,
    lastCourseXpReward,
    achievementCatalog: achievementServiceRef.current!.getCatalog(),
    unlockedAchievements,
    achievementToast,
    leaderboard,
    isNewRecord,
    photoModeActive,
    photoState,
    photoCapturing,
    photoSavedNotice,
    gamepadStatus,
    gamepadToast,
    touchControlsActive,
    showPortraitHint,
    ghostDelta,
    cctvPreviewOpen,
    cctvChannel,
    toggleCctvPreview,
    closeCctvPreview,
    selectCctvChannel,
    registerCctvCanvas,
    dismissPortraitHint,
    selectMetroLine,
    selectRouteDirection,
    selectStartStation,
    selectGameMode,
    selectChallenge,
    selectWeatherMode,
    selectTrainModel,
    selectTimeOfDay,
    triggerSandboxOncomingTrain,
    cycleSandboxNextSignal,
    openAchievements,
    closeAchievements,
    openProfile,
    closeProfile,
    resetDriverProfile,
    openLineBuilder,
    closeLineBuilder,
    saveCustomLine,
    deleteCustomLine,
    openSettings,
    closeSettings,
    updateSettings,
    setLanguage,
    resetSettings,
    startGame,
    startAcademy,
    startPassengerAto,
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
    toggleCabLight,
    toggleWipers,
    toggleAto,
    acknowledgeCzuwak,
    acknowledgeRadio,
    cycleCamera,
    triggerEmergencyBrake,
    setHornActive,
    setManualLeverAxis,
    enterPhotoMode,
    exitPhotoMode,
    togglePhotoMode,
    setPhotoFov,
    setPhotoTilt,
    setPhotoFilter,
    resetPhotoCamera,
    capturePhotoPng,
  };
}
