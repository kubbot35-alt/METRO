import type { RefObject } from 'react';
import type { IPhotoCameraState, ISimulationSnapshot, PhotoFilterId } from '../../domain/types';
import type { IGameRuntimeRefs } from './types';

const PHOTO_MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight']);

function triggerPngDownload(dataUrl: string, lineSlug: string, modelSlug: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `metro-${lineSlug}-${modelSlug}-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function attachPhotoWindowListeners(
  refs: IGameRuntimeRefs,
  setPhotoState: (pose: IPhotoCameraState) => void,
  renderPose: (pose: IPhotoCameraState) => void,
): () => void {
  const drag = { active: false, x: 0, y: 0 };
  const handlers = createPhotoDomHandlers(refs, drag, setPhotoState, renderPose);
  window.addEventListener('keydown', handlers.onKeyDown);
  window.addEventListener('keyup', handlers.onKeyUp);
  window.addEventListener('pointerdown', handlers.onPointerDown);
  window.addEventListener('pointermove', handlers.onPointerMove);
  window.addEventListener('pointerup', handlers.onPointerUp);
  window.addEventListener('wheel', handlers.onWheel, { passive: false });
  window.addEventListener('blur', handlers.onBlur);
  return () => detachPhotoWindowListeners(refs, handlers);
}

function detachPhotoWindowListeners(refs: IGameRuntimeRefs, handlers: ReturnType<typeof createPhotoDomHandlers>): void {
  window.removeEventListener('keydown', handlers.onKeyDown);
  window.removeEventListener('keyup', handlers.onKeyUp);
  window.removeEventListener('pointerdown', handlers.onPointerDown);
  window.removeEventListener('pointermove', handlers.onPointerMove);
  window.removeEventListener('pointerup', handlers.onPointerUp);
  window.removeEventListener('wheel', handlers.onWheel);
  window.removeEventListener('blur', handlers.onBlur);
  refs.photoKeysRef.current.clear();
}

function createPhotoPointerHandlers(
  refs: IGameRuntimeRefs,
  drag: { active: boolean; x: number; y: number },
  setPhotoState: (pose: IPhotoCameraState) => void,
  renderPose: (pose: IPhotoCameraState) => void,
) {
  return {
    onPointerDown: (e: PointerEvent): void => {
      if ((e.target as HTMLElement | null)?.closest('[data-testid="photo-mode-panel"]')) return;
      drag.active = true;
      drag.x = e.clientX;
      drag.y = e.clientY;
    },
    onPointerMove: (e: PointerEvent): void => {
      if (!drag.active) return;
      const next = refs.photoController.current.applyLookDelta(e.clientX - drag.x, e.clientY - drag.y);
      drag.x = e.clientX;
      drag.y = e.clientY;
      setPhotoState(next);
      renderPose(next);
    },
    onPointerUp: (): void => { drag.active = false; },
  };
}

function createPhotoDomHandlers(
  refs: IGameRuntimeRefs,
  drag: { active: boolean; x: number; y: number },
  setPhotoState: (pose: IPhotoCameraState) => void,
  renderPose: (pose: IPhotoCameraState) => void,
) {
  return {
    onKeyDown: (e: KeyboardEvent): void => { if (PHOTO_MOVE_KEYS.has(e.code)) refs.photoKeysRef.current.add(e.code); },
    onKeyUp: (e: KeyboardEvent): void => { refs.photoKeysRef.current.delete(e.code); },
    onWheel: (e: WheelEvent): void => {
      if ((e.target as HTMLElement | null)?.closest('[data-testid="photo-mode-panel"]')) return;
      e.preventDefault();
      const next = refs.photoController.current.applyWheelZoom(e.deltaY);
      setPhotoState(next);
      renderPose(next);
    },
    onBlur: (): void => { drag.active = false; refs.photoKeysRef.current.clear(); },
    ...createPhotoPointerHandlers(refs, drag, setPhotoState, renderPose),
  };
}

export interface IPhotoActionDeps {
  readonly refs: IGameRuntimeRefs;
  readonly noticeTimerRef: RefObject<number | null>;
  readonly setSnapshot: (snap: ISimulationSnapshot) => void;
  readonly setPhotoModeActive: (active: boolean) => void;
  readonly setPhotoState: (pose: IPhotoCameraState) => void;
  readonly setPhotoCapturing: (capturing: boolean) => void;
  readonly setPhotoSavedNotice: (saved: boolean) => void;
  readonly syncNow: () => void;
}

function renderPhotoPose(refs: IGameRuntimeRefs, pose: IPhotoCameraState): void {
  refs.renderer.current?.setPhotoModePose?.(pose, refs.sim.current.getSnapshot(), refs.photoKeepInteriorRef.current);
  refs.renderer.current?.render();
}

function performEnterPhotoMode(deps: IPhotoActionDeps): void {
  const { refs } = deps;
  const renderer = refs.renderer.current;
  const snap = refs.sim.current.getSnapshot();
  if (!renderer || snap.phase === 'title' || snap.phase === 'gameover') return;
  if (snap.phase === 'playing') refs.sim.current.pause();
  refs.audio.current?.silence();
  refs.speech.current?.stop();
  refs.input.current?.clearHeld();
  refs.photoKeysRef.current.clear();
  const anchor = renderer.getPhotoAnchorPose?.(snap);
  refs.photoKeepInteriorRef.current = anchor?.keepInteriorVisible ?? false;
  const initial = anchor
    ? refs.photoController.current.initializeFromPose(anchor.x, anchor.y, anchor.z, anchor.yaw, anchor.pitch, anchor.fovDeg)
    : refs.photoController.current.getState();
  refs.photoModeActiveRef.current = true;
  document.body.dataset.photoMode = '1';
  deps.setPhotoModeActive(true);
  deps.setPhotoState(initial);
  deps.setSnapshot(refs.sim.current.getSnapshot());
  renderPhotoPose(refs, initial);
}

function performExitPhotoMode(deps: IPhotoActionDeps): void {
  const { refs } = deps;
  if (!refs.photoModeActiveRef.current) return;
  refs.photoModeActiveRef.current = false;
  refs.photoKeepInteriorRef.current = false;
  refs.photoKeysRef.current.clear();
  document.body.dataset.photoMode = '0';
  deps.setPhotoModeActive(false);
  deps.setPhotoCapturing(false);
  if (refs.sim.current.getSnapshot().phase === 'paused') refs.sim.current.resume();
  refs.audio.current?.unlock();
  refs.input.current?.clearHeld();
  refs.renderer.current?.setPhotoModePose?.(null, refs.sim.current.getSnapshot(), false);
  deps.syncNow();
}

export function createPhotoModeActions(deps: IPhotoActionDeps) {
  const enterPhotoMode = (): void => performEnterPhotoMode(deps);
  const exitPhotoMode = (): void => performExitPhotoMode(deps);
  return {
    enterPhotoMode,
    exitPhotoMode,
    togglePhotoMode: (): void => (deps.refs.photoModeActiveRef.current ? exitPhotoMode() : enterPhotoMode()),
    ...createPhotoAdjustAndCaptureActions(deps),
  };
}

function createPhotoAdjustAndCaptureActions(deps: IPhotoActionDeps) {
  const { refs } = deps;
  return {
    setPhotoFov: (fov: number): void => { const n = refs.photoController.current.setFov(fov); deps.setPhotoState(n); renderPhotoPose(refs, n); },
    setPhotoTilt: (roll: number): void => { const n = refs.photoController.current.setTilt(roll); deps.setPhotoState(n); renderPhotoPose(refs, n); },
    setPhotoFilter: (filter: PhotoFilterId): void => deps.setPhotoState(refs.photoController.current.setFilter(filter)),
    resetPhotoCamera: (): void => { const n = refs.photoController.current.resetToInitial(); deps.setPhotoState(n); renderPhotoPose(refs, n); },
    capturePhotoPng: (): void => capturePngSnapshot(deps),
  };
}

function capturePngSnapshot(deps: IPhotoActionDeps): void {
  const renderer = deps.refs.renderer.current;
  if (!renderer || !deps.refs.photoModeActiveRef.current) return;
  const filter = deps.refs.photoController.current.getState().filter;
  deps.setPhotoCapturing(true);
  window.requestAnimationFrame(() => {
    const dataUrl = renderer.captureScreenshotPng?.(filter) ?? null;
    if (dataUrl) {
      const snap = deps.refs.sim.current.getSnapshot();
      triggerPngDownload(dataUrl, (snap.line.badgeCode ?? snap.line.id).replace(/[^a-zA-Z0-9_-]/g, ''), snap.trainModel.id);
      deps.setPhotoSavedNotice(true);
      if (deps.noticeTimerRef.current !== null) window.clearTimeout(deps.noticeTimerRef.current);
      (deps.noticeTimerRef as { current: number | null }).current = window.setTimeout(() => deps.setPhotoSavedNotice(false), 2400);
    }
    deps.setPhotoCapturing(false);
  });
}
