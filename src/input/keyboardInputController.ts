import type { IControlInput } from '../domain/types';
import type { IInputActionCallbacks, IInputController } from './types';

export class KeyboardInputController implements IInputController {
  private readonly heldKeys = new Set<string>();
  private callbacks: IInputActionCallbacks | null = null;
  private doorToggleQueued = false;
  private doorLeftQueued = false;
  private doorRightQueued = false;
  private emergencyBrakeQueued = false;
  private headlightsToggleQueued = false;
  private cabLightToggleQueued = false;
  private wipersToggleQueued = false;
  private czuwakAckQueued = false;
  private radioAckQueued = false;
  private cameraCycleQueued = false;
  private atoToggleQueued = false;
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
      emergencyBrakePressed: this.emergencyBrakeQueued,
      toggleDoorsPressed: this.doorToggleQueued,
      toggleDoorsLeftPressed: this.doorLeftQueued,
      toggleDoorsRightPressed: this.doorRightQueued,
      toggleHeadlightsPressed: this.headlightsToggleQueued,
      toggleCabLightPressed: this.cabLightToggleQueued,
      toggleWipersPressed: this.wipersToggleQueued,
      acknowledgeCzuwakPressed: this.czuwakAckQueued,
      acknowledgeRadioPressed: this.radioAckQueued,
      cycleCameraPressed: this.cameraCycleQueued,
      toggleAtoPressed: this.atoToggleQueued,
      manualLeverAxis: this.virtualLeverAxis,
      hornActive: this.heldKeys.has('KeyH') || this.virtualHornActive,
    };
    this.doorToggleQueued = false;
    this.doorLeftQueued = false;
    this.doorRightQueued = false;
    this.emergencyBrakeQueued = false;
    this.headlightsToggleQueued = false;
    this.cabLightToggleQueued = false;
    this.wipersToggleQueued = false;
    this.czuwakAckQueued = false;
    this.radioAckQueued = false;
    this.cameraCycleQueued = false;
    this.atoToggleQueued = false;
    return input;
  }

  public triggerDoorToggle(): void {
    this.callbacks?.onFirstInteraction();
    this.doorToggleQueued = true;
  }

  public triggerDoorLeftToggle(): void {
    this.callbacks?.onFirstInteraction();
    this.doorLeftQueued = true;
  }

  public triggerDoorRightToggle(): void {
    this.callbacks?.onFirstInteraction();
    this.doorRightQueued = true;
  }

  public triggerEmergencyBrake(): void {
    this.callbacks?.onFirstInteraction();
    this.emergencyBrakeQueued = true;
  }

  public triggerHeadlightsToggle(): void {
    this.callbacks?.onFirstInteraction();
    this.headlightsToggleQueued = true;
  }

  public triggerCabLightToggle(): void {
    this.callbacks?.onFirstInteraction();
    this.cabLightToggleQueued = true;
  }

  public triggerWipersToggle(): void {
    this.callbacks?.onFirstInteraction();
    this.wipersToggleQueued = true;
  }

  public triggerCzuwakAck(): void {
    this.callbacks?.onFirstInteraction();
    this.czuwakAckQueued = true;
  }

  public triggerRadioAck(): void {
    this.callbacks?.onFirstInteraction();
    this.radioAckQueued = true;
  }

  public triggerCameraCycle(): void {
    this.callbacks?.onFirstInteraction();
    this.cameraCycleQueued = true;
  }

  public triggerAtoToggle(): void {
    this.callbacks?.onFirstInteraction();
    this.atoToggleQueued = true;
  }

  public setVirtualHorn(active: boolean): void {
    if (active) {
      this.callbacks?.onFirstInteraction();
    }
    this.virtualHornActive = active;
  }

  public setVirtualLeverAxis(axis: number | null): void {
    this.callbacks?.onFirstInteraction();
    this.virtualLeverAxis = axis === null ? null : Math.max(-1, Math.min(1, axis));
  }

  public clearHeld(): void {
    this.heldKeys.clear();
    this.virtualHornActive = false;
    this.virtualLeverAxis = null;
    this.doorToggleQueued = false;
    this.doorLeftQueued = false;
    this.doorRightQueued = false;
    this.emergencyBrakeQueued = false;
    this.headlightsToggleQueued = false;
    this.cabLightToggleQueued = false;
    this.wipersToggleQueued = false;
    this.czuwakAckQueued = false;
    this.radioAckQueued = false;
    this.cameraCycleQueued = false;
    this.atoToggleQueued = false;
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    this.callbacks?.onFirstInteraction();
    if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'ArrowDown') {
      event.preventDefault();
    }
    if (
      event.code === 'KeyW' ||
      event.code === 'KeyS' ||
      event.code === 'ArrowUp' ||
      event.code === 'ArrowDown' ||
      event.code === 'Space'
    ) {
      this.virtualLeverAxis = null;
    }
    const isTitle = document.body.dataset.state === 'title';
    const isModalOpen = document.body.dataset.modalOpen === '1';
    const isPhotoMode = document.body.dataset.photoMode === '1';
    if (isPhotoMode) {
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
      this.handleOneShotKey(event.code, event.key, event.shiftKey, isTitle, isModalOpen);
    }
    this.heldKeys.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.heldKeys.delete(event.code);
  };

  private readonly handlePointerDown = (): void => {
    this.callbacks?.onFirstInteraction();
  };

  private readonly handleWindowBlur = (): void => {
    this.clearHeld();
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.clearHeld();
    }
  };

  private handleOneShotKey(
    code: string,
    key: string,
    shiftKey: boolean,
    isTitle: boolean,
    isModalOpen: boolean,
  ): void {
    if (code === 'KeyF') {
      if (!isTitle && !isModalOpen) {
        this.callbacks?.onPhotoModeToggle?.();
      }
    } else if (code === 'KeyQ') {
      this.doorLeftQueued = true;
    } else if (code === 'KeyE') {
      this.doorRightQueued = true;
    } else if (code === 'KeyO') {
      this.doorToggleQueued = true;
    } else if (code === 'KeyB') {
      this.emergencyBrakeQueued = true;
    } else if (code === 'KeyL') {
      this.headlightsToggleQueued = true;
    } else if (code === 'KeyK') {
      this.cabLightToggleQueued = true;
    } else if (code === 'KeyX') {
      this.wipersToggleQueued = true;
    } else if (code === 'KeyC') {
      this.czuwakAckQueued = true;
    } else if (code === 'KeyR') {
      if (shiftKey) {
        this.callbacks?.onRestartRequested();
      } else {
        this.radioAckQueued = true;
      }
    } else if (code === 'KeyV') {
      this.cameraCycleQueued = true;
    } else if (code === 'KeyA') {
      if (!isTitle && !isModalOpen) {
        this.atoToggleQueued = true;
      }
    } else if (code === 'F1' || key === '?') {
      this.callbacks?.onHelpToggle();
    } else if (code === 'KeyP' || code === 'Escape') {
      this.callbacks?.onPauseToggle();
    } else if (code === 'KeyM') {
      this.callbacks?.onMuteToggle();
    }
  }
}
