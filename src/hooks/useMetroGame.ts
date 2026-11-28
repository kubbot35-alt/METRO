import { useCallback, useMemo, useRef, type RefObject } from 'react';
import { computeGhostDelta } from '../domain/ghostDelta';
import { createGameplayQuickActions } from './game/gameplayActionsFactory';
import { createSessionLifecycleActions } from './game/sessionActionsFactory';
import type { IGamepadToastState, IMetroGameController } from './game/types';
import { useCctvAndPaController } from './game/useCctvAndPaController';
import { useEngineMountEffect, type IEngineMountCallbacks } from './game/useEngineMountEffect';
import { useGameRuntimeState } from './game/useGameRuntimeState';
import { useOverlayModalsController } from './game/useOverlayModalsController';
import { usePhotoModeController } from './game/usePhotoModeController';
import { useViewportAndTouch } from './game/useViewportAndTouch';

export type { IGamepadToastState, IMetroGameController };

function useSyncNow(state: ReturnType<typeof useGameRuntimeState>): () => void {
  const { refs, setSnapshot, setActiveGhostRecord } = state;
  return useCallback((): void => {
    const next = refs.sim.current.getSnapshot();
    document.body.dataset.state = next.phase;
    setSnapshot(next);
    setActiveGhostRecord(refs.services.ghostRecords.getRecordForLine(next.line.id));
    if (refs.renderer.current) {
      refs.renderer.current.update(next, 0);
      refs.renderer.current.render();
    }
  }, [refs, setActiveGhostRecord, setSnapshot]);
}

function buildSetterCallbacks(state: ReturnType<typeof useGameRuntimeState>, setPhotoState: ReturnType<typeof usePhotoModeController>['setPhotoState']) {
  return {
    setFps: state.setFps, setSnapshot: state.setSnapshot, setPhotoState,
    setRouteDirection: state.setRouteDirection, setStartStationIndex: state.setStartStationIndex,
    setActiveGhostRecord: state.setActiveGhostRecord, setDriverProfile: state.setDriverProfile,
    setLastCourseXpReward: state.setLastCourseXpReward, setLeaderboard: state.setLeaderboard,
    setIsNewRecord: state.setIsNewRecord, setUnlockedAchievements: state.setUnlockedAchievements,
    setAchievementToast: state.setAchievementToast, setGamepadStatus: state.setGamepadStatus, setGamepadToast: state.setGamepadToast,
  };
}

function buildMountCallbacks(
  state: ReturnType<typeof useGameRuntimeState>,
  cctvPa: ReturnType<typeof useCctvAndPaController>,
  modals: ReturnType<typeof useOverlayModalsController>,
  photo: ReturnType<typeof usePhotoModeController>,
  session: ReturnType<typeof createSessionLifecycleActions>,
  handle3dCabControlClick: ReturnType<typeof createGameplayQuickActions>['handle3dCabControlClick'],
): IEngineMountCallbacks {
  return {
    ...buildSetterCallbacks(state, photo.setPhotoState),
    startGame: session.startGame, toggleHelp: session.toggleHelp, togglePhotoMode: photo.togglePhotoMode,
    toggleCctvPreview: cctvPa.toggleCctvPreview, togglePaPanel: cctvPa.togglePaPanel,
    toggleDispatchMap: cctvPa.toggleDispatchMap, closeDispatchMap: cctvPa.closeDispatchMap, triggerCabSwitch: session.triggerCabSwitch,
    toggleMute: session.toggleMute, restartGame: session.restartGame, pauseGame: session.pauseGame,
    resumeGame: session.resumeGame, exitPhotoMode: photo.exitPhotoMode, closePaPanel: cctvPa.closePaPanel,
    closeSettings: modals.closeSettings, closeHelp: session.closeHelp, handle3dMonitorClick: cctvPa.handle3dMonitorClick,
    setCabHoverTooltip: state.setCabHoverTooltip, handle3dCabControlClick,
  };
}

function buildTelemetrySnapshotFields(state: ReturnType<typeof useGameRuntimeState>, viewport: ReturnType<typeof useViewportAndTouch>) {
  const { snapshot, selectedLiveries } = state;
  const ghostDelta = snapshot.gameMode === 'duty' || snapshot.gameMode === 'challenge'
    ? computeGhostDelta(snapshot.stationSplits, state.activeGhostRecord)
    : null;
  const selectedLiveryId = snapshot.trainModel.visual.liveryId ?? selectedLiveries[snapshot.trainModel.id] ?? 'default';
  return {
    snapshot, settings: state.settings, fps: state.fps, muted: state.muted, helpOpen: state.helpOpen,
    customLines: state.customLines, baseLineSpec: state.baseLineSpec, routeDirection: state.routeDirection,
    startStationIndex: state.startStationIndex, driverProfile: state.driverProfile,
    lastCourseXpReward: state.lastCourseXpReward, achievementCatalog: state.refs.services.achievements.getCatalog(),
    unlockedAchievements: state.unlockedAchievements, achievementToast: state.achievementToast,
    leaderboard: state.leaderboard, isNewRecord: state.isNewRecord, gamepadStatus: state.gamepadStatus,
    gamepadToast: state.gamepadToast, touchControlsActive: viewport.touchControlsActive,
    showPortraitHint: viewport.showPortraitHint, ghostDelta, selectedLiveryId,
    cabHoverTooltip: state.cabHoverTooltip, dismissPortraitHint: viewport.dismissPortraitHint,
  };
}

export function useMetroGame(mountRef: RefObject<HTMLDivElement | null>): IMetroGameController {
  const state = useGameRuntimeState();
  const syncNow = useSyncNow(state);
  const viewport = useViewportAndTouch(state.settings);
  const cctvPa = useCctvAndPaController(state.refs, syncNow);
  const photo = usePhotoModeController(state.refs, state.setSnapshot, syncNow);
  const gameplay = useMemo(() => createGameplayQuickActions({ ...state, syncNow, togglePaPanel: cctvPa.togglePaPanel }), [cctvPa.togglePaPanel, state, syncNow]);
  const modals = useOverlayModalsController({ ...state, applyRouteVariant: gameplay.applyRouteVariant });
  const session = useMemo(
    () => createSessionLifecycleActions({ ...state, syncNow, ...cctvPa, setSettingsOpen: modals.setSettingsOpen }),
    [cctvPa, modals.setSettingsOpen, state, syncNow],
  );
  const mountCbRef = useRef<IEngineMountCallbacks>(null!);
  mountCbRef.current = buildMountCallbacks(state, cctvPa, modals, photo, session, gameplay.handle3dCabControlClick);
  useEngineMountEffect(mountRef, state.refs, mountCbRef);
  return { ...buildTelemetrySnapshotFields(state, viewport), ...cctvPa, ...modals, ...photo, ...session, ...gameplay };
}
