import type { IPhotoCameraState, PhotoFilterId } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';
import {
  PhotoFilterBackdrop,
  PhotoFilterGrid,
  PhotoPanelActions,
  PhotoPanelHeader,
  PhotoRangeSliders,
} from './hud/PhotoModeEffects';

interface IPhotoModeOverlayProps {
  readonly state: IPhotoCameraState;
  readonly capturing: boolean;
  readonly savedNotice: boolean;
  readonly trainName: string;
  readonly onFovChange: (fovDeg: number) => void;
  readonly onTiltChange: (rollDeg: number) => void;
  readonly onFilterChange: (filter: PhotoFilterId) => void;
  readonly onResetCamera: () => void;
  readonly onCapturePng: () => void;
  readonly onClose: () => void;
}

export function PhotoModeOverlay(props: IPhotoModeOverlayProps) {
  const { tr } = useI18n();
  const { state, capturing } = props;
  return (
    <div className="fixed inset-0 z-30 pointer-events-none select-none">
      <PhotoFilterBackdrop filter={state.filter} capturing={capturing} />
      {!capturing && (
        <aside data-testid="photo-mode-panel" aria-label={tr('Panel Trybu Fotograficznego', 'Photo Mode Panel')} className="pointer-events-auto fixed bottom-4 right-4 w-[312px] bg-[#0a0f18]/94 border border-cyan-500/45 rounded-lg p-3.5 shadow-2xl text-slate-100 flex flex-col gap-3">
          <PhotoPanelHeader trainName={props.trainName} onClose={props.onClose} />
          <PhotoRangeSliders state={state} onFovChange={props.onFovChange} onTiltChange={props.onTiltChange} />
          <PhotoFilterGrid activeFilter={state.filter} onFilterChange={props.onFilterChange} />
          <PhotoPanelActions savedNotice={props.savedNotice} onCapturePng={props.onCapturePng} onResetCamera={props.onResetCamera} />
        </aside>
      )}
    </div>
  );
}
