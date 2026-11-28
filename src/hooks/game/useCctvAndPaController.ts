import { useCallback, useMemo, useState } from 'react';
import type { CctvPreviewChannel, DoorSide, PaAnnouncementId } from '../../domain/types';
import { createCctvAndPaActions } from './cctvAndPaActions';
import type { IGameRuntimeRefs } from './types';

export interface ICctvAndPaState {
  readonly cctvPreviewOpen: boolean;
  readonly cctvChannel: CctvPreviewChannel;
  readonly paPanelOpen: boolean;
  readonly dispatchMapOpen: boolean;
  setCctvPreviewOpen: (open: boolean) => void;
  setPaPanelOpen: (open: boolean) => void;
  toggleCctvPreview: () => void;
  closeCctvPreview: () => void;
  selectCctvChannel: (channel: CctvPreviewChannel) => void;
  registerCctvCanvas: (canvas: HTMLCanvasElement | null) => void;
  handle3dMonitorClick: (side: DoorSide) => void;
  togglePaPanel: () => void;
  closePaPanel: () => void;
  triggerPaAnnouncement: (id: PaAnnouncementId) => void;
  toggleDispatchMap: () => void;
  closeDispatchMap: () => void;
}

export function useCctvAndPaController(
  refs: IGameRuntimeRefs,
  syncNow: () => void,
): ICctvAndPaState {
  const [cctvPreviewOpen, setCctvPreviewOpen] = useState<boolean>(false);
  const [cctvChannel, setCctvChannel] = useState<CctvPreviewChannel>('auto');
  const [paPanelOpen, setPaPanelOpen] = useState<boolean>(false);
  const [dispatchMapOpen, setDispatchMapOpen] = useState<boolean>(false);
  const actions = useMemo(
    () => createCctvAndPaActions(refs, setCctvPreviewOpen, setCctvChannel, setPaPanelOpen, syncNow),
    [refs, syncNow],
  );
  const toggleDispatchMap = useCallback((): void => {
    if (refs.sim.current.getSnapshot().phase !== 'playing') return;
    const next = !refs.dispatchMapOpenRef.current;
    (refs.dispatchMapOpenRef as { current: boolean }).current = next;
    setDispatchMapOpen(next);
  }, [refs]);
  const closeDispatchMap = useCallback((): void => {
    (refs.dispatchMapOpenRef as { current: boolean }).current = false;
    setDispatchMapOpen(false);
  }, [refs]);
  return {
    cctvPreviewOpen, cctvChannel, paPanelOpen, dispatchMapOpen,
    setCctvPreviewOpen, setPaPanelOpen, ...actions, toggleDispatchMap, closeDispatchMap,
  };
}
