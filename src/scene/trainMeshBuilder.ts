import * as THREE from 'three';
import type { ITrainVisualProfile } from '../domain/types';

export interface ITrainConsistRig {
  readonly group: THREE.Group;
  setTheme(visual: ITrainVisualProfile): void;
  setDoorsOpen(open: boolean, dtSec: number): void;
  setHeadlights(on: boolean): void;
  dispose(): void;
}

const CAR_COUNT = 4;
const CAR_LENGTH_M = 16.0;
const CAR_GAP_M = 0.85;
const CAR_WIDTH_M = 2.66;
const CAR_HEIGHT_M = 3.22;

interface IConsistMaterials {
  body: THREE.MeshStandardMaterial;
  stripe: THREE.MeshStandardMaterial;
  roof: THREE.MeshStandardMaterial;
  nose: THREE.MeshStandardMaterial;
  underframe: THREE.MeshStandardMaterial;
  windowMat: THREE.MeshStandardMaterial;
  windshield: THREE.MeshStandardMaterial;
  doorMat: THREE.MeshStandardMaterial;
  headlight: THREE.MeshStandardMaterial;
  taillight: THREE.MeshStandardMaterial;
}

interface ISlidingDoorPair {
  readonly leftLeaf: THREE.Mesh;
  readonly rightLeaf: THREE.Mesh;
  readonly baseZ: number;
}

export function buildMetroConsist(
  scene: THREE.Scene,
  visual: ITrainVisualProfile,
): ITrainConsistRig {
  const disposables: Array<{ dispose(): void }> = [];
  const group = new THREE.Group();
  group.name = 'MetroTrainConsist';
  const mats = createConsistMaterials(visual);
  disposables.push(...Object.values(mats));

  const sharedGeos = createSharedGeometries();
  disposables.push(...Object.values(sharedGeos));

  const doorPairs: ISlidingDoorPair[] = [];
  for (let i = 0; i < CAR_COUNT; i += 1) {
    const carZ = i * (CAR_LENGTH_M + CAR_GAP_M) + CAR_LENGTH_M * 0.5;
    addCarBody(group, carZ, i === 0, i === CAR_COUNT - 1, mats, sharedGeos, doorPairs);
    if (i < CAR_COUNT - 1) {
      const gangway = new THREE.Mesh(sharedGeos.gangway, mats.underframe);
      gangway.position.set(0, 1.9, carZ + CAR_LENGTH_M * 0.5 + CAR_GAP_M * 0.5);
      group.add(gangway);
    }
  }
  scene.add(group);

  let doorProgress = 0;
  return {
    group,
    setTheme: (next: ITrainVisualProfile): void => {
      mats.body.color.setHex(next.bodyHex);
      mats.stripe.color.setHex(next.stripeHex);
      mats.roof.color.setHex(next.roofHex);
      mats.nose.color.setHex(next.noseHex);
    },
    setDoorsOpen: (open: boolean, dtSec: number): void => {
      const target = open ? 1 : 0;
      doorProgress = THREE.MathUtils.damp(doorProgress, target, 7, Math.max(dtSec, 0.016));
      const slide = doorProgress * 0.55;
      for (let i = 0; i < doorPairs.length; i += 1) {
        const pair = doorPairs[i];
        pair.leftLeaf.position.z = pair.baseZ - 0.34 - slide;
        pair.rightLeaf.position.z = pair.baseZ + 0.34 + slide;
      }
    },
    setHeadlights: (on: boolean): void => {
      mats.headlight.emissiveIntensity = on ? 4.2 : 0.15;
    },
    dispose: (): void => {
      scene.remove(group);
      disposables.forEach((d) => d.dispose());
    },
  };
}

function createConsistMaterials(visual: ITrainVisualProfile): IConsistMaterials {
  return {
    body: new THREE.MeshStandardMaterial({ color: visual.bodyHex, roughness: 0.42, metalness: 0.35 }),
    stripe: new THREE.MeshStandardMaterial({ color: visual.stripeHex, roughness: 0.36, metalness: 0.2 }),
    roof: new THREE.MeshStandardMaterial({ color: visual.roofHex, roughness: 0.55, metalness: 0.25 }),
    nose: new THREE.MeshStandardMaterial({ color: visual.noseHex, roughness: 0.38, metalness: 0.35 }),
    underframe: new THREE.MeshStandardMaterial({ color: 0x161920, roughness: 0.82, metalness: 0.45 }),
    windowMat: new THREE.MeshStandardMaterial({
      color: 0xfef9c3,
      emissive: 0xfde68a,
      emissiveIntensity: 1.45,
      roughness: 0.2,
    }),
    windshield: new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.12, metalness: 0.8 }),
    doorMat: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.5 }),
    headlight: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfff3c4,
      emissiveIntensity: 4.2,
      roughness: 0.15,
    }),
    taillight: new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 2.8,
      roughness: 0.2,
    }),
  };
}

function createSharedGeometries() {
  return {
    body: new THREE.BoxGeometry(CAR_WIDTH_M, CAR_HEIGHT_M, CAR_LENGTH_M),
    underframe: new THREE.BoxGeometry(CAR_WIDTH_M - 0.18, 0.48, CAR_LENGTH_M - 0.4),
    roof: new THREE.BoxGeometry(CAR_WIDTH_M - 0.22, 0.2, CAR_LENGTH_M - 0.25),
    acPod: new THREE.BoxGeometry(1.5, 0.22, 2.8),
    stripe: new THREE.BoxGeometry(CAR_WIDTH_M + 0.04, 0.34, CAR_LENGTH_M - 0.1),
    windowBand: new THREE.BoxGeometry(CAR_WIDTH_M + 0.05, 0.86, 2.05),
    doorLeaf: new THREE.BoxGeometry(0.08, 1.98, 0.64),
    gangway: new THREE.BoxGeometry(2.05, 2.55, CAR_GAP_M + 0.1),
    noseCap: new THREE.BoxGeometry(CAR_WIDTH_M + 0.02, CAR_HEIGHT_M - 0.06, 0.42),
    windshield: new THREE.BoxGeometry(2.15, 1.05, 0.12),
    lamp: new THREE.BoxGeometry(0.28, 0.2, 0.12),
  };
}

function addCarBody(
  root: THREE.Group,
  centerZ: number,
  isFront: boolean,
  isRear: boolean,
  mats: IConsistMaterials,
  geos: ReturnType<typeof createSharedGeometries>,
  doorPairs: ISlidingDoorPair[],
): void {
  const body = new THREE.Mesh(geos.body, mats.body);
  body.position.set(0, 2.15, centerZ);

  const under = new THREE.Mesh(geos.underframe, mats.underframe);
  under.position.set(0, 0.48, centerZ);

  const roof = new THREE.Mesh(geos.roof, mats.roof);
  roof.position.set(0, 3.84, centerZ);

  const acA = new THREE.Mesh(geos.acPod, mats.underframe);
  acA.position.set(0, 4.02, centerZ - 4.1);
  const acB = new THREE.Mesh(geos.acPod, mats.underframe);
  acB.position.set(0, 4.02, centerZ + 4.1);

  const stripe = new THREE.Mesh(geos.stripe, mats.stripe);
  stripe.position.set(0, 1.56, centerZ);

  root.add(body, under, roof, acA, acB, stripe);
  [-5.1, 0, 5.1].forEach((offset) => {
    const win = new THREE.Mesh(geos.windowBand, mats.windowMat);
    win.position.set(0, 2.52, centerZ + offset);
    root.add(win);
  });

  [-2.6, 2.6].forEach((doorOffset) => {
    const baseZ = centerZ + doorOffset;
    const leftLeaf = new THREE.Mesh(geos.doorLeaf, mats.doorMat);
    leftLeaf.position.set(CAR_WIDTH_M * 0.5 + 0.02, 1.88, baseZ - 0.34);
    const rightLeaf = new THREE.Mesh(geos.doorLeaf, mats.doorMat);
    rightLeaf.position.set(CAR_WIDTH_M * 0.5 + 0.02, 1.88, baseZ + 0.34);
    root.add(leftLeaf, rightLeaf);
    doorPairs.push({ leftLeaf, rightLeaf, baseZ });
  });

  if (isFront) {
    addEndCap(root, centerZ - CAR_LENGTH_M * 0.5, -1, mats, geos, true);
  }
  if (isRear) {
    addEndCap(root, centerZ + CAR_LENGTH_M * 0.5, 1, mats, geos, false);
  }
}

function addEndCap(
  root: THREE.Group,
  endZ: number,
  dir: -1 | 1,
  mats: IConsistMaterials,
  geos: ReturnType<typeof createSharedGeometries>,
  isFront: boolean,
): void {
  const cap = new THREE.Mesh(geos.noseCap, mats.nose);
  cap.position.set(0, 2.15, endZ + dir * 0.14);
  const glass = new THREE.Mesh(geos.windshield, mats.windshield);
  glass.position.set(0, 2.65, endZ + dir * 0.34);

  const lampMat = isFront ? mats.headlight : mats.taillight;
  const lampL = new THREE.Mesh(geos.lamp, lampMat);
  lampL.position.set(-0.85, 1.38, endZ + dir * 0.36);
  const lampR = new THREE.Mesh(geos.lamp, lampMat);
  lampR.position.set(0.85, 1.38, endZ + dir * 0.36);

  root.add(cap, glass, lampL, lampR);
}
