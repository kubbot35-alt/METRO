import { useMemo, useState } from 'react';
import type { CctvPreviewChannel, DoorSide, PaAnnouncementId } from '../../domain/types';
import { createCctvAndPaActions } from './cctvAndPaActions';
import type { IGameRuntimeRefs } from './types';

export interface ICctvAndPaState {
  readonly cctvPreviewOpen: boolean;
  readonly cctvChannel: CctvPreviewChannel;
  readonly paPanelOpen: boolean;
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
}

export function useCctvAndPaController(
  refs: IGameRuntimeRefs,
  syncNow: () => void,
): ICctvAndPaState {
  const [cctvPreviewOpen, setCctvPreviewOpen] = useState<boolean>(false);
  const [cctvChannel, setCctvChannel] = useState<CctvPreviewChannel>('auto');
  const [paPanelOpen, setPaPanelOpen] = useState<boolean>(false);
  const actions = useMemo(
    () => createCctvAndPaActions(refs, setCctvPreviewOpen, setCctvChannel, setPaPanelOpen, syncNow),
    [refs, syncNow],
  );
  return { cctvPreviewOpen, cctvChannel, paPanelOpen, setCctvPreviewOpen, setPaPanelOpen, ...actions };
}
