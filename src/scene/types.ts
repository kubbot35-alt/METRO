import type { CabControlId, ICabHoverTooltip } from '../domain/cabControlsCatalog';
import type {
  CctvPreviewChannel,
  DoorSide,
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
  setCctvPreviewState?(
    open: boolean,
    channel: CctvPreviewChannel,
    canvas: HTMLCanvasElement | null,
  ): void;
  setOnCctvMonitorClick?(callback: ((side: DoorSide) => void) | null): void;
  setOnCabControlHover?(callback: ((tooltip: ICabHoverTooltip | null) => void) | null): void;
  setOnCabControlClick?(callback: ((controlId: CabControlId) => void) | null): void;
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
