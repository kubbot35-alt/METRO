import * as THREE from 'three';
import type { IStationSpec, PlatformLayout } from '../domain/types';
import { addEscalatorStructure, type IStationFurnitureMaterials } from './stationEscalatorBuilder';
import { ISLAND_PLATFORM_CENTER_X, SIDE_LEFT_PLATFORM_CENTER_X, SIDE_RIGHT_PLATFORM_CENTER_X } from './stationHallBuilder';

export type { IStationFurnitureMaterials };

export function addPlatformFurniture(
  group: THREE.Group,
  station: IStationSpec,
  layout: PlatformLayout,
  centerZ: number,
  mats: IStationFurnitureMaterials,
  disposables: Array<{ dispose(): void }>,
): void {
  if (layout === 'island') addIslandFurniture(group, station.platformLengthM, centerZ, mats, disposables);
  else addSidePlatformsFurniture(group, station.platformLengthM, centerZ, mats, disposables);
}

function addIslandFurniture(
  group: THREE.Group, platformLengthM: number, centerZ: number, mats: IStationFurnitureMaterials, disposables: Array<{ dispose(): void }>,
): void {
  addSafetyEdgeStrip(group, -1.78, platformLengthM, centerZ, mats.safetyYellow, disposables);
  addSafetyEdgeStrip(group, -8.02, platformLengthM, centerZ, mats.safetyYellow, disposables);
  addIslandColumns(group, centerZ, mats, disposables);
  addEscalatorStructure(group, ISLAND_PLATFORM_CENTER_X, centerZ - 4, 2.5, mats, disposables);
  addBenchesAt(group, ISLAND_PLATFORM_CENTER_X + 0.56, [-34, 10, 30], 1, centerZ, mats, disposables);
  addBenchesAt(group, ISLAND_PLATFORM_CENTER_X - 0.56, [-34, 10, 30], -1, centerZ, mats, disposables);
  addTrashBinsAt(group, ISLAND_PLATFORM_CENTER_X, [-28, 22, 42], centerZ, mats, disposables);
  addDepartureClockBoards(group, -3.15, [-26, 22], centerZ, mats.clockScreenPlayer, mats, disposables);
  addDepartureClockBoards(group, -6.65, [-26, 22], centerZ, mats.clockScreenOpposite, mats, disposables);
}

function addIslandColumns(group: THREE.Group, centerZ: number, mats: IStationFurnitureMaterials, disposables: Array<{ dispose(): void }>): void {
  const colGeo = new THREE.CylinderGeometry(0.28, 0.32, 4.5, 12);
  const colBaseGeo = new THREE.CylinderGeometry(0.38, 0.42, 0.22, 12);
  disposables.push(colGeo, colBaseGeo);
  [-42, -24, 18, 36].forEach((offset) => {
    const col = new THREE.Mesh(colGeo, mats.column);
    col.position.set(ISLAND_PLATFORM_CENTER_X, 3.33, centerZ + offset);
    const base = new THREE.Mesh(colBaseGeo, mats.benchMetal);
    base.position.set(ISLAND_PLATFORM_CENTER_X, 1.19, centerZ + offset);
    group.add(col, base);
  });
}

function addSidePlatformsFurniture(
  group: THREE.Group, platformLengthM: number, centerZ: number, mats: IStationFurnitureMaterials, disposables: Array<{ dispose(): void }>,
): void {
  addSafetyEdgeStrip(group, 1.78, platformLengthM, centerZ, mats.safetyYellow, disposables);
  addSafetyEdgeStrip(group, -6.18, platformLengthM, centerZ, mats.safetyYellow, disposables);
  addSidePlatformColumns(group, centerZ, mats.column, disposables);
  addEscalatorStructure(group, 5.45, centerZ - 4, 1.7, mats, disposables);
  addEscalatorStructure(group, -9.85, centerZ - 4, 1.7, mats, disposables);
  addBenchesAt(group, 5.65, [-32, 16, 36], -1, centerZ, mats, disposables);
  addBenchesAt(group, -10.05, [-32, 16, 36], 1, centerZ, mats, disposables);
  addTrashBinsAt(group, 5.1, [-22, 26], centerZ, mats, disposables);
  addTrashBinsAt(group, -9.5, [-22, 26], centerZ, mats, disposables);
  addDepartureClockBoards(group, 3.35, [-24, 18], centerZ, mats.clockScreenPlayer, mats, disposables);
  addDepartureClockBoards(group, -7.75, [-24, 18], centerZ, mats.clockScreenOpposite, mats, disposables);
}

function addSidePlatformColumns(group: THREE.Group, centerZ: number, colMat: THREE.MeshStandardMaterial, disposables: Array<{ dispose(): void }>): void {
  const colGeo = new THREE.CylinderGeometry(0.24, 0.28, 4.5, 10);
  disposables.push(colGeo);
  [-38, -18, 12, 34].forEach((offset) => {
    const colR = new THREE.Mesh(colGeo, colMat);
    colR.position.set(SIDE_RIGHT_PLATFORM_CENTER_X + 0.4, 3.33, centerZ + offset);
    const colL = new THREE.Mesh(colGeo, colMat);
    colL.position.set(SIDE_LEFT_PLATFORM_CENTER_X - 0.4, 3.33, centerZ + offset);
    group.add(colR, colL);
  });
}

function addSafetyEdgeStrip(
  group: THREE.Group, xPos: number, platformLengthM: number, centerZ: number, yellowMat: THREE.MeshStandardMaterial, disposables: Array<{ dispose(): void }>,
): void {
  const stripGeo = new THREE.BoxGeometry(0.2, 0.025, platformLengthM - 0.6);
  const strip = new THREE.Mesh(stripGeo, yellowMat);
  strip.position.set(xPos, 1.095, centerZ);
  group.add(strip);
  disposables.push(stripGeo);
}

function addBenchesAt(
  group: THREE.Group, xPos: number, offsets: readonly number[], facingDirX: -1 | 1, centerZ: number, mats: IStationFurnitureMaterials, disposables: Array<{ dispose(): void }>,
): void {
  const seatGeo = new THREE.BoxGeometry(0.62, 0.07, 2.5);
  const backGeo = new THREE.BoxGeometry(0.07, 0.36, 2.5);
  const legGeo = new THREE.BoxGeometry(0.56, 0.44, 0.12);
  disposables.push(seatGeo, backGeo, legGeo);
  offsets.forEach((offset) => {
    const z = centerZ + offset;
    const seat = new THREE.Mesh(seatGeo, mats.benchWood);
    seat.position.set(xPos, 1.52, z);
    const back = new THREE.Mesh(backGeo, mats.benchWood);
    back.position.set(xPos - facingDirX * 0.29, 1.78, z);
    const legA = new THREE.Mesh(legGeo, mats.benchMetal);
    legA.position.set(xPos, 1.3, z - 0.96);
    const legB = new THREE.Mesh(legGeo, mats.benchMetal);
    legB.position.set(xPos, 1.3, z + 0.96);
    group.add(seat, back, legA, legB);
  });
}

function addTrashBinsAt(
  group: THREE.Group, xPos: number, offsets: readonly number[], centerZ: number, mats: IStationFurnitureMaterials, disposables: Array<{ dispose(): void }>,
): void {
  const binGeo = new THREE.CylinderGeometry(0.2, 0.18, 0.78, 12);
  const rimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.07, 12);
  disposables.push(binGeo, rimGeo);
  offsets.forEach((offset) => {
    const z = centerZ + offset;
    const body = new THREE.Mesh(binGeo, mats.binBody);
    body.position.set(xPos, 1.47, z);
    const rim = new THREE.Mesh(rimGeo, mats.binRim);
    rim.position.set(xPos, 1.88, z);
    group.add(body, rim);
  });
}

function addDepartureClockBoards(
  group: THREE.Group, xPos: number, offsets: readonly number[], centerZ: number, screenMat: THREE.MeshStandardMaterial, mats: IStationFurnitureMaterials, disposables: Array<{ dispose(): void }>,
): void {
  const rodGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.15, 8);
  const housingGeo = new THREE.BoxGeometry(2.35, 0.72, 0.22);
  const faceGeo = new THREE.PlaneGeometry(2.22, 0.62);
  const clockBoxGeo = new THREE.BoxGeometry(1.18, 0.46, 0.22);
  const clockFaceGeo = new THREE.PlaneGeometry(1.08, 0.38);
  disposables.push(rodGeo, housingGeo, faceGeo, clockBoxGeo, clockFaceGeo);
  offsets.forEach((offset) => {
    const z = centerZ + offset;
    addSingleSipAndClockUnit(group, xPos, z, screenMat, mats, rodGeo, housingGeo, faceGeo, clockBoxGeo, clockFaceGeo);
  });
}

function addSingleSipAndClockUnit(
  group: THREE.Group, xPos: number, z: number, screenMat: THREE.MeshStandardMaterial, mats: IStationFurnitureMaterials,
  rodGeo: THREE.CylinderGeometry, housingGeo: THREE.BoxGeometry, faceGeo: THREE.PlaneGeometry,
  clockBoxGeo: THREE.BoxGeometry, clockFaceGeo: THREE.PlaneGeometry,
): void {
  const housing = new THREE.Mesh(housingGeo, mats.clockFrame);
  housing.position.set(xPos, 4.3, z);
  const frontFace = new THREE.Mesh(faceGeo, screenMat);
  frontFace.position.set(xPos, 4.3, z + 0.115);
  const rearFace = new THREE.Mesh(faceGeo, screenMat);
  rearFace.position.set(xPos, 4.3, z - 0.115);
  rearFace.rotation.y = Math.PI;
  const clockBox = new THREE.Mesh(clockBoxGeo, mats.clockFrame);
  clockBox.position.set(xPos, 3.66, z);
  const clockFront = new THREE.Mesh(clockFaceGeo, mats.liveDigitalClock);
  clockFront.position.set(xPos, 3.66, z + 0.115);
  const clockRear = new THREE.Mesh(clockFaceGeo, mats.liveDigitalClock);
  clockRear.position.set(xPos, 3.66, z - 0.115);
  clockRear.rotation.y = Math.PI;
  const rodL = new THREE.Mesh(rodGeo, mats.benchMetal);
  rodL.position.set(xPos - 0.9, 5.05, z);
  const rodR = new THREE.Mesh(rodGeo, mats.benchMetal);
  rodR.position.set(xPos + 0.9, 5.05, z);
  group.add(housing, frontFace, rearFace, clockBox, clockFront, clockRear, rodL, rodR);
}
