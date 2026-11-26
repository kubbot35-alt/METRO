import * as THREE from 'three';
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

interface ISharedStationMats extends IHallMaterials, IStationFurnitureMaterials {}

export function buildMetroStations(
  scene: THREE.Scene,
  stations: readonly IStationSpec[],
  maxAnisotropy: number,
  lineSpec?: Pick<IMetroLineSpec, 'id' | 'destinationLed' | 'oppositeDestinationLed' | 'cssColor'>,
): ISceneResources {
  const disposables: Array<{ dispose(): void }> = [];
  const root = new THREE.Group();
  root.name = 'MetroStationsGroup';
  scene.add(root);

  const lineId = lineSpec?.id ?? 'M1';
  const destLed = lineSpec?.destinationLed ?? 'MŁOCINY';
  const oppDestLed = lineSpec?.oppositeDestinationLed ?? (lineId === 'M2' ? 'BEMOWO' : 'KABATY');
  const lineCss = lineSpec?.cssColor ?? '#2563eb';

  const platformTex = createPlatformTileTexture(maxAnisotropy);
  const stopTex = createStopMarkerTexture(maxAnisotropy);
  const clockTexPlayer = createPlatformClockTexture(lineId, destLed, lineCss, maxAnisotropy);
  const clockTexOpp = createPlatformClockTexture(lineId, oppDestLed, lineCss, maxAnisotropy);
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

  stations.forEach((station) => {
    const stationGroup = createSingleStation(station, lineId, sharedMats, maxAnisotropy, disposables);
    root.add(stationGroup);
  });

  return {
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
  lineId: 'M1' | 'M2',
  mats: ISharedStationMats,
  maxAnisotropy: number,
  disposables: Array<{ dispose(): void }>,
): THREE.Group {
  const group = new THREE.Group();
  const hallLength = station.platformLengthM + 18;
  const centerZ = -(station.distanceM - 36);
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

  buildStationHallShell(
    group,
    station,
    layout,
    centerZ,
    hallLength,
    wallMat,
    accentGlowMat,
    signMat,
    mats,
    disposables,
  );
  addPlatformFurniture(group, station, layout, centerZ, mats, disposables);
  return group;
}
