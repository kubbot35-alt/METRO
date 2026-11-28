import * as THREE from 'three';
import { INTERIOR_CEIL_Y, INTERIOR_FLOOR_Y, INTERIOR_HALF_W, type IInteriorMaterials } from './interiorMaterials';

export interface IInteriorDoorLeaf {
  readonly mesh: THREE.Object3D;
  readonly baseZ: number;
  readonly slideDir: -1 | 1;
}

const DOOR_SLIDE_M = 0.66;

export function buildShellAndWindows(root: THREE.Group, mats: IInteriorMaterials, disposables: Array<{ dispose(): void }>): void {
  const len = 17.6;
  const centerZ = 10.8;
  buildFloorCeilingAndBulkheads(root, len, centerZ, mats, disposables);
  const headerGeo = new THREE.BoxGeometry(0.09, 0.28, len);
  const mullionGeo = new THREE.BoxGeometry(0.11, INTERIOR_CEIL_Y - INTERIOR_FLOOR_Y, 0.16);
  const thresholdGeo = new THREE.BoxGeometry(0.18, 0.015, 1.72);
  disposables.push(headerGeo, mullionGeo, thresholdGeo);
  [-1, 1].forEach((sideSign) => buildSideWallBayMeshes(root, sideSign, centerZ, headerGeo, mullionGeo, thresholdGeo, mats, disposables));
}

function buildFloorCeilingAndBulkheads(
  root: THREE.Group, len: number, centerZ: number, mats: IInteriorMaterials, disposables: Array<{ dispose(): void }>,
): void {
  const floorGeo = new THREE.BoxGeometry(INTERIOR_HALF_W * 2, 0.08, len);
  const aisleGeo = new THREE.BoxGeometry(1.18, 0.085, len - 0.4);
  const ceilGeo = new THREE.BoxGeometry(INTERIOR_HALF_W * 2, 0.1, len);
  const lampStripGeo = new THREE.BoxGeometry(0.16, 0.05, len - 1.2);
  const bulkGeo = new THREE.BoxGeometry(INTERIOR_HALF_W * 2, INTERIOR_CEIL_Y - INTERIOR_FLOOR_Y, 0.16);
  const doorFrameGeo = new THREE.BoxGeometry(0.95, 1.95, 0.19);
  const cabWinGeo = new THREE.BoxGeometry(0.68, 0.92, 0.21);
  disposables.push(floorGeo, aisleGeo, ceilGeo, lampStripGeo, bulkGeo, doorFrameGeo, cabWinGeo);

  const floor = new THREE.Mesh(floorGeo, mats.floor); floor.position.set(0, INTERIOR_FLOOR_Y - 0.04, centerZ);
  const aisle = new THREE.Mesh(aisleGeo, mats.aisleStrip); aisle.position.set(0, INTERIOR_FLOOR_Y - 0.036, centerZ);
  const ceil = new THREE.Mesh(ceilGeo, mats.ceiling); ceil.position.set(0, INTERIOR_CEIL_Y + 0.05, centerZ);
  const lampL = new THREE.Mesh(lampStripGeo, mats.ceilingLamp); lampL.position.set(-0.56, INTERIOR_CEIL_Y - 0.02, centerZ);
  const lampR = new THREE.Mesh(lampStripGeo, mats.ceilingLamp); lampR.position.set(0.56, INTERIOR_CEIL_Y - 0.02, centerZ);
  const frontWall = new THREE.Mesh(bulkGeo, mats.wall); frontWall.position.set(0, (INTERIOR_FLOOR_Y + INTERIOR_CEIL_Y) * 0.5, 2.0);
  const cabDoor = new THREE.Mesh(doorFrameGeo, mats.bulkheadDark); cabDoor.position.set(0, INTERIOR_FLOOR_Y + 0.98, 2.01);
  const cabWin = new THREE.Mesh(cabWinGeo, mats.windowGlass); cabWin.position.set(0, INTERIOR_FLOOR_Y + 1.48, 2.02);
  const rearWall = new THREE.Mesh(bulkGeo, mats.bulkheadDark); rearWall.position.set(0, (INTERIOR_FLOOR_Y + INTERIOR_CEIL_Y) * 0.5, 19.6);
  root.add(floor, aisle, ceil, lampL, lampR, frontWall, cabDoor, cabWin, rearWall);
}

function buildSideWallBayMeshes(
  root: THREE.Group, sideSign: number, centerZ: number, headerGeo: THREE.BoxGeometry, mullionGeo: THREE.BoxGeometry,
  thresholdGeo: THREE.BoxGeometry, mats: IInteriorMaterials, disposables: Array<{ dispose(): void }>,
): void {
  const wallX = sideSign * INTERIOR_HALF_W;
  const header = new THREE.Mesh(headerGeo, mats.wall);
  header.position.set(wallX, INTERIOR_CEIL_Y - 0.12, centerZ);
  root.add(header);
  ([[2.05, 5.75], [7.45, 11.45], [13.15, 19.55]] as ReadonlyArray<[number, number]>).forEach(([zStart, zEnd]) => {
    addSideWindowBay(root, wallX, sideSign, zStart, zEnd, mullionGeo, mats, disposables);
  });
  [6.6, 12.3].forEach((dz) => {
    const threshold = new THREE.Mesh(thresholdGeo, mats.yellowEdge);
    threshold.position.set(wallX - sideSign * 0.12, INTERIOR_FLOOR_Y + 0.008, dz);
    root.add(threshold);
  });
}

function addSideWindowBay(
  root: THREE.Group, wallX: number, sideSign: number, zStart: number, zEnd: number,
  mullionGeo: THREE.BoxGeometry, mats: IInteriorMaterials, disposables: Array<{ dispose(): void }>,
): void {
  const bayLen = zEnd - zStart;
  const midZ = (zStart + zEnd) * 0.5;
  const waistGeo = new THREE.BoxGeometry(0.09, 0.9, bayLen);
  const glassGeo = new THREE.PlaneGeometry(bayLen - 0.14, 1.06);
  disposables.push(waistGeo, glassGeo);
  const waist = new THREE.Mesh(waistGeo, mats.wall); waist.position.set(wallX, INTERIOR_FLOOR_Y + 0.45, midZ);
  const glass = new THREE.Mesh(glassGeo, mats.windowGlass); glass.position.set(wallX - sideSign * 0.02, INTERIOR_FLOOR_Y + 1.43, midZ);
  glass.rotation.y = sideSign > 0 ? -Math.PI / 2 : Math.PI / 2;
  const pillarA = new THREE.Mesh(mullionGeo, mats.wall); pillarA.position.set(wallX, (INTERIOR_FLOOR_Y + INTERIOR_CEIL_Y) * 0.5, zStart);
  const pillarB = new THREE.Mesh(mullionGeo, mats.wall); pillarB.position.set(wallX, (INTERIOR_FLOOR_Y + INTERIOR_CEIL_Y) * 0.5, zEnd);
  root.add(waist, glass, pillarA, pillarB);
}

export function buildSlidingDoors(root: THREE.Group, wallX: number, mats: IInteriorMaterials, disposables: Array<{ dispose(): void }>): readonly IInteriorDoorLeaf[] {
  const leaves: IInteriorDoorLeaf[] = [];
  const lowerGeo = new THREE.BoxGeometry(0.06, 0.98, 0.83);
  const frameTopGeo = new THREE.BoxGeometry(0.06, 0.16, 0.83);
  const stileGeo = new THREE.BoxGeometry(0.06, 0.92, 0.1);
  const glassGeo = new THREE.BoxGeometry(0.025, 0.88, 0.62);
  disposables.push(lowerGeo, frameTopGeo, stileGeo, glassGeo);
  [6.6, 12.3].forEach((dz) => {
    ([-1, 1] as const).forEach((dir) => {
      const leaf = new THREE.Group();
      const baseZ = dz + dir * 0.42;
      leaf.position.set(wallX, INTERIOR_FLOOR_Y, baseZ);
      const lower = new THREE.Mesh(lowerGeo, mats.doorPanel); lower.position.y = 0.49;
      const top = new THREE.Mesh(frameTopGeo, mats.doorPanel); top.position.y = 1.9;
      const stileL = new THREE.Mesh(stileGeo, mats.doorPanel); stileL.position.set(0, 1.42, -0.36);
      const stileR = new THREE.Mesh(stileGeo, mats.doorPanel); stileR.position.set(0, 1.42, 0.36);
      const glass = new THREE.Mesh(glassGeo, mats.windowGlass); glass.position.set(0, 1.42, 0);
      leaf.add(lower, top, stileL, stileR, glass);
      root.add(leaf);
      leaves.push({ mesh: leaf, baseZ, slideDir: dir });
    });
  });
  return leaves;
}

export function animateInteriorDoors(leaves: readonly IInteriorDoorLeaf[], openAmount: number): void {
  for (let i = 0; i < leaves.length; i += 1) {
    leaves[i].mesh.position.z = leaves[i].baseZ + leaves[i].slideDir * openAmount * DOOR_SLIDE_M;
  }
}

export function buildSeatsAndHandrails(root: THREE.Group, mats: IInteriorMaterials, disposables: Array<{ dispose(): void }>): void {
  const vPoleGeo = new THREE.CylinderGeometry(0.022, 0.022, INTERIOR_CEIL_Y - INTERIOR_FLOOR_Y, 8);
  const hRailGeo = new THREE.CylinderGeometry(0.02, 0.02, 16.4, 8);
  const bracketGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.44, 6);
  const strapLoopGeo = new THREE.TorusGeometry(0.055, 0.011, 6, 12);
  const strapStemGeo = new THREE.BoxGeometry(0.018, 0.16, 0.018);
  disposables.push(vPoleGeo, hRailGeo, bracketGeo, strapLoopGeo, strapStemGeo);
  [-1, 1].forEach((sideSign) => buildSideSeatsAndRails(root, sideSign, vPoleGeo, hRailGeo, bracketGeo, strapLoopGeo, strapStemGeo, mats, disposables));
}

function buildSideSeatsAndRails(
  root: THREE.Group, sideSign: number, vPoleGeo: THREE.CylinderGeometry, hRailGeo: THREE.CylinderGeometry,
  bracketGeo: THREE.CylinderGeometry, strapLoopGeo: THREE.TorusGeometry, strapStemGeo: THREE.BoxGeometry,
  mats: IInteriorMaterials, disposables: Array<{ dispose(): void }>,
): void {
  ([[2.35, 5.45], [7.75, 11.15], [13.45, 18.8]] as ReadonlyArray<[number, number]>).forEach(([zA, zB]) => {
    const len = zB - zA;
    const midZ = (zA + zB) * 0.5;
    const baseGeo = new THREE.BoxGeometry(0.46, 0.42, len);
    const cushionGeo = new THREE.BoxGeometry(0.48, 0.08, len - 0.04);
    const backGeo = new THREE.BoxGeometry(0.08, 0.44, len - 0.04);
    disposables.push(baseGeo, cushionGeo, backGeo);
    const base = new THREE.Mesh(baseGeo, mats.seatFrame); base.position.set(sideSign * 1.07, INTERIOR_FLOOR_Y + 0.21, midZ);
    const cushion = new THREE.Mesh(cushionGeo, mats.seatCushion); cushion.position.set(sideSign * 1.06, INTERIOR_FLOOR_Y + 0.45, midZ);
    const back = new THREE.Mesh(backGeo, mats.seatBack); back.position.set(sideSign * 1.26, INTERIOR_FLOOR_Y + 0.68, midZ);
    root.add(base, cushion, back);
  });
  attachGrabRailsAndStraps(root, sideSign, vPoleGeo, hRailGeo, bracketGeo, strapLoopGeo, strapStemGeo, mats);
}

function attachGrabRailsAndStraps(
  root: THREE.Group, sideSign: number, vPoleGeo: THREE.CylinderGeometry, hRailGeo: THREE.CylinderGeometry,
  bracketGeo: THREE.CylinderGeometry, strapLoopGeo: THREE.TorusGeometry, strapStemGeo: THREE.BoxGeometry, mats: IInteriorMaterials,
): void {
  const hRail = new THREE.Mesh(hRailGeo, mats.handrail);
  hRail.rotation.x = Math.PI / 2;
  hRail.position.set(sideSign * 0.66, INTERIOR_FLOOR_Y + 1.84, 10.6);
  root.add(hRail);
  for (let z = 3.2; z <= 18.0; z += 3.0) {
    const hanger = new THREE.Mesh(bracketGeo, mats.handrail);
    hanger.position.set(sideSign * 0.66, INTERIOR_FLOOR_Y + 2.04, z);
    root.add(hanger);
  }
  for (let z = 3.8; z <= 17.5; z += 1.45) {
    const stem = new THREE.Mesh(strapStemGeo, mats.strap); stem.position.set(sideSign * 0.66, INTERIOR_FLOOR_Y + 1.74, z);
    const loop = new THREE.Mesh(strapLoopGeo, mats.strap); loop.position.set(sideSign * 0.66, INTERIOR_FLOOR_Y + 1.63, z);
    loop.rotation.y = Math.PI / 2;
    root.add(stem, loop);
  }
  [5.6, 7.6, 11.3, 13.3, 16.2].forEach((pz) => {
    const pole = new THREE.Mesh(vPoleGeo, mats.handrail);
    pole.position.set(sideSign * 0.78, (INTERIOR_FLOOR_Y + INTERIOR_CEIL_Y) * 0.5, pz);
    root.add(pole);
  });
}

export function buildSaloonLights(root: THREE.Group): readonly THREE.PointLight[] {
  const lightA = new THREE.PointLight(0xf0f9ff, 12.5, 16, 1.3);
  lightA.position.set(0, INTERIOR_CEIL_Y - 0.25, 6.2);
  const lightB = new THREE.PointLight(0xf0f9ff, 12.5, 16, 1.3);
  lightB.position.set(0, INTERIOR_CEIL_Y - 0.25, 13.8);
  root.add(lightA, lightB);
  return [lightA, lightB];
}
