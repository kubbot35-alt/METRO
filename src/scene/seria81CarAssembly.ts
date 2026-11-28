import * as THREE from 'three';
import {
  SERIA81_CAR_LENGTH,
  SERIA81_CAR_WIDTH,
  type ISeria81Geometries,
  type ISeria81Materials,
} from './seria81ExteriorParts';
import { addSeria81FrontFace } from './seria81FrontAssembly';
import type { ISlidingDoorPair } from './shared/baseTrainConsist';

const DOOR_OFFSETS_Z = [-5.4, -1.8, 1.8, 5.4] as const;
const WINDOW_OFFSETS_Z = [-3.6, 0, 3.6] as const;
const FLUTE_HEIGHTS_Y = [0.84, 0.96, 1.08, 1.2] as const;
const BOGIE_OFFSETS_Z = [-5.1, 5.1] as const;

export interface IExteriorMirrorParts {
  readonly mirrorArmGeo: THREE.BoxGeometry;
  readonly mirrorHousingGeo: THREE.BoxGeometry;
  readonly mirrorGlassGeo: THREE.PlaneGeometry;
  readonly mirrorGlassMat: THREE.MeshStandardMaterial;
}

export interface ISeria81CarBuildContext {
  readonly mats: ISeria81Materials;
  readonly geos: ISeria81Geometries;
  readonly doorPairs: ISlidingDoorPair[];
  readonly axles: THREE.Mesh[];
  readonly mirrorParts: IExteriorMirrorParts;
}

export function addSeria81Car(
  root: THREE.Group,
  centerZ: number,
  isFront: boolean,
  isRear: boolean,
  ctx: ISeria81CarBuildContext,
): void {
  addSeria81CarBody(root, centerZ, ctx.mats, ctx.geos);
  addCarDoors(root, centerZ, ctx.mats, ctx.geos, ctx.doorPairs);
  BOGIE_OFFSETS_Z.forEach((bOff) => addBogie(root, centerZ + bOff, ctx.mats, ctx.geos, ctx.axles));
  if (isFront) addSeria81FrontFace(root, centerZ - SERIA81_CAR_LENGTH * 0.5, -1, true, ctx);
  if (isRear) addSeria81FrontFace(root, centerZ + SERIA81_CAR_LENGTH * 0.5, 1, false, ctx);
}

function addSeria81CarBody(
  root: THREE.Group,
  centerZ: number,
  mats: ISeria81Materials,
  geos: ISeria81Geometries,
): void {
  const shell = new THREE.Mesh(geos.carShell, mats.upperBody);
  shell.position.set(0, 0, centerZ);
  const redSkirt = new THREE.Mesh(geos.redSkirt, mats.warsawRed);
  redSkirt.position.set(0, 1.12, centerZ);
  const yellowWaist = new THREE.Mesh(geos.yellowWaist, mats.warsawYellow);
  yellowWaist.position.set(0, 1.65, centerZ);
  root.add(shell, redSkirt, yellowWaist);
  addFlutesVentsAndWindows(root, centerZ, mats, geos);
}

function addFlutesVentsAndWindows(
  root: THREE.Group,
  centerZ: number,
  mats: ISeria81Materials,
  geos: ISeria81Geometries,
): void {
  FLUTE_HEIGHTS_Y.forEach((yPos) => {
    const rib = new THREE.Mesh(geos.fluteRib, mats.corrugatedRed);
    rib.position.set(0, yPos, centerZ);
    root.add(rib);
  });
  [-5.2, -1.75, 1.75, 5.2].forEach((ventOff) => {
    const vent = new THREE.Mesh(geos.roofVent, mats.roofNavy);
    vent.position.set(0, 3.6, centerZ + ventOff);
    root.add(vent);
  });
  WINDOW_OFFSETS_Z.forEach((winOff) => {
    const frame = new THREE.Mesh(geos.sideWindowFrame, mats.rubberBlack);
    frame.position.set(0, 2.38, centerZ + winOff);
    const pane = new THREE.Mesh(geos.sideWindow, mats.sideGlass);
    pane.position.set(0, 2.38, centerZ + winOff);
    root.add(frame, pane);
  });
}

function addCarDoors(
  root: THREE.Group,
  centerZ: number,
  mats: ISeria81Materials,
  geos: ISeria81Geometries,
  doorPairs: ISlidingDoorPair[],
): void {
  ([-1, 1] as const).forEach((side) => {
    const xPos = side * (SERIA81_CAR_WIDTH * 0.5 + 0.055);
    DOOR_OFFSETS_Z.forEach((offset) => {
      const baseZ = centerZ + offset;
      const leftLeaf = createDoorLeaf(mats, geos, side);
      leftLeaf.position.set(xPos, 1.94, baseZ - 0.3);
      const rightLeaf = createDoorLeaf(mats, geos, side);
      rightLeaf.position.set(xPos, 1.94, baseZ + 0.3);
      root.add(leftLeaf, rightLeaf);
      doorPairs.push({ leftLeaf, rightLeaf, baseZ, side: side === -1 ? 'left' : 'right' });
    });
  });
}

function createDoorLeaf(mats: ISeria81Materials, geos: ISeria81Geometries, side: -1 | 1): THREE.Group {
  const leaf = new THREE.Group();
  const body = new THREE.Mesh(geos.doorLeaf, mats.upperBody);
  const glass = new THREE.Mesh(geos.doorGlass, mats.sideGlass);
  glass.position.set(side * 0.004, 0.38, 0);
  const redLower = new THREE.Mesh(geos.doorGlass, mats.warsawRed);
  redLower.scale.set(0.95, 0.95, 1.5);
  redLower.position.set(side * 0.005, -0.62, 0);
  leaf.add(body, glass, redLower);
  return leaf;
}

function addBogie(
  root: THREE.Group,
  bogieZ: number,
  mats: ISeria81Materials,
  geos: ISeria81Geometries,
  axles: THREE.Mesh[],
): void {
  const frame = new THREE.Mesh(geos.bogieFrame, mats.darkSteel);
  frame.position.set(0, 0.54, bogieZ);
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
