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

export function buildNightServiceFixtures(
  layout: PlatformLayout, centerZ: number, mats: IHallMaterials, disposables: Array<{ dispose(): void }>,
): THREE.Group {
  const nightGroup = new THREE.Group();
  const emergGeo = new THREE.BoxGeometry(0.42, 0.14, 1.8);
  disposables.push(emergGeo);
  const lampX = layout === 'island' ? ISLAND_PLATFORM_CENTER_X : SIDE_RIGHT_PLATFORM_CENTER_X - 1.2;
  [-34, 0, 34].forEach((zOff) => {
    const lamp = new THREE.Mesh(emergGeo, mats.emergencyLamp);
    lamp.position.set(lampX, 5.26, centerZ + zOff);
    nightGroup.add(lamp);
  });
  addNightBeacons(nightGroup, layout === 'island' ? -2.35 : 2.35, centerZ, mats, disposables);
  return nightGroup;
}

function addNightBeacons(
  nightGroup: THREE.Group, beaconX: number, centerZ: number, mats: IHallMaterials, disposables: Array<{ dispose(): void }>,
): void {
  const poleGeo = new THREE.CylinderGeometry(0.05, 0.08, 1.35, 8);
  const domeGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.22, 10);
  const haloGeo = new THREE.SphereGeometry(0.45, 10, 10);
  disposables.push(poleGeo, domeGeo, haloGeo);
  [-42, 6, 44].forEach((zOff) => {
    const pole = new THREE.Mesh(poleGeo, mats.column); pole.position.set(beaconX, 1.08 + 0.675, centerZ + zOff);
    const dome = new THREE.Mesh(domeGeo, mats.yellowBeacon); dome.position.set(beaconX, 1.08 + 1.44, centerZ + zOff);
    const halo = new THREE.Mesh(haloGeo, mats.yellowBeaconHalo); halo.position.set(beaconX, 1.08 + 1.44, centerZ + zOff);
    nightGroup.add(pole, dome, halo);
  });
}

export function addIslandPlatformAndPortals(
  group: THREE.Group, station: IStationSpec, centerZ: number, hallLength: number,
  mats: IHallMaterials, disposables: Array<{ dispose(): void }>,
): void {
  const platGeo = new THREE.BoxGeometry(ISLAND_PLATFORM_WIDTH, 1.08, station.platformLengthM);
  const platform = new THREE.Mesh(platGeo, mats.platform);
  platform.position.set(ISLAND_PLATFORM_CENTER_X, 0.54, centerZ);
  group.add(platform);
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

export function addSidePlatformsAndPortals(
  group: THREE.Group, station: IStationSpec, centerZ: number, hallLength: number,
  mats: IHallMaterials, disposables: Array<{ dispose(): void }>,
): void {
  const platGeo = new THREE.BoxGeometry(SIDE_PLATFORM_WIDTH, 1.08, station.platformLengthM);
  const rightPlat = new THREE.Mesh(platGeo, mats.platform); rightPlat.position.set(SIDE_RIGHT_PLATFORM_CENTER_X, 0.54, centerZ);
  const leftPlat = new THREE.Mesh(platGeo, mats.platform); leftPlat.position.set(SIDE_LEFT_PLATFORM_CENTER_X, 0.54, centerZ);
  group.add(rightPlat, leftPlat);
  const dividerGeo = new THREE.CylinderGeometry(0.18, 0.22, 5.4, 10);
  for (let offset = -40; offset <= 40; offset += 20) {
    const pillar = new THREE.Mesh(dividerGeo, mats.column);
    pillar.position.set(-2.2, 2.7, centerZ + offset);
    group.add(pillar);
  }
  disposables.push(platGeo, dividerGeo);
  addSidePlatformEndPortals(group, centerZ, hallLength, mats.portalConcrete, disposables);
}

function addSidePlatformEndPortals(
  group: THREE.Group, centerZ: number, hallLength: number, portalMat: THREE.MeshStandardMaterial, disposables: Array<{ dispose(): void }>,
): void {
  const sideEndWallGeo = new THREE.BoxGeometry(5.2, 5.4, 0.6);
  const lintelGeo = new THREE.BoxGeometry(18.6, 0.9, 0.6);
  disposables.push(sideEndWallGeo, lintelGeo);
  [-1, 1].forEach((endDir) => {
    const endZ = centerZ + endDir * (hallLength * 0.5 - 0.25);
    const rightBulk = new THREE.Mesh(sideEndWallGeo, portalMat); rightBulk.position.set(4.5, 2.7, endZ);
    const leftBulk = new THREE.Mesh(sideEndWallGeo, portalMat); leftBulk.position.set(-8.8, 2.7, endZ);
    const lintel = new THREE.Mesh(lintelGeo, portalMat); lintel.position.set(-2.2, 5.1, endZ);
    group.add(rightBulk, leftBulk, lintel);
  });
}
