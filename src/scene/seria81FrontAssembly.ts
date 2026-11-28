import * as THREE from 'three';
import type { IExteriorMirrorParts, ISeria81CarBuildContext } from './seria81CarAssembly';
import { SERIA81_CAR_WIDTH, type ISeria81Geometries, type ISeria81Materials } from './seria81ExteriorParts';

export function addSeria81FrontFace(
  root: THREE.Group,
  endZ: number,
  dir: -1 | 1,
  isFront: boolean,
  ctx: ISeria81CarBuildContext,
): void {
  const face = new THREE.Group();
  face.position.set(0, 0, endZ);
  face.rotation.y = dir === -1 ? 0 : Math.PI;
  addFrontPlatesAndChevrons(face, ctx.mats, ctx.geos);
  addFrontWindshieldsAndDestBoard(face, ctx.mats, ctx.geos);
  addFrontHeadlamps(face, isFront, ctx.mats, ctx.geos);
  addFrontWingMirrors(face, ctx.mats, ctx.mirrorParts);
  root.add(face);
}

function addFrontPlatesAndChevrons(
  face: THREE.Group,
  mats: ISeria81Materials,
  geos: ISeria81Geometries,
): void {
  const frontPlate = new THREE.Mesh(geos.frontPlate, mats.upperBody);
  frontPlate.position.set(0, 2.08, -0.06);
  const lowerRedFace = new THREE.Mesh(geos.frontPlate, mats.warsawRed);
  lowerRedFace.scale.set(1.005, 0.3, 1.05);
  lowerRedFace.position.set(0, 1.12, -0.075);
  const coupler = new THREE.Mesh(geos.coupler, mats.darkSteel);
  coupler.position.set(0, 0.58, -0.36);
  face.add(frontPlate, lowerRedFace, coupler);
  ([-1, 1] as const).forEach((s) => {
    const chev = new THREE.Mesh(geos.chevronBar, mats.chevronWhite);
    chev.position.set(s * 0.62, 1.62, -0.195);
    chev.rotation.z = s * 0.26;
    const yChev = new THREE.Mesh(geos.chevronBar, mats.warsawYellow);
    yChev.scale.set(0.95, 0.72, 1.05);
    yChev.position.set(s * 0.62, 1.48, -0.198);
    yChev.rotation.z = s * 0.26;
    face.add(chev, yChev);
  });
}

function addFrontWindshieldsAndDestBoard(
  face: THREE.Group,
  mats: ISeria81Materials,
  geos: ISeria81Geometries,
): void {
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
  const destBoard = new THREE.Mesh(geos.destBoardPlane, mats.destBoardMat);
  destBoard.position.set(0.58, 2.75, -0.255);
  destBoard.rotation.y = Math.PI;
  face.add(centerPillar, destBoard);
}

function addFrontHeadlamps(
  face: THREE.Group,
  isFront: boolean,
  mats: ISeria81Materials,
  geos: ISeria81Geometries,
): void {
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
}

function addFrontWingMirrors(
  face: THREE.Group,
  mats: ISeria81Materials,
  mirrorParts: IExteriorMirrorParts,
): void {
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
}
