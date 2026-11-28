import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IPhotoCameraState, ISimulationSnapshot, PhotoFilterId } from '../../domain/types';
import { attachPhotoWindowListeners, createPhotoModeActions } from './photoModeActions';
import type { IGameRuntimeRefs } from './types';

export interface IPhotoModeActions {
  readonly photoModeActive: boolean;
  readonly photoState: IPhotoCameraState;
  readonly photoCapturing: boolean;
  readonly photoSavedNotice: boolean;
  setPhotoState: (pose: IPhotoCameraState) => void;
  enterPhotoMode: () => void;
  exitPhotoMode: () => void;
  togglePhotoMode: () => void;
  setPhotoFov: (fovDeg: number) => void;
  setPhotoTilt: (rollDeg: number) => void;
  setPhotoFilter: (filter: PhotoFilterId) => void;
  resetPhotoCamera: () => void;
  capturePhotoPng: () => void;
}

export function usePhotoModeController(
  refs: IGameRuntimeRefs,
  setSnapshot: (snap: ISimulationSnapshot) => void,
  syncNow: () => void,
): IPhotoModeActions {
  const [photoModeActive, setPhotoModeActive] = useState<boolean>(false);
  const [photoState, setPhotoState] = useState<IPhotoCameraState>(() => refs.photoController.current.getState());
  const [photoCapturing, setPhotoCapturing] = useState<boolean>(false);
  const [photoSavedNotice, setPhotoSavedNotice] = useState<boolean>(false);
  const noticeTimerRef = useRef<number | null>(null);
  const renderPose = useCallback((pose: IPhotoCameraState): void => {
    refs.renderer.current?.setPhotoModePose?.(pose, refs.sim.current.getSnapshot(), refs.photoKeepInteriorRef.current);
    refs.renderer.current?.render();
  }, [refs]);
  const actions = useMemo(() => createPhotoModeActions({
    refs, noticeTimerRef, setSnapshot, setPhotoModeActive, setPhotoState, setPhotoCapturing, setPhotoSavedNotice, syncNow,
  }), [refs, setSnapshot, syncNow]);
  useEffect(() => { document.body.dataset.photoMode = photoModeActive ? '1' : '0'; }, [photoModeActive]);
  useEffect(() => (photoModeActive ? attachPhotoWindowListeners(refs, setPhotoState, renderPose) : undefined), [photoModeActive, refs, renderPose]);
  return { photoModeActive, photoState, photoCapturing, photoSavedNotice, setPhotoState, ...actions };
}
