import * as THREE from 'three';
import { DEFAULT_SCENE_CULL_RANGE_M, isWithinCullingRange } from '../domain/routeVariant';
import type { TrackAlignment } from '../domain/trackAlignment';
import { getStationPlatformLayout } from '../domain/trackGeometry';
import type { IMetroLineSpec, IStationSpec } from '../domain/types';
import type { IAdTexturePool } from './adTexturePool';
import { createPlatformClockTexture, createPlatformTileTexture, createStationSignTexture, createStationWallTexture, createStopMarkerTexture } from './proceduralTextures';
import { addStationAdvertisements, createStationAdsContext } from './stationAdsBuilder';
import { addPlatformFurniture } from './stationFurnitureBuilder';
import { buildStationHallShell } from './stationHallBuilder';
import { createSharedStationMaterials, type ISharedStationMats } from './stationMaterials';
import { LivePlatformClockDisplay, type ILivePlatformClock } from './textures/platformClockDisplay';
import type { ISceneResources } from './types';

export interface IMetroStationsRig extends ISceneResources {
  setNightServiceMode(active: boolean, dtSec: number): void;
  updateClock(clockSec: number): void;
  updateCulling(playerPosM: number, cullRangeM?: number): number;
}

interface IStationEntry { readonly distanceM: number; readonly group: THREE.Group; visible: boolean; }

export function buildMetroStations(
  scene: THREE.Scene,
  alignment: TrackAlignment,
  stations: readonly IStationSpec[],
  maxAnisotropy: number,
  lineSpec?: Pick<IMetroLineSpec, 'id' | 'badgeCode' | 'destinationLed' | 'oppositeDestinationLed' | 'cssColor'>,
  adPool?: IAdTexturePool,
): IMetroStationsRig {
  const disposables: Array<{ dispose(): void }> = [];
  const root = new THREE.Group();
  root.name = 'MetroStationsGroup';
  scene.add(root);
  const lineBadge = lineSpec?.badgeCode ?? lineSpec?.id ?? 'M1';
  const liveClock = new LivePlatformClockDisplay(maxAnisotropy);
  const sharedMats = initSharedAssets(lineSpec, lineBadge, maxAnisotropy, liveClock, disposables);
  const adsCtx = createStationAdsContext();
  disposables.push(...adsCtx.resources.geometries, ...adsCtx.resources.materials);
  const built = buildStationEntries(root, stations, alignment, lineBadge, sharedMats, maxAnisotropy, disposables, adPool, adsCtx.ctx);
  return new MetroStationsRig(scene, root, disposables, sharedMats, liveClock, built.stationEntries, built.nightGroups, built.accentGlowMats, built.signMats);
}

function buildStationEntries(
  root: THREE.Group, stations: readonly IStationSpec[], alignment: TrackAlignment, lineBadge: string, sharedMats: ISharedStationMats,
  maxAnisotropy: number, disposables: Array<{ dispose(): void }>, adPool: IAdTexturePool | undefined, adsCtx: ReturnType<typeof createStationAdsContext>['ctx'],
) {
  const stationEntries: IStationEntry[] = [];
  const nightGroups: THREE.Group[] = [];
  const accentGlowMats: THREE.MeshStandardMaterial[] = [];
  const signMats: THREE.MeshStandardMaterial[] = [];
  stations.forEach((station, idx) => {
    const built = createSingleStation(station, alignment, lineBadge, sharedMats, maxAnisotropy, disposables);
    if (adPool) addStationAdvertisements(built.group, station, idx, adPool, adsCtx);
    root.add(built.group);
    stationEntries.push({ distanceM: station.distanceM, group: built.group, visible: true });
    nightGroups.push(built.nightGroup);
    accentGlowMats.push(built.accentGlowMat);
    signMats.push(built.signMat);
  });
  return { stationEntries, nightGroups, accentGlowMats, signMats };
}

function initSharedAssets(
  lineSpec: Pick<IMetroLineSpec, 'id' | 'badgeCode' | 'destinationLed' | 'oppositeDestinationLed' | 'cssColor'> | undefined,
  lineBadge: string, maxAnisotropy: number, liveClock: ILivePlatformClock, disposables: Array<{ dispose(): void }>,
): ISharedStationMats {
  const destLed = lineSpec?.destinationLed ?? 'MŁOCINY';
  const oppDestLed = lineSpec?.oppositeDestinationLed ?? (lineBadge === 'M2' ? 'BEMOWO' : 'KABATY');
  const lineCss = lineSpec?.cssColor ?? '#2563eb';
  const platformTex = createPlatformTileTexture(maxAnisotropy);
  const stopTex = createStopMarkerTexture(maxAnisotropy);
  const clockTexPlayer = createPlatformClockTexture(lineBadge, destLed, lineCss, maxAnisotropy);
  const clockTexOpp = createPlatformClockTexture(lineBadge, oppDestLed, lineCss, maxAnisotropy);
  const sharedMats = createSharedStationMaterials(platformTex, stopTex, clockTexPlayer, clockTexOpp, liveClock.texture);
  disposables.push(platformTex, stopTex, clockTexPlayer, clockTexOpp, liveClock, ...Object.values(sharedMats));
  return sharedMats;
}

class MetroStationsRig implements IMetroStationsRig {
  private nightClock = 0;
  private lastNightActive = false;

  public constructor(
    private readonly scene: THREE.Scene,
    private readonly root: THREE.Group,
    private readonly disposables: Array<{ dispose(): void }>,
    private readonly sharedMats: ISharedStationMats,
    private readonly liveClock: ILivePlatformClock,
    private readonly stationEntries: readonly IStationEntry[],
    private readonly nightGroups: readonly THREE.Group[],
    private readonly accentGlowMats: readonly THREE.MeshStandardMaterial[],
    private readonly signMats: readonly THREE.MeshStandardMaterial[],
  ) {}

  public setNightServiceMode(active: boolean, dtSec: number): void {
    if (active !== this.lastNightActive) {
      this.lastNightActive = active;
      applyStationNightLighting(active, this.sharedMats, this.accentGlowMats, this.signMats, this.nightGroups);
    }
    if (active) {
      this.nightClock += Math.max(0, Math.min(dtSec, 0.1));
      const pulse = Math.sin(this.nightClock * 8.5) > -0.1 ? 1 : 0.15;
      this.sharedMats.yellowBeacon.emissiveIntensity = 0.35 + pulse * 3.8;
      this.sharedMats.yellowBeaconHalo.opacity = 0.12 + pulse * 0.42;
    }
  }

  public updateClock(clockSec: number): void {
    this.liveClock.update(clockSec);
  }

  public updateCulling(playerPosM: number, cullRangeM = DEFAULT_SCENE_CULL_RANGE_M): number {
    return updateStationCulling(this.stationEntries, playerPosM, cullRangeM);
  }

  public dispose(): void { this.scene.remove(this.root); this.disposables.forEach((d) => d.dispose()); }
}

function applyStationNightLighting(
  active: boolean,
  sharedMats: ISharedStationMats,
  accentGlowMats: readonly THREE.MeshStandardMaterial[],
  signMats: readonly THREE.MeshStandardMaterial[],
  nightGroups: readonly THREE.Group[],
): void {
  sharedMats.lightStrip.color.setHex(active ? 0x1e293b : 0xffffff);
  sharedMats.lightStrip.emissive.setHex(active ? 0x0f172a : 0xe0f2fe);
  sharedMats.lightStrip.emissiveIntensity = active ? 0.04 : 2.6;
  sharedMats.clockScreenPlayer.emissiveIntensity = active ? 0.14 : 1.05;
  sharedMats.clockScreenOpposite.emissiveIntensity = active ? 0.14 : 1.05;
  sharedMats.liveDigitalClock.emissiveIntensity = active ? 0.55 : 1.25;
  sharedMats.stopStrip.emissiveIntensity = active ? 0.45 : 1.9;
  sharedMats.stopBoard.emissiveIntensity = active ? 0.65 : 1.15;
  accentGlowMats.forEach((m) => { m.emissiveIntensity = active ? 0.16 : 1.15; });
  signMats.forEach((m) => { m.emissiveIntensity = active ? 0.24 : 0.82; });
  nightGroups.forEach((ng) => { ng.visible = active; });
}

function updateStationCulling(stationEntries: readonly IStationEntry[], playerPosM: number, cullRangeM: number): number {
  let visibleCount = 0;
  for (let i = 0; i < stationEntries.length; i += 1) {
    const entry = stationEntries[i];
    const nextVis = isWithinCullingRange(entry.distanceM, playerPosM, cullRangeM);
    if (entry.visible !== nextVis) { entry.visible = nextVis; entry.group.visible = nextVis; }
    if (nextVis) visibleCount += 1;
  }
  return visibleCount;
}

function createSingleStation(
  station: IStationSpec,
  alignment: TrackAlignment,
  lineId: string,
  mats: ISharedStationMats,
  maxAnisotropy: number,
  disposables: Array<{ dispose(): void }>,
) {
  const group = new THREE.Group();
  const frame = alignment.sample(station.distanceM);
  group.position.set(frame.x, frame.y, frame.z);
  group.rotation.set(0, frame.yaw, 0);
  const localStation: IStationSpec = { ...station, distanceM: 0 };
  const layout = getStationPlatformLayout(station);
  const wallTex = createStationWallTexture(station.accentHex, maxAnisotropy, station.wallBaseHex);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.58, metalness: 0.14 });
  const signTex = createStationSignTexture(station.name, station.code, station.accentHex, maxAnisotropy, lineId);
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, emissiveMap: signTex, emissive: 0xffffff, emissiveIntensity: 0.82, roughness: 0.35 });
  const accentGlowMat = new THREE.MeshStandardMaterial({ color: station.accentHex, emissive: station.accentHex, emissiveIntensity: 1.15, roughness: 0.28 });
  disposables.push(wallTex, wallMat, signTex, signMat, accentGlowMat);
  const nightGroup = buildStationHallShell(group, localStation, layout, 36, station.platformLengthM + 18, wallMat, accentGlowMat, signMat, mats, disposables);
  addPlatformFurniture(group, localStation, layout, 36, mats, disposables);
  return { group, nightGroup, accentGlowMat, signMat };
}
