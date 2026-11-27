import * as THREE from 'three';
import type { DoorSide, MetroLineId } from '../domain/types';
import {
  SERIA81_CAR_GAP,
  SERIA81_CAR_LENGTH,
  SERIA81_CAR_WIDTH,
  createSeria81Geometries,
  createSeria81Materials,
  type ISeria81Geometries,
  type ISeria81Materials,
} from './seria81ExteriorParts';
import { createSeria81DestBoard } from './seria81Textures';

export interface ISeria81ConsistBuild {
  readonly group: THREE.Group;
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
const FLUTE_HEIGHTS_Y = [0.84, 0.96, 1.08, 1.2] as const;
const BOGIE_OFFSETS_Z = [-5.1, 5.1] as const;

export function buildSeria81Consist(maxAnisotropy: number): ISeria81ConsistBuild {
  const disposables: Array<{ dispose(): void }> = [];
  const group = new THREE.Group();
  group.name = 'Seria81WarsawConsist';

  const destBoard = createSeria81DestBoard(maxAnisotropy);
  const mats = createSeria81Materials(destBoard.texture);
  const geos = createSeria81Geometries();
  disposables.push(destBoard, ...Object.values(mats), ...Object.values(geos));

  const doorPairs: ISlidingDoorPair[] = [];
  const axles: THREE.Mesh[] = [];

  const mirrorArmGeo = new THREE.BoxGeometry(0.24, 0.022, 0.022);
  const mirrorHousingGeo = new THREE.BoxGeometry(0.06, 0.28, 0.16);
  const mirrorGlassGeo = new THREE.PlaneGeometry(0.14, 0.24);
  const mirrorGlassMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.12,
    metalness: 0.92,
  });
  disposables.push(mirrorArmGeo, mirrorHousingGeo, mirrorGlassGeo, mirrorGlassMat);

  for (let i = 0; i < CAR_COUNT; i += 1) {
    const carZ = i * (SERIA81_CAR_LENGTH + SERIA81_CAR_GAP) + SERIA81_CAR_LENGTH * 0.5;
    addSeria81Car(
      group,
      carZ,
      i === 0,
      i === CAR_COUNT - 1,
      mats,
      geos,
      doorPairs,
      axles,
      { mirrorArmGeo, mirrorHousingGeo, mirrorGlassGeo, mirrorGlassMat },
    );
    if (i < CAR_COUNT - 1) {
      const gangway = new THREE.Mesh(geos.gangway, mats.rubberBlack);
      gangway.position.set(0, 1.98, carZ + SERIA81_CAR_LENGTH * 0.5 + SERIA81_CAR_GAP * 0.5);
      group.add(gangway);
    }
  }

  let leftDoorProgress = 0;
  let rightDoorProgress = 0;
  return {
    group,
    setDoorsOpen: (openSide: DoorSide | null, dtSec: number): void => {
      const safeDt = Math.max(dtSec, 0.016);
      leftDoorProgress = THREE.MathUtils.damp(
        leftDoorProgress,
        openSide === 'left' ? 1 : 0,
        6.2,
        safeDt,
      );
      rightDoorProgress = THREE.MathUtils.damp(
        rightDoorProgress,
        openSide === 'right' ? 1 : 0,
        6.2,
        safeDt,
      );
      for (let i = 0; i < doorPairs.length; i += 1) {
        const pair = doorPairs[i];
        const progress = pair.side === 'left' ? leftDoorProgress : rightDoorProgress;
        const slide = progress * 0.52;
        pair.leftLeaf.position.z = pair.baseZ - 0.3 - slide;
        pair.rightLeaf.position.z = pair.baseZ + 0.3 + slide;
      }
    },
    setHeadlights: (on: boolean): void => {
      mats.warmHeadlamp.emissiveIntensity = on ? 4.4 : 0.14;
    },
    setLine: (lineId: MetroLineId, destinationLed: string): void => {
      destBoard.setLine(lineId, destinationLed);
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

interface IExteriorMirrorParts {
  readonly mirrorArmGeo: THREE.BoxGeometry;
  readonly mirrorHousingGeo: THREE.BoxGeometry;
  readonly mirrorGlassGeo: THREE.PlaneGeometry;
  readonly mirrorGlassMat: THREE.MeshStandardMaterial;
}

function addSeria81Car(
  root: THREE.Group,
  centerZ: number,
  isFront: boolean,
  isRear: boolean,
  mats: ISeria81Materials,
  geos: ISeria81Geometries,
  doorPairs: ISlidingDoorPair[],
  axles: THREE.Mesh[],
  mirrorParts: IExteriorMirrorParts,
): void {
  const shell = new THREE.Mesh(geos.carShell, mats.upperBody);
  shell.position.set(0, 0, centerZ);

  const redSkirt = new THREE.Mesh(geos.redSkirt, mats.warsawRed);
  redSkirt.position.set(0, 1.12, centerZ);

  const yellowWaist = new THREE.Mesh(geos.yellowWaist, mats.warsawYellow);
  yellowWaist.position.set(0, 1.65, centerZ);

  root.add(shell, redSkirt, yellowWaist);

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

  addCarDoors(root, centerZ, mats, geos, doorPairs);
  BOGIE_OFFSETS_Z.forEach((bOff) => addBogie(root, centerZ + bOff, mats, geos, axles));

  if (isFront) {
    addSeria81FrontFace(root, centerZ - SERIA81_CAR_LENGTH * 0.5, -1, true, mats, geos, mirrorParts);
  }
  if (isRear) {
    addSeria81FrontFace(root, centerZ + SERIA81_CAR_LENGTH * 0.5, 1, false, mats, geos, mirrorParts);
  }
}

function addCarDoors(
  root: THREE.Group,
  centerZ: number,
  mats: ISeria81Materials,
  geos: ISeria81Geometries,
  doorPairs: ISlidingDoorPair[],
): void {
  const sides: readonly (-1 | 1)[] = [1, -1];
  sides.forEach((side) => {
    const xPos = side * (SERIA81_CAR_WIDTH * 0.5 + 0.055);
    DOOR_OFFSETS_Z.forEach((offset) => {
      const baseZ = centerZ + offset;
      const leftLeaf = createDoorLeaf(mats, geos, side);
      leftLeaf.position.set(xPos, 1.94, baseZ - 0.3);
      const rightLeaf = createDoorLeaf(mats, geos, side);
      rightLeaf.position.set(xPos, 1.94, baseZ + 0.3);
      root.add(leftLeaf, rightLeaf);
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
  mats: ISeria81Materials,
  geos: ISeria81Geometries,
  side: -1 | 1,
): THREE.Group {
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

function addSeria81FrontFace(
  root: THREE.Group,
  endZ: number,
  dir: -1 | 1,
  isFront: boolean,
  mats: ISeria81Materials,
  geos: ISeria81Geometries,
  mirrorParts: IExteriorMirrorParts,
): void {
  const face = new THREE.Group();
  face.position.set(0, 0, endZ);
  face.rotation.y = dir === -1 ? 0 : Math.PI;

  const frontPlate = new THREE.Mesh(geos.frontPlate, mats.upperBody);
  frontPlate.position.set(0, 2.08, -0.06);

  const lowerRedFace = new THREE.Mesh(geos.frontPlate, mats.warsawRed);
  lowerRedFace.scale.set(1.005, 0.3, 1.05);
  lowerRedFace.position.set(0, 1.12, -0.075);

  const chevronL = new THREE.Mesh(geos.chevronBar, mats.chevronWhite);
  chevronL.position.set(-0.62, 1.62, -0.195);
  chevronL.rotation.z = -0.26;
  const chevronR = new THREE.Mesh(geos.chevronBar, mats.chevronWhite);
  chevronR.position.set(0.62, 1.62, -0.195);
  chevronR.rotation.z = 0.26;

  const yellowChevL = new THREE.Mesh(geos.chevronBar, mats.warsawYellow);
  yellowChevL.scale.set(0.95, 0.72, 1.05);
  yellowChevL.position.set(-0.62, 1.48, -0.198);
  yellowChevL.rotation.z = -0.26;
  const yellowChevR = new THREE.Mesh(geos.chevronBar, mats.warsawYellow);
  yellowChevR.scale.set(0.95, 0.72, 1.05);
  yellowChevR.position.set(0.62, 1.48, -0.198);
  yellowChevR.rotation.z = 0.26;

  // Split front windshields with black rubber gaskets + dual wipers
  ([-0.58, 0.58] as const).forEach((wx) => {
    const gasket = new THREE.Mesh(geos.frontGasketFrame, mats.rubberBlack);
    gasket.position.set(wx, 2.48, -0.19);
    const glass = new THREE.Mesh(geos.frontWindshieldPane, mats.windshieldGlass);
    glass.position.set(wx, 2.48, -0.2);
    const wiper = new THREE.Mesh(geos.wiperArm, mats.rubberBlack);
    wiper.position.set(wx + 0.12, 2.18, -0.26);
    wiper.rotation.z = 0.85;
    face.add(gasket, glass, wiper);
  });

  const centerPillar = new THREE.Mesh(geos.frontCenterPillar, mats.upperBody);
  centerPillar.position.set(0, 2.48, -0.19);

  // Classic white destination board behind upper-right windshield
  const destBoard = new THREE.Mesh(geos.destBoardPlane, mats.destBoardMat);
  destBoard.position.set(0.58, 2.75, -0.255);
  destBoard.rotation.y = Math.PI;

  // 6 Classic Round Headlamps: 2 pairs low + 2 upper above windshield
  const lampPositions: ReadonlyArray<{ x: number; y: number; isTailCandidate: boolean }> = [
    { x: -1.04, y: 1.22, isTailCandidate: true },
    { x: -0.74, y: 1.22, isTailCandidate: false },
    { x: 0.74, y: 1.22, isTailCandidate: false },
    { x: 1.04, y: 1.22, isTailCandidate: true },
    { x: -0.36, y: 3.24, isTailCandidate: false },
    { x: 0.36, y: 3.24, isTailCandidate: false },
  ];
  lampPositions.forEach((pos) => {
    const bezel = new THREE.Mesh(geos.headlampBezel, mats.chromeSteel);
    bezel.position.set(pos.x, pos.y, -0.21);
    const lensMat = !isFront && pos.isTailCandidate ? mats.redTaillamp : mats.warmHeadlamp;
    const lens = new THREE.Mesh(geos.headlampLens, lensMat);
    lens.position.set(pos.x, pos.y, -0.22);
    face.add(bezel, lens);
  });

  const coupler = new THREE.Mesh(geos.coupler, mats.darkSteel);
  coupler.position.set(0, 0.58, -0.36);

  // Physical 3D exterior wing mirrors on metal brackets flanking the cab
  ([-1, 1] as const).forEach((side) => {
    const mirrorUnit = new THREE.Group();
    mirrorUnit.position.set(side * (SERIA81_CAR_WIDTH * 0.5 + 0.14), 2.52, 0.14);
    const armTop = new THREE.Mesh(mirrorParts.mirrorArmGeo, mats.chromeSteel);
    armTop.position.set(-side * 0.09, 0.09, 0);
    const armBot = new THREE.Mesh(mirrorParts.mirrorArmGeo, mats.chromeSteel);
    armBot.position.set(-side * 0.09, -0.09, 0);
    const casing = new THREE.Mesh(mirrorParts.mirrorHousingGeo, mats.rubberBlack);
    casing.rotation.y = -side * 0.28;
    const glass = new THREE.Mesh(mirrorParts.mirrorGlassGeo, mirrorParts.mirrorGlassMat);
    glass.position.set(0, 0, 0.082);
    glass.rotation.y = -side * 0.28;
    mirrorUnit.add(armTop, armBot, casing, glass);
    face.add(mirrorUnit);
  });

  face.add(
    frontPlate,
    lowerRedFace,
    chevronL,
    chevronR,
    yellowChevL,
    yellowChevR,
    centerPillar,
    destBoard,
    coupler,
  );
  root.add(face);
}
