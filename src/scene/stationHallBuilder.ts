import * as THREE from 'three';
import type { IStationSpec, PlatformLayout } from '../domain/types';

export interface IHallMaterials {
  readonly platform: THREE.MeshStandardMaterial;
  readonly ceiling: THREE.MeshStandardMaterial;
  readonly column: THREE.MeshStandardMaterial;
  readonly lightStrip: THREE.MeshStandardMaterial;
  readonly stopStrip: THREE.MeshStandardMaterial;
  readonly stopBoard: THREE.MeshStandardMaterial;
  readonly portalConcrete: THREE.MeshStandardMaterial;
  readonly emergencyLamp: THREE.MeshStandardMaterial;
  readonly yellowBeacon: THREE.MeshStandardMaterial;
  readonly yellowBeaconHalo: THREE.MeshBasicMaterial;
}

export const ISLAND_HALL_LEFT_WALL_X = -13.2;
export const ISLAND_HALL_RIGHT_WALL_X = 3.4;
export const ISLAND_PLATFORM_CENTER_X = -4.9;
export const ISLAND_PLATFORM_WIDTH = 6.64;

export const SIDE_HALL_LEFT_WALL_X = -11.3;
export const SIDE_HALL_RIGHT_WALL_X = 6.9;
export const SIDE_RIGHT_PLATFORM_CENTER_X = 4.13;
export const SIDE_LEFT_PLATFORM_CENTER_X = -8.53;
export const SIDE_PLATFORM_WIDTH = 5.1;

export function buildStationHallShell(
  group: THREE.Group,
  station: IStationSpec,
  layout: PlatformLayout,
  centerZ: number,
  hallLength: number,
  wallMat: THREE.MeshStandardMaterial,
  accentGlowMat: THREE.MeshStandardMaterial,
  signMat: THREE.MeshStandardMaterial,
  mats: IHallMaterials,
  disposables: Array<{ dispose(): void }>,
): THREE.Group {
  const leftWallX = layout === 'island' ? ISLAND_HALL_LEFT_WALL_X : SIDE_HALL_LEFT_WALL_X;
  const rightWallX = layout === 'island' ? ISLAND_HALL_RIGHT_WALL_X : SIDE_HALL_RIGHT_WALL_X;
  const spanW = rightWallX - leftWallX;
  const hallCenterX = (leftWallX + rightWallX) * 0.5;

  const wallGeo = new THREE.BoxGeometry(0.42, 5.65, hallLength);
  const ceilGeo = new THREE.BoxGeometry(spanW + 0.8, 0.42, hallLength);
  const stripGeo = new THREE.BoxGeometry(0.48, 0.1, hallLength - 8);
  const glowBandGeo = new THREE.BoxGeometry(0.08, 0.16, hallLength - 4);
  disposables.push(wallGeo, ceilGeo, stripGeo, glowBandGeo);

  const leftWall = new THREE.Mesh(wallGeo, wallMat);
  leftWall.position.set(leftWallX, 2.82, centerZ);
  const rightWall = new THREE.Mesh(wallGeo, wallMat);
  rightWall.position.set(rightWallX, 2.82, centerZ);
  const ceiling = new THREE.Mesh(ceilGeo, mats.ceiling);
  ceiling.position.set(hallCenterX, 5.58, centerZ);

  const leftGlow = new THREE.Mesh(glowBandGeo, accentGlowMat);
  leftGlow.position.set(leftWallX + 0.25, 4.1, centerZ);
  const rightGlow = new THREE.Mesh(glowBandGeo, accentGlowMat);
  rightGlow.position.set(rightWallX - 0.25, 4.1, centerZ);
  group.add(leftWall, rightWall, ceiling, leftGlow, rightGlow);

  const lightXs = layout === 'island' ? [-9.8, -4.9, 0.0] : [-8.4, -2.2, 4.0];
  lightXs.forEach((lx) => {
    const strip = new THREE.Mesh(stripGeo, mats.lightStrip);
    strip.position.set(lx, 5.32, centerZ);
    group.add(strip);
  });

  if (layout === 'island') {
    addIslandPlatformAndPortals(group, station, centerZ, hallLength, mats, disposables);
  } else {
    addSidePlatformsAndPortals(group, station, centerZ, hallLength, mats, disposables);
  }

  addStopZoneVisuals(group, station, layout, mats, disposables);
  addStationWallSigns(group, station, leftWallX, rightWallX, layout, signMat, disposables);
  const nightGroup = buildNightServiceFixtures(layout, centerZ, mats, disposables);
  nightGroup.visible = false;
  group.add(nightGroup);
  return nightGroup;
}

function buildNightServiceFixtures(
  layout: PlatformLayout,
  centerZ: number,
  mats: IHallMaterials,
  disposables: Array<{ dispose(): void }>,
): THREE.Group {
  const nightGroup = new THREE.Group();
  const emergGeo = new THREE.BoxGeometry(0.42, 0.14, 1.8);
  const poleGeo = new THREE.CylinderGeometry(0.05, 0.08, 1.35, 8);
  const domeGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.22, 10);
  const haloGeo = new THREE.SphereGeometry(0.45, 10, 10);
  disposables.push(emergGeo, poleGeo, domeGeo, haloGeo);

  const lampX = layout === 'island' ? ISLAND_PLATFORM_CENTER_X : SIDE_RIGHT_PLATFORM_CENTER_X - 1.2;
  [-34, 0, 34].forEach((zOff) => {
    const lamp = new THREE.Mesh(emergGeo, mats.emergencyLamp);
    lamp.position.set(lampX, 5.26, centerZ + zOff);
    nightGroup.add(lamp);
  });

  const beaconX = layout === 'island' ? -2.35 : 2.35;
  [-42, 6, 44].forEach((zOff) => {
    const pole = new THREE.Mesh(poleGeo, mats.column);
    pole.position.set(beaconX, 1.08 + 0.675, centerZ + zOff);
    const dome = new THREE.Mesh(domeGeo, mats.yellowBeacon);
    dome.position.set(beaconX, 1.08 + 1.44, centerZ + zOff);
    const halo = new THREE.Mesh(haloGeo, mats.yellowBeaconHalo);
    halo.position.set(beaconX, 1.08 + 1.44, centerZ + zOff);
    nightGroup.add(pole, dome, halo);
  });

  return nightGroup;
}

function addIslandPlatformAndPortals(
  group: THREE.Group,
  station: IStationSpec,
  centerZ: number,
  hallLength: number,
  mats: IHallMaterials,
  disposables: Array<{ dispose(): void }>,
): void {
  const platGeo = new THREE.BoxGeometry(ISLAND_PLATFORM_WIDTH, 1.08, station.platformLengthM);
  const platform = new THREE.Mesh(platGeo, mats.platform);
  platform.position.set(ISLAND_PLATFORM_CENTER_X, 0.54, centerZ);
  group.add(platform);

  // Dark concrete portal bulkheads at both hall ends behind the island platform ends
  const centerBulkheadGeo = new THREE.BoxGeometry(5.6, 5.4, 0.6);
  const lintelGeo = new THREE.BoxGeometry(17.0, 0.9, 0.6);
  disposables.push(platGeo, centerBulkheadGeo, lintelGeo);

  [-1, 1].forEach((endDir) => {
    const endZ = centerZ + endDir * (hallLength * 0.5 - 0.25);
    const bulkhead = new THREE.Mesh(centerBulkheadGeo, mats.portalConcrete);
    bulkhead.position.set(ISLAND_PLATFORM_CENTER_X, 2.7, endZ);
    const lintel = new THREE.Mesh(lintelGeo, mats.portalConcrete);
    lintel.position.set(ISLAND_PLATFORM_CENTER_X, 5.1, endZ);
    group.add(bulkhead, lintel);
  });
}

function addSidePlatformsAndPortals(
  group: THREE.Group,
  station: IStationSpec,
  centerZ: number,
  hallLength: number,
  mats: IHallMaterials,
  disposables: Array<{ dispose(): void }>,
): void {
  const platGeo = new THREE.BoxGeometry(SIDE_PLATFORM_WIDTH, 1.08, station.platformLengthM);
  const rightPlat = new THREE.Mesh(platGeo, mats.platform);
  rightPlat.position.set(SIDE_RIGHT_PLATFORM_CENTER_X, 0.54, centerZ);
  const leftPlat = new THREE.Mesh(platGeo, mats.platform);
  leftPlat.position.set(SIDE_LEFT_PLATFORM_CENTER_X, 0.54, centerZ);
  group.add(rightPlat, leftPlat);

  // Slim structural steel pillars dividing the two central tracks
  const dividerGeo = new THREE.CylinderGeometry(0.18, 0.22, 5.4, 10);
  for (let offset = -40; offset <= 40; offset += 20) {
    const pillar = new THREE.Mesh(dividerGeo, mats.column);
    pillar.position.set(-2.2, 2.7, centerZ + offset);
    group.add(pillar);
  }

  // Portal end bulkheads closing off the two outer platforms at tunnel transitions
  const sideEndWallGeo = new THREE.BoxGeometry(5.2, 5.4, 0.6);
  const lintelGeo = new THREE.BoxGeometry(18.6, 0.9, 0.6);
  disposables.push(platGeo, dividerGeo, sideEndWallGeo, lintelGeo);

  [-1, 1].forEach((endDir) => {
    const endZ = centerZ + endDir * (hallLength * 0.5 - 0.25);
    const rightBulk = new THREE.Mesh(sideEndWallGeo, mats.portalConcrete);
    rightBulk.position.set(4.5, 2.7, endZ);
    const leftBulk = new THREE.Mesh(sideEndWallGeo, mats.portalConcrete);
    leftBulk.position.set(-8.8, 2.7, endZ);
    const lintel = new THREE.Mesh(lintelGeo, mats.portalConcrete);
    lintel.position.set(-2.2, 5.1, endZ);
    group.add(rightBulk, leftBulk, lintel);
  });
}

function addStopZoneVisuals(
  group: THREE.Group,
  station: IStationSpec,
  layout: PlatformLayout,
  mats: IHallMaterials,
  disposables: Array<{ dispose(): void }>,
): void {
  const sideSign = layout === 'island' ? -1 : 1;
  const zoneLen = station.stopZoneHalfWidthM * 2;
  const stopStripGeo = new THREE.BoxGeometry(0.42, 0.04, zoneLen);
  const stopStrip = new THREE.Mesh(stopStripGeo, mats.stopStrip);
  stopStrip.position.set(sideSign * 2.02, 1.1, -station.distanceM);

  const trackBeaconGeo = new THREE.BoxGeometry(1.7, 0.04, 1.6);
  const trackBeacon = new THREE.Mesh(trackBeaconGeo, mats.stopStrip);
  trackBeacon.position.set(0, 0.09, -station.distanceM);

  const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.7, 8);
  const post = new THREE.Mesh(postGeo, mats.column);
  post.position.set(sideSign * 2.2, 2.4, -station.distanceM);

  const boardGeo = new THREE.BoxGeometry(1.5, 0.78, 0.08);
  const board = new THREE.Mesh(boardGeo, mats.stopBoard);
  board.position.set(sideSign * 2.2, 3.45, -station.distanceM);

  group.add(stopStrip, trackBeacon, post, board);
  disposables.push(stopStripGeo, trackBeaconGeo, postGeo, boardGeo);
}

function addStationWallSigns(
  group: THREE.Group,
  station: IStationSpec,
  leftWallX: number,
  rightWallX: number,
  layout: PlatformLayout,
  signMat: THREE.MeshStandardMaterial,
  disposables: Array<{ dispose(): void }>,
): void {
  const signGeo = new THREE.BoxGeometry(4.2, 1.0, 0.14);
  disposables.push(signGeo);

  [-36, 0, 28].forEach((offset) => {
    const rightSign = new THREE.Mesh(signGeo, signMat);
    rightSign.position.set(rightWallX - 0.28, 3.25, -station.distanceM + offset);
    rightSign.rotation.y = -Math.PI / 2;

    const leftSign = new THREE.Mesh(signGeo, signMat);
    leftSign.position.set(leftWallX + 0.28, 3.25, -station.distanceM + offset);
    leftSign.rotation.y = Math.PI / 2;
    group.add(rightSign, leftSign);
  });

  const overheadSign = new THREE.Mesh(signGeo, signMat);
  const overheadX = layout === 'island' ? -2.8 : 2.8;
  overheadSign.position.set(overheadX, 4.45, -(station.distanceM - 52));
  group.add(overheadSign);
}
