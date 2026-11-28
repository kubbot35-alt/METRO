import * as THREE from 'three';
import type { IStationSpec, PlatformLayout } from '../domain/types';
import { addEscalatorStructure, type IStationFurnitureMaterials } from './stationEscalatorBuilder';
import { ISLAND_PLATFORM_CENTER_X } from './stationHallBuilder';
import {
  addInstancedBenches,
  addInstancedCeilingBaffles,
  addInstancedIslandColumns,
  addInstancedSideColumns,
  addInstancedTrashBins,
} from './stationInstancedFurniture';

export type { IStationFurnitureMaterials };

const COLUMN_OFFSETS = [-44, -31, -18, -5, 8, 21, 34, 45];
const BENCH_OFFSETS = [-38, -24, -10, 10, 24, 38];
const BIN_OFFSETS = [-42, -28, -14, 0, 14, 28, 42];
const SIP_CLOCK_OFFSETS = [-42, -14, 14, 42];
const ESCALATOR_END_OFFSET = 57;

export function addPlatformFurniture(
  group: THREE.Group,
  station: IStationSpec,
  layout: PlatformLayout,
  centerZ: number,
  mats: IStationFurnitureMaterials,
  disposables: Array<{ dispose(): void }>,
): void {
  addInstancedCeilingBaffles(group, layout, centerZ, mats, disposables);
  if (layout === 'island') addIslandFurniture(group, station.platformLengthM, centerZ, mats, disposables);
  else addSidePlatformsFurniture(group, station.platformLengthM, centerZ, mats, disposables);
}

function addIslandFurniture(
  group: THREE.Group, platformLengthM: number, centerZ: number, mats: IStationFurnitureMaterials, disposables: Array<{ dispose(): void }>,
): void {
  addSafetyEdgeStrip(group, -1.78, platformLengthM, centerZ, mats.safetyYellow, disposables);
  addSafetyEdgeStrip(group, -8.02, platformLengthM, centerZ, mats.safetyYellow, disposables);
  addInstancedIslandColumns(group, centerZ, COLUMN_OFFSETS, mats, disposables);
  addEscalatorStructure(group, ISLAND_PLATFORM_CENTER_X, centerZ - ESCALATOR_END_OFFSET, 2.5, mats, disposables, 1);
  addEscalatorStructure(group, ISLAND_PLATFORM_CENTER_X, centerZ + ESCALATOR_END_OFFSET, 2.5, mats, disposables, -1);
  addInstancedBenches(
    group,
    [
      { xPos: ISLAND_PLATFORM_CENTER_X + 0.56, facingDirX: 1, offsets: BENCH_OFFSETS },
      { xPos: ISLAND_PLATFORM_CENTER_X - 0.56, facingDirX: -1, offsets: BENCH_OFFSETS },
    ],
    centerZ, mats, disposables,
  );
  addInstancedTrashBins(group, [{ xPos: ISLAND_PLATFORM_CENTER_X, offsets: BIN_OFFSETS }], centerZ, mats, disposables);
  addDepartureClockBoards(group, -3.15, SIP_CLOCK_OFFSETS, centerZ, mats.clockScreenPlayer, mats, disposables);
  addDepartureClockBoards(group, -6.65, SIP_CLOCK_OFFSETS, centerZ, mats.clockScreenOpposite, mats, disposables);
}

function addSidePlatformsFurniture(
  group: THREE.Group, platformLengthM: number, centerZ: number, mats: IStationFurnitureMaterials, disposables: Array<{ dispose(): void }>,
): void {
  addSafetyEdgeStrip(group, 1.78, platformLengthM, centerZ, mats.safetyYellow, disposables);
  addSafetyEdgeStrip(group, -6.18, platformLengthM, centerZ, mats.safetyYellow, disposables);
  addInstancedSideColumns(group, centerZ, COLUMN_OFFSETS, mats, disposables);
  addEscalatorStructure(group, 5.45, centerZ - ESCALATOR_END_OFFSET, 1.7, mats, disposables, 1);
  addEscalatorStructure(group, 5.45, centerZ + ESCALATOR_END_OFFSET, 1.7, mats, disposables, -1);
  addEscalatorStructure(group, -9.85, centerZ - ESCALATOR_END_OFFSET, 1.7, mats, disposables, 1);
  addEscalatorStructure(group, -9.85, centerZ + ESCALATOR_END_OFFSET, 1.7, mats, disposables, -1);
  addInstancedBenches(
    group,
    [
      { xPos: 5.65, facingDirX: -1, offsets: BENCH_OFFSETS },
      { xPos: -10.05, facingDirX: 1, offsets: BENCH_OFFSETS },
    ],
    centerZ, mats, disposables,
  );
  addInstancedTrashBins(
    group,
    [
      { xPos: 5.1, offsets: BIN_OFFSETS },
      { xPos: -9.5, offsets: BIN_OFFSETS },
    ],
    centerZ, mats, disposables,
  );
  addDepartureClockBoards(group, 3.35, SIP_CLOCK_OFFSETS, centerZ, mats.clockScreenPlayer, mats, disposables);
  addDepartureClockBoards(group, -7.75, SIP_CLOCK_OFFSETS, centerZ, mats.clockScreenOpposite, mats, disposables);
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
