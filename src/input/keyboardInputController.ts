import type { IControlInput } from '../domain/types';
import { dispatchOneShotKey, type QueuedInputAction } from './queuedActionsState';
import type { IInputActionCallbacks, IInputController } from './types';

export class KeyboardInputController implements IInputController {
  private readonly heldKeys = new Set<string>();
  private readonly queuedActions = new Set<QueuedInputAction>();
  private callbacks: IInputActionCallbacks | null = null;
  private virtualHornActive = false;
  private virtualLeverAxis: number | null = null;

  public attach(callbacks: IInputActionCallbacks): void {
    this.callbacks = callbacks;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('blur', this.handleWindowBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  public detach(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('blur', this.handleWindowBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.heldKeys.clear();
  }

  public sampleControlInput(): IControlInput {
    const input: IControlInput = {
      throttleUp: this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp'),
      throttleDown: this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown'),
      serviceBrake: this.heldKeys.has('Space'),
      emergencyBrakePressed: this.queuedActions.has('emergencyBrake'),
      toggleDoorsPressed: this.queuedActions.has('doorToggle'),
      toggleDoorsLeftPressed: this.queuedActions.has('doorLeft'),
      toggleDoorsRightPressed: this.queuedActions.has('doorRight'),
      toggleHeadlightsPressed: this.queuedActions.has('headlights'),
      toggleCabLightPressed: this.queuedActions.has('cabLight'),
      toggleWipersPressed: this.queuedActions.has('wipers'),
      acknowledgeCzuwakPressed: this.queuedActions.has('czuwak'),
      acknowledgeRadioPressed: this.queuedActions.has('radio'),
      cycleCameraPressed: this.queuedActions.has('camera'),
      toggleAtoPressed: this.queuedActions.has('ato'),
      manualLeverAxis: this.virtualLeverAxis,
      hornActive: this.heldKeys.has('KeyH') || this.virtualHornActive,
    };
    this.queuedActions.clear();
    return input;
  }

  public triggerDoorToggle(): void { this.queueAction('doorToggle'); }
  public triggerDoorLeftToggle(): void { this.queueAction('doorLeft'); }
  public triggerDoorRightToggle(): void { this.queueAction('doorRight'); }
  public triggerEmergencyBrake(): void { this.queueAction('emergencyBrake'); }
  public triggerHeadlightsToggle(): void { this.queueAction('headlights'); }
  public triggerCabLightToggle(): void { this.queueAction('cabLight'); }
  public triggerWipersToggle(): void { this.queueAction('wipers'); }
  public triggerCzuwakAck(): void { this.queueAction('czuwak'); }
  public triggerRadioAck(): void { this.queueAction('radio'); }
  public triggerCameraCycle(): void { this.queueAction('camera'); }
  public triggerAtoToggle(): void { this.queueAction('ato'); }

  public setVirtualHorn(active: boolean): void {
    if (active) this.callbacks?.onFirstInteraction();
    this.virtualHornActive = active;
  }

  public setVirtualLeverAxis(axis: number | null): void {
    this.callbacks?.onFirstInteraction();
    this.virtualLeverAxis = axis === null ? null : Math.max(-1, Math.min(1, axis));
  }

  public clearHeld(): void {
    this.heldKeys.clear();
    this.queuedActions.clear();
    this.virtualHornActive = false;
    this.virtualLeverAxis = null;
  }

  private queueAction(action: QueuedInputAction): void {
    this.callbacks?.onFirstInteraction();
    this.queuedActions.add(action);
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    this.callbacks?.onFirstInteraction();
    if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'ArrowDown') {
      event.preventDefault();
    }
    if (['KeyW', 'KeyS', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) {
      this.virtualLeverAxis = null;
    }
    const isTitle = document.body.dataset.state === 'title';
    const isModalOpen = document.body.dataset.modalOpen === '1';
    if (document.body.dataset.photoMode === '1') {
      if (!event.repeat && (event.code === 'KeyF' || event.code === 'Escape')) {
        this.callbacks?.onPhotoModeToggle?.();
      }
      return;
    }
    if (isTitle && !isModalOpen && (event.code === 'Enter' || event.code === 'Space')) {
      this.callbacks?.onStartRequested();
      return;
    }
    if (!event.repeat) {
      dispatchOneShotKey(event.code, event.key, event.shiftKey, isTitle, isModalOpen, this.queuedActions, this.callbacks);
    }
    this.heldKeys.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => { this.heldKeys.delete(event.code); };
  private readonly handlePointerDown = (): void => { this.callbacks?.onFirstInteraction(); };
  private readonly handleWindowBlur = (): void => { this.clearHeld(); };
  private readonly handleVisibilityChange = (): void => { if (document.hidden) this.clearHeld(); };
}
