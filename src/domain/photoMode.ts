import type {
  IPhotoCameraState,
  IPhotoFilterSpec,
  IPhotoMoveInput,
  PhotoFilterId,
} from './types';

export interface IPhotoCameraController {
  getState(): IPhotoCameraState;
  initializeFromPose(
    x: number,
    y: number,
    z: number,
    yaw: number,
    pitch: number,
    fovDeg?: number,
  ): IPhotoCameraState;
  resetToInitial(): IPhotoCameraState;
  stepMovement(input: IPhotoMoveInput, dtSec: number): IPhotoCameraState;
  applyLookDelta(deltaX: number, deltaY: number): IPhotoCameraState;
  applyWheelZoom(deltaY: number): IPhotoCameraState;
  setFov(fovDeg: number): IPhotoCameraState;
  setTilt(rollDeg: number): IPhotoCameraState;
  setFilter(filter: PhotoFilterId): IPhotoCameraState;
}

export const MIN_PHOTO_FOV_DEG = 30;
export const MAX_PHOTO_FOV_DEG = 100;
export const DEFAULT_PHOTO_FOV_DEG = 62;
export const MIN_PHOTO_TILT_DEG = -25;
export const MAX_PHOTO_TILT_DEG = 25;

export const PHOTO_FILTERS: readonly IPhotoFilterSpec[] = [
  {
    id: 'normal',
    label: 'Normalny',
    shortDesc: 'Naturalne barwy 3D',
    cssFilter: 'none',
  },
  {
    id: 'cinematic',
    label: 'Kinowy',
    shortDesc: 'Wysoki kontrast i głębia',
    cssFilter: 'contrast(1.26) saturate(1.18) brightness(0.95)',
  },
  {
    id: 'vhs',
    label: 'Retro VHS',
    shortDesc: 'Ciepły filtr pod Serię 81',
    cssFilter: 'sepia(0.36) contrast(1.14) saturate(1.3) hue-rotate(-8deg) brightness(1.02)',
  },
  {
    id: 'noir',
    label: 'Noir',
    shortDesc: 'Kontrastowa czerń i biel',
    cssFilter: 'grayscale(1) contrast(1.32) brightness(0.96)',
  },
];

export function getPhotoFilterSpec(id: PhotoFilterId): IPhotoFilterSpec {
  return PHOTO_FILTERS.find((f) => f.id === id) ?? PHOTO_FILTERS[0];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createDefaultPhotoCameraState(): IPhotoCameraState {
  return {
    x: 5.5,
    y: 3.1,
    z: -9.0,
    yaw: 0.55,
    pitch: -0.1,
    rollDeg: 0,
    fovDeg: DEFAULT_PHOTO_FOV_DEG,
    filter: 'normal',
  };
}

function computeCameraMoveDelta(
  input: IPhotoMoveInput,
  yaw: number,
  pitch: number,
): readonly [number, number, number] {
  const fwdInput = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
  const rightInput = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const upInput = (input.up ? 1 : 0) - (input.down ? 1 : 0);
  if (fwdInput === 0 && rightInput === 0 && upInput === 0) return [0, 0, 0];
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const cosP = Math.cos(pitch);
  const moveX = -sinY * cosP * fwdInput + cosY * rightInput;
  const moveY = Math.sin(pitch) * fwdInput + upInput;
  const moveZ = -cosY * cosP * fwdInput - sinY * rightInput;
  const len = Math.hypot(moveX, moveY, moveZ);
  return len > 1e-4 ? [moveX / len, moveY / len, moveZ / len] : [0, 0, 0];
}

export class PhotoCameraController implements IPhotoCameraController {
  private state: IPhotoCameraState = createDefaultPhotoCameraState();
  private initialPose: IPhotoCameraState = this.state;

  public getState(): IPhotoCameraState {
    return this.state;
  }

  public initializeFromPose(
    x: number,
    y: number,
    z: number,
    yaw: number,
    pitch: number,
    fovDeg = DEFAULT_PHOTO_FOV_DEG,
  ): IPhotoCameraState {
    const next: IPhotoCameraState = {
      x,
      y,
      z,
      yaw,
      pitch: clamp(pitch, -1.4, 1.4),
      rollDeg: 0,
      fovDeg: clamp(Math.round(fovDeg), MIN_PHOTO_FOV_DEG, MAX_PHOTO_FOV_DEG),
      filter: this.state.filter,
    };
    this.state = next;
    this.initialPose = next;
    return next;
  }

  public resetToInitial(): IPhotoCameraState {
    this.state = { ...this.initialPose };
    return this.state;
  }

  public stepMovement(input: IPhotoMoveInput, dtSec: number): IPhotoCameraState {
    const [dx, dy, dz] = computeCameraMoveDelta(input, this.state.yaw, this.state.pitch);
    if (dx === 0 && dy === 0 && dz === 0) return this.state;
    const stepM = (input.boost ? 22 : 9.5) * clamp(dtSec, 0, 0.1);
    this.state = {
      ...this.state,
      x: this.state.x + dx * stepM,
      y: clamp(this.state.y + dy * stepM, 0.35, 36),
      z: this.state.z + dz * stepM,
    };
    return this.state;
  }

  public applyLookDelta(deltaX: number, deltaY: number): IPhotoCameraState {
    const sensitivity = 0.0042;
    this.state = {
      ...this.state,
      yaw: this.state.yaw - deltaX * sensitivity,
      pitch: clamp(this.state.pitch - deltaY * sensitivity, -1.4, 1.4),
    };
    return this.state;
  }

  public applyWheelZoom(deltaY: number): IPhotoCameraState {
    const step = deltaY > 0 ? 3 : -3;
    return this.setFov(this.state.fovDeg + step);
  }

  public setFov(fovDeg: number): IPhotoCameraState {
    const clamped = clamp(Math.round(fovDeg), MIN_PHOTO_FOV_DEG, MAX_PHOTO_FOV_DEG);
    this.state = { ...this.state, fovDeg: clamped };
    return this.state;
  }

  public setTilt(rollDeg: number): IPhotoCameraState {
    const clamped = clamp(Math.round(rollDeg), MIN_PHOTO_TILT_DEG, MAX_PHOTO_TILT_DEG);
    this.state = { ...this.state, rollDeg: clamped };
    return this.state;
  }

  public setFilter(filter: PhotoFilterId): IPhotoCameraState {
    this.state = { ...this.state, filter };
    return this.state;
  }
}
