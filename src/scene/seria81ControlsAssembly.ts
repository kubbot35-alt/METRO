import * as THREE from 'three';
import type { IDisposableResource } from './shared/baseTrainConsist';

export function addToggleSwitchBanks(
  group: THREE.Group,
  deskGreyMat: THREE.MeshStandardMaterial,
  steelTrimMat: THREE.MeshStandardMaterial,
  disposables: IDisposableResource[],
): void {
  const plateGeo = new THREE.BoxGeometry(0.32, 0.14, 0.04);
  const nutGeo = new THREE.CylinderGeometry(0.009, 0.011, 0.014, 6);
  nutGeo.rotateX(Math.PI / 2);
  const batGeo = new THREE.CylinderGeometry(0.0035, 0.0055, 0.034, 8);
  const rightBank = new THREE.Group();
  rightBank.position.set(0.64, -0.35, -0.89);
  rightBank.rotation.set(-0.35, -0.22, 0);
  rightBank.add(new THREE.Mesh(plateGeo, deskGreyMat));
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      addToggleSwitch(rightBank, -0.11 + col * 0.055, row === 0 ? 0.028 : -0.028, (col + row) % 2 === 0, nutGeo, batGeo, steelTrimMat);
    }
  }
  group.add(rightBank);
  disposables.push(plateGeo, nutGeo, batGeo);
}

function addToggleSwitch(
  bank: THREE.Group,
  sx: number,
  sy: number,
  up: boolean,
  nutGeo: THREE.CylinderGeometry,
  batGeo: THREE.CylinderGeometry,
  steelTrimMat: THREE.MeshStandardMaterial,
): void {
  const nut = new THREE.Mesh(nutGeo, steelTrimMat);
  nut.position.set(sx, sy, 0.024);
  const bat = new THREE.Mesh(batGeo, steelTrimMat);
  bat.position.set(sx, sy, 0.04);
  bat.rotation.x = up ? 0.55 : -0.55;
  bank.add(nut, bat);
}

export function addHeavyMetalController(
  group: THREE.Group,
  deskGreyMat: THREE.MeshStandardMaterial,
  steelTrimMat: THREE.MeshStandardMaterial,
  disposables: IDisposableResource[],
): THREE.Group {
  const base = { x: -0.6, y: -0.39, z: -0.83 };
  const boxGeo = new THREE.BoxGeometry(0.19, 0.11, 0.32);
  const box = new THREE.Mesh(boxGeo, deskGreyMat);
  box.position.set(base.x, base.y - 0.035, base.z);
  const quadrantGeo = new THREE.BoxGeometry(0.06, 0.024, 0.25);
  const quadrant = new THREE.Mesh(quadrantGeo, steelTrimMat);
  quadrant.position.set(base.x, base.y + 0.018, base.z);
  const pivot = createHeavyControllerPivot(base, steelTrimMat, disposables);
  group.add(box, quadrant, pivot);
  disposables.push(boxGeo, quadrantGeo);
  return pivot;
}

function createHeavyControllerPivot(
  base: { x: number; y: number; z: number },
  steelTrimMat: THREE.MeshStandardMaterial,
  disposables: IDisposableResource[],
): THREE.Group {
  const pivot = new THREE.Group();
  pivot.name = 'Seria81HeavyControllerPivot';
  pivot.position.set(base.x, base.y, base.z);
  const shaftGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.2, 10);
  const shaft = new THREE.Mesh(shaftGeo, steelTrimMat);
  shaft.position.set(0, 0.1, 0);
  pivot.add(shaft);
  disposables.push(shaftGeo);
  addControllerGripAndCollars(pivot, steelTrimMat, disposables);
  return pivot;
}

function addControllerGripAndCollars(
  pivot: THREE.Group,
  steelTrimMat: THREE.MeshStandardMaterial,
  disposables: IDisposableResource[],
): void {
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x16191e, roughness: 0.65, metalness: 0.35 });
  const gripGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.15, 12);
  gripGeo.rotateZ(Math.PI / 2);
  const grip = new THREE.Mesh(gripGeo, handleMat);
  grip.position.set(0, 0.2, 0);
  const collarGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.018, 12);
  collarGeo.rotateZ(Math.PI / 2);
  ([-0.072, 0.072] as const).forEach((xOff) => {
    const cap = new THREE.Mesh(collarGeo, steelTrimMat);
    cap.position.set(xOff, 0.2, 0);
    pivot.add(cap);
  });
  pivot.add(grip);
  disposables.push(handleMat, gripGeo, collarGeo);
}

export function addDualRetroWipers(
  group: THREE.Group,
  gasketMat: THREE.MeshStandardMaterial,
  disposables: IDisposableResource[],
): { pivotL: THREE.Group; pivotR: THREE.Group } {
  const armGeo = new THREE.BoxGeometry(0.017, 0.44, 0.015);
  const bladeGeo = new THREE.BoxGeometry(0.022, 0.34, 0.016);
  const pivotL = createWiperWing(-0.46, -1.26, armGeo, bladeGeo, gasketMat);
  const pivotR = createWiperWing(0.46, 1.26, armGeo, bladeGeo, gasketMat);
  group.add(pivotL, pivotR);
  disposables.push(armGeo, bladeGeo);
  return { pivotL, pivotR };
}

function createWiperWing(
  x: number,
  parkRad: number,
  armGeo: THREE.BoxGeometry,
  bladeGeo: THREE.BoxGeometry,
  gasketMat: THREE.MeshStandardMaterial,
): THREE.Group {
  const pivot = new THREE.Group();
  pivot.position.set(x, -0.22, -1.0);
  const arm = new THREE.Mesh(armGeo, gasketMat);
  arm.position.set(0, 0.22, 0);
  const blade = new THREE.Mesh(bladeGeo, gasketMat);
  blade.position.set(0, 0.42, -0.006);
  pivot.add(arm, blade);
  pivot.rotation.z = parkRad;
  return pivot;
}
