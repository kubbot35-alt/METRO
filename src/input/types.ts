import type { IControlInput } from '../domain/types';

export interface IInputActionCallbacks {
  readonly onStartRequested: () => void;
  readonly onPauseToggle: () => void;
  readonly onPhotoModeToggle?: () => void;
  readonly onCctvPreviewToggle?: () => void;
  readonly onPaPanelToggle?: () => void;
  readonly onSwitchCabRequested?: () => void;
  readonly onHelpToggle: () => void;
  readonly onMuteToggle: () => void;
  readonly onRestartRequested: () => void;
  readonly onFirstInteraction: () => void;
}

export interface IInputController {
  attach(callbacks: IInputActionCallbacks): void;
  detach(): void;
  sampleControlInput(): IControlInput;
  triggerDoorToggle(): void;
  triggerDoorLeftToggle(): void;
  triggerDoorRightToggle(): void;
  triggerEmergencyBrake(): void;
  triggerHeadlightsToggle(): void;
  triggerCabLightToggle(): void;
  triggerWipersToggle(): void;
  triggerCzuwakAck(): void;
  triggerRadioAck(): void;
  triggerCameraCycle(): void;
  triggerAtoToggle(): void;
  setVirtualHorn(active: boolean): void;
  setVirtualLeverAxis(axis: number | null): void;
  clearHeld(): void;
}
