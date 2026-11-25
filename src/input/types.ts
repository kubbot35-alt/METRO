import type { IControlInput } from '../domain/types';

export interface IInputActionCallbacks {
  readonly onStartRequested: () => void;
  readonly onPauseToggle: () => void;
  readonly onMuteToggle: () => void;
  readonly onRestartRequested: () => void;
  readonly onFirstInteraction: () => void;
}

export interface IInputController {
  attach(callbacks: IInputActionCallbacks): void;
  detach(): void;
  sampleControlInput(): IControlInput;
  triggerDoorToggle(): void;
  triggerEmergencyBrake(): void;
  setVirtualHorn(active: boolean): void;
  clearHeld(): void;
}
