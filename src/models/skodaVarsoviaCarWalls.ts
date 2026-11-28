import * as THREE from 'three';
import {
  VARSOVIA_DIMENSIONS,
  type ISkodaVarsoviaGeometries,
  type ISkodaVarsoviaMaterials,
} from './skodaVarsoviaTypes';

const PIER_CENTERS_Z = [-4.8, 0, 4.8] as const;

export function addSkodaCarWalls(
  car: THREE.Group,
  isFrontCab: boolean,
  isRearCab: boolean,
  g: ISkodaVarsoviaGeometries,
  m: ISkodaVarsoviaMaterials,
  extraGeos: THREE.BufferGeometry[],
): void {
  const innerGeo = new THREE.BoxGeometry(0.02, 0.9, 3.44);
  const cabGlassGeo = new THREE.BoxGeometry(0.02, 1.04, 1.25);
  const cabPillarGeo = new THREE.BoxGeometry(0.07, 1.06, 0.3);
  extraGeos.push(innerGeo, cabGlassGeo, cabPillarGeo);
  for (const s of [-1, 1] as const) {
    const wallX = s * (VARSOVIA_DIMENSIONS.halfW - 0.035);
    for (const pz of PIER_CENTERS_Z) {
      addSidePier(car, wallX, pz, s, g, m, innerGeo);
    }
    for (const ez of [-8.73, 8.73]) {
      const isCabEnd = (isFrontCab && ez > 0) || (isRearCab && ez < 0);
      addEndSideSection(car, wallX, ez, isCabEnd, g, m, cabGlassGeo, cabPillarGeo);
    }
  }
}

function addSidePier(
  car: THREE.Group,
  wallX: number,
  pz: number,
  sideSign: 1 | -1,
  g: ISkodaVarsoviaGeometries,
  m: ISkodaVarsoviaMaterials,
  innerGeo: THREE.BoxGeometry,
): void {
  const parts: Array<[THREE.BufferGeometry, THREE.Material, number, number, number]> = [
    [g.pierWhiteSkirt, m.whiteBody, wallX, 1.15, pz],
    [g.pierRed, m.warsawRed, wallX, 1.47, pz],
    [g.pierYellow, m.warsawYellow, wallX, 1.83, pz],
    [g.pierBlackSill, m.blackBand, wallX, 1.99, pz],
    [g.pierPillar, m.blackBand, wallX, 2.57, pz - 1.52],
    [g.pierPillar, m.blackBand, wallX, 2.57, pz + 1.52],
    [g.pierGlass, m.windowGlass, wallX, 2.57, pz],
    [innerGeo, m.interiorWall, wallX - sideSign * 0.045, 1.58, pz],
  ];
  for (const [geo, mat, x, y, z] of parts) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    car.add(mesh);
  }
}

function addEndSideSection(
  car: THREE.Group,
  wallX: number,
  ez: number,
  isCabEnd: boolean,
  g: ISkodaVarsoviaGeometries,
  m: ISkodaVarsoviaMaterials,
  cabGlassGeo: THREE.BoxGeometry,
  cabPillarGeo: THREE.BoxGeometry,
): void {
  const skirt = new THREE.Mesh(g.endWhiteSkirt, m.whiteBody);
  skirt.position.set(wallX, 1.15, ez);
  const red = new THREE.Mesh(g.endRed, m.warsawRed);
  red.position.set(wallX, 1.47, ez);
  const yellow = new THREE.Mesh(g.endYellow, m.warsawYellow);
  yellow.position.set(wallX, 1.83, ez);
  const sill = new THREE.Mesh(g.endBlackSill, m.blackBand);
  sill.position.set(wallX, 1.99, ez);
  car.add(skirt, red, yellow, sill);
  addEndSideGlazing(car, wallX, ez, isCabEnd, g, m, cabGlassGeo, cabPillarGeo);
}

function addEndSideGlazing(
  car: THREE.Group,
  wallX: number,
  ez: number,
  isCabEnd: boolean,
  g: ISkodaVarsoviaGeometries,
  m: ISkodaVarsoviaMaterials,
  cabGlassGeo: THREE.BoxGeometry,
  cabPillarGeo: THREE.BoxGeometry,
): void {
  if (isCabEnd) {
    const glass = new THREE.Mesh(cabGlassGeo, m.windowGlass);
    glass.position.set(wallX, 2.57, ez);
    const pillar = new THREE.Mesh(cabPillarGeo, m.blackBand);
    pillar.position.set(wallX, 2.57, ez - Math.sign(ez) * 0.72);
    car.add(glass, pillar);
    return;
  }
  const upper = new THREE.Mesh(g.endBlackUpper, m.blackBand);
  upper.position.set(wallX, 2.57, ez);
  car.add(upper);
}
