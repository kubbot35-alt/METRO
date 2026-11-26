import * as THREE from 'three';
import type { IStationSpec } from '../domain/types';
import {
  createPlatformTileTexture,
  createStationSignTexture,
  createStationWallTexture,
  createStopMarkerTexture,
} from './proceduralTextures';
import type { ISceneResources } from './types';

export function buildMetroStations(
  scene: THREE.Scene,
  stations: readonly IStationSpec[],
  maxAnisotropy: number,
): ISceneResources {
  const disposables: Array<{ dispose(): void }> = [];
  const root = new THREE.Group();
  root.name = 'MetroStationsGroup';
  scene.add(root);

  const platformTex = createPlatformTileTexture(maxAnisotropy);
  const stopTex = createStopMarkerTexture(maxAnisotropy);
  const sharedMats = createSharedStationMaterials(platformTex, stopTex);
  disposables.push(platformTex, stopTex, ...Object.values(sharedMats));

  stations.forEach((station) => {
    const stationGroup = createSingleStation(station, sharedMats, maxAnisotropy, disposables);
    root.add(stationGroup);
  });

  return {
    dispose: () => {
      scene.remove(root);
      disposables.forEach((d) => d.dispose());
    },
  };
}

interface ISharedStationMats {
  platform: THREE.MeshStandardMaterial;
  ceiling: THREE.MeshStandardMaterial;
  column: THREE.MeshStandardMaterial;
  lightStrip: THREE.MeshStandardMaterial;
  stopStrip: THREE.MeshStandardMaterial;
  stopBoard: THREE.MeshStandardMaterial;
  benchWood: THREE.MeshStandardMaterial;
  benchMetal: THREE.MeshStandardMaterial;
}

function createSharedStationMaterials(
  platformTex: THREE.CanvasTexture,
  stopTex: THREE.CanvasTexture,
): ISharedStationMats {
  return {
    platform: new THREE.MeshStandardMaterial({ map: platformTex, roughness: 0.72, metalness: 0.08 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x262d38, roughness: 0.8, metalness: 0.15 }),
    column: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.65 }),
    lightStrip: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xe0f2fe,
      emissiveIntensity: 2.6,
      roughness: 0.15,
    }),
    stopStrip: new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 1.9,
      roughness: 0.3,
    }),
    stopBoard: new THREE.MeshStandardMaterial({
      map: stopTex,
      emissiveMap: stopTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.9,
      roughness: 0.25,
    }),
    benchWood: new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.78, metalness: 0.05 }),
    benchMetal: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.75 }),
  };
}

function createSingleStation(
  station: IStationSpec,
  mats: ISharedStationMats,
  maxAnisotropy: number,
  disposables: Array<{ dispose(): void }>,
): THREE.Group {
  const group = new THREE.Group();
  const hallLength = station.platformLengthM + 18;
  const centerZ = -(station.distanceM - 36);

  const wallTex = createStationWallTexture(station.accentHex, maxAnisotropy);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.62, metalness: 0.1 });
  const signTex = createStationSignTexture(station.name, station.code, station.accentHex, maxAnisotropy);
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex,
    emissiveMap: signTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.55,
    roughness: 0.3,
  });
  disposables.push(wallTex, wallMat, signTex, signMat);

  addHallShell(group, centerZ, hallLength, wallMat, mats, disposables);
  addPlatformAndStopZone(group, station, centerZ, mats, disposables);
  addStationSignsAndColumns(group, station, centerZ, signMat, mats, disposables);
  addPlatformBenches(group, centerZ, mats, disposables);
  return group;
}

function addHallShell(
  group: THREE.Group,
  centerZ: number,
  hallLength: number,
  wallMat: THREE.MeshStandardMaterial,
  mats: ISharedStationMats,
  disposables: Array<{ dispose(): void }>,
): void {
  const leftWallGeo = new THREE.BoxGeometry(0.4, 5.4, hallLength);
  const rightWallGeo = new THREE.BoxGeometry(0.4, 5.4, hallLength);
  const ceilGeo = new THREE.BoxGeometry(15.2, 0.4, hallLength);
  const stripGeo = new THREE.BoxGeometry(0.45, 0.1, hallLength - 8);

  const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
  leftWall.position.set(-7.6, 2.7, centerZ);
  const rightWall = new THREE.Mesh(rightWallGeo, wallMat);
  rightWall.position.set(7.1, 2.7, centerZ);
  const ceiling = new THREE.Mesh(ceilGeo, mats.ceiling);
  ceiling.position.set(-0.25, 5.35, centerZ);

  const stripA = new THREE.Mesh(stripGeo, mats.lightStrip);
  stripA.position.set(0.3, 5.1, centerZ);
  const stripB = new THREE.Mesh(stripGeo, mats.lightStrip);
  stripB.position.set(4.1, 5.1, centerZ);
  const stripC = new THREE.Mesh(stripGeo, mats.lightStrip);
  stripC.position.set(-4.6, 5.1, centerZ);

  group.add(leftWall, rightWall, ceiling, stripA, stripB, stripC);
  disposables.push(leftWallGeo, rightWallGeo, ceilGeo, stripGeo);
}

function addPlatformAndStopZone(
  group: THREE.Group,
  station: IStationSpec,
  centerZ: number,
  mats: ISharedStationMats,
  disposables: Array<{ dispose(): void }>,
): void {
  const platGeo = new THREE.BoxGeometry(5.3, 1.08, station.platformLengthM);
  const platform = new THREE.Mesh(platGeo, mats.platform);
  platform.position.set(4.3, 0.54, centerZ);
  group.add(platform);

  const zoneLen = station.stopZoneHalfWidthM * 2;
  const stopStripGeo = new THREE.BoxGeometry(0.42, 0.04, zoneLen);
  const stopStrip = new THREE.Mesh(stopStripGeo, mats.stopStrip);
  stopStrip.position.set(1.88, 1.1, -station.distanceM);

  const trackBeaconGeo = new THREE.BoxGeometry(1.7, 0.04, 1.6);
  const trackBeacon = new THREE.Mesh(trackBeaconGeo, mats.stopStrip);
  trackBeacon.position.set(0, 0.09, -station.distanceM);

  const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.7, 8);
  const post = new THREE.Mesh(postGeo, mats.column);
  post.position.set(2.15, 2.4, -station.distanceM);

  const boardGeo = new THREE.BoxGeometry(1.5, 0.78, 0.08);
  const board = new THREE.Mesh(boardGeo, mats.stopBoard);
  board.position.set(2.15, 3.45, -station.distanceM);

  group.add(stopStrip, trackBeacon, post, board);
  disposables.push(platGeo, stopStripGeo, trackBeaconGeo, postGeo, boardGeo);
}

function addStationSignsAndColumns(
  group: THREE.Group,
  station: IStationSpec,
  centerZ: number,
  signMat: THREE.MeshStandardMaterial,
  mats: ISharedStationMats,
  disposables: Array<{ dispose(): void }>,
): void {
  const colGeo = new THREE.CylinderGeometry(0.24, 0.28, 4.3, 10);
  const signGeo = new THREE.BoxGeometry(3.8, 0.95, 0.12);
  disposables.push(colGeo, signGeo);

  for (let offset = -40; offset <= 40; offset += 20) {
    const col = new THREE.Mesh(colGeo, mats.column);
    col.position.set(4.4, 3.22, centerZ + offset);
    const dividerCol = new THREE.Mesh(colGeo, mats.column);
    dividerCol.position.set(-2.35, 2.65, centerZ + offset);
    group.add(col, dividerCol);
  }

  [-36, 0, 28].forEach((offset) => {
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(6.8, 3.35, -station.distanceM + offset);
    sign.rotation.y = -Math.PI / 2;
    group.add(sign);
  });

  const overheadSign = new THREE.Mesh(signGeo, signMat);
  overheadSign.position.set(3.2, 4.15, -(station.distanceM - 45));
  group.add(overheadSign);
}

function addPlatformBenches(
  group: THREE.Group,
  centerZ: number,
  mats: ISharedStationMats,
  disposables: Array<{ dispose(): void }>,
): void {
  const seatGeo = new THREE.BoxGeometry(0.65, 0.08, 2.4);
  const legGeo = new THREE.BoxGeometry(0.55, 0.44, 0.14);
  disposables.push(seatGeo, legGeo);

  [-28, 4, 32].forEach((offset) => {
    const bench = new THREE.Group();
    const seat = new THREE.Mesh(seatGeo, mats.benchWood);
    seat.position.set(5.4, 1.52, centerZ + offset);
    const legA = new THREE.Mesh(legGeo, mats.benchMetal);
    legA.position.set(5.4, 1.3, centerZ + offset - 0.9);
    const legB = new THREE.Mesh(legGeo, mats.benchMetal);
    legB.position.set(5.4, 1.3, centerZ + offset + 0.9);
    bench.add(seat, legA, legB);
    group.add(bench);
  });
}
