import * as THREE from 'three';
import { addInspiroAerodynamicEnd } from './inspiroEndAssembly';
import {
  INSPIRO_CAR_LENGTH,
  INSPIRO_CAR_WIDTH,
  type IInspiroGeometries,
  type IInspiroMaterials,
} from './inspiroExteriorParts';
import type { ISlidingDoorPair } from './shared/baseTrainConsist';

const DOOR_OFFSETS_Z = [-5.4, -1.8, 1.8, 5.4] as const;
const WINDOW_OFFSETS_Z = [-3.6, 0, 3.6] as const;
const BOGIE_OFFSETS_Z = [-5.1, 5.1] as const;

export interface IInspiroCarBuildContext {
  readonly mats: IInspiroMaterials;
  readonly geos: IInspiroGeometries;
  readonly doorPairs: ISlidingDoorPair[];
  readonly axles: THREE.Mesh[];
  readonly camPodGeo: THREE.BoxGeometry;
  readonly camLensGeo: THREE.CylinderGeometry;
}

export function addInspiroCar(
  root: THREE.Group,
  centerZ: number,
  isFront: boolean,
  isRear: boolean,
  ctx: IInspiroCarBuildContext,
): void {
  addInspiroCarBody(root, centerZ, ctx.mats, ctx.geos);
  addSideWindows(root, centerZ, ctx.mats, ctx.geos);
  addCarDoors(root, centerZ, ctx.mats, ctx.geos, ctx.doorPairs);
  BOGIE_OFFSETS_Z.forEach((offset) => addBogie(root, centerZ + offset, ctx.mats, ctx.geos, ctx.axles));
  if (isFront) addInspiroAerodynamicEnd(root, centerZ - INSPIRO_CAR_LENGTH * 0.5, -1, true, ctx);
  if (isRear) addInspiroAerodynamicEnd(root, centerZ + INSPIRO_CAR_LENGTH * 0.5, 1, false, ctx);
}

export function addArticulatedBellows(
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

function addInspiroCarBody(
  root: THREE.Group,
  centerZ: number,
  mats: IInspiroMaterials,
  geos: IInspiroGeometries,
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
  ([-1, 1] as const).forEach((side) => {
    const xPos = side * (INSPIRO_CAR_WIDTH * 0.5 + 0.068);
    DOOR_OFFSETS_Z.forEach((offset) => {
      addSingleDoorPair(root, xPos, centerZ + offset, side, mats, geos, doorPairs);
    });
  });
}

function addSingleDoorPair(
  root: THREE.Group,
  xPos: number,
  baseZ: number,
  side: -1 | 1,
  mats: IInspiroMaterials,
  geos: IInspiroGeometries,
  doorPairs: ISlidingDoorPair[],
): void {
  const trimL = new THREE.Mesh(geos.doorYellowTrim, mats.warsawYellow);
  trimL.position.set(xPos - side * 0.012, 1.98, baseZ - 0.68);
  const trimR = new THREE.Mesh(geos.doorYellowTrim, mats.warsawYellow);
  trimR.position.set(xPos - side * 0.012, 1.98, baseZ + 0.68);
  const leftLeaf = createDoorLeafGroup(mats, geos, side);
  leftLeaf.position.set(xPos, 1.98, baseZ - 0.32);
  const rightLeaf = createDoorLeafGroup(mats, geos, side);
  rightLeaf.position.set(xPos, 1.98, baseZ + 0.32);
  root.add(trimL, trimR, leftLeaf, rightLeaf);
  doorPairs.push({ leftLeaf, rightLeaf, baseZ, side: side === -1 ? 'left' : 'right' });
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
  root: THREE.Group, bogieZ: number, mats: IInspiroMaterials, geos: IInspiroGeometries, axles: THREE.Mesh[],
): void {
  const frame = new THREE.Mesh(geos.bogieFrame, mats.darkSteel);
  frame.position.set(0, 0.56, bogieZ);
  root.add(frame);
  [-0.86, 0.86].forEach((axleOff) => {
    const axle = new THREE.Mesh(geos.axle, mats.darkSteel); axle.position.set(0, 0.44, bogieZ + axleOff);
    const wheelL = new THREE.Mesh(geos.wheel, mats.wheelSteel); wheelL.position.set(-0.76, 0.44, bogieZ + axleOff);
    const wheelR = new THREE.Mesh(geos.wheel, mats.wheelSteel); wheelR.position.set(0.76, 0.44, bogieZ + axleOff);
    root.add(axle, wheelL, wheelR);
    axles.push(wheelL, wheelR);
  });
  [-0.92, 0.92].forEach((sx) => {
    const spring = new THREE.Mesh(geos.springCoil, mats.warsawYellow);
    spring.position.set(sx, 0.62, bogieZ);
    root.add(spring);
  });
}
