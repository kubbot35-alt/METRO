import * as THREE from 'three';
import type { DoorSide, ITrainVisualProfile, MetroLineId } from '../domain/types';
import {
  INSPIRO_CAR_GAP,
  INSPIRO_CAR_LENGTH,
  INSPIRO_CAR_WIDTH,
  createInspiroGeometries,
  createInspiroMaterials,
  type IInspiroGeometries,
  type IInspiroMaterials,
} from './inspiroExteriorParts';
import { createInspiroLedDisplay } from './inspiroTextures';

export interface IInspiroConsistBuild {
  readonly group: THREE.Group;
  setVisualProfile?(visual: ITrainVisualProfile): void;
  setDoorsOpen(openSide: DoorSide | null, dtSec: number): void;
  setHeadlights(on: boolean): void;
  setLine(lineId: MetroLineId, destinationLed: string): void;
  updateWheelSpin(speedMs: number, dtSec: number): void;
  dispose(): void;
}

interface ISlidingDoorPair {
  readonly leftLeaf: THREE.Group;
  readonly rightLeaf: THREE.Group;
  readonly baseZ: number;
  readonly side: DoorSide;
}

const CAR_COUNT = 4;
const DOOR_OFFSETS_Z = [-5.4, -1.8, 1.8, 5.4] as const;
const WINDOW_OFFSETS_Z = [-3.6, 0, 3.6] as const;
const BOGIE_OFFSETS_Z = [-5.1, 5.1] as const;

export function buildInspiroConsist(maxAnisotropy: number): IInspiroConsistBuild {
  const disposables: Array<{ dispose(): void }> = [];
  const group = new THREE.Group();
  group.name = 'SiemensInspiroConsist';

  const ledDisplay = createInspiroLedDisplay(maxAnisotropy);
  const mats = createInspiroMaterials(ledDisplay.texture);
  const geos = createInspiroGeometries();
  disposables.push(ledDisplay, ...Object.values(mats), ...Object.values(geos));

  const doorPairs: ISlidingDoorPair[] = [];
  const axles: THREE.Mesh[] = [];

  const camPodGeo = new THREE.BoxGeometry(0.11, 0.075, 0.22);
  const camLensGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.02, 10);
  camLensGeo.rotateX(Math.PI / 2);
  disposables.push(camPodGeo, camLensGeo);

  for (let i = 0; i < CAR_COUNT; i += 1) {
    const carZ = i * (INSPIRO_CAR_LENGTH + INSPIRO_CAR_GAP) + INSPIRO_CAR_LENGTH * 0.5;
    addInspiroCar(
      group,
      carZ,
      i === 0,
      i === CAR_COUNT - 1,
      mats,
      geos,
      doorPairs,
      axles,
      camPodGeo,
      camLensGeo,
    );
    if (i < CAR_COUNT - 1) {
      addArticulatedBellows(group, carZ + INSPIRO_CAR_LENGTH * 0.5 + INSPIRO_CAR_GAP * 0.5, mats, geos);
    }
  }

  let leftDoorProgress = 0;
  let rightDoorProgress = 0;
  return {
    group,
    setVisualProfile: (visual: ITrainVisualProfile): void => {
      mats.silverBody.color.setHex(visual.bodyHex);
      mats.roofSilver.color.setHex(visual.roofHex);
      mats.warsawRed.color.setHex(visual.stripeHex);
      mats.warsawYellow.color.setHex(visual.noseHex);
    },
    setDoorsOpen: (openSide: DoorSide | null, dtSec: number): void => {
      const safeDt = Math.max(dtSec, 0.016);
      leftDoorProgress = THREE.MathUtils.damp(
        leftDoorProgress,
        openSide === 'left' ? 1 : 0,
        7,
        safeDt,
      );
      rightDoorProgress = THREE.MathUtils.damp(
        rightDoorProgress,
        openSide === 'right' ? 1 : 0,
        7,
        safeDt,
      );
      for (let i = 0; i < doorPairs.length; i += 1) {
        const pair = doorPairs[i];
        const progress = pair.side === 'left' ? leftDoorProgress : rightDoorProgress;
        const slide = progress * 0.56;
        pair.leftLeaf.position.z = pair.baseZ - 0.32 - slide;
        pair.rightLeaf.position.z = pair.baseZ + 0.32 + slide;
      }
    },
    setHeadlights: (on: boolean): void => {
      mats.headlightMat.emissiveIntensity = on ? 4.5 : 0.15;
    },
    setLine: (lineId: MetroLineId, destinationLed: string): void => {
      ledDisplay.setLine(lineId, destinationLed);
    },
    updateWheelSpin: (speedMs: number, dtSec: number): void => {
      const deltaAngle = (speedMs / 0.41) * Math.max(dtSec, 0);
      for (let i = 0; i < axles.length; i += 1) {
        axles[i].rotation.x -= deltaAngle;
      }
    },
    dispose: (): void => disposables.forEach((d) => d.dispose()),
  };
}

function addInspiroCar(
  root: THREE.Group,
  centerZ: number,
  isFront: boolean,
  isRear: boolean,
  mats: IInspiroMaterials,
  geos: IInspiroGeometries,
  doorPairs: ISlidingDoorPair[],
  axles: THREE.Mesh[],
  camPodGeo: THREE.BoxGeometry,
  camLensGeo: THREE.CylinderGeometry,
): void {
  const shell = new THREE.Mesh(geos.carShell, mats.silverBody);
  shell.position.set(0, 0, centerZ);

  const blackRibbon = new THREE.Mesh(geos.blackRibbonSide, mats.blackRibbon);
  blackRibbon.position.set(0, 2.52, centerZ);

  const redStripe = new THREE.Mesh(geos.redStripeSide, mats.warsawRed);
  redStripe.position.set(0, 1.06, centerZ);

  const hvacA = new THREE.Mesh(geos.roofHvacPod, mats.roofSilver);
  hvacA.position.set(0, 3.74, centerZ - 3.8);
  const hvacB = new THREE.Mesh(geos.roofHvacPod, mats.roofSilver);
  hvacB.position.set(0, 3.74, centerZ + 3.8);

  root.add(shell, blackRibbon, redStripe, hvacA, hvacB);
  addSideWindows(root, centerZ, mats, geos);
  addCarDoors(root, centerZ, mats, geos, doorPairs);
  BOGIE_OFFSETS_Z.forEach((offset) => addBogie(root, centerZ + offset, mats, geos, axles));

  if (isFront) {
    addInspiroAerodynamicEnd(root, centerZ - INSPIRO_CAR_LENGTH * 0.5, -1, true, mats, geos, camPodGeo, camLensGeo);
  }
  if (isRear) {
    addInspiroAerodynamicEnd(root, centerZ + INSPIRO_CAR_LENGTH * 0.5, 1, false, mats, geos, camPodGeo, camLensGeo);
  }
}

function addSideWindows(
  root: THREE.Group,
  centerZ: number,
  mats: IInspiroMaterials,
  geos: IInspiroGeometries,
): void {
  WINDOW_OFFSETS_Z.forEach((offset) => {
    const win = new THREE.Mesh(geos.windowPane, mats.cabinGlowMat);
    win.position.set(0, 2.52, centerZ + offset);
    root.add(win);
  });
}

function addCarDoors(
  root: THREE.Group,
  centerZ: number,
  mats: IInspiroMaterials,
  geos: IInspiroGeometries,
  doorPairs: ISlidingDoorPair[],
): void {
  const sides: readonly (-1 | 1)[] = [1, -1];
  sides.forEach((side) => {
    const xPos = side * (INSPIRO_CAR_WIDTH * 0.5 + 0.068);
    DOOR_OFFSETS_Z.forEach((offset) => {
      const baseZ = centerZ + offset;
      const trimL = new THREE.Mesh(geos.doorYellowTrim, mats.warsawYellow);
      trimL.position.set(xPos - side * 0.012, 1.98, baseZ - 0.68);
      const trimR = new THREE.Mesh(geos.doorYellowTrim, mats.warsawYellow);
      trimR.position.set(xPos - side * 0.012, 1.98, baseZ + 0.68);

      const leftLeaf = createDoorLeafGroup(mats, geos, side);
      leftLeaf.position.set(xPos, 1.98, baseZ - 0.32);
      const rightLeaf = createDoorLeafGroup(mats, geos, side);
      rightLeaf.position.set(xPos, 1.98, baseZ + 0.32);

      root.add(trimL, trimR, leftLeaf, rightLeaf);
      doorPairs.push({
        leftLeaf,
        rightLeaf,
        baseZ,
        side: side === -1 ? 'left' : 'right',
      });
    });
  });
}

function createDoorLeafGroup(
  mats: IInspiroMaterials,
  geos: IInspiroGeometries,
  side: -1 | 1,
): THREE.Group {
  const leafGroup = new THREE.Group();
  const panel = new THREE.Mesh(geos.doorLeaf, mats.silverBody);
  const glass = new THREE.Mesh(geos.doorWindow, mats.cabinGlowMat);
  glass.position.set(side * 0.006, 0.44, 0);
  const redBottom = new THREE.Mesh(geos.doorYellowTrim, mats.warsawRed);
  redBottom.scale.set(1.1, 0.21, 7.6);
  redBottom.position.set(side * 0.008, -0.82, 0);
  leafGroup.add(panel, glass, redBottom);
  return leafGroup;
}

function addBogie(
  root: THREE.Group,
  bogieZ: number,
  mats: IInspiroMaterials,
  geos: IInspiroGeometries,
  axles: THREE.Mesh[],
): void {
  const frame = new THREE.Mesh(geos.bogieFrame, mats.darkSteel);
  frame.position.set(0, 0.56, bogieZ);
  root.add(frame);

  [-0.86, 0.86].forEach((axleOff) => {
    const axle = new THREE.Mesh(geos.axle, mats.darkSteel);
    axle.position.set(0, 0.44, bogieZ + axleOff);
    const wheelL = new THREE.Mesh(geos.wheel, mats.wheelSteel);
    wheelL.position.set(-0.76, 0.44, bogieZ + axleOff);
    const wheelR = new THREE.Mesh(geos.wheel, mats.wheelSteel);
    wheelR.position.set(0.76, 0.44, bogieZ + axleOff);
    root.add(axle, wheelL, wheelR);
    axles.push(wheelL, wheelR);
  });

  [-0.92, 0.92].forEach((sx) => {
    const spring = new THREE.Mesh(geos.springCoil, mats.warsawYellow);
    spring.position.set(sx, 0.62, bogieZ);
    root.add(spring);
  });
}

function addArticulatedBellows(
  root: THREE.Group,
  centerZ: number,
  mats: IInspiroMaterials,
  geos: IInspiroGeometries,
): void {
  [-0.28, -0.1, 0.1, 0.28].forEach((foldOff) => {
    const fold = new THREE.Mesh(geos.bellowFold, mats.bellowsMat);
    fold.position.set(0, 0, centerZ + foldOff);
    root.add(fold);
  });
}

function addInspiroAerodynamicEnd(
  root: THREE.Group,
  endZ: number,
  dir: -1 | 1,
  isFront: boolean,
  mats: IInspiroMaterials,
  geos: IInspiroGeometries,
  camPodGeo: THREE.BoxGeometry,
  camLensGeo: THREE.CylinderGeometry,
): void {
  const endGroup = new THREE.Group();
  endGroup.position.set(0, 0, endZ);
  endGroup.rotation.y = dir === -1 ? 0 : Math.PI;

  const nose = new THREE.Mesh(geos.noseShell, mats.silverBody);
  const yellowApron = new THREE.Mesh(geos.noseYellowApron, mats.warsawYellow);
  const redSkirt = new THREE.Mesh(geos.noseRedSkirt, mats.warsawRed);
  const coupler = new THREE.Mesh(geos.coupler, mats.darkSteel);
  coupler.position.set(0, 0.62, -1.56);

  const frame = new THREE.Mesh(geos.windshieldFrame, mats.blackRibbon);
  frame.position.set(0, 2.48, -1.4);
  frame.rotation.x = 0.25;

  const glass = new THREE.Mesh(geos.windshield, mats.glassTint);
  glass.position.set(0, 2.38, -1.45);
  glass.rotation.x = 0.25;

  const ledSign = new THREE.Mesh(geos.ledDisplayPlane, mats.ledDisplayMat);
  ledSign.position.set(0, 3.03, -1.36);
  ledSign.rotation.x = 0.25;

  const wiper = new THREE.Mesh(geos.wiperArm, mats.darkSteel);
  wiper.position.set(0.28, 2.02, -1.55);
  wiper.rotation.set(0.25, 0, 1.18);

  const lampMat = isFront ? mats.headlightMat : mats.taillightMat;
  const lampL = new THREE.Mesh(geos.angledLamp, lampMat);
  lampL.position.set(-0.92, 1.38, -1.73);
  lampL.rotation.set(0.12, 0.24, 0.24);

  const lampR = new THREE.Mesh(geos.angledLamp, lampMat);
  lampR.position.set(0.92, 1.38, -1.73);
  lampR.rotation.set(0.12, -0.24, -0.24);

  // Aerodynamic exterior CCTV side-camera pods (no wing mirrors on modern Inspiro)
  ([-1, 1] as const).forEach((side) => {
    const pod = new THREE.Mesh(camPodGeo, mats.blackRibbon);
    pod.position.set(side * (INSPIRO_CAR_WIDTH * 0.5 + 0.05), 2.68, -0.52);
    const lens = new THREE.Mesh(camLensGeo, mats.glassTint);
    lens.position.set(side * (INSPIRO_CAR_WIDTH * 0.5 + 0.06), 2.68, -0.4);
    endGroup.add(pod, lens);
  });

  endGroup.add(nose, yellowApron, redSkirt, coupler, frame, glass, ledSign, wiper, lampL, lampR);
  root.add(endGroup);
}
