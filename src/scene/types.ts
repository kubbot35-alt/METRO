import type {
  IGameSettings,
  IPhotoCameraState,
  ISimulationSnapshot,
  PhotoFilterId,
} from '../domain/types';

export interface IPhotoAnchorPose {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  readonly pitch: number;
  readonly fovDeg: number;
  readonly keepInteriorVisible: boolean;
}

export interface ISceneResources {
  dispose(): void;
}

export interface IMetroSceneRenderer {
  mount(container: HTMLElement): void;
  applySettings?(settings: IGameSettings): void;
  update(snapshot: ISimulationSnapshot, dtSec: number): void;
  getPhotoAnchorPose?(snapshot: ISimulationSnapshot): IPhotoAnchorPose | null;
  setPhotoModePose?(
    pose: IPhotoCameraState | null,
    snapshot: ISimulationSnapshot,
    keepInteriorVisible?: boolean,
  ): void;
  captureScreenshotPng?(filterId: PhotoFilterId): string | null;
  render(): void;
  isSoftwareRenderer(): boolean;
  scheduleNextFrame(callback: () => void): number;
  cancelScheduledFrame(handle: number): void;
  dispose(): void;
}
