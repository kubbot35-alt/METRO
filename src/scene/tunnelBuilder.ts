import * as THREE from 'three';
import type { ISpeedLimitZone, IStationSpec } from '../domain/types';
import {
  createBallastTexture,
  createSpeedSignTexture,
  createTunnelConcreteTexture,
} from './proceduralTextures';
import type { ISceneResources } from './types';

const ROUTE_LENGTH_M = 3240;
const BAY_LENGTH_M = 16;
const SLEEPER_SPACING_M = 1.6;
const TOTAL_BAYS = Math.ceil((ROUTE_LENGTH_M + 40) / BAY_LENGTH_M);

function isStationBay(centerDistanceM: number, stations: readonly IStationSpec[]): boolean {
  for (let i = 0; i < stations.length; i += 1) {
    const s = stations[i];
    if (centerDistanceM >= s.distanceM - 98 && centerDistanceM <= s.distanceM + 26) {
      return true;
    }
  }
  return false;
}

export function buildMetroTunnel(
  scene: THREE.Scene,
  stations: readonly IStationSpec[],
  speedZones: readonly ISpeedLimitZone[],
  maxAnisotropy: number,
): ISceneResources {
  const disposables: Array<{ dispose(): void }> = [];
  const root = new THREE.Group();
  root.name = 'MetroTunnelGroup';
  scene.add(root);

  const concreteTex = createTunnelConcreteTexture(maxAnisotropy);
  const ballastTex = createBallastTexture(maxAnisotropy);
  disposables.push(concreteTex, ballastTex);

  addTrackBedAndRails(root, ballastTex, disposables);
  addInstancedSleepers(root, disposables);
  addTunnelBaysAndLamps(root, stations, concreteTex, disposables);
  addSpeedLimitSigns(root, speedZones, maxAnisotropy, disposables);

  return {
    dispose: () => {
      scene.remove(root);
      disposables.forEach((item) => item.dispose());
    },
  };
}

function addTrackBedAndRails(
  root: THREE.Group,
  ballastTex: THREE.CanvasTexture,
  disposables: Array<{ dispose(): void }>,
): void {
  const centerZ = -(ROUTE_LENGTH_M - 40) * 0.5;
  const floorGeo = new THREE.PlaneGeometry(7.2, ROUTE_LENGTH_M + 60);
  const floorMat = new THREE.MeshStandardMaterial({ map: ballastTex, roughness: 0.94, metalness: 0.04 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, centerZ);
  root.add(floor);

  const railGeo = new THREE.BoxGeometry(0.08, 0.14, ROUTE_LENGTH_M + 60);
  const railMat = new THREE.MeshStandardMaterial({ color: 0xb8c4d4, roughness: 0.24, metalness: 0.88 });
  [-0.72, 0.72].forEach((xPos) => {
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(xPos, 0.15, centerZ);
    root.add(rail);
  });

  const thirdRailGeo = new THREE.BoxGeometry(0.14, 0.12, ROUTE_LENGTH_M + 60);
  const thirdRailMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.55, metalness: 0.2 });
  const thirdRail = new THREE.Mesh(thirdRailGeo, thirdRailMat);
  thirdRail.position.set(-1.32, 0.22, centerZ);
  root.add(thirdRail);
  disposables.push(floorGeo, floorMat, railGeo, railMat, thirdRailGeo, thirdRailMat);
}

function addInstancedSleepers(root: THREE.Group, disposables: Array<{ dispose(): void }>): void {
  const count = Math.floor((ROUTE_LENGTH_M + 40) / SLEEPER_SPACING_M);
  const geo = new THREE.BoxGeometry(2.15, 0.08, 0.24);
  const mat = new THREE.MeshStandardMaterial({ color: 0x383634, roughness: 0.92, metalness: 0.05 });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i += 1) {
    dummy.position.set(0, 0.045, 30 - i * SLEEPER_SPACING_M);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  root.add(mesh);
  disposables.push(geo, mat);
}

function addTunnelBaysAndLamps(
  root: THREE.Group,
  stations: readonly IStationSpec[],
  concreteTex: THREE.CanvasTexture,
  disposables: Array<{ dispose(): void }>,
): void {
  const bayDistances: number[] = [];
  for (let i = 0; i < TOTAL_BAYS; i += 1) {
    const distM = -32 + i * BAY_LENGTH_M;
    if (!isStationBay(distM, stations)) {
      bayDistances.push(distM);
    }
  }
  const n = bayDistances.length;
  const wallGeo = new THREE.BoxGeometry(0.45, 5.1, BAY_LENGTH_M + 0.08);
  const ceilGeo = new THREE.BoxGeometry(6.8, 0.4, BAY_LENGTH_M + 0.08);
  const colGeo = new THREE.BoxGeometry(0.42, 4.9, 0.55);
  const beamGeo = new THREE.BoxGeometry(6.1, 0.36, 0.52);
  const cableGeo = new THREE.BoxGeometry(0.12, 0.14, BAY_LENGTH_M + 0.08);
  const lampGeo = new THREE.BoxGeometry(0.16, 0.24, 1.55);

  const wallMat = new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.88, metalness: 0.08 });
  const colMat = new THREE.MeshStandardMaterial({ color: 0x3b424d, roughness: 0.72, metalness: 0.22 });
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.48, metalness: 0.55 });
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: 0xf59e0b,
    emissiveIntensity: 2.5,
    roughness: 0.2,
  });

  const leftWalls = new THREE.InstancedMesh(wallGeo, wallMat, n);
  const rightWalls = new THREE.InstancedMesh(wallGeo, wallMat, n);
  const ceilings = new THREE.InstancedMesh(ceilGeo, wallMat, n);
  const cols = new THREE.InstancedMesh(colGeo, colMat, n * 2);
  const beams = new THREE.InstancedMesh(beamGeo, colMat, n);
  const cables = new THREE.InstancedMesh(cableGeo, cableMat, n * 2);
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, n * 2);

  populateTunnelInstances(bayDistances, leftWalls, rightWalls, ceilings, cols, beams, cables, lamps);
  [leftWalls, rightWalls, ceilings, cols, beams, cables, lamps].forEach((inst) => {
    inst.instanceMatrix.needsUpdate = true;
    inst.frustumCulled = false;
    root.add(inst);
  });
  disposables.push(wallGeo, ceilGeo, colGeo, beamGeo, cableGeo, lampGeo, wallMat, colMat, cableMat, lampMat);
}

function populateTunnelInstances(
  bayDistances: readonly number[],
  leftWalls: THREE.InstancedMesh,
  rightWalls: THREE.InstancedMesh,
  ceilings: THREE.InstancedMesh,
  cols: THREE.InstancedMesh,
  beams: THREE.InstancedMesh,
  cables: THREE.InstancedMesh,
  lamps: THREE.InstancedMesh,
): void {
  const dummy = new THREE.Object3D();
  bayDistances.forEach((distM, i) => {
    const z = -distM;
    dummy.position.set(-3.2, 2.55, z);
    dummy.updateMatrix();
    leftWalls.setMatrixAt(i, dummy.matrix);
    dummy.position.set(3.2, 2.55, z);
    dummy.updateMatrix();
    rightWalls.setMatrixAt(i, dummy.matrix);
    dummy.position.set(0, 5.05, z);
    dummy.updateMatrix();
    ceilings.setMatrixAt(i, dummy.matrix);

    dummy.position.set(-2.85, 2.45, z);
    dummy.updateMatrix();
    cols.setMatrixAt(i * 2, dummy.matrix);
    dummy.position.set(2.85, 2.45, z);
    dummy.updateMatrix();
    cols.setMatrixAt(i * 2 + 1, dummy.matrix);

    dummy.position.set(0, 4.72, z);
    dummy.updateMatrix();
    beams.setMatrixAt(i, dummy.matrix);

    dummy.position.set(-2.92, 1.55, z);
    dummy.updateMatrix();
    cables.setMatrixAt(i * 2, dummy.matrix);
    dummy.position.set(2.92, 1.55, z);
    dummy.updateMatrix();
    cables.setMatrixAt(i * 2 + 1, dummy.matrix);

    dummy.position.set(-2.9, 3.65, z + 3.5);
    dummy.updateMatrix();
    lamps.setMatrixAt(i * 2, dummy.matrix);
    dummy.position.set(2.9, 3.65, z + 3.5);
    dummy.updateMatrix();
    lamps.setMatrixAt(i * 2 + 1, dummy.matrix);
  });
}

function addSpeedLimitSigns(
  root: THREE.Group,
  speedZones: readonly ISpeedLimitZone[],
  maxAnisotropy: number,
  disposables: Array<{ dispose(): void }>,
): void {
  const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.7 });
  const signGeo = new THREE.PlaneGeometry(0.68, 0.68);
  disposables.push(postGeo, postMat, signGeo);

  speedZones.forEach((zone) => {
    if (zone.startM <= 10) {
      return;
    }
    const signTex = createSpeedSignTexture(zone.limitKmh, maxAnisotropy);
    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      emissiveMap: signTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.45,
      roughness: 0.35,
    });
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(-2.25, 1.1, -zone.startM);
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(-2.25, 2.15, -zone.startM + 0.06);
    root.add(post, sign);
    disposables.push(signTex, signMat);
  });
}
