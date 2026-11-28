import * as THREE from 'three';

export interface IFreeLookAngles {
  readonly yawRad: number;
  readonly pitchRad: number;
}

export interface IFreeLookController {
  attach(element: HTMLElement): void;
  detach(): void;
  setEnabled(enabled: boolean): void;
  reset(): void;
  step(dtSec: number): IFreeLookAngles;
}

const MAX_YAW_RAD = Math.PI * 0.92;
const MAX_PITCH_RAD = 0.58;
const LOOK_SENSITIVITY = 0.0052;

export class PointerFreeLookController implements IFreeLookController {
  private element: HTMLElement | null = null;
  private enabled = false;
  private activePointerId: number | null = null;
  private lastX = 0;
  private lastY = 0;
  private targetYaw = 0;
  private targetPitch = 0;
  private currentYaw = 0;
  private currentPitch = 0;

  public attach(element: HTMLElement): void {
    this.detach();
    this.element = element;
    element.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerEnd);
    window.addEventListener('pointercancel', this.onPointerEnd);
  }

  public detach(): void {
    if (this.element) {
      this.element.removeEventListener('pointerdown', this.onPointerDown);
      this.element = null;
    }
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerEnd);
    window.removeEventListener('pointercancel', this.onPointerEnd);
    this.activePointerId = null;
  }

  public setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled) this.activePointerId = null;
  }

  public reset(): void {
    this.targetYaw = 0;
    this.targetPitch = 0;
    this.currentYaw = 0;
    this.currentPitch = 0;
  }

  public step(dtSec: number): IFreeLookAngles {
    const dt = Math.max(dtSec, 0.016);
    this.currentYaw = THREE.MathUtils.damp(this.currentYaw, this.targetYaw, 10, dt);
    this.currentPitch = THREE.MathUtils.damp(this.currentPitch, this.targetPitch, 10, dt);
    return { yawRad: this.currentYaw, pitchRad: this.currentPitch };
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.enabled || event.button !== 0) return;
    this.activePointerId = event.pointerId;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.enabled || this.activePointerId !== event.pointerId) return;
    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.targetYaw = THREE.MathUtils.clamp(this.targetYaw - dx * LOOK_SENSITIVITY, -MAX_YAW_RAD, MAX_YAW_RAD);
    this.targetPitch = THREE.MathUtils.clamp(this.targetPitch - dy * LOOK_SENSITIVITY, -MAX_PITCH_RAD, MAX_PITCH_RAD);
  };

  private readonly onPointerEnd = (event: PointerEvent): void => {
    if (this.activePointerId === event.pointerId) this.activePointerId = null;
  };
}
