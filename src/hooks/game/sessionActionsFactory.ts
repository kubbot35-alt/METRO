import { getRankForXp } from '../../domain/driverProfile';
import { MetroSimulationEngine } from '../../domain/metroSimulation';
import { compileRouteVariant } from '../../domain/routeVariant';
import { MetroScoringRules } from '../../domain/scoringRules';
import { isLiverySelectable } from '../../domain/trainLiveryCatalog';
import { MetroTrainPhysics } from '../../domain/trainPhysics';
import type {
  GameModeId,
  IDriverProfileStats,
  ILeaderboardEntry,
  IMetroLineSpec,
  ISimulationSnapshot,
  TrainLiveryId,
} from '../../domain/types';
import type { IGameRuntimeRefs } from './types';

export interface ISessionActionDeps {
  readonly refs: IGameRuntimeRefs;
  readonly syncNow: () => void;
  readonly setIsNewRecord: (v: boolean) => void;
  readonly setLastCourseXpReward: (v: null) => void;
  readonly setHelpOpen: (v: boolean) => void;
  readonly setSettingsOpen: (v: boolean) => void;
  readonly setCctvPreviewOpen: (v: boolean) => void;
  readonly setPaPanelOpen: (v: boolean) => void;
  readonly setMuted: (v: boolean) => void;
  readonly setLeaderboard: (entries: readonly ILeaderboardEntry[]) => void;
  readonly setDriverProfile: (profile: IDriverProfileStats) => void;
}

function resetUiBeforeStart(deps: ISessionActionDeps): void {
  deps.refs.audio.current?.unlock();
  deps.refs.input.current?.clearHeld();
  deps.refs.recordedGameOverRef.current = false;
  deps.setIsNewRecord(false);
  deps.setLastCourseXpReward(null);
  deps.refs.helpOpenRef.current = false;
  deps.setHelpOpen(false);
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

function resolveRestoredMode(snap: ISimulationSnapshot, preMode: GameModeId): GameModeId {
  if (snap.gameMode !== 'academy' && snap.gameMode !== 'passenger') return snap.gameMode;
  return preMode === 'academy' || preMode === 'passenger' ? 'duty' : preMode;
}

function buildRestoredSimulation(refs: IGameRuntimeRefs, snap: ISimulationSnapshot | undefined, restoredLine: IMetroLineSpec | null | undefined): void {
  const mode = snap ? resolveRestoredMode(snap, refs.preAcademyModeRef.current) : 'duty';
  const modelId = snap?.trainModel.id ?? 'inspiro';
  const liveryId = snap?.trainModel.visual.liveryId ?? refs.selectedLiveriesRef.current[modelId] ?? 'default';
  const freshSim = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
  const line = restoredLine && restoredLine.id !== 'ACADEMY'
    ? restoredLine
    : compileRouteVariant(refs.baseLineRef.current, refs.routeDirectionRef.current, refs.startStationIndexRef.current);
  freshSim.setMetroLineSpec(line);
  freshSim.setChallenge?.(snap?.challenge?.id ?? 'inverter_fault');
  freshSim.setWeatherMode?.(snap?.weather.mode ?? 'clear');
  freshSim.setGameMode(mode);
  freshSim.setTrainModel(modelId);
  const rankId = getRankForXp(refs.services.driverProfile.load().xp).id;
  const effective: TrainLiveryId = isLiverySelectable(liveryId, modelId, rankId, mode) ? liveryId : 'default';
  freshSim.setTrainLivery(effective);
  freshSim.setTimeOfDay(snap?.timeOfDay.id ?? 'rush');
  (refs.sim as { current: MetroSimulationEngine }).current = freshSim;
}

function createStartActions(deps: ISessionActionDeps) {
  const { refs, syncNow } = deps;
  const startWithMode = (mode: GameModeId): void => { resetUiBeforeStart(deps); refs.sim.current.setGameMode(mode); refs.sim.current.start(); syncNow(); };
  return {
    startGame: (): void => { resetUiBeforeStart(deps); refs.sim.current.start(); syncNow(); },
    startAcademy: (): void => {
      const snap = refs.sim.current.getSnapshot();
      if (snap.gameMode !== 'academy') { refs.preAcademyLineRef.current = snap.line; refs.preAcademyModeRef.current = snap.gameMode; }
      startWithMode('academy');
    },
    startPassengerAto: (): void => {
      const snap = refs.sim.current.getSnapshot();
      if (snap.gameMode !== 'passenger' && snap.gameMode !== 'academy') refs.preAcademyModeRef.current = snap.gameMode;
      startWithMode('passenger');
    },
  };
}

function performReturnToTitle(deps: ISessionActionDeps): void {
  const { refs } = deps;
  const snap = refs.sim.current.getSnapshot();
  const restoredLine = snap.gameMode === 'academy' ? refs.preAcademyLineRef.current : snap.line;
  refs.sim.current.reset();
  refs.audio.current?.silence();
  refs.speech.current?.stop();
  resetUiBeforeStart(deps);
  refs.settingsOpenRef.current = false;
  deps.setSettingsOpen(false);
  refs.cctvPreviewOpenRef.current = false;
  deps.setCctvPreviewOpen(false);
  refs.renderer.current?.setCctvPreviewState?.(false, refs.cctvChannelRef.current, null);
  buildRestoredSimulation(refs, snap, restoredLine);
  deps.setLeaderboard(refs.services.leaderboard.getTopEntries());
  deps.setDriverProfile(refs.services.driverProfile.load());
  deps.syncNow();
}

function createPauseAndTitleActions(deps: ISessionActionDeps) {
  const { refs, syncNow } = deps;
  return {
    pauseGame: (): void => { refs.sim.current.pause(); refs.audio.current?.silence(); refs.speech.current?.stop(); refs.input.current?.clearHeld(); syncNow(); },
    resumeGame: (): void => { refs.audio.current?.unlock(); refs.input.current?.clearHeld(); refs.sim.current.resume(); syncNow(); },
    restartGame: (): void => { refs.speech.current?.stop(); resetUiBeforeStart(deps); refs.sim.current.reset(); syncNow(); },
    returnToTitle: (): void => performReturnToTitle(deps),
  };
}

function performToggleMute(refs: IGameRuntimeRefs, setMuted: (v: boolean) => void): void {
  const audio = refs.audio.current;
  if (!audio) return;
  const next = !audio.isMuted();
  audio.setMuted(next);
  if (next) refs.speech.current?.stop();
  setMuted(next);
}

function createHelpAndAudioActions(deps: ISessionActionDeps, pauseGame: () => void, resumeGame: () => void) {
  const { refs } = deps;
  const closeHelp = (): void => {
    if (!refs.helpOpenRef.current) return;
    refs.helpOpenRef.current = false;
    deps.setHelpOpen(false);
    if (refs.helpPausedGameRef.current) { refs.helpPausedGameRef.current = false; resumeGame(); }
  };
  return {
    closeHelp,
    toggleHelp: (): void => {
      if (refs.helpOpenRef.current) return closeHelp();
      refs.helpOpenRef.current = true;
      deps.setHelpOpen(true);
      refs.helpPausedGameRef.current = refs.sim.current.getSnapshot().phase === 'playing';
      if (refs.helpPausedGameRef.current) pauseGame();
    },
    toggleMute: (): void => performToggleMute(refs, deps.setMuted),
  };
}

function createTurnaroundActions({ refs, syncNow, setPaPanelOpen, setIsNewRecord, setLastCourseXpReward }: ISessionActionDeps) {
  return {
    enterTurnaroundSiding: (): void => {
      refs.audio.current?.unlock(); refs.input.current?.clearHeld();
      refs.paPanelOpenRef.current = false; setPaPanelOpen(false); refs.cabSwitchAppliedRef.current = false;
      if (!refs.sim.current.enterTurnaroundSiding?.()) return;
      refs.recordedGameOverRef.current = false; setIsNewRecord(false); setLastCourseXpReward(null);
      syncNow();
    },
    triggerCabSwitch: (): void => {
      refs.audio.current?.unlock(); refs.input.current?.clearHeld(); refs.cabSwitchAppliedRef.current = false;
      if (!refs.sim.current.beginCabSwitch?.()) return;
      refs.paPanelOpenRef.current = false; setPaPanelOpen(false);
      syncNow();
    },
  };
}

export function createSessionLifecycleActions(deps: ISessionActionDeps) {
  const starts = createStartActions(deps);
  const flow = createPauseAndTitleActions(deps);
  return { ...starts, ...flow, ...createHelpAndAudioActions(deps, flow.pauseGame, flow.resumeGame), ...createTurnaroundActions(deps) };
}
