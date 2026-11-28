import { useEffect, useRef, type RefObject } from 'react';
import { MetroAudioEngine } from '../../audio/metroAudioEngine';
import { WebSpeechAnnouncer } from '../../audio/speechAnnouncer';
import type { CabControlId, ICabHoverTooltip } from '../../domain/cabControlsCatalog';
import type { DoorSide, IGamepadStatus } from '../../domain/types';
import { BrowserGamepadController } from '../../input/gamepadController';
import { KeyboardInputController } from '../../input/keyboardInputController';
import { MetroSceneRenderer } from '../../scene/metroSceneRenderer';
import { SimulationFrameRunner, type IFrameRunnerCallbacks } from './simulationFrameRunner';
import type { IGamepadToastState, IGameRuntimeRefs } from './types';

export interface IEngineMountCallbacks extends Omit<IFrameRunnerCallbacks, 'handlePauseToggle'> {
  readonly setGamepadStatus: (status: IGamepadStatus) => void;
  readonly setGamepadToast: (toast: IGamepadToastState | null) => void;
  readonly startGame: () => void;
  readonly toggleHelp: () => void;
  readonly togglePhotoMode: () => void;
  readonly toggleCctvPreview: () => void;
  readonly togglePaPanel: () => void;
  readonly toggleDispatchMap: () => void;
  readonly closeDispatchMap: () => void;
  readonly triggerCabSwitch: () => void;
  readonly toggleMute: () => void;
  readonly restartGame: () => void;
  readonly pauseGame: () => void;
  readonly resumeGame: () => void;
  readonly exitPhotoMode: () => void;
  readonly closePaPanel: () => void;
  readonly closeSettings: () => void;
  readonly closeHelp: () => void;
  readonly handle3dMonitorClick: (side: DoorSide) => void;
  readonly setCabHoverTooltip: (tooltip: ICabHoverTooltip | null) => void;
  readonly handle3dCabControlClick: (controlId: CabControlId) => void;
}

function invokePauseToggle(refs: IGameRuntimeRefs, cb: IEngineMountCallbacks): void {
  if (refs.photoModeActiveRef.current) return cb.exitPhotoMode();
  if (refs.dispatchMapOpenRef.current) return cb.closeDispatchMap();
  if (refs.paPanelOpenRef.current) return cb.closePaPanel();
  if (refs.settingsOpenRef.current) return cb.closeSettings();
  if (refs.helpOpenRef.current) return cb.closeHelp();
  const phase = refs.sim.current.getSnapshot().phase;
  if (phase === 'playing') cb.pauseGame();
  else if (phase === 'paused') cb.resumeGame();
}

function createDynamicRunnerCallbacks(refs: IGameRuntimeRefs, cbRef: RefObject<IEngineMountCallbacks>): IFrameRunnerCallbacks {
  return {
    setFps: (v) => cbRef.current.setFps(v),
    setSnapshot: (v) => cbRef.current.setSnapshot(v),
    setPhotoState: (v) => cbRef.current.setPhotoState(v),
    setRouteDirection: (v) => cbRef.current.setRouteDirection(v),
    setStartStationIndex: (v) => cbRef.current.setStartStationIndex(v),
    setActiveGhostRecord: (v) => cbRef.current.setActiveGhostRecord(v),
    setDriverProfile: (v) => cbRef.current.setDriverProfile(v),
    setLastCourseXpReward: (v) => cbRef.current.setLastCourseXpReward(v),
    setLeaderboard: (v) => cbRef.current.setLeaderboard(v),
    setIsNewRecord: (v) => cbRef.current.setIsNewRecord(v),
    setUnlockedAchievements: (v) => cbRef.current.setUnlockedAchievements(v),
    setAchievementToast: (v) => cbRef.current.setAchievementToast(v),
    handlePauseToggle: () => invokePauseToggle(refs, cbRef.current),
  };
}

function configureRendererAndAudio(
  container: HTMLDivElement,
  refs: IGameRuntimeRefs,
  cbRef: RefObject<IEngineMountCallbacks>,
  renderer: MetroSceneRenderer,
  audio: MetroAudioEngine,
): void {
  const s = refs.settingsRef.current;
  refs.sim.current.setSop2InterventionEnabled?.(s.sop2InterventionEnabled);
  renderer.applySettings?.(s);
  renderer.setOnCctvMonitorClick?.((side) => cbRef.current.handle3dMonitorClick(side));
  renderer.setOnCabControlHover?.((tooltip) => cbRef.current.setCabHoverTooltip(tooltip));
  renderer.setOnCabControlClick?.((controlId) => cbRef.current.handle3dCabControlClick(controlId));
  renderer.setCctvPreviewState?.(refs.cctvPreviewOpenRef.current, refs.cctvChannelRef.current, refs.cctvCanvasRef.current);
  audio.setAudioSettings?.(s.masterVolume, s.trainVolume, s.voiceVolume, s.alertsVolume);
  renderer.mount(container);
  document.body.dataset.state = refs.sim.current.getSnapshot().phase;
}

function attachGamepad(cbRef: RefObject<IEngineMountCallbacks>, gamepad: BrowserGamepadController, toastTimerRef: RefObject<number | null>): void {
  gamepad.attach({
    onStatusChanged: (status, justConnected) => {
      cbRef.current.setGamepadStatus(status);
      if (!justConnected || !status.connected) return;
      cbRef.current.setGamepadToast({ name: status.name, brand: status.brand });
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
      (toastTimerRef as { current: number | null }).current = window.setTimeout(() => cbRef.current.setGamepadToast(null), 4200);
    },
  });
}

function attachKeyboard(refs: IGameRuntimeRefs, cbRef: RefObject<IEngineMountCallbacks>, input: KeyboardInputController): void {
  input.attach({
    onStartRequested: () => cbRef.current.startGame(),
    onHelpToggle: () => cbRef.current.toggleHelp(),
    onPhotoModeToggle: () => cbRef.current.togglePhotoMode(),
    onCctvPreviewToggle: () => cbRef.current.toggleCctvPreview(),
    onPaPanelToggle: () => cbRef.current.togglePaPanel(),
    onDispatchMapToggle: () => cbRef.current.toggleDispatchMap(),
    onSwitchCabRequested: () => cbRef.current.triggerCabSwitch(),
    onPauseToggle: () => invokePauseToggle(refs, cbRef.current),
    onMuteToggle: () => cbRef.current.toggleMute(),
    onRestartRequested: () => { if (refs.sim.current.getSnapshot().phase !== 'title') cbRef.current.restartGame(); },
    onFirstInteraction: () => refs.audio.current?.unlock(),
  });
}

function startEngineLoop(renderer: MetroSceneRenderer, runner: SimulationFrameRunner): () => void {
  let active = true;
  let frameHandle = 0;
  const tick = (): void => {
    if (!active) return;
    runner.step(performance.now());
    frameHandle = renderer.scheduleNextFrame(tick);
  };
  frameHandle = renderer.scheduleNextFrame(tick);
  return () => { active = false; renderer.cancelScheduledFrame(frameHandle); };
}

function createAndStoreSubsystems(refs: IGameRuntimeRefs) {
  const renderer = new MetroSceneRenderer();
  const audio = new MetroAudioEngine();
  const speech = new WebSpeechAnnouncer();
  const input = new KeyboardInputController();
  const gamepad = new BrowserGamepadController();
  (refs.renderer as { current: MetroSceneRenderer }).current = renderer;
  (refs.audio as { current: MetroAudioEngine }).current = audio;
  (refs.speech as { current: WebSpeechAnnouncer }).current = speech;
  (refs.input as { current: KeyboardInputController }).current = input;
  (refs.gamepad as { current: BrowserGamepadController }).current = gamepad;
  return { renderer, audio, speech, input, gamepad };
}

function attachEngineSubsystems(
  container: HTMLDivElement,
  refs: IGameRuntimeRefs,
  cbRef: RefObject<IEngineMountCallbacks>,
  toastTimerRef: RefObject<number | null>,
): () => void {
  const { renderer, audio, speech, input, gamepad } = createAndStoreSubsystems(refs);
  configureRendererAndAudio(container, refs, cbRef, renderer, audio);
  attachGamepad(cbRef, gamepad, toastTimerRef);
  attachKeyboard(refs, cbRef, input);
  const stopLoop = startEngineLoop(renderer, new SimulationFrameRunner(refs, createDynamicRunnerCallbacks(refs, cbRef)));
  return () => {
    stopLoop();
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    gamepad.detach(); input.detach(); speech.dispose(); audio.dispose(); renderer.dispose();
  };
}

export function useEngineMountEffect(
  mountRef: RefObject<HTMLDivElement | null>,
  refs: IGameRuntimeRefs,
  callbacksRef: RefObject<IEngineMountCallbacks>,
): void {
  const toastTimerRef = useRef<number | null>(null);
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return undefined;
    return attachEngineSubsystems(container, refs, callbacksRef, toastTimerRef);
  }, [callbacksRef, mountRef, refs]);
}
