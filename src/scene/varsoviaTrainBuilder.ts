import * as THREE from 'three';
import type { DoorSide, ITrainVisualProfile, MetroLineId } from '../domain/types';
import type { IInspiroConsistBuild } from './inspiroTrainBuilder';
import {
  VARSOVIA_CAR_GAP,
  VARSOVIA_CAR_LENGTH,
  VARSOVIA_CAR_WIDTH,
  createVarsoviaGeometries,
  createVarsoviaMaterials,
  type IVarsoviaGeometries,
  type IVarsoviaMaterials,
} from './varsoviaExteriorParts';
import { createVarsoviaLedDisplay } from './varsoviaTextures';

interface IVarsoviaDoorPair {
  readonly leftLeaf: THREE.Group;
  readonly rightLeaf: THREE.Group;
  readonly baseZ: number;
  readonly side: DoorSide;
}

const CAR_COUNT = 4;
const DOOR_OFFSETS_Z = [-5.4, -1.8, 1.8, 5.4] as const;
const WINDOW_OFFSETS_Z = [-3.6, 0, 3.6] as const;
const BOGIE_OFFSETS_Z = [-5.1, 5.1] as const;

export function buildVarsoviaConsist(maxAnisotropy: number): IInspiroConsistBuild {
  const disposables: Array<{ dispose(): void }> = [];
  const group = new THREE.Group();
  group.name = 'SkodaVarsoviaConsist';

  const ledDisplay = createVarsoviaLedDisplay(maxAnisotropy);
  const mats = createVarsoviaMaterials(ledDisplay.texture);
  const geos = createVarsoviaGeometries();
  disposables.push(ledDisplay, ...Object.values(mats), ...Object.values(geos));

  const doorPairs: IVarsoviaDoorPair[] = [];
  const axles: THREE.Mesh[] = [];

  const camPodGeo = new THREE.BoxGeometry(0.105, 0.068, 0.23);
  const camLensGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.02, 10);
  camLensGeo.rotateX(Math.PI / 2);
  disposables.push(camPodGeo, camLensGeo);

  for (let i = 0; i < CAR_COUNT; i += 1) {
    const carZ = i * (VARSOVIA_CAR_LENGTH + VARSOVIA_CAR_GAP) + VARSOVIA_CAR_LENGTH * 0.5;
    addVarsoviaCar(
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
      addArticulatedGangway(group, carZ + VARSOVIA_CAR_LENGTH * 0.5 + VARSOVIA_CAR_GAP * 0.5, mats, geos);
    }
  }

  let leftDoorProgress = 0;
  let rightDoorProgress = 0;
  return {
    group,
    setVisualProfile: (visual: ITrainVisualProfile): void => {
      mats.whiteBody.color.setHex(visual.bodyHex);
      mats.roofGray.color.setHex(visual.roofHex);
      mats.warsawRed.color.setHex(visual.stripeHex);
      mats.warsawYellow.color.setHex(visual.noseHex);
      const isStealth = visual.liveryId === 'stealth_night';
      mats.whiteBody.roughness = isStealth ? 0.56 : 0.24;
      mats.warsawRed.emissive.setHex(isStealth ? 0xff1e42 : 0x000000);
      mats.warsawRed.emissiveIntensity = isStealth ? 1.15 : 0;
      mats.smileLedFrontMat.emissive.setHex(isStealth ? 0xff2a55 : 0xe0f7ff);
    },
    setDoorsOpen: (openSide: DoorSide | null, dtSec: number): void => {
      const safeDt = Math.max(dtSec, 0.016);
      leftDoorProgress = THREE.MathUtils.damp(leftDoorProgress, openSide === 'left' ? 1 : 0, 7.5, safeDt);
      rightDoorProgress = THREE.MathUtils.damp(rightDoorProgress, openSide === 'right' ? 1 : 0, 7.5, safeDt);
      for (let i = 0; i < doorPairs.length; i += 1) {
        const pair = doorPairs[i];
        const progress = pair.side === 'left' ? leftDoorProgress : rightDoorProgress;
        const slide = progress * 0.58;
        pair.leftLeaf.position.z = pair.baseZ - 0.32 - slide;
        pair.rightLeaf.position.z = pair.baseZ + 0.32 + slide;
      }
    },
    setHeadlights: (on: boolean): void => {
      mats.smileLedFrontMat.emissiveIntensity = on ? 5.2 : 0.35;
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

function addVarsoviaCar(
  root: THREE.Group,
  centerZ: number,
  isFront: boolean,
  isRear: boolean,
  mats: IVarsoviaMaterials,
  geos: IVarsoviaGeometries,
  doorPairs: IVarsoviaDoorPair[],
  axles: THREE.Mesh[],
  camPodGeo: THREE.BoxGeometry,
  camLensGeo: THREE.CylinderGeometry,
): void {
  const shell = new THREE.Mesh(geos.carShell, mats.whiteBody);
  shell.position.set(0, 0, centerZ);

  const blackRibbon = new THREE.Mesh(geos.blackRibbonSide, mats.glossyBlackMask);
  blackRibbon.position.set(0, 2.54, centerZ);

  const redStripe = new THREE.Mesh(geos.redStripeSide, mats.warsawRed);
  redStripe.position.set(0, 1.02, centerZ);

  const hvacA = new THREE.Mesh(geos.roofHvacPod, mats.roofGray);
  hvacA.position.set(0, 3.74, centerZ - 4.0);
  const hvacB = new THREE.Mesh(geos.roofHvacPod, mats.roofGray);
  hvacB.position.set(0, 3.74, centerZ + 4.0);

  root.add(shell, blackRibbon, redStripe, hvacA, hvacB);
  WINDOW_OFFSETS_Z.forEach((offset) => {
    const win = new THREE.Mesh(geos.windowPane, mats.cabinGlowMat);
    win.position.set(0, 2.54, centerZ + offset);
    root.add(win);
  });

  addVarsoviaDoors(root, centerZ, mats, geos, doorPairs);
  BOGIE_OFFSETS_Z.forEach((offset) => addVarsoviaBogie(root, centerZ + offset, mats, geos, axles));

  if (isFront) {
    addVarsoviaNoseEnd(root, centerZ - VARSOVIA_CAR_LENGTH * 0.5, -1, true, mats, geos, camPodGeo, camLensGeo);
  }
  if (isRear) {
    addVarsoviaNoseEnd(root, centerZ + VARSOVIA_CAR_LENGTH * 0.5, 1, false, mats, geos, camPodGeo, camLensGeo);
  }
}

function addVarsoviaDoors(
  root: THREE.Group,
  centerZ: number,
  mats: IVarsoviaMaterials,
  geos: IVarsoviaGeometries,
  doorPairs: IVarsoviaDoorPair[],
): void {
  const sides: readonly (-1 | 1)[] = [1, -1];
  sides.forEach((side) => {
    const xPos = side * (VARSOVIA_CAR_WIDTH * 0.5 + 0.068);
    DOOR_OFFSETS_Z.forEach((offset) => {
      const baseZ = centerZ + offset;
      const trimL = new THREE.Mesh(geos.doorYellowFrame, mats.warsawYellow);
      trimL.position.set(xPos - side * 0.012, 1.98, baseZ - 0.69);
      const trimR = new THREE.Mesh(geos.doorYellowFrame, mats.warsawYellow);
      trimR.position.set(xPos - side * 0.012, 1.98, baseZ + 0.69);

      const leftLeaf = createDoorLeaf(mats, geos, side);
      leftLeaf.position.set(xPos, 1.98, baseZ - 0.32);
      const rightLeaf = createDoorLeaf(mats, geos, side);
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

function createDoorLeaf(
  mats: IVarsoviaMaterials,
  geos: IVarsoviaGeometries,
  side: -1 | 1,
): THREE.Group {
  const leaf = new THREE.Group();
  const panel = new THREE.Mesh(geos.doorLeaf, mats.whiteBody);
  const glass = new THREE.Mesh(geos.doorWindow, mats.cabinGlowMat);
  glass.position.set(side * 0.006, 0.42, 0);

  const redLower = new THREE.Mesh(geos.yellowDoorStripe, mats.warsawRed);
  redLower.scale.set(1.02, 2.8, 1);
  redLower.position.set(side * 0.008, -0.78, 0);

  const yellowBand = new THREE.Mesh(geos.yellowDoorStripe, mats.warsawYellow);
  yellowBand.position.set(side * 0.01, -0.45, 0);

  leaf.add(panel, glass, redLower, yellowBand);
  return leaf;
}

function addVarsoviaBogie(
  root: THREE.Group,
  bogieZ: number,
  mats: IVarsoviaMaterials,
  geos: IVarsoviaGeometries,
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
}

function addArticulatedGangway(
  root: THREE.Group,
  centerZ: number,
  mats: IVarsoviaMaterials,
  geos: IVarsoviaGeometries,
): void {
  [-0.28, -0.1, 0.1, 0.28].forEach((foldOff) => {
    const fold = new THREE.Mesh(geos.bellowFold, mats.bellowsMat);
    fold.position.set(0, 0, centerZ + foldOff);
    root.add(fold);
  });
}

function addVarsoviaNoseEnd(
  root: THREE.Group,
  endZ: number,
  dir: -1 | 1,
  isFront: boolean,
  mats: IVarsoviaMaterials,
  geos: IVarsoviaGeometries,
  camPodGeo: THREE.BoxGeometry,
  camLensGeo: THREE.CylinderGeometry,
): void {
  const endGroup = new THREE.Group();
  endGroup.position.set(0, 0, endZ);
  endGroup.rotation.y = dir === -1 ? 0 : Math.PI;

  const nose = new THREE.Mesh(geos.noseShell, mats.whiteBody);
  const redLower = new THREE.Mesh(geos.noseRedLower, mats.warsawRed);
  const yellowTrim = new THREE.Mesh(geos.noseYellowAccent, mats.warsawYellow);
  const coupler = new THREE.Mesh(geos.coupler, mats.darkSteel);
  coupler.position.set(0, 0.62, -1.68);

  // Iconic panoramic glossy black front mask + sloped glass + overhead LED display
  const blackMask = new THREE.Mesh(geos.panoramicMask, mats.glossyBlackMask);
  blackMask.position.set(0, 2.48, -1.48);
  blackMask.rotation.x = 0.27;

  const glass = new THREE.Mesh(geos.panoramicWindshield, mats.panoramicGlass);
  glass.position.set(0, 2.38, -1.53);
  glass.rotation.x = 0.27;

  const ledSign = new THREE.Mesh(geos.ledDisplayPlane, mats.ledDisplayMat);
  ledSign.position.set(0, 3.16, -1.39);
  ledSign.rotation.x = 0.27;

  const wiper = new THREE.Mesh(geos.wiperArm, mats.darkSteel);
  wiper.position.set(0.24, 1.98, -1.66);
  wiper.rotation.set(0.27, 0, 1.15);

  // Characteristic sharp "smiling" LED light bar curving up across the front mask
  const ledMat = isFront ? mats.smileLedFrontMat : mats.smileLedRearMat;
  const centerBar = new THREE.Mesh(geos.smileCenterBar, ledMat);
  centerBar.position.set(0, 1.46, -1.87);

  const leftWing = new THREE.Mesh(geos.smileWingBar, ledMat);
  leftWing.position.set(-0.78, 1.59, -1.84);
  leftWing.rotation.set(0.14, 0.16, -0.34);

  const rightWing = new THREE.Mesh(geos.smileWingBar, ledMat);
  rightWing.position.set(0.78, 1.59, -1.84);
  rightWing.rotation.set(0.14, -0.16, 0.34);

  const leftPod = new THREE.Mesh(geos.smileSidePod, ledMat);
  leftPod.position.set(-1.1, 1.72, -1.78);
  leftPod.rotation.set(0.22, 0.24, -0.36);

  const rightPod = new THREE.Mesh(geos.smileSidePod, ledMat);
  rightPod.position.set(1.1, 1.72, -1.78);
  rightPod.rotation.set(0.22, -0.24, 0.36);

  // Sleek aerodynamic exterior CCTV side-camera pods (no wing mirrors on flagship Varsovia)
  ([-1, 1] as const).forEach((side) => {
    const camPod = new THREE.Mesh(camPodGeo, mats.glossyBlackMask);
    camPod.position.set(side * (VARSOVIA_CAR_WIDTH * 0.5 + 0.05), 2.7, -0.58);
    const camLens = new THREE.Mesh(camLensGeo, mats.panoramicGlass);
    camLens.position.set(side * (VARSOVIA_CAR_WIDTH * 0.5 + 0.06), 2.7, -0.46);
    endGroup.add(camPod, camLens);
  });

  endGroup.add(
    nose,
    redLower,
    yellowTrim,
    coupler,
    blackMask,
    glass,
    ledSign,
    wiper,
    centerBar,
    leftWing,
    rightWing,
    leftPod,
    rightPod,
  );
  root.add(endGroup);
}
