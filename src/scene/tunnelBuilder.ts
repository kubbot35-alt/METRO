import * as THREE from 'three';
import {
  getOppositeTrackX,
  getOppositeTrackYaw,
  isWithinStationHall,
} from '../domain/trackGeometry';
import type { ISpeedLimitZone, IStationSpec } from '../domain/types';
import {
  createBallastTexture,
  createMeterMarkerTexture,
  createSpeedSignTexture,
  createTunnelConcreteTexture,
} from './proceduralTextures';
import type { ISceneResources } from './types';

const BAY_LENGTH_M = 16;
const SLEEPER_SPACING_M = 1.6;
const RAIL_SAMPLE_STEP_M = 4;
const RIGHT_WALL_X = 3.2;

function computeRouteLengthM(stations: readonly IStationSpec[]): number {
  const lastStationM = stations[stations.length - 1]?.distanceM ?? 3000;
  return lastStationM + 240;
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

  const routeLengthM = computeRouteLengthM(stations);
  const concreteTex = createTunnelConcreteTexture(maxAnisotropy);
  const ballastTex = createBallastTexture(maxAnisotropy, Math.round(routeLengthM / 8));
  disposables.push(concreteTex, ballastTex);

  addTrackBedAndRails(root, routeLengthM, stations, ballastTex, disposables);
  addInstancedSleepers(root, routeLengthM, stations, disposables);
  addTunnelBaysAndLamps(root, routeLengthM, stations, concreteTex, disposables);
  addSpeedLimitSigns(root, speedZones, maxAnisotropy, disposables);
  addMeterMarkerPlaques(root, routeLengthM, stations, maxAnisotropy, disposables);

  return {
    dispose: () => {
      scene.remove(root);
      disposables.forEach((item) => item.dispose());
    },
  };
}

function createCurvedRailGeometry(
  startDistM: number,
  endDistM: number,
  stations: readonly IStationSpec[],
  lateralOffsetX: number,
  width: number,
  height: number,
  centerY: number,
): THREE.BufferGeometry {
  const steps = Math.ceil((endDistM - startDistM) / RAIL_SAMPLE_STEP_M);
  const halfW = width * 0.5;
  const halfH = height * 0.5;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= steps; i += 1) {
    const distM = Math.min(endDistM, startDistM + i * RAIL_SAMPLE_STEP_M);
    const cx = getOppositeTrackX(distM, stations) + lateralOffsetX;
    const z = -distM;
    // 4 vertices per cross-section: bottom-left, bottom-right, top-right, top-left
    positions.push(
      cx - halfW, centerY - halfH, z,
      cx + halfW, centerY - halfH, z,
      cx + halfW, centerY + halfH, z,
      cx - halfW, centerY + halfH, z,
    );
    if (i < steps) {
      const a = i * 4;
      const b = (i + 1) * 4;
      // Top face
      indices.push(a + 3, a + 2, b + 2, a + 3, b + 2, b + 3);
      // Right face
      indices.push(a + 2, a + 1, b + 1, a + 2, b + 1, b + 2);
      // Left face
      indices.push(a + 0, a + 3, b + 3, a + 0, b + 3, b + 0);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function addTrackBedAndRails(
  root: THREE.Group,
  routeLengthM: number,
  stations: readonly IStationSpec[],
  ballastTex: THREE.CanvasTexture,
  disposables: Array<{ dispose(): void }>,
): void {
  const rearPadM = 110;
  const totalLen = routeLengthM + rearPadM + 30;
  const centerZ = rearPadM - totalLen * 0.5;

  // Wide floor spans both standard double-track tunnel and wide dual-track station halls
  const zSegments = Math.max(1, Math.ceil(totalLen / 20));
  const floorGeo = new THREE.PlaneGeometry(21.2, totalLen, 1, zSegments);
  const floorMat = new THREE.MeshStandardMaterial({ map: ballastTex, roughness: 0.94, metalness: 0.04 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(-3.1, 0, centerZ);
  root.add(floor);

  // Straight player track rails (X = -0.72 and +0.72) subdivided to prevent long-triangle depth bleed
  const railGeo = new THREE.BoxGeometry(0.08, 0.14, totalLen, 1, 1, zSegments);
  const railMat = new THREE.MeshStandardMaterial({ color: 0xb8c4d4, roughness: 0.24, metalness: 0.88 });
  [-0.72, 0.72].forEach((xPos) => {
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(xPos, 0.15, centerZ);
    root.add(rail);
  });

  // Smooth curved opposite track rails following S-curve around island platforms
  const startDist = -rearPadM;
  const endDist = routeLengthM + 30;
  const oppRailLeftGeo = createCurvedRailGeometry(startDist, endDist, stations, -0.72, 0.08, 0.14, 0.15);
  const oppRailRightGeo = createCurvedRailGeometry(startDist, endDist, stations, 0.72, 0.08, 0.14, 0.15);
  root.add(new THREE.Mesh(oppRailLeftGeo, railMat), new THREE.Mesh(oppRailRightGeo, railMat));

  // Third rails (yellow/amber protective shroud)
  const thirdRailGeo = new THREE.BoxGeometry(0.14, 0.12, totalLen, 1, 1, zSegments);
  const thirdRailMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.55, metalness: 0.2 });
  const playerThirdRail = new THREE.Mesh(thirdRailGeo, thirdRailMat);
  playerThirdRail.position.set(-1.32, 0.22, centerZ);
  const oppThirdRailGeo = createCurvedRailGeometry(startDist, endDist, stations, -1.32, 0.14, 0.12, 0.22);
  root.add(playerThirdRail, new THREE.Mesh(oppThirdRailGeo, thirdRailMat));

  disposables.push(
    floorGeo,
    floorMat,
    railGeo,
    railMat,
    oppRailLeftGeo,
    oppRailRightGeo,
    thirdRailGeo,
    thirdRailMat,
    oppThirdRailGeo,
  );
}

function addInstancedSleepers(
  root: THREE.Group,
  routeLengthM: number,
  stations: readonly IStationSpec[],
  disposables: Array<{ dispose(): void }>,
): void {
  const count = Math.floor((routeLengthM + 120) / SLEEPER_SPACING_M);
  const geo = new THREE.BoxGeometry(2.15, 0.08, 0.24);
  const mat = new THREE.MeshStandardMaterial({ color: 0x383634, roughness: 0.92, metalness: 0.05 });
  const mesh = new THREE.InstancedMesh(geo, mat, count * 2);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i += 1) {
    const z = 104 - i * SLEEPER_SPACING_M;
    const distM = -z;
    dummy.position.set(0, 0.045, z);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i * 2, dummy.matrix);

    const oppX = getOppositeTrackX(distM, stations);
    const oppYaw = getOppositeTrackYaw(distM, stations);
    dummy.position.set(oppX, 0.045, z);
    dummy.rotation.set(0, oppYaw, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i * 2 + 1, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  root.add(mesh);
  disposables.push(geo, mat);
}

function addTunnelBaysAndLamps(
  root: THREE.Group,
  routeLengthM: number,
  stations: readonly IStationSpec[],
  concreteTex: THREE.CanvasTexture,
  disposables: Array<{ dispose(): void }>,
): void {
  const totalBays = Math.ceil((routeLengthM + 128) / BAY_LENGTH_M);
  const bayDistances: number[] = [];
  for (let i = 0; i < totalBays; i += 1) {
    const distM = -112 + i * BAY_LENGTH_M;
    if (!isWithinStationHall(distM, stations)) {
      bayDistances.push(distM);
    }
  }
  const n = bayDistances.length;
  const baseWidth = 10.8;
  const wallGeo = new THREE.BoxGeometry(0.45, 5.4, BAY_LENGTH_M + 0.08);
  const ceilGeo = new THREE.BoxGeometry(baseWidth + 0.6, 0.4, BAY_LENGTH_M + 0.08);
  const colGeo = new THREE.BoxGeometry(0.42, 5.1, 0.55);
  const beamGeo = new THREE.BoxGeometry(baseWidth, 0.36, 0.52);
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
  const cols = new THREE.InstancedMesh(colGeo, colMat, n * 3);
  const beams = new THREE.InstancedMesh(beamGeo, colMat, n);
  const cables = new THREE.InstancedMesh(cableGeo, cableMat, n * 6);
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, n * 2);

  populateTunnelInstances(
    bayDistances,
    stations,
    baseWidth,
    leftWalls,
    rightWalls,
    ceilings,
    cols,
    beams,
    cables,
    lamps,
  );
  [leftWalls, rightWalls, ceilings, cols, beams, cables, lamps].forEach((inst) => {
    inst.instanceMatrix.needsUpdate = true;
    inst.frustumCulled = false;
    root.add(inst);
  });
  disposables.push(wallGeo, ceilGeo, colGeo, beamGeo, cableGeo, lampGeo, wallMat, colMat, cableMat, lampMat);
}

function populateTunnelInstances(
  bayDistances: readonly number[],
  stations: readonly IStationSpec[],
  baseWidth: number,
  leftWalls: THREE.InstancedMesh,
  rightWalls: THREE.InstancedMesh,
  ceilings: THREE.InstancedMesh,
  cols: THREE.InstancedMesh,
  beams: THREE.InstancedMesh,
  cables: THREE.InstancedMesh,
  lamps: THREE.InstancedMesh,
): void {
  const dummy = new THREE.Object3D();
  const cableHeights = [1.32, 1.56, 1.8];
  bayDistances.forEach((distM, i) => {
    const z = -distM;
    const oppX = Math.min(
      getOppositeTrackX(distM - BAY_LENGTH_M * 0.45, stations),
      getOppositeTrackX(distM + BAY_LENGTH_M * 0.45, stations),
    );
    const leftWallX = oppX - 3.2;
    const spanW = RIGHT_WALL_X - leftWallX;
    const centerX = (leftWallX + RIGHT_WALL_X) * 0.5;
    const midColX = oppX * 0.5;

    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);

    dummy.position.set(leftWallX, 2.7, z);
    dummy.updateMatrix();
    leftWalls.setMatrixAt(i, dummy.matrix);

    dummy.position.set(RIGHT_WALL_X, 2.7, z);
    dummy.updateMatrix();
    rightWalls.setMatrixAt(i, dummy.matrix);

    dummy.scale.set(spanW / baseWidth, 1, 1);
    dummy.position.set(centerX, 5.25, z);
    dummy.updateMatrix();
    ceilings.setMatrixAt(i, dummy.matrix);

    dummy.position.set(centerX, 4.92, z);
    dummy.updateMatrix();
    beams.setMatrixAt(i, dummy.matrix);

    dummy.scale.set(1, 1, 1);
    dummy.position.set(leftWallX + 0.35, 2.55, z);
    dummy.updateMatrix();
    cols.setMatrixAt(i * 3, dummy.matrix);

    dummy.position.set(midColX, 2.55, z);
    dummy.updateMatrix();
    cols.setMatrixAt(i * 3 + 1, dummy.matrix);

    dummy.position.set(RIGHT_WALL_X - 0.35, 2.55, z);
    dummy.updateMatrix();
    cols.setMatrixAt(i * 3 + 2, dummy.matrix);

    cableHeights.forEach((h, tier) => {
      dummy.position.set(leftWallX + 0.28, h, z);
      dummy.updateMatrix();
      cables.setMatrixAt(i * 6 + tier * 2, dummy.matrix);
      dummy.position.set(RIGHT_WALL_X - 0.28, h, z);
      dummy.updateMatrix();
      cables.setMatrixAt(i * 6 + tier * 2 + 1, dummy.matrix);
    });

    dummy.position.set(leftWallX + 0.35, 3.65, z + 3.5);
    dummy.updateMatrix();
    lamps.setMatrixAt(i * 2, dummy.matrix);

    dummy.position.set(RIGHT_WALL_X - 0.3, 3.65, z + 3.5);
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
    post.position.set(-1.92, 1.1, -zone.startM);
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(-1.92, 2.15, -zone.startM + 0.06);
    root.add(post, sign);
    disposables.push(signTex, signMat);
  });
}

function addMeterMarkerPlaques(
  root: THREE.Group,
  routeLengthM: number,
  stations: readonly IStationSpec[],
  maxAnisotropy: number,
  disposables: Array<{ dispose(): void }>,
): void {
  const plaqueGeo = new THREE.BoxGeometry(0.06, 0.34, 0.64);
  const faceGeo = new THREE.PlaneGeometry(0.6, 0.3);
  const backingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.4 });
  disposables.push(plaqueGeo, faceGeo, backingMat);

  for (let distM = 100; distM < routeLengthM - 80; distM += 100) {
    if (isWithinStationHall(distM, stations)) {
      continue;
    }
    const tex = createMeterMarkerTexture(distM, maxAnisotropy);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: 0xffffff,
      emissiveIntensity: 0.42,
      roughness: 0.4,
    });
    const backing = new THREE.Mesh(plaqueGeo, backingMat);
    backing.position.set(2.88, 2.28, -distM);
    const face = new THREE.Mesh(faceGeo, mat);
    face.position.set(2.84, 2.28, -distM);
    face.rotation.y = -Math.PI / 2;
    root.add(backing, face);
    disposables.push(tex, mat);
  }
}
