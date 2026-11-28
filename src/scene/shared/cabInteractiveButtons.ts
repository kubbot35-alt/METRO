import * as THREE from 'three';
import { computeCabLampStates, getCabControlSpec, type CabControlId } from '../../domain/cabControlsCatalog';
import type { ISimulationSnapshot } from '../../domain/types';

export interface ICabButtonPlacement {
  readonly id: CabControlId;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly rx: number;
  readonly isMushroom?: boolean;
}

export interface IInteractiveCabButtonsRig {
  readonly interactiveMeshes: readonly THREE.Mesh[];
  update(snapshot: ISimulationSnapshot, elapsedSec: number): void;
}

interface IButtonEntry {
  readonly id: CabControlId;
  readonly capMesh: THREE.Mesh;
  readonly capMat: THREE.MeshStandardMaterial;
  readonly baseY: number;
}

export const INSPIRO_BUTTON_LAYOUT: readonly ICabButtonPlacement[] = [
  { id: 'doors_left', x: -0.45, y: -0.184, z: -0.945, rx: 0.34 },
  { id: 'doors_right', x: -0.355, y: -0.184, z: -0.945, rx: 0.34 },
  { id: 'czuwak', x: -0.235, y: -0.184, z: -0.945, rx: 0.34 },
  { id: 'lights', x: -0.095, y: -0.184, z: -0.945, rx: 0.34 },
  { id: 'wipers', x: 0.005, y: -0.184, z: -0.945, rx: 0.34 },
  { id: 'horn', x: 0.105, y: -0.184, z: -0.945, rx: 0.34 },
  { id: 'intercom', x: 0.215, y: -0.184, z: -0.945, rx: 0.34 },
  { id: 'emergency', x: 0.39, y: -0.182, z: -0.94, rx: 0.28, isMushroom: true },
];

export const VARSOVIA_BUTTON_LAYOUT: readonly ICabButtonPlacement[] = [
  { id: 'doors_left', x: -0.46, y: -0.174, z: -0.94, rx: 0.34 },
  { id: 'doors_right', x: -0.365, y: -0.174, z: -0.94, rx: 0.34 },
  { id: 'czuwak', x: -0.245, y: -0.174, z: -0.94, rx: 0.34 },
  { id: 'lights', x: -0.10, y: -0.174, z: -0.94, rx: 0.34 },
  { id: 'wipers', x: 0.00, y: -0.174, z: -0.94, rx: 0.34 },
  { id: 'horn', x: 0.10, y: -0.174, z: -0.94, rx: 0.34 },
  { id: 'intercom', x: 0.21, y: -0.174, z: -0.94, rx: 0.34 },
  { id: 'emergency', x: 0.39, y: -0.172, z: -0.935, rx: 0.28, isMushroom: true },
];

export const SERIA81_BUTTON_LAYOUT: readonly ICabButtonPlacement[] = [
  { id: 'doors_left', x: -0.39, y: -0.172, z: -0.915, rx: 0.34 },
  { id: 'doors_right', x: -0.305, y: -0.172, z: -0.915, rx: 0.34 },
  { id: 'czuwak', x: -0.20, y: -0.172, z: -0.915, rx: 0.34 },
  { id: 'lights', x: -0.085, y: -0.172, z: -0.915, rx: 0.34 },
  { id: 'wipers', x: 0.005, y: -0.172, z: -0.915, rx: 0.34 },
  { id: 'horn', x: 0.095, y: -0.172, z: -0.915, rx: 0.34 },
  { id: 'intercom', x: 0.19, y: -0.172, z: -0.915, rx: 0.34 },
  { id: 'emergency', x: 0.335, y: -0.170, z: -0.91, rx: 0.28, isMushroom: true },
];

function createButtonVisuals(
  placement: ICabButtonPlacement,
  bezelMat: THREE.MeshStandardMaterial,
  collarMat: THREE.MeshStandardMaterial,
  hitMat: THREE.MeshBasicMaterial,
  disposables: Array<{ dispose(): void }>,
): { group: THREE.Group; entry: IButtonEntry; hitMesh: THREE.Mesh } {
  const spec = getCabControlSpec(placement.id);
  const group = new THREE.Group();
  group.position.set(placement.x, placement.y, placement.z);
  group.rotation.x = placement.rx;

  const isMush = Boolean(placement.isMushroom);
  const bezelGeo = isMush ? new THREE.CylinderGeometry(0.032, 0.036, 0.016, 16) : new THREE.BoxGeometry(0.062, 0.016, 0.044);
  const capGeo = isMush ? new THREE.CylinderGeometry(0.025, 0.021, 0.024, 16) : new THREE.BoxGeometry(0.048, 0.018, 0.032);
  const hitGeo = new THREE.BoxGeometry(isMush ? 0.086 : 0.076, 0.065, 0.076);
  const capMat = new THREE.MeshStandardMaterial({
    color: spec.baseHex,
    emissive: spec.baseHex,
    emissiveIntensity: 0.42,
    roughness: 0.22,
    metalness: 0.12,
  });
  disposables.push(bezelGeo, capGeo, hitGeo, capMat);

  const bezel = new THREE.Mesh(bezelGeo, isMush ? collarMat : bezelMat);
  const capMesh = new THREE.Mesh(capGeo, capMat);
  const baseY = isMush ? 0.018 : 0.014;
  capMesh.position.y = baseY;
  const hitMesh = new THREE.Mesh(hitGeo, hitMat);
  hitMesh.position.y = 0.02;
  hitMesh.userData.cabControlId = placement.id;
  group.add(bezel, capMesh, hitMesh);
  return { group, entry: { id: placement.id, capMesh, capMat, baseY }, hitMesh };
}

export function attachInteractiveCabButtons(
  root: THREE.Group,
  layout: readonly ICabButtonPlacement[],
  disposables: Array<{ dispose(): void }>,
): IInteractiveCabButtonsRig {
  const bezelMat = new THREE.MeshStandardMaterial({ color: 0x0b1018, roughness: 0.48, metalness: 0.58 });
  const collarMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.36, metalness: 0.25 });
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const railGeo = new THREE.BoxGeometry(layout.length > 0 ? 1.02 : 0.8, 0.016, 0.068);
  const rail = new THREE.Mesh(railGeo, bezelMat);
  if (layout.length > 0) {
    rail.position.set(-0.02, layout[0].y - 0.008, layout[0].z);
    rail.rotation.x = layout[0].rx;
    root.add(rail);
  }
  disposables.push(bezelMat, collarMat, hitMat, railGeo);

  const entries: IButtonEntry[] = [];
  const interactiveMeshes: THREE.Mesh[] = [];
  for (let i = 0; i < layout.length; i += 1) {
    const built = createButtonVisuals(layout[i], bezelMat, collarMat, hitMat, disposables);
    root.add(built.group);
    entries.push(built.entry);
    interactiveMeshes.push(built.hitMesh);
  }

  return {
    interactiveMeshes,
    update(snapshot: ISimulationSnapshot, elapsedSec: number): void {
      const states = computeCabLampStates(snapshot, elapsedSec);
      for (let i = 0; i < entries.length; i += 1) {
        const item = entries[i];
        const st = states[item.id];
        item.capMat.emissive.setHex(st.emissiveHex);
        item.capMat.emissiveIntensity = st.intensity;
        item.capMesh.position.y = item.baseY - (st.active ? 0.004 : 0);
      }
    },
  };
}
