import * as THREE from 'three';
import type { TrainVisualTheme } from '../../domain/types';

export const INTERIOR_FLOOR_Y = 1.08;
export const INTERIOR_CEIL_Y = 3.28;
export const INTERIOR_HALF_W = 1.36;

export interface IInteriorMaterials {
  readonly floor: THREE.MeshStandardMaterial;
  readonly aisleStrip: THREE.MeshStandardMaterial;
  readonly yellowEdge: THREE.MeshStandardMaterial;
  readonly wall: THREE.MeshStandardMaterial;
  readonly ceiling: THREE.MeshStandardMaterial;
  readonly seatCushion: THREE.MeshStandardMaterial;
  readonly seatBack: THREE.MeshStandardMaterial;
  readonly seatFrame: THREE.MeshStandardMaterial;
  readonly handrail: THREE.MeshStandardMaterial;
  readonly strap: THREE.MeshStandardMaterial;
  readonly doorPanel: THREE.MeshStandardMaterial;
  readonly windowGlass: THREE.MeshPhysicalMaterial;
  readonly ceilingLamp: THREE.MeshStandardMaterial;
  readonly bulkheadDark: THREE.MeshStandardMaterial;
}

export function createInteriorMaterials(disposables: Array<{ dispose(): void }>): IInteriorMaterials {
  const mats: IInteriorMaterials = {
    floor: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.86, metalness: 0.08 }),
    aisleStrip: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, metalness: 0.05 }),
    yellowEdge: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.55, metalness: 0.1 }),
    wall: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.55, metalness: 0.12 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5, metalness: 0.1 }),
    seatCushion: new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.82, metalness: 0.04 }),
    seatBack: new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.82, metalness: 0.04 }),
    seatFrame: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.55 }),
    handrail: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.28, metalness: 0.55 }),
    strap: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75, metalness: 0.1 }),
    doorPanel: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.38, metalness: 0.35 }),
    windowGlass: new THREE.MeshPhysicalMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.14, roughness: 0.1, metalness: 0.1, depthWrite: false }),
    ceilingLamp: new THREE.MeshStandardMaterial({ color: 0xf8fafc, emissive: 0xe0f2fe, emissiveIntensity: 2.2, roughness: 0.2 }),
    bulkheadDark: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65, metalness: 0.28 }),
  };
  disposables.push(...Object.values(mats));
  return mats;
}

export function applyInteriorThemePalette(
  mats: IInteriorMaterials,
  lights: readonly THREE.PointLight[],
  theme: TrainVisualTheme,
): void {
  const palette = theme === 'retro'
    ? { floor: 0x3f4448, aisle: 0x2c3035, wall: 0xc8cfc0, ceil: 0xd8dcd0, cushion: 0x6b2c2a, back: 0x6b2c2a, rail: 0xd8e0ea, railMet: 0.85, railRough: 0.22, door: 0xa8b3a8, lampEm: 0xfde68a, lampInt: 1.9, lightHex: 0xfff1d0, lightInt: 10.5 }
    : theme === 'varsovia'
      ? { floor: 0x94a3b8, aisle: 0x64748b, wall: 0xf8fafc, ceil: 0xffffff, cushion: 0x475569, back: 0xdc2626, rail: 0xe2e8f0, railMet: 0.9, railRough: 0.18, door: 0xe2e8f0, lampEm: 0xf8fafc, lampInt: 2.6, lightHex: 0xffffff, lightInt: 14.5 }
      : { floor: 0x4b5563, aisle: 0x334155, wall: 0xe5e9f0, ceil: 0xf8fafc, cushion: 0x1d4ed8, back: 0x1d4ed8, rail: 0xfacc15, railMet: 0.42, railRough: 0.3, door: 0xd1d5db, lampEm: 0xe0f2fe, lampInt: 2.3, lightHex: 0xf0f9ff, lightInt: 12.5 };

  mats.floor.color.setHex(palette.floor);
  mats.aisleStrip.color.setHex(palette.aisle);
  mats.wall.color.setHex(palette.wall);
  mats.ceiling.color.setHex(palette.ceil);
  mats.seatCushion.color.setHex(palette.cushion);
  mats.seatBack.color.setHex(palette.back);
  mats.handrail.color.setHex(palette.rail);
  mats.handrail.metalness = palette.railMet;
  mats.handrail.roughness = palette.railRough;
  mats.doorPanel.color.setHex(palette.door);
  mats.ceilingLamp.emissive.setHex(palette.lampEm);
  mats.ceilingLamp.emissiveIntensity = palette.lampInt;
  lights.forEach((l) => { l.color.setHex(palette.lightHex); l.intensity = palette.lightInt; });
}
