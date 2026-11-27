import * as THREE from 'three';
import { DEFAULT_SCENE_CULL_RANGE_M, isWithinCullingRange } from '../domain/routeVariant';
import type { TrackAlignment } from '../domain/trackAlignment';
import { getStationPlatformLayout } from '../domain/trackGeometry';
import type { IMetroLineSpec, IStationSpec } from '../domain/types';
import {
  createPlatformClockTexture,
  createPlatformTileTexture,
  createStationSignTexture,
  createStationWallTexture,
  createStopMarkerTexture,
} from './proceduralTextures';
import {
  addPlatformFurniture,
  type IStationFurnitureMaterials,
} from './stationFurnitureBuilder';
import { buildStationHallShell, type IHallMaterials } from './stationHallBuilder';
import type { ISceneResources } from './types';

export interface IMetroStationsRig extends ISceneResources {
  setNightServiceMode(active: boolean, dtSec: number): void;
  updateCulling(playerPosM: number, cullRangeM?: number): number;
}

interface IStationEntry {
  readonly distanceM: number;
  readonly group: THREE.Group;
  visible: boolean;
}

interface ISharedStationMats extends IHallMaterials, IStationFurnitureMaterials {}

export function buildMetroStations(
  scene: THREE.Scene,
  alignment: TrackAlignment,
  stations: readonly IStationSpec[],
  maxAnisotropy: number,
  lineSpec?: Pick<IMetroLineSpec, 'id' | 'badgeCode' | 'destinationLed' | 'oppositeDestinationLed' | 'cssColor'>,
): IMetroStationsRig {
  const disposables: Array<{ dispose(): void }> = [];
  const root = new THREE.Group();
  root.name = 'MetroStationsGroup';
  scene.add(root);

  const lineBadge = lineSpec?.badgeCode ?? lineSpec?.id ?? 'M1';
  const destLed = lineSpec?.destinationLed ?? 'MŁOCINY';
  const oppDestLed = lineSpec?.oppositeDestinationLed ?? (lineBadge === 'M2' ? 'BEMOWO' : 'KABATY');
  const lineCss = lineSpec?.cssColor ?? '#2563eb';

  const platformTex = createPlatformTileTexture(maxAnisotropy);
  const stopTex = createStopMarkerTexture(maxAnisotropy);
  const clockTexPlayer = createPlatformClockTexture(lineBadge, destLed, lineCss, maxAnisotropy);
  const clockTexOpp = createPlatformClockTexture(lineBadge, oppDestLed, lineCss, maxAnisotropy);
  const sharedMats = createSharedStationMaterials(
    platformTex,
    stopTex,
    clockTexPlayer,
    clockTexOpp,
  );
  disposables.push(
    platformTex,
    stopTex,
    clockTexPlayer,
    clockTexOpp,
    ...Object.values(sharedMats),
  );

  const stationEntries: IStationEntry[] = [];
  const nightGroups: THREE.Group[] = [];
  const accentGlowMats: THREE.MeshStandardMaterial[] = [];
  const signMats: THREE.MeshStandardMaterial[] = [];

  stations.forEach((station) => {
    const built = createSingleStation(station, alignment, lineBadge, sharedMats, maxAnisotropy, disposables);
    root.add(built.group);
    stationEntries.push({ distanceM: station.distanceM, group: built.group, visible: true });
    nightGroups.push(built.nightGroup);
    accentGlowMats.push(built.accentGlowMat);
    signMats.push(built.signMat);
  });

  let nightClock = 0;
  let lastNightActive = false;

  return {
    setNightServiceMode: (active, dtSec) => {
      if (active !== lastNightActive) {
        lastNightActive = active;
        sharedMats.lightStrip.color.setHex(active ? 0x1e293b : 0xffffff);
        sharedMats.lightStrip.emissive.setHex(active ? 0x0f172a : 0xe0f2fe);
        sharedMats.lightStrip.emissiveIntensity = active ? 0.04 : 2.6;
        sharedMats.clockScreenPlayer.emissiveIntensity = active ? 0.14 : 1.05;
        sharedMats.clockScreenOpposite.emissiveIntensity = active ? 0.14 : 1.05;
        sharedMats.stopStrip.emissiveIntensity = active ? 0.45 : 1.9;
        sharedMats.stopBoard.emissiveIntensity = active ? 0.35 : 0.9;
        accentGlowMats.forEach((m) => {
          m.emissiveIntensity = active ? 0.16 : 1.15;
        });
        signMats.forEach((m) => {
          m.emissiveIntensity = active ? 0.24 : 0.82;
        });
        nightGroups.forEach((ng) => {
          ng.visible = active;
        });
      }
      if (active) {
        nightClock += Math.max(0, Math.min(dtSec, 0.1));
        const pulse = Math.sin(nightClock * 8.5) > -0.1 ? 1 : 0.15;
        sharedMats.yellowBeacon.emissiveIntensity = 0.35 + pulse * 3.8;
        sharedMats.yellowBeaconHalo.opacity = 0.12 + pulse * 0.42;
      }
    },
    updateCulling: (playerPosM, cullRangeM = DEFAULT_SCENE_CULL_RANGE_M) => {
      let visibleCount = 0;
      for (let i = 0; i < stationEntries.length; i += 1) {
        const entry = stationEntries[i];
        const nextVis = isWithinCullingRange(entry.distanceM, playerPosM, cullRangeM);
        if (entry.visible !== nextVis) {
          entry.visible = nextVis;
          entry.group.visible = nextVis;
        }
        if (nextVis) {
          visibleCount += 1;
        }
      }
      return visibleCount;
    },
    dispose: () => {
      scene.remove(root);
      disposables.forEach((d) => d.dispose());
    },
  };
}

function createSharedStationMaterials(
  platformTex: THREE.CanvasTexture,
  stopTex: THREE.CanvasTexture,
  clockTexPlayer: THREE.CanvasTexture,
  clockTexOpp: THREE.CanvasTexture,
): ISharedStationMats {
  return {
    platform: new THREE.MeshStandardMaterial({ map: platformTex, roughness: 0.72, metalness: 0.08 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x242b36, roughness: 0.8, metalness: 0.15 }),
    column: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.65 }),
    portalConcrete: new THREE.MeshStandardMaterial({ color: 0x1a202a, roughness: 0.9, metalness: 0.08 }),
    lightStrip: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xe0f2fe,
      emissiveIntensity: 2.6,
      roughness: 0.15,
    }),
    emergencyLamp: new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.55,
      roughness: 0.25,
    }),
    yellowBeacon: new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xf59e0b,
      emissiveIntensity: 3.6,
      roughness: 0.2,
    }),
    yellowBeaconHalo: new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
    stopStrip: new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 1.9,
      roughness: 0.3,
    }),
    stopBoard: new THREE.MeshStandardMaterial({
      map: stopTex,
      emissiveMap: stopTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.9,
      roughness: 0.25,
    }),
    benchWood: new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.76, metalness: 0.05 }),
    benchMetal: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.75 }),
    safetyYellow: new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xca8a04,
      emissiveIntensity: 0.35,
      roughness: 0.55,
    }),
    binBody: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.48, metalness: 0.65 }),
    binRim: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.28, metalness: 0.85 }),
    clockFrame: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.6 }),
    clockScreenPlayer: new THREE.MeshStandardMaterial({
      map: clockTexPlayer,
      emissiveMap: clockTexPlayer,
      emissive: 0xffffff,
      emissiveIntensity: 1.05,
      roughness: 0.4,
    }),
    clockScreenOpposite: new THREE.MeshStandardMaterial({
      map: clockTexOpp,
      emissiveMap: clockTexOpp,
      emissive: 0xffffff,
      emissiveIntensity: 1.05,
      roughness: 0.4,
    }),
    escalatorMetal: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.36, metalness: 0.78 }),
    escalatorStep: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55, metalness: 0.58 }),
    escalatorGlass: new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      roughness: 0.14,
      metalness: 0.2,
      transparent: true,
      opacity: 0.45,
    }),
    handrailBlack: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.15 }),
    exitGlow: new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 1.8,
      roughness: 0.25,
    }),
  };
}

function createSingleStation(
  station: IStationSpec,
  alignment: TrackAlignment,
  lineId: string,
  mats: ISharedStationMats,
  maxAnisotropy: number,
  disposables: Array<{ dispose(): void }>,
): {
  readonly group: THREE.Group;
  readonly nightGroup: THREE.Group;
  readonly accentGlowMat: THREE.MeshStandardMaterial;
  readonly signMat: THREE.MeshStandardMaterial;
} {
  const group = new THREE.Group();
  const frame = alignment.sample(station.distanceM);
  group.position.set(frame.x, frame.y, frame.z);
  group.rotation.set(0, frame.yaw, 0);

  // Build station geometry in local straight/level frame with stop point at local z = 0
  const localStation: IStationSpec = { ...station, distanceM: 0 };
  const hallLength = station.platformLengthM + 18;
  const centerZ = 36;
  const layout = getStationPlatformLayout(station);

  const wallTex = createStationWallTexture(station.accentHex, maxAnisotropy, station.wallBaseHex);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.58, metalness: 0.14 });
  const signTex = createStationSignTexture(station.name, station.code, station.accentHex, maxAnisotropy, lineId);
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex,
    emissiveMap: signTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.82,
    roughness: 0.35,
  });
  const accentGlowMat = new THREE.MeshStandardMaterial({
    color: station.accentHex,
    emissive: station.accentHex,
    emissiveIntensity: 1.15,
    roughness: 0.28,
  });
  disposables.push(wallTex, wallMat, signTex, signMat, accentGlowMat);

  const nightGroup = buildStationHallShell(
    group,
    localStation,
    layout,
    centerZ,
    hallLength,
    wallMat,
    accentGlowMat,
    signMat,
    mats,
    disposables,
  );
  addPlatformFurniture(group, localStation, layout, centerZ, mats, disposables);
  return { group, nightGroup, accentGlowMat, signMat };
}
