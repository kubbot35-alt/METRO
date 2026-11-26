import * as THREE from 'three';
import type { IStationSpec, PlatformLayout } from '../domain/types';
import {
  ISLAND_PLATFORM_CENTER_X,
  SIDE_LEFT_PLATFORM_CENTER_X,
  SIDE_RIGHT_PLATFORM_CENTER_X,
} from './stationHallBuilder';

export interface IStationFurnitureMaterials {
  readonly column: THREE.MeshStandardMaterial;
  readonly benchWood: THREE.MeshStandardMaterial;
  readonly benchMetal: THREE.MeshStandardMaterial;
  readonly safetyYellow: THREE.MeshStandardMaterial;
  readonly binBody: THREE.MeshStandardMaterial;
  readonly binRim: THREE.MeshStandardMaterial;
  readonly clockFrame: THREE.MeshStandardMaterial;
  readonly clockScreenPlayer: THREE.MeshStandardMaterial;
  readonly clockScreenOpposite: THREE.MeshStandardMaterial;
  readonly escalatorMetal: THREE.MeshStandardMaterial;
  readonly escalatorStep: THREE.MeshStandardMaterial;
  readonly escalatorGlass: THREE.MeshStandardMaterial;
  readonly handrailBlack: THREE.MeshStandardMaterial;
  readonly exitGlow: THREE.MeshStandardMaterial;
}

export function addPlatformFurniture(
  group: THREE.Group,
  station: IStationSpec,
  layout: PlatformLayout,
  centerZ: number,
  mats: IStationFurnitureMaterials,
  disposables: Array<{ dispose(): void }>,
): void {
  if (layout === 'island') {
    addIslandFurniture(group, station.platformLengthM, centerZ, mats, disposables);
  } else {
    addSidePlatformsFurniture(group, station.platformLengthM, centerZ, mats, disposables);
  }
}

function addIslandFurniture(
  group: THREE.Group,
  platformLengthM: number,
  centerZ: number,
  mats: IStationFurnitureMaterials,
  disposables: Array<{ dispose(): void }>,
): void {
  // Yellow safety lines on BOTH sides of the island platform (player track + opposite track)
  addSafetyEdgeStrip(group, -1.78, platformLengthM, centerZ, mats.safetyYellow, disposables);
  addSafetyEdgeStrip(group, -8.02, platformLengthM, centerZ, mats.safetyYellow, disposables);

  // Central spine columns (leaving central escalator zone open)
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

  // Central spine ascending escalators + stairs leading up to mezzanine
  addEscalatorStructure(group, ISLAND_PLATFORM_CENTER_X, centerZ - 4, 2.5, mats, disposables);

  // Back-to-back benches along the central spine facing both tracks
  addBenchesAt(group, ISLAND_PLATFORM_CENTER_X + 0.56, [-34, 10, 30], 1, centerZ, mats, disposables);
  addBenchesAt(group, ISLAND_PLATFORM_CENTER_X - 0.56, [-34, 10, 30], -1, centerZ, mats, disposables);

  // Trash bins along central spine
  addTrashBinsAt(group, ISLAND_PLATFORM_CENTER_X, [-28, 22, 42], centerZ, mats, disposables);

  // Dual-track overhead departure boards (one row for player track, one row for opposite track)
  addDepartureClockBoards(group, -3.15, [-26, 22], centerZ, mats.clockScreenPlayer, mats, disposables);
  addDepartureClockBoards(group, -6.65, [-26, 22], centerZ, mats.clockScreenOpposite, mats, disposables);
}

function addSidePlatformsFurniture(
  group: THREE.Group,
  platformLengthM: number,
  centerZ: number,
  mats: IStationFurnitureMaterials,
  disposables: Array<{ dispose(): void }>,
): void {
  // Yellow safety lines on BOTH outer side platforms
  addSafetyEdgeStrip(group, 1.78, platformLengthM, centerZ, mats.safetyYellow, disposables);
  addSafetyEdgeStrip(group, -6.18, platformLengthM, centerZ, mats.safetyYellow, disposables);

  // Structural platform columns on both outer platforms
  const colGeo = new THREE.CylinderGeometry(0.24, 0.28, 4.5, 10);
  disposables.push(colGeo);
  [-38, -18, 12, 34].forEach((offset) => {
    const colR = new THREE.Mesh(colGeo, mats.column);
    colR.position.set(SIDE_RIGHT_PLATFORM_CENTER_X + 0.4, 3.33, centerZ + offset);
    const colL = new THREE.Mesh(colGeo, mats.column);
    colL.position.set(SIDE_LEFT_PLATFORM_CENTER_X - 0.4, 3.33, centerZ + offset);
    group.add(colR, colL);
  });

  // Escalators leading up along outer backs of both side platforms
  addEscalatorStructure(group, 5.45, centerZ - 4, 1.7, mats, disposables);
  addEscalatorStructure(group, -9.85, centerZ - 4, 1.7, mats, disposables);

  // Benches & trash bins on both outer platforms
  addBenchesAt(group, 5.65, [-32, 16, 36], -1, centerZ, mats, disposables);
  addBenchesAt(group, -10.05, [-32, 16, 36], 1, centerZ, mats, disposables);
  addTrashBinsAt(group, 5.1, [-22, 26], centerZ, mats, disposables);
  addTrashBinsAt(group, -9.5, [-22, 26], centerZ, mats, disposables);

  // Overhead departure boards for both tracks
  addDepartureClockBoards(group, 3.35, [-24, 18], centerZ, mats.clockScreenPlayer, mats, disposables);
  addDepartureClockBoards(group, -7.75, [-24, 18], centerZ, mats.clockScreenOpposite, mats, disposables);
}

function addSafetyEdgeStrip(
  group: THREE.Group,
  xPos: number,
  platformLengthM: number,
  centerZ: number,
  yellowMat: THREE.MeshStandardMaterial,
  disposables: Array<{ dispose(): void }>,
): void {
  const stripGeo = new THREE.BoxGeometry(0.2, 0.025, platformLengthM - 0.6);
  const strip = new THREE.Mesh(stripGeo, yellowMat);
  strip.position.set(xPos, 1.095, centerZ);
  group.add(strip);
  disposables.push(stripGeo);
}

function addEscalatorStructure(
  group: THREE.Group,
  centerX: number,
  centerZ: number,
  totalWidth: number,
  mats: IStationFurnitureMaterials,
  disposables: Array<{ dispose(): void }>,
): void {
  const runLength = 12.6;
  const riseHeight = 4.35;
  const slopeLen = Math.hypot(runLength, riseHeight);
  const pitchRad = Math.atan2(riseHeight, runLength);

  const escGroup = new THREE.Group();
  escGroup.position.set(centerX, 1.08, centerZ);

  // Main inclined truss carriage
  const trussGeo = new THREE.BoxGeometry(totalWidth, 0.58, slopeLen);
  const truss = new THREE.Mesh(trussGeo, mats.escalatorMetal);
  truss.position.set(0, riseHeight * 0.5 - 0.1, 0);
  truss.rotation.x = pitchRad;
  escGroup.add(truss);

  // Stepped treads rising up along the slope
  const stepCount = 20;
  const stepGeo = new THREE.BoxGeometry(totalWidth - 0.24, 0.14, 0.42);
  for (let i = 0; i < stepCount; i += 1) {
    const t = (i + 0.5) / stepCount;
    const step = new THREE.Mesh(stepGeo, mats.escalatorStep);
    step.position.set(0, t * riseHeight + 0.08, runLength * 0.5 - t * runLength);
    escGroup.add(step);
  }

  // Side glass balustrades + black handrails + center divider
  const sideBalGeo = new THREE.BoxGeometry(0.08, 0.92, slopeLen);
  const railGeo = new THREE.BoxGeometry(0.12, 0.09, slopeLen + 0.4);
  const balOffsets = totalWidth > 2.0 ? [-totalWidth * 0.5, 0, totalWidth * 0.5] : [-totalWidth * 0.5, totalWidth * 0.5];
  balOffsets.forEach((bx) => {
    const bal = new THREE.Mesh(sideBalGeo, mats.escalatorGlass);
    bal.position.set(bx, riseHeight * 0.5 + 0.62, 0);
    bal.rotation.x = pitchRad;
    const rail = new THREE.Mesh(railGeo, mats.handrailBlack);
    rail.position.set(bx, riseHeight * 0.5 + 1.1, 0);
    rail.rotation.x = pitchRad;
    escGroup.add(bal, rail);
  });

  // Entry landing plates & illuminated mezzanine exit arch at the top
  const landingGeo = new THREE.BoxGeometry(totalWidth + 0.2, 0.06, 1.4);
  const bottomLanding = new THREE.Mesh(landingGeo, mats.escalatorMetal);
  bottomLanding.position.set(0, 0.03, runLength * 0.5 + 0.65);

  const archBeamGeo = new THREE.BoxGeometry(totalWidth + 0.6, 0.26, 0.4);
  const archGlowGeo = new THREE.BoxGeometry(totalWidth + 0.2, 0.14, 0.44);
  const topArch = new THREE.Mesh(archBeamGeo, mats.clockFrame);
  topArch.position.set(0, riseHeight + 0.05, -runLength * 0.5);
  const topGlow = new THREE.Mesh(archGlowGeo, mats.exitGlow);
  topGlow.position.set(0, riseHeight - 0.12, -runLength * 0.5);

  escGroup.add(bottomLanding, topArch, topGlow);
  group.add(escGroup);
  disposables.push(trussGeo, stepGeo, sideBalGeo, railGeo, landingGeo, archBeamGeo, archGlowGeo);
}

function addBenchesAt(
  group: THREE.Group,
  xPos: number,
  offsets: readonly number[],
  facingDirX: -1 | 1,
  centerZ: number,
  mats: IStationFurnitureMaterials,
  disposables: Array<{ dispose(): void }>,
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
  group: THREE.Group,
  xPos: number,
  offsets: readonly number[],
  centerZ: number,
  mats: IStationFurnitureMaterials,
  disposables: Array<{ dispose(): void }>,
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
  group: THREE.Group,
  xPos: number,
  offsets: readonly number[],
  centerZ: number,
  screenMat: THREE.MeshStandardMaterial,
  mats: IStationFurnitureMaterials,
  disposables: Array<{ dispose(): void }>,
): void {
  const rodGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.15, 8);
  const housingGeo = new THREE.BoxGeometry(2.35, 0.72, 0.22);
  const faceGeo = new THREE.PlaneGeometry(2.22, 0.62);
  disposables.push(rodGeo, housingGeo, faceGeo);

  offsets.forEach((offset) => {
    const z = centerZ + offset;
    const housing = new THREE.Mesh(housingGeo, mats.clockFrame);
    housing.position.set(xPos, 4.3, z);

    const frontFace = new THREE.Mesh(faceGeo, screenMat);
    frontFace.position.set(xPos, 4.3, z + 0.115);

    const rearFace = new THREE.Mesh(faceGeo, screenMat);
    rearFace.position.set(xPos, 4.3, z - 0.115);
    rearFace.rotation.y = Math.PI;

    const rodL = new THREE.Mesh(rodGeo, mats.benchMetal);
    rodL.position.set(xPos - 0.9, 5.05, z);
    const rodR = new THREE.Mesh(rodGeo, mats.benchMetal);
    rodR.position.set(xPos + 0.9, 5.05, z);

    group.add(housing, frontFace, rearFace, rodL, rodR);
  });
}
