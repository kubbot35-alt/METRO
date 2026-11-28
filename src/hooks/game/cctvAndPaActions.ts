import { getPaAnnouncementSpec } from '../../domain/paIntercomSystem';
import type { CctvPreviewChannel, DoorSide, PaAnnouncementId } from '../../domain/types';
import type { IGameRuntimeRefs } from './types';

function syncRenderer(refs: IGameRuntimeRefs): void {
  refs.renderer.current?.setCctvPreviewState?.(
    refs.cctvPreviewOpenRef.current,
    refs.cctvChannelRef.current,
    refs.cctvCanvasRef.current,
  );
}

function createCctvChannelActions(
  refs: IGameRuntimeRefs,
  setCctvPreviewOpen: (open: boolean) => void,
  setCctvChannel: (ch: CctvPreviewChannel) => void,
) {
  return {
    toggleCctvPreview: (): void => {
      const next = !refs.cctvPreviewOpenRef.current;
      refs.cctvPreviewOpenRef.current = next;
      setCctvPreviewOpen(next);
      syncRenderer(refs);
    },
    closeCctvPreview: (): void => {
      refs.cctvPreviewOpenRef.current = false;
      setCctvPreviewOpen(false);
      syncRenderer(refs);
    },
    selectCctvChannel: (channel: CctvPreviewChannel): void => {
      refs.cctvChannelRef.current = channel;
      setCctvChannel(channel);
      syncRenderer(refs);
    },
  };
}

function createCctvMonitorActions(
  refs: IGameRuntimeRefs,
  setCctvPreviewOpen: (open: boolean) => void,
  setCctvChannel: (ch: CctvPreviewChannel) => void,
) {
  return {
    registerCctvCanvas: (canvas: HTMLCanvasElement | null): void => {
      refs.cctvCanvasRef.current = canvas;
      syncRenderer(refs);
    },
    handle3dMonitorClick: (side: DoorSide): void => {
      const closing = refs.cctvPreviewOpenRef.current && refs.cctvChannelRef.current === side;
      refs.cctvPreviewOpenRef.current = !closing;
      setCctvPreviewOpen(!closing);
      if (!closing) {
        refs.cctvChannelRef.current = side;
        setCctvChannel(side);
      }
      syncRenderer(refs);
    },
  };
}

function speakPaAnnouncement(refs: IGameRuntimeRefs, specId: PaAnnouncementId, annId: number): void {
  const lang = refs.settingsRef.current.language;
  const spec = getPaAnnouncementSpec(specId);
  const vol = refs.settingsRef.current.masterVolume * refs.settingsRef.current.voiceVolume;
  refs.speech.current?.announce(20000 + annId, lang === 'en' ? spec.textEn : spec.textPl, refs.audio.current?.isMuted() ?? false, vol, lang, 'pa');
}

function createPaIntercomActions(refs: IGameRuntimeRefs, setPaPanelOpen: (open: boolean) => void, syncNow: () => void) {
  return {
    togglePaPanel: (): void => {
      if (refs.sim.current.getSnapshot().phase !== 'playing') return;
      const next = !refs.paPanelOpenRef.current;
      refs.paPanelOpenRef.current = next;
      setPaPanelOpen(next);
    },
    closePaPanel: (): void => {
      refs.paPanelOpenRef.current = false;
      setPaPanelOpen(false);
    },
    triggerPaAnnouncement: (id: PaAnnouncementId): void => {
      refs.audio.current?.unlock();
      const res = refs.sim.current.triggerPaAnnouncement?.(id);
      if (res?.accepted) speakPaAnnouncement(refs, res.specId, res.announcementId);
      syncNow();
    },
  };
}

export function createCctvAndPaActions(
  refs: IGameRuntimeRefs,
  setCctvPreviewOpen: (open: boolean) => void,
  setCctvChannel: (ch: CctvPreviewChannel) => void,
  setPaPanelOpen: (open: boolean) => void,
  syncNow: () => void,
) {
  return {
    ...createCctvChannelActions(refs, setCctvPreviewOpen, setCctvChannel),
    ...createCctvMonitorActions(refs, setCctvPreviewOpen, setCctvChannel),
    ...createPaIntercomActions(refs, setPaPanelOpen, syncNow),
  };
}
