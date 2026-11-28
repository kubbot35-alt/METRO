import {
  classifyGamepadBrand,
  GAMEPAD_DEADZONE,
  sampleGamepadState,
  type IGamepadSampleResult,
  type IRawGamepadLike,
} from '../domain/gamepadMapping';
import type { IGamepadStatus } from '../domain/types';

export interface IGamepadStatusCallbacks {
  readonly onStatusChanged: (status: IGamepadStatus, justConnected: boolean) => void;
}

export interface IGamepadController {
  attach(callbacks: IGamepadStatusCallbacks): void;
  detach(): void;
  getStatus(): IGamepadStatus;
  poll(): IGamepadSampleResult | null;
  triggerRumble(strongMagnitude: number, weakMagnitude: number, durationMs: number): void;
}

interface IVibrationActuatorLike {
  playEffect?: (
    type: string,
    params: {
      startDelay: number;
      duration: number;
      weakMagnitude: number;
      strongMagnitude: number;
    },
  ) => Promise<unknown> | void;
}

interface IBrowserGamepadWithHaptics extends IRawGamepadLike {
  readonly index: number;
  readonly vibrationActuator?: IVibrationActuatorLike | null;
}

const DISCONNECTED_STATUS: IGamepadStatus = {
  connected: false,
  name: '',
  brand: 'generic',
  supportsVibration: false,
};

const RUMBLE_COOLDOWN_MS = 180;

export class BrowserGamepadController implements IGamepadController {
  private callbacks: IGamepadStatusCallbacks | null = null;
  private status: IGamepadStatus = DISCONNECTED_STATUS;
  private activePadIndex: number | null = null;
  private prevButtons: readonly boolean[] = [];
  private wasAnalogActive = false;
  private lastRumbleMs = 0;

  private readonly handleConnected = (event: Event): void => {
    const pad = (event as GamepadEvent).gamepad as unknown as IBrowserGamepadWithHaptics | undefined;
    if (!pad) {
      this.syncConnectionStatus(true);
      return;
    }
    this.activePadIndex = pad.index;
    this.prevButtons = [];
    this.wasAnalogActive = false;
    this.emitStatus(this.buildStatus(pad), true);
  };

  private readonly handleDisconnected = (event: Event): void => {
    const pad = (event as GamepadEvent).gamepad as unknown as IBrowserGamepadWithHaptics | undefined;
    if (pad && this.activePadIndex === pad.index) {
      this.activePadIndex = null;
      this.prevButtons = [];
      this.wasAnalogActive = false;
    }
    this.syncConnectionStatus(false);
  };

  public attach(callbacks: IGamepadStatusCallbacks): void {
    this.callbacks = callbacks;
    window.addEventListener('gamepadconnected', this.handleConnected);
    window.addEventListener('gamepaddisconnected', this.handleDisconnected);
    this.syncConnectionStatus(false);
  }

  public detach(): void {
    window.removeEventListener('gamepadconnected', this.handleConnected);
    window.removeEventListener('gamepaddisconnected', this.handleDisconnected);
    this.callbacks = null;
  }

  public getStatus(): IGamepadStatus {
    return this.status;
  }

  public poll(): IGamepadSampleResult | null {
    const pad = this.findActiveGamepad();
    if (!pad) {
      if (this.status.connected) {
        this.activePadIndex = null;
        this.prevButtons = [];
        this.wasAnalogActive = false;
        this.emitStatus(DISCONNECTED_STATUS, false);
      }
      return null;
    }

    if (!this.status.connected || this.status.name !== pad.id) {
      this.activePadIndex = pad.index;
      this.emitStatus(this.buildStatus(pad), !this.status.connected);
    }

    const sampled = sampleGamepadState(pad, this.prevButtons, this.wasAnalogActive, GAMEPAD_DEADZONE);
    this.prevButtons = sampled.nextButtons;
    this.wasAnalogActive = sampled.analogActive;
    return sampled;
  }

  public triggerRumble(strongMagnitude: number, weakMagnitude: number, durationMs: number): void {
    const now = performance.now();
    if (now - this.lastRumbleMs < RUMBLE_COOLDOWN_MS) return;
    const actuator = this.findActiveGamepad()?.vibrationActuator;
    if (!actuator?.playEffect) return;
    this.lastRumbleMs = now;
    try {
      const result = actuator.playEffect('dual-rumble', {
        startDelay: 0,
        duration: Math.max(40, Math.min(450, Math.round(durationMs))),
        strongMagnitude: Math.max(0, Math.min(1, strongMagnitude)),
        weakMagnitude: Math.max(0, Math.min(1, weakMagnitude)),
      });
      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        void (result as Promise<unknown>).catch(() => undefined);
      }
    } catch {
      // Ignore unsupported vibration errors
    }
  }

  private syncConnectionStatus(allowConnectToast: boolean): void {
    const pad = this.findActiveGamepad();
    if (!pad) {
      if (this.status.connected) {
        this.emitStatus(DISCONNECTED_STATUS, false);
      }
      return;
    }
    this.activePadIndex = pad.index;
    const next = this.buildStatus(pad);
    const wasConnected = this.status.connected;
    this.emitStatus(next, allowConnectToast || !wasConnected);
  }

  private findActiveGamepad(): IBrowserGamepadWithHaptics | null {
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
      return null;
    }
    const pads = navigator.getGamepads();
    if (!pads) {
      return null;
    }
    if (this.activePadIndex !== null) {
      const preferred = pads[this.activePadIndex] as unknown as IBrowserGamepadWithHaptics | null;
      if (preferred && preferred.connected) {
        return preferred;
      }
    }
    for (let i = 0; i < pads.length; i += 1) {
      const pad = pads[i] as unknown as IBrowserGamepadWithHaptics | null;
      if (pad && pad.connected) {
        return pad;
      }
    }
    return null;
  }

  private buildStatus(pad: IBrowserGamepadWithHaptics): IGamepadStatus {
    return {
      connected: true,
      name: pad.id || 'Kontroler standardowy',
      brand: classifyGamepadBrand(pad.id || ''),
      supportsVibration: Boolean(pad.vibrationActuator?.playEffect),
    };
  }

  private emitStatus(next: IGamepadStatus, justConnected: boolean): void {
    this.status = next;
    this.callbacks?.onStatusChanged(next, justConnected);
  }
}
