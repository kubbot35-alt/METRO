import * as THREE from 'three';
import type { IStationFurnitureMaterials } from './stationFurnitureBuilder';
import type { IHallMaterials } from './stationHallBuilder';

export interface ISharedStationMats extends IHallMaterials, IStationFurnitureMaterials {}

export function createSharedStationMaterials(
  platformTex: THREE.CanvasTexture,
  stopTex: THREE.CanvasTexture,
  clockTexPlayer: THREE.CanvasTexture,
  clockTexOpp: THREE.CanvasTexture,
  liveClockTex: THREE.CanvasTexture,
): ISharedStationMats {
  return {
    ...createStructureAndLightingMaterials(platformTex, stopTex),
    ...createFurnitureAndClockMaterials(clockTexPlayer, clockTexOpp, liveClockTex),
  };
}

function createStructureAndLightingMaterials(platformTex: THREE.CanvasTexture, stopTex: THREE.CanvasTexture) {
  return {
    platform: new THREE.MeshStandardMaterial({ map: platformTex, roughness: 0.72, metalness: 0.08 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x242b36, roughness: 0.8, metalness: 0.15 }),
    column: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.65 }),
    portalConcrete: new THREE.MeshStandardMaterial({ color: 0x1a202a, roughness: 0.9, metalness: 0.08 }),
    lightStrip: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xe0f2fe, emissiveIntensity: 2.6, roughness: 0.15 }),
    emergencyLamp: new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xf59e0b, emissiveIntensity: 1.55, roughness: 0.25 }),
    yellowBeacon: new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 3.6, roughness: 0.2 }),
    yellowBeaconHalo: new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
    stopStrip: new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 1.9, roughness: 0.3 }),
    stopBoard: new THREE.MeshStandardMaterial({ map: stopTex, emissiveMap: stopTex, emissive: 0xffffff, emissiveIntensity: 1.15, roughness: 0.22 }),
  };
}

function createFurnitureAndClockMaterials(
  clockTexPlayer: THREE.CanvasTexture,
  clockTexOpp: THREE.CanvasTexture,
  liveClockTex: THREE.CanvasTexture,
) {
  return {
    benchWood: new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.76, metalness: 0.05 }),
    benchMetal: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.75 }),
    safetyYellow: new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xca8a04, emissiveIntensity: 0.35, roughness: 0.55 }),
    binBody: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.48, metalness: 0.65 }),
    binRim: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.28, metalness: 0.85 }),
    clockFrame: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.6 }),
    clockScreenPlayer: new THREE.MeshStandardMaterial({ map: clockTexPlayer, emissiveMap: clockTexPlayer, emissive: 0xffffff, emissiveIntensity: 1.05, roughness: 0.4 }),
    clockScreenOpposite: new THREE.MeshStandardMaterial({ map: clockTexOpp, emissiveMap: clockTexOpp, emissive: 0xffffff, emissiveIntensity: 1.05, roughness: 0.4 }),
    liveDigitalClock: new THREE.MeshStandardMaterial({ map: liveClockTex, emissiveMap: liveClockTex, emissive: 0xffffff, emissiveIntensity: 1.25, roughness: 0.32 }),
    escalatorMetal: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.36, metalness: 0.78 }),
    escalatorStep: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55, metalness: 0.58 }),
    escalatorGlass: new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.14, metalness: 0.2, transparent: true, opacity: 0.45 }),
    handrailBlack: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.15 }),
    exitGlow: new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x10b981, emissiveIntensity: 1.8, roughness: 0.25 }),
  };
}
