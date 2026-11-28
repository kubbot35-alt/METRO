import * as THREE from 'three';
import type { IDisposableResource } from './shared/baseTrainConsist';
import { createGlowMaterial } from './shared/canvasTextureFactory';

export function addInspiroMasterLever(
  group: THREE.Group,
  panelMat: THREE.MeshStandardMaterial,
  trimMat: THREE.MeshStandardMaterial,
  disposables: IDisposableResource[],
): THREE.Group {
  const base = { x: -0.71, y: -0.39, z: -0.84 };
  addLeverConsoleBase(group, base, panelMat, disposables);
  const pivot = new THREE.Group();
  pivot.name = 'InspiroMasterControllerLever';
  pivot.position.set(base.x, base.y, base.z);
  addLeverHandleMeshes(pivot, trimMat, disposables);
  group.add(pivot);
  return pivot;
}

function addLeverConsoleBase(
  group: THREE.Group,
  base: { x: number; y: number; z: number },
  panelMat: THREE.MeshStandardMaterial,
  disposables: IDisposableResource[],
): void {
  const consoleGeo = new THREE.BoxGeometry(0.18, 0.1, 0.3);
  const consoleBox = new THREE.Mesh(consoleGeo, panelMat);
  consoleBox.position.set(base.x, base.y - 0.03, base.z);
  const slotGeo = new THREE.BoxGeometry(0.034, 0.022, 0.24);
  const slotMat = new THREE.MeshStandardMaterial({ color: 0x05070b, roughness: 0.9 });
  const slot = new THREE.Mesh(slotGeo, slotMat);
  slot.position.set(base.x, base.y + 0.015, base.z);
  const powerTickMat = createGlowMaterial(0x10b981, 0x34d399, 1.4);
  const brakeTickMat = createGlowMaterial(0xd97706, 0xf59e0b, 1.4);
  const tickGeo = new THREE.BoxGeometry(0.012, 0.008, 0.09);
  const fwdTick = new THREE.Mesh(tickGeo, powerTickMat);
  fwdTick.position.set(base.x + 0.048, base.y + 0.022, base.z - 0.055);
  const revTick = new THREE.Mesh(tickGeo, brakeTickMat);
  revTick.position.set(base.x + 0.048, base.y + 0.022, base.z + 0.055);
  group.add(consoleBox, slot, fwdTick, revTick);
  disposables.push(consoleGeo, slotGeo, slotMat, powerTickMat, brakeTickMat, tickGeo);
}

function addLeverHandleMeshes(
  pivot: THREE.Group,
  trimMat: THREE.MeshStandardMaterial,
  disposables: IDisposableResource[],
): void {
  const shaftGeo = new THREE.CylinderGeometry(0.012, 0.016, 0.18, 10);
  const shaft = new THREE.Mesh(shaftGeo, trimMat);
  shaft.position.set(0, 0.09, 0);
  const gripGeo = new THREE.CylinderGeometry(0.021, 0.021, 0.135, 14);
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65, metalness: 0.28 });
  const grip = new THREE.Mesh(gripGeo, gripMat);
  grip.rotation.z = Math.PI / 2;
  grip.position.set(0, 0.18, 0);
  const capGeo = new THREE.CylinderGeometry(0.023, 0.023, 0.016, 12);
  const capMat = createGlowMaterial(0x0284c7, 0x38bdf8, 1.1);
  ([-0.062, 0.062] as const).forEach((xOff) => {
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.rotation.z = Math.PI / 2;
    cap.position.set(xOff, 0.18, 0);
    pivot.add(cap);
  });
  pivot.add(shaft, grip);
  disposables.push(shaftGeo, gripGeo, gripMat, capGeo, capMat);
}
