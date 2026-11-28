import * as THREE from 'three';
import type { IStationSpec, PlatformLayout } from '../domain/types';
import {
  addIslandPlatformAndPortals,
  addSidePlatformsAndPortals,
  buildNightServiceFixtures,
  ISLAND_HALL_LEFT_WALL_X,
  ISLAND_HALL_RIGHT_WALL_X,
  ISLAND_PLATFORM_CENTER_X,
  ISLAND_PLATFORM_WIDTH,
  SIDE_HALL_LEFT_WALL_X,
  SIDE_HALL_RIGHT_WALL_X,
  SIDE_LEFT_PLATFORM_CENTER_X,
  SIDE_PLATFORM_WIDTH,
  SIDE_RIGHT_PLATFORM_CENTER_X,
  type IHallMaterials,
} from './stationHallPortals';

export {
  ISLAND_HALL_LEFT_WALL_X,
  ISLAND_HALL_RIGHT_WALL_X,
  ISLAND_PLATFORM_CENTER_X,
  ISLAND_PLATFORM_WIDTH,
  SIDE_HALL_LEFT_WALL_X,
  SIDE_HALL_RIGHT_WALL_X,
  SIDE_LEFT_PLATFORM_CENTER_X,
  SIDE_PLATFORM_WIDTH,
  SIDE_RIGHT_PLATFORM_CENTER_X,
  type IHallMaterials,
};

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
  addHallWallsAndLights(group, layout, leftWallX, rightWallX, centerZ, hallLength, wallMat, accentGlowMat, mats, disposables);
  if (layout === 'island') addIslandPlatformAndPortals(group, station, centerZ, hallLength, mats, disposables);
  else addSidePlatformsAndPortals(group, station, centerZ, hallLength, mats, disposables);
  addStopZoneVisuals(group, station, layout, mats, disposables);
  addStationWallSigns(group, station, leftWallX, rightWallX, layout, signMat, disposables);
  const nightGroup = buildNightServiceFixtures(layout, centerZ, mats, disposables);
  nightGroup.visible = false;
  group.add(nightGroup);
  return nightGroup;
}

function addHallWallsAndLights(
  group: THREE.Group, layout: PlatformLayout, leftWallX: number, rightWallX: number, centerZ: number, hallLength: number,
  wallMat: THREE.MeshStandardMaterial, accentGlowMat: THREE.MeshStandardMaterial, mats: IHallMaterials, disposables: Array<{ dispose(): void }>,
): void {
  const wallGeo = new THREE.BoxGeometry(0.42, 5.65, hallLength);
  const ceilGeo = new THREE.BoxGeometry(rightWallX - leftWallX + 0.8, 0.42, hallLength);
  const glowBandGeo = new THREE.BoxGeometry(0.08, 0.16, hallLength - 4);
  disposables.push(wallGeo, ceilGeo, glowBandGeo);
  const leftWall = new THREE.Mesh(wallGeo, wallMat); leftWall.position.set(leftWallX, 2.82, centerZ);
  const rightWall = new THREE.Mesh(wallGeo, wallMat); rightWall.position.set(rightWallX, 2.82, centerZ);
  const ceiling = new THREE.Mesh(ceilGeo, mats.ceiling); ceiling.position.set((leftWallX + rightWallX) * 0.5, 5.58, centerZ);
  const leftGlow = new THREE.Mesh(glowBandGeo, accentGlowMat); leftGlow.position.set(leftWallX + 0.25, 4.1, centerZ);
  const rightGlow = new THREE.Mesh(glowBandGeo, accentGlowMat); rightGlow.position.set(rightWallX - 0.25, 4.1, centerZ);
  group.add(leftWall, rightWall, ceiling, leftGlow, rightGlow);
  addHallCeilingLightStrips(group, layout, centerZ, hallLength, mats.lightStrip, disposables);
}

function addHallCeilingLightStrips(
  group: THREE.Group, layout: PlatformLayout, centerZ: number, hallLength: number,
  lightStripMat: THREE.MeshStandardMaterial, disposables: Array<{ dispose(): void }>,
): void {
  const stripGeo = new THREE.BoxGeometry(0.48, 0.1, hallLength - 8);
  disposables.push(stripGeo);
  (layout === 'island' ? [-9.8, -4.9, 0.0] : [-8.4, -2.2, 4.0]).forEach((lx) => {
    const strip = new THREE.Mesh(stripGeo, lightStripMat);
    strip.position.set(lx, 5.32, centerZ);
    group.add(strip);
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
  const stopStripGeo = new THREE.BoxGeometry(0.42, 0.04, station.stopZoneHalfWidthM * 2);
  const stopStrip = new THREE.Mesh(stopStripGeo, mats.stopStrip);
  stopStrip.position.set(sideSign * 2.02, 1.1, -station.distanceM);
  const trackBeaconGeo = new THREE.BoxGeometry(1.7, 0.04, 1.6);
  const trackBeacon = new THREE.Mesh(trackBeaconGeo, mats.stopStrip);
  trackBeacon.position.set(0, 0.09, -station.distanceM);
  group.add(stopStrip, trackBeacon);
  disposables.push(stopStripGeo, trackBeaconGeo);
  addW4StoppingMarkerBoard(group, sideSign * 2.05, -station.distanceM, mats, disposables);
}

function addW4StoppingMarkerBoard(
  group: THREE.Group,
  xPos: number,
  zPos: number,
  mats: IHallMaterials,
  disposables: Array<{ dispose(): void }>,
): void {
  const postGeo = new THREE.CylinderGeometry(0.055, 0.06, 2.55, 8);
  const frameGeo = new THREE.BoxGeometry(0.96, 1.2, 0.12);
  const faceGeo = new THREE.PlaneGeometry(0.88, 1.12);
  const hoodGeo = new THREE.BoxGeometry(0.92, 0.06, 0.22);
  const post = new THREE.Mesh(postGeo, mats.column);
  post.position.set(xPos, 2.32, zPos);
  const frame = new THREE.Mesh(frameGeo, mats.portalConcrete);
  frame.position.set(xPos, 3.02, zPos);
  const frontFace = new THREE.Mesh(faceGeo, mats.stopBoard);
  frontFace.position.set(xPos, 3.02, zPos + 0.066);
  const hoodLamp = new THREE.Mesh(hoodGeo, mats.lightStrip);
  hoodLamp.position.set(xPos, 3.65, zPos + 0.06);
  group.add(post, frame, frontFace, hoodLamp);
  disposables.push(postGeo, frameGeo, faceGeo, hoodGeo);
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
  [0, 30, 60, 90, 118].forEach((offset) => {
    const rightSign = new THREE.Mesh(signGeo, signMat);
    rightSign.position.set(rightWallX - 0.28, 3.25, -station.distanceM + offset);
    rightSign.rotation.y = -Math.PI / 2;
    const leftSign = new THREE.Mesh(signGeo, signMat);
    leftSign.position.set(leftWallX + 0.28, 3.25, -station.distanceM + offset);
    leftSign.rotation.y = Math.PI / 2;
    group.add(rightSign, leftSign);
  });
  [24, 92].forEach((zOff) => {
    const overheadSign = new THREE.Mesh(signGeo, signMat);
    overheadSign.position.set(layout === 'island' ? -2.8 : 2.8, 4.45, -station.distanceM + zOff);
    group.add(overheadSign);
  });
}
