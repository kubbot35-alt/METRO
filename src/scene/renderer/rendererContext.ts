import * as THREE from 'three';
import type { CabControlId, ICabHoverTooltip } from '../../domain/cabControlsCatalog';
import { LINE_M1_STATIONS, METRO_LINE_M1 } from '../../domain/routeData';
import { DEFAULT_GAME_SETTINGS } from '../../domain/settingsService';
import { getLineTrackAlignment, type TrackAlignment } from '../../domain/trackAlignment';
import type {
  CctvPreviewChannel,
  DoorSide,
  IGameSettings,
  ISimulationSnapshot,
  TimeOfDayId,
  TrainModelId,
} from '../../domain/types';
import type { IAdTexturePool } from '../adTexturePool';
import type { ICabRig } from '../cabBuilder';
import type { ILiveMirrorSystem } from '../liveMirrorSystem';
import type { INightCrewRig } from '../nightCrewBuilder';
import type { IPassengerInteriorRig } from '../passengerInteriorBuilder';
import type { IPassengerRig } from '../passengerManager';
import type { IRainSystemRig } from '../rainSystemBuilder';
import type { ISemaphoreRig } from '../semaphoreBuilder';
import type { IMetroStationsRig } from '../stationBuilder';
import type { ISurfaceDepotRig } from '../surfaceDepotBuilder';
import type { ITrackworkRig } from '../trackworkBuilder';
import type { ITrainConsistRig } from '../trainMeshBuilder';
import type { IMetroTunnelRig } from '../tunnelBuilder';
import type { ITunnelEffectsRig } from '../tunnelEffectsBuilder';
import type { ITurnaroundSidingRig } from '../turnaroundSidingBuilder';
import type { ISceneResources } from '../types';

export interface ISceneRendererContext {
  readonly isSoftwareGl: boolean;
  renderer: THREE.WebGLRenderer | null;
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  headlight: THREE.SpotLight | null;
  headlightTarget: THREE.Object3D | null;
  hemiLight: THREE.HemisphereLight | null;
  sunLight: THREE.DirectionalLight | null;
  stationLightA: THREE.PointLight | null;
  stationLightB: THREE.PointLight | null;
  signalLight: THREE.PointLight | null;
  oncomingLight: THREE.PointLight | null;
  cabFillLight: THREE.PointLight | null;
  cabRig: ICabRig | null;
  playerTrainRig: ITrainConsistRig | null;
  passengerInteriorRig: IPassengerInteriorRig | null;
  oncomingTrainRig: ITrainConsistRig | null;
  leadingTrainRig: ITrainConsistRig | null;
  semaphoreRig: ISemaphoreRig | null;
  passengerRig: IPassengerRig | null;
  trackworkRig: ITrackworkRig | null;
  surfaceDepotRig: ISurfaceDepotRig | null;
  tunnelRig: IMetroTunnelRig | null;
  stationsRig: IMetroStationsRig | null;
  rainRig: IRainSystemRig | null;
  tunnelEffectsRig: ITunnelEffectsRig | null;
  nightCrewRig: INightCrewRig | null;
  turnaroundSidingRig: ITurnaroundSidingRig | null;
  adTexturePool: IAdTexturePool | null;
  liveMirrorSystem: ILiveMirrorSystem | null;
  interiorSideBlend: number;
  freeLookYawRad: number;
  freeLookPitchRad: number;
  lastSeatSpotSig: string | null;
  onCctvMonitorClick: ((side: DoorSide) => void) | null;
  onCabControlHover: ((tooltip: ICabHoverTooltip | null) => void) | null;
  onCabControlClick: ((controlId: CabControlId) => void) | null;
  pipOpen: boolean;
  pipChannel: CctvPreviewChannel;
  pipCanvas: HTMLCanvasElement | null;
  lastSnapshot: ISimulationSnapshot | null;
  lastDtSec: number;
  usingLiveMirrorTextures: boolean | null;
  settings: IGameSettings;
  passengerDensity: number;
  fogDensityScale: number;
  alignment: TrackAlignment;
  worldResources: ISceneResources[];
  envTexture: THREE.Texture | null;
  container: HTMLElement | null;
  resizeObserver: ResizeObserver | null;
  maxAniso: number;
  appliedLineSignature: string | null;
  appliedModelSignature: string | null;
  appliedOncomingModelId: TrainModelId | null;
  appliedLeadingModelId: TrainModelId | null;
  appliedTimeOfDayId: TimeOfDayId | null;
}

export function createRendererContext(isSoftwareGl: boolean): ISceneRendererContext {
  return {
    isSoftwareGl,
    renderer: null, scene: null, camera: null, headlight: null, headlightTarget: null,
    hemiLight: null, sunLight: null, stationLightA: null, stationLightB: null,
    signalLight: null, oncomingLight: null, cabFillLight: null, cabRig: null,
    playerTrainRig: null, passengerInteriorRig: null, oncomingTrainRig: null, leadingTrainRig: null,
    semaphoreRig: null, passengerRig: null, trackworkRig: null, surfaceDepotRig: null,
    tunnelRig: null, stationsRig: null, rainRig: null, tunnelEffectsRig: null,
    nightCrewRig: null, turnaroundSidingRig: null, adTexturePool: null, liveMirrorSystem: null,
    interiorSideBlend: 1, freeLookYawRad: 0, freeLookPitchRad: 0, lastSeatSpotSig: null,
    onCctvMonitorClick: null, onCabControlHover: null, onCabControlClick: null, pipOpen: false, pipChannel: 'auto',
    pipCanvas: null, lastSnapshot: null, lastDtSec: 0.016, usingLiveMirrorTextures: null,
    settings: DEFAULT_GAME_SETTINGS, passengerDensity: 1.0, fogDensityScale: 1.0,
    alignment: getLineTrackAlignment(METRO_LINE_M1.id, LINE_M1_STATIONS),
    worldResources: [], envTexture: null, container: null, resizeObserver: null,
    maxAniso: 4, appliedLineSignature: null, appliedModelSignature: null,
    appliedOncomingModelId: null, appliedLeadingModelId: null, appliedTimeOfDayId: null,
  };
}

export function disposeLineWorldRigs(ctx: ISceneRendererContext): void {
  ctx.worldResources.forEach((res) => res.dispose());
  ctx.worldResources = [];
  ctx.tunnelRig?.dispose();
  ctx.stationsRig?.dispose();
  ctx.surfaceDepotRig?.dispose();
  ctx.turnaroundSidingRig?.dispose();
  ctx.passengerRig?.dispose();
  ctx.semaphoreRig?.dispose();
}

export function disposeAllRendererResources(ctx: ISceneRendererContext): void {
  disposeLineWorldRigs(ctx);
  ctx.adTexturePool?.dispose();
  ctx.rainRig?.dispose();
  ctx.tunnelEffectsRig?.dispose();
  ctx.nightCrewRig?.dispose();
  ctx.liveMirrorSystem?.dispose();
  ctx.playerTrainRig?.dispose();
  ctx.passengerInteriorRig?.dispose();
  ctx.oncomingTrainRig?.dispose();
  ctx.leadingTrainRig?.dispose();
  ctx.trackworkRig?.dispose();
  ctx.cabRig?.dispose();
  ctx.envTexture?.dispose();
}
