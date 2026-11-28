import { useEffect, useRef, useState } from 'react';
import { PhotoCameraController } from '../../domain/photoMode';
import { METRO_LINE_M1 } from '../../domain/routeData';
import type { SelectedLiveryMap } from '../../domain/trainLiveryCatalog';
import type {
  CctvPreviewChannel,
  GameModeId,
  IAchievementRecord,
  IAchievementSpec,
  IAchievementToast,
  ICourseXpReward,
  ICustomLineDraft,
  IDriverProfileStats,
  IGamepadStatus,
  IGameSettings,
  ILeaderboardEntry,
  ILineGhostRecord,
  IMetroLineSpec,
  ISimulationSnapshot,
  RouteDirection,
} from '../../domain/types';
import { createGameServiceBag, createInitialSimulation } from './serviceBag';
import type { IGamepadToastState, IGameRuntimeRefs } from './types';

function createDeviceAndServiceRefs(services: ReturnType<typeof createGameServiceBag>, sim: ReturnType<typeof createInitialSimulation>) {
  return {
    sim: { current: sim },
    services,
    renderer: { current: null },
    audio: { current: null },
    speech: { current: null },
    input: { current: null },
    gamepad: { current: null },
    photoController: { current: new PhotoCameraController() },
  };
}

function createModeAndUiRefs(settings: IGameSettings, liveries: SelectedLiveryMap, customLines: readonly ICustomLineDraft[]) {
  return {
    settingsRef: { current: settings }, selectedLiveriesRef: { current: liveries }, customLinesRef: { current: customLines },
    baseLineRef: { current: METRO_LINE_M1 }, routeDirectionRef: { current: 'normal' as RouteDirection },
    startStationIndexRef: { current: 0 }, preAcademyLineRef: { current: null }, preAcademyModeRef: { current: 'duty' as GameModeId },
    helpPausedGameRef: { current: false }, helpOpenRef: { current: false }, settingsOpenRef: { current: false },
    recordedGameOverRef: { current: false }, toastQueueRef: { current: [] as IAchievementSpec[] },
    activeToastRef: { current: null as IAchievementToast | null }, photoModeActiveRef: { current: false },
    photoKeepInteriorRef: { current: false }, photoKeysRef: { current: new Set<string>() },
    cctvPreviewOpenRef: { current: false }, cctvChannelRef: { current: 'auto' as CctvPreviewChannel },
    cctvCanvasRef: { current: null }, paPanelOpenRef: { current: false }, cabSwitchAppliedRef: { current: false },
  };
}

function useGameCoreRefs(): IGameRuntimeRefs {
  const bagRef = useRef<IGameRuntimeRefs | null>(null);
  if (!bagRef.current) {
    const services = createGameServiceBag();
    const sim = createInitialSimulation(services);
    bagRef.current = {
      ...createDeviceAndServiceRefs(services, sim),
      ...createModeAndUiRefs(services.settings.load(), services.liveries.load(), services.customLines.list()),
    };
  }
  return bagRef.current;
}

function useRouteAndCareerState(refs: IGameRuntimeRefs) {
  const [snapshot, setSnapshot] = useState<ISimulationSnapshot>(() => refs.sim.current.getSnapshot());
  const [selectedLiveries, setSelectedLiveries] = useState<SelectedLiveryMap>(refs.selectedLiveriesRef.current);
  const [settings, setSettings] = useState<IGameSettings>(refs.settingsRef.current);
  const [customLines, setCustomLines] = useState<readonly ICustomLineDraft[]>(refs.customLinesRef.current);
  const [baseLineSpec, setBaseLineSpec] = useState<IMetroLineSpec>(METRO_LINE_M1);
  const [routeDirection, setRouteDirection] = useState<RouteDirection>('normal');
  const [startStationIndex, setStartStationIndex] = useState<number>(0);
  const [driverProfile, setDriverProfile] = useState<IDriverProfileStats>(() => refs.services.driverProfile.load());
  const [lastCourseXpReward, setLastCourseXpReward] = useState<ICourseXpReward | null>(null);
  return {
    snapshot, setSnapshot, selectedLiveries, setSelectedLiveries, settings, setSettings,
    customLines, setCustomLines, baseLineSpec, setBaseLineSpec, routeDirection, setRouteDirection,
    startStationIndex, setStartStationIndex, driverProfile, setDriverProfile,
    lastCourseXpReward, setLastCourseXpReward,
  };
}

function useDeviceAndToastState() {
  const [fps, setFps] = useState<number>(60);
  const [muted, setMuted] = useState<boolean>(false);
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const [achievementToast, setAchievementToast] = useState<IAchievementToast | null>(null);
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [gamepadStatus, setGamepadStatus] = useState<IGamepadStatus>({
    connected: false, name: '', brand: 'generic', supportsVibration: false,
  });
  const [gamepadToast, setGamepadToast] = useState<IGamepadToastState | null>(null);
  return {
    fps, setFps, muted, setMuted, helpOpen, setHelpOpen, achievementToast, setAchievementToast,
    isNewRecord, setIsNewRecord, gamepadStatus, setGamepadStatus, gamepadToast, setGamepadToast,
  };
}

function useProgressAndGhostState(refs: IGameRuntimeRefs, snapshotLineId: string) {
  const [unlockedAchievements, setUnlockedAchievements] = useState<readonly IAchievementRecord[]>(
    () => refs.services.achievements.getUnlockedRecords(),
  );
  const [leaderboard, setLeaderboard] = useState<readonly ILeaderboardEntry[]>(
    () => refs.services.leaderboard.getTopEntries(),
  );
  const [activeGhostRecord, setActiveGhostRecord] = useState<ILineGhostRecord | null>(
    () => refs.services.ghostRecords.getRecordForLine(snapshotLineId),
  );
  useEffect(() => {
    setActiveGhostRecord(refs.services.ghostRecords.getRecordForLine(snapshotLineId));
  }, [refs, snapshotLineId]);
  return { unlockedAchievements, setUnlockedAchievements, leaderboard, setLeaderboard, activeGhostRecord, setActiveGhostRecord };
}

export function useGameRuntimeState() {
  const refs = useGameCoreRefs();
  const routeCareer = useRouteAndCareerState(refs);
  const deviceToast = useDeviceAndToastState();
  const progressGhost = useProgressAndGhostState(refs, routeCareer.snapshot.line.id);
  return { refs, ...routeCareer, ...deviceToast, ...progressGhost };
}
