import type { IInputActionCallbacks } from './types';

export type QueuedInputAction =
  | 'doorToggle'
  | 'doorLeft'
  | 'doorRight'
  | 'emergencyBrake'
  | 'headlights'
  | 'cabLight'
  | 'wipers'
  | 'czuwak'
  | 'radio'
  | 'camera'
  | 'ato';

const DIRECT_ACTION_MAP: Readonly<Record<string, QueuedInputAction>> = {
  KeyQ: 'doorLeft',
  KeyE: 'doorRight',
  KeyO: 'doorToggle',
  KeyB: 'emergencyBrake',
  KeyL: 'headlights',
  KeyK: 'cabLight',
  KeyX: 'wipers',
  KeyC: 'czuwak',
  KeyV: 'camera',
};

function dispatchContextualKey(
  code: string,
  shiftKey: boolean,
  activeRun: boolean,
  queued: Set<QueuedInputAction>,
  callbacks: IInputActionCallbacks | null,
): boolean {
  if (code === 'KeyR') { if (shiftKey) callbacks?.onRestartRequested(); else queued.add('radio'); return true; }
  if (code === 'KeyM') { if (shiftKey || !activeRun) callbacks?.onMuteToggle(); else callbacks?.onCctvPreviewToggle?.(); return true; }
  if (!activeRun) return false;
  if (code === 'KeyF') callbacks?.onPhotoModeToggle?.();
  else if (code === 'Tab') callbacks?.onDispatchMapToggle?.();
  else if (code === 'KeyA') queued.add('ato');
  else if (code === 'KeyI') callbacks?.onPaPanelToggle?.();
  else if (code === 'KeyT') callbacks?.onSwitchCabRequested?.();
  else return false;
  return true;
}

export function dispatchOneShotKey(
  code: string,
  key: string,
  shiftKey: boolean,
  isTitle: boolean,
  isModalOpen: boolean,
  queued: Set<QueuedInputAction>,
  callbacks: IInputActionCallbacks | null,
): void {
  const direct = DIRECT_ACTION_MAP[code];
  if (direct) {
    queued.add(direct);
    return;
  }
  if (dispatchContextualKey(code, shiftKey, !isTitle && !isModalOpen, queued, callbacks)) {
    return;
  }
  if (code === 'F1' || key === '?') callbacks?.onHelpToggle();
  else if (code === 'KeyP' || code === 'Escape') callbacks?.onPauseToggle();
  else if (code === 'KeyU') callbacks?.onMuteToggle();
}
