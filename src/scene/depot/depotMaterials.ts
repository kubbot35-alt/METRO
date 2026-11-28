import * as THREE from 'three';
import { createDepotBuildingTexture, createDepotPortalSignTexture, createDepotSignboardTexture } from '../proceduralTextures';

export interface IDepotMaterials {
  readonly gravel: THREE.MeshStandardMaterial;
  readonly grass: THREE.MeshStandardMaterial;
  readonly concrete: THREE.MeshStandardMaterial;
  readonly darkConcrete: THREE.MeshStandardMaterial;
  readonly portalArch: THREE.MeshStandardMaterial;
  readonly portalSign: THREE.MeshStandardMaterial;
  readonly hangarWall: THREE.MeshStandardMaterial;
  readonly hangarSign: THREE.MeshStandardMaterial;
  readonly hangarRoof: THREE.MeshStandardMaterial;
  readonly hangarWindow: THREE.MeshStandardMaterial;
  readonly steel: THREE.MeshStandardMaterial;
  readonly mastLamp: THREE.MeshStandardMaterial;
  readonly redBuffer: THREE.MeshStandardMaterial;
  readonly whiteStripe: THREE.MeshStandardMaterial;
  readonly trainBody: THREE.MeshStandardMaterial;
  readonly trainGlass: THREE.MeshStandardMaterial;
  readonly trainRed: THREE.MeshStandardMaterial;
  readonly trainYellow: THREE.MeshStandardMaterial;
  readonly trunk: THREE.MeshStandardMaterial;
  readonly foliage: THREE.MeshStandardMaterial;
  readonly cityBlock: THREE.MeshStandardMaterial;
}

function stdMat(color: number, roughness: number, metalness: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function createDepotGroundAndTrainMaterials() {
  return {
    gravel: stdMat(0x52565c, 0.94, 0.04),
    grass: stdMat(0x3b6036, 0.95, 0.02),
    concrete: stdMat(0x8b929b, 0.88, 0.06),
    darkConcrete: stdMat(0x383f4a, 0.9, 0.08),
    portalArch: stdMat(0x737b86, 0.82, 0.1),
    hangarRoof: stdMat(0x334155, 0.58, 0.42),
    steel: stdMat(0x94a3b8, 0.42, 0.72),
    redBuffer: stdMat(0xdc2626, 0.5, 0.18),
    whiteStripe: stdMat(0xf1f5f9, 0.55, 0.1),
    trainBody: stdMat(0xcbd5e1, 0.34, 0.48),
    trainGlass: stdMat(0x0f172a, 0.16, 0.4),
    trainRed: stdMat(0xc81e1e, 0.36, 0.22),
    trainYellow: stdMat(0xfacc15, 0.36, 0.18),
    trunk: stdMat(0x4b3621, 0.92, 0.02),
    foliage: stdMat(0x2f5a32, 0.88, 0.02),
    cityBlock: stdMat(0x5c6b7e, 0.85, 0.08),
  };
}

export function createDepotMaterials(maxAnisotropy: number, disposables: Array<{ dispose(): void }>): IDepotMaterials {
  const portalSignTex = createDepotPortalSignTexture(maxAnisotropy);
  const hangarTex = createDepotBuildingTexture(maxAnisotropy);
  const hangarSignTex = createDepotSignboardTexture(maxAnisotropy);
  const mats: IDepotMaterials = {
    ...createDepotGroundAndTrainMaterials(),
    portalSign: new THREE.MeshStandardMaterial({ map: portalSignTex, emissiveMap: portalSignTex, emissive: 0xffffff, emissiveIntensity: 0.65, roughness: 0.35 }),
    hangarWall: new THREE.MeshStandardMaterial({ map: hangarTex, roughness: 0.65, metalness: 0.25 }),
    hangarSign: new THREE.MeshStandardMaterial({ map: hangarSignTex, emissiveMap: hangarSignTex, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.35 }),
    hangarWindow: new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xf59e0b, emissiveIntensity: 0.6, roughness: 0.2 }),
    mastLamp: new THREE.MeshStandardMaterial({ color: 0xfff7ed, emissive: 0xfbbf24, emissiveIntensity: 1.5, roughness: 0.2 }),
  };
  disposables.push(portalSignTex, hangarTex, hangarSignTex, ...Object.values(mats));
  return mats;
}
