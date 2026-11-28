import * as THREE from 'three';
import {
  INSPIRO_CAR_GAP,
  INSPIRO_CAR_LENGTH,
  INSPIRO_CAR_WIDTH,
  createInspiroGeometries,
  type IInspiroGeometries,
} from './inspiroGeometries';

export { INSPIRO_CAR_GAP, INSPIRO_CAR_LENGTH, INSPIRO_CAR_WIDTH, createInspiroGeometries, type IInspiroGeometries };

export interface IInspiroMaterials {
  readonly silverBody: THREE.MeshStandardMaterial;
  readonly roofSilver: THREE.MeshStandardMaterial;
  readonly blackRibbon: THREE.MeshStandardMaterial;
  readonly glassTint: THREE.MeshStandardMaterial;
  readonly warsawRed: THREE.MeshStandardMaterial;
  readonly warsawYellow: THREE.MeshStandardMaterial;
  readonly darkSteel: THREE.MeshStandardMaterial;
  readonly wheelSteel: THREE.MeshStandardMaterial;
  readonly bellowsMat: THREE.MeshStandardMaterial;
  readonly headlightMat: THREE.MeshStandardMaterial;
  readonly taillightMat: THREE.MeshStandardMaterial;
  readonly ledDisplayMat: THREE.MeshStandardMaterial;
  readonly cabinGlowMat: THREE.MeshStandardMaterial;
}

export function createInspiroMaterials(ledTexture: THREE.CanvasTexture): IInspiroMaterials {
  return {
    silverBody: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.3, metalness: 0.58 }),
    roofSilver: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.44, metalness: 0.45 }),
    blackRibbon: new THREE.MeshStandardMaterial({ color: 0x0b0f17, roughness: 0.16, metalness: 0.65 }),
    glassTint: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.85 }),
    warsawRed: new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.34, metalness: 0.22 }),
    warsawYellow: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.32, metalness: 0.18 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x181c24, roughness: 0.78, metalness: 0.55 }),
    wheelSteel: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.35, metalness: 0.88 }),
    bellowsMat: new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.9, metalness: 0.1 }),
    headlightMat: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf8fafc, emissiveIntensity: 4.5, roughness: 0.12 }),
    taillightMat: new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 3.4, roughness: 0.18 }),
    ledDisplayMat: createInspiroLedMat(ledTexture),
    cabinGlowMat: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, emissive: 0xfef3c7, emissiveIntensity: 0.85, roughness: 0.18 }),
  };
}

function createInspiroLedMat(ledTexture: THREE.CanvasTexture): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: ledTexture,
    emissiveMap: ledTexture,
    emissive: 0xffffff,
    emissiveIntensity: 1.55,
    roughness: 0.75,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
}
