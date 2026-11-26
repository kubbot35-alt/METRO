import * as THREE from 'three';
import type { TrackAlignment } from '../domain/trackAlignment';
import {
  getOppositeTrackX,
  getOppositeTrackYaw,
  isWithinStationHall,
} from '../domain/trackGeometry';
import type { ISpeedLimitZone, IStationSpec } from '../domain/types';
import {
  createBallastTexture,
  createCurveLimitSignTexture,
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
  alignment: TrackAlignment,
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
  const ballastTex = createBallastTexture(maxAnisotropy, 1);
  disposables.push(concreteTex, ballastTex);

  addTrackBedAndRails(root, alignment, routeLengthM, stations, ballastTex, disposables);
  addInstancedSleepers(root, alignment, routeLengthM, stations, disposables);
  addCurvedTunnelShells(root, alignment, routeLengthM, stations, concreteTex, disposables);
  addTunnelRibsAndLamps(root, alignment, routeLengthM, stations, disposables);
  addSpeedLimitSigns(root, alignment, speedZones, maxAnisotropy, disposables);
  addCurveWarningSigns(root, alignment, maxAnisotropy, disposables);
  addMeterMarkerPlaques(root, alignment, routeLengthM, stations, maxAnisotropy, disposables);

  return {
    dispose: () => {
      scene.remove(root);
      disposables.forEach((item) => item.dispose());
    },
  };
}

function createTrackBeamGeometry(
  startDistM: number,
  endDistM: number,
  alignment: TrackAlignment,
  getLateralX: (distM: number) => number,
  width: number,
  height: number,
  centerY: number,
  applyCant: boolean,
): THREE.BufferGeometry {
  const steps = Math.max(1, Math.ceil((endDistM - startDistM) / RAIL_SAMPLE_STEP_M));
  const halfW = width * 0.5;
  const halfH = height * 0.5;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= steps; i += 1) {
    const distM = Math.min(endDistM, startDistM + i * RAIL_SAMPLE_STEP_M);
    const cx = getLateralX(distM);
    const bl = alignment.toWorldPoint(distM, cx - halfW, centerY - halfH, applyCant);
    const br = alignment.toWorldPoint(distM, cx + halfW, centerY - halfH, applyCant);
    const tr = alignment.toWorldPoint(distM, cx + halfW, centerY + halfH, applyCant);
    const tl = alignment.toWorldPoint(distM, cx - halfW, centerY + halfH, applyCant);
    positions.push(bl.x, bl.y, bl.z, br.x, br.y, br.z, tr.x, tr.y, tr.z, tl.x, tl.y, tl.z);
    if (i < steps) {
      const a = i * 4;
      const b = (i + 1) * 4;
      indices.push(a + 3, a + 2, b + 2, a + 3, b + 2, b + 3); // top
      indices.push(a + 2, a + 1, b + 1, a + 2, b + 1, b + 2); // right
      indices.push(a + 0, a + 3, b + 3, a + 0, b + 3, b + 0); // left
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createTrackFloorRibbon(
  startDistM: number,
  endDistM: number,
  alignment: TrackAlignment,
): THREE.BufferGeometry {
  const steps = Math.max(1, Math.ceil((endDistM - startDistM) / RAIL_SAMPLE_STEP_M));
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const leftEdge = -13.7;
  const rightEdge = 7.5;

  for (let i = 0; i <= steps; i += 1) {
    const distM = Math.min(endDistM, startDistM + i * RAIL_SAMPLE_STEP_M);
    const pL = alignment.toWorldPoint(distM, leftEdge, 0, false);
    const pR = alignment.toWorldPoint(distM, rightEdge, 0, false);
    positions.push(pL.x, pL.y, pL.z, pR.x, pR.y, pR.z);
    const vCoord = distM / 8;
    uvs.push(0, vCoord, 2.5, vCoord);
    if (i < steps) {
      const a = i * 2;
      const b = (i + 1) * 2;
      indices.push(a, a + 1, b + 1, a, b + 1, b);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function addTrackBedAndRails(
  root: THREE.Group,
  alignment: TrackAlignment,
  routeLengthM: number,
  stations: readonly IStationSpec[],
  ballastTex: THREE.CanvasTexture,
  disposables: Array<{ dispose(): void }>,
): void {
  const startDist = -110;
  const endDist = routeLengthM + 30;

  const floorGeo = createTrackFloorRibbon(startDist, endDist, alignment);
  const floorMat = new THREE.MeshStandardMaterial({ map: ballastTex, roughness: 0.94, metalness: 0.04 });
  root.add(new THREE.Mesh(floorGeo, floorMat));

  const railMat = new THREE.MeshStandardMaterial({ color: 0xb8c4d4, roughness: 0.24, metalness: 0.88 });
  const playerRailLeftGeo = createTrackBeamGeometry(startDist, endDist, alignment, () => -0.72, 0.08, 0.14, 0.15, true);
  const playerRailRightGeo = createTrackBeamGeometry(startDist, endDist, alignment, () => 0.72, 0.08, 0.14, 0.15, true);
  const oppRailLeftGeo = createTrackBeamGeometry(
    startDist,
    endDist,
    alignment,
    (d) => getOppositeTrackX(d, stations) - 0.72,
    0.08,
    0.14,
    0.15,
    false,
  );
  const oppRailRightGeo = createTrackBeamGeometry(
    startDist,
    endDist,
    alignment,
    (d) => getOppositeTrackX(d, stations) + 0.72,
    0.08,
    0.14,
    0.15,
    false,
  );
  root.add(
    new THREE.Mesh(playerRailLeftGeo, railMat),
    new THREE.Mesh(playerRailRightGeo, railMat),
    new THREE.Mesh(oppRailLeftGeo, railMat),
    new THREE.Mesh(oppRailRightGeo, railMat),
  );

  const thirdRailMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.55, metalness: 0.2 });
  const playerThirdGeo = createTrackBeamGeometry(startDist, endDist, alignment, () => -1.32, 0.14, 0.12, 0.22, true);
  const oppThirdGeo = createTrackBeamGeometry(
    startDist,
    endDist,
    alignment,
    (d) => getOppositeTrackX(d, stations) - 1.32,
    0.14,
    0.12,
    0.22,
    false,
  );
  root.add(new THREE.Mesh(playerThirdGeo, thirdRailMat), new THREE.Mesh(oppThirdGeo, thirdRailMat));

  disposables.push(
    floorGeo,
    floorMat,
    railMat,
    playerRailLeftGeo,
    playerRailRightGeo,
    oppRailLeftGeo,
    oppRailRightGeo,
    thirdRailMat,
    playerThirdGeo,
    oppThirdGeo,
  );
}

function addInstancedSleepers(
  root: THREE.Group,
  alignment: TrackAlignment,
  routeLengthM: number,
  stations: readonly IStationSpec[],
  disposables: Array<{ dispose(): void }>,
): void {
  const count = Math.floor((routeLengthM + 120) / SLEEPER_SPACING_M);
  const geo = new THREE.BoxGeometry(2.15, 0.08, 0.24);
  const mat = new THREE.MeshStandardMaterial({ color: 0x383634, roughness: 0.92, metalness: 0.05 });
  const mesh = new THREE.InstancedMesh(geo, mat, count * 2);
  const dummy = new THREE.Object3D();
  dummy.rotation.order = 'YXZ';

  for (let i = 0; i < count; i += 1) {
    const distM = -104 + i * SLEEPER_SPACING_M;
    const s = alignment.sample(distM);
    dummy.position.set(s.x, s.y + 0.045, s.z);
    dummy.rotation.set(s.pitch, s.yaw, s.cantRollRad);
    dummy.updateMatrix();
    mesh.setMatrixAt(i * 2, dummy.matrix);

    const oppX = getOppositeTrackX(distM, stations);
    const oppYaw = getOppositeTrackYaw(distM, stations);
    const oppPt = alignment.toWorldPoint(distM, oppX, 0.045, false);
    dummy.position.set(oppPt.x, oppPt.y, oppPt.z);
    dummy.rotation.set(s.pitch, s.yaw + oppYaw, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i * 2 + 1, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  root.add(mesh);
  disposables.push(geo, mat);
}

function computeUndergroundTunnelSpans(
  alignment: TrackAlignment,
  routeLengthM: number,
  stations: readonly IStationSpec[],
): Array<{ readonly startM: number; readonly endM: number }> {
  const startBoundary = alignment.tunnelPortalDistanceM ?? -112;
  const endBoundary = routeLengthM + 24;
  const spans: Array<{ startM: number; endM: number }> = [];
  let cursor = startBoundary;

  for (let i = 0; i < stations.length; i += 1) {
    const hallStart = stations[i].distanceM - 98;
    const hallEnd = stations[i].distanceM + 28;
    if (hallStart > cursor + 2) {
      spans.push({ startM: cursor, endM: hallStart + 1 });
    }
    cursor = Math.max(cursor, hallEnd - 1);
  }
  if (endBoundary > cursor + 2) {
    spans.push({ startM: cursor, endM: endBoundary });
  }
  return spans;
}

function addCurvedTunnelShells(
  root: THREE.Group,
  alignment: TrackAlignment,
  routeLengthM: number,
  stations: readonly IStationSpec[],
  concreteTex: THREE.CanvasTexture,
  disposables: Array<{ dispose(): void }>,
): void {
  const spans = computeUndergroundTunnelSpans(alignment, routeLengthM, stations);
  const wallMat = new THREE.MeshStandardMaterial({
    map: concreteTex,
    roughness: 0.88,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });
  disposables.push(wallMat);

  spans.forEach((span) => {
    const geo = buildTunnelSpanShellGeometry(span.startM, span.endM, alignment, stations);
    root.add(new THREE.Mesh(geo, wallMat));
    disposables.push(geo);
  });
}

function buildTunnelSpanShellGeometry(
  startM: number,
  endM: number,
  alignment: TrackAlignment,
  stations: readonly IStationSpec[],
): THREE.BufferGeometry {
  const stepM = 4;
  const steps = Math.max(1, Math.ceil((endM - startM) / stepM));
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= steps; i += 1) {
    const d = Math.min(endM, startM + i * stepM);
    const leftWallX = getOppositeTrackX(d, stations) - 3.2;
    const pLB = alignment.toWorldPoint(d, leftWallX, 0, false);
    const pLT = alignment.toWorldPoint(d, leftWallX, 5.25, false);
    const pRT = alignment.toWorldPoint(d, RIGHT_WALL_X, 5.25, false);
    const pRB = alignment.toWorldPoint(d, RIGHT_WALL_X, 0, false);

    // 4 vertices per cross section: 0=leftBot, 1=leftTop, 2=rightTop, 3=rightBot
    positions.push(
      pLB.x, pLB.y, pLB.z,
      pLT.x, pLT.y, pLT.z,
      pRT.x, pRT.y, pRT.z,
      pRB.x, pRB.y, pRB.z,
    );
    const u = d / 16;
    uvs.push(u, 0, u, 1, u, 2, u, 3);
    if (i < steps) {
      const a = i * 4;
      const b = (i + 1) * 4;
      // Left inner wall (faces +X)
      indices.push(a + 0, b + 0, b + 1, a + 0, b + 1, a + 1);
      // Ceiling (faces -Y)
      indices.push(a + 1, b + 1, b + 2, a + 1, b + 2, a + 2);
      // Right inner wall (faces -X)
      indices.push(a + 2, b + 2, b + 3, a + 2, b + 3, a + 3);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function addTunnelRibsAndLamps(
  root: THREE.Group,
  alignment: TrackAlignment,
  routeLengthM: number,
  stations: readonly IStationSpec[],
  disposables: Array<{ dispose(): void }>,
): void {
  const startBoundary = alignment.tunnelPortalDistanceM !== null ? alignment.tunnelPortalDistanceM + 8 : -112;
  const bayDistances: number[] = [];
  for (let distM = startBoundary; distM <= routeLengthM + 16; distM += BAY_LENGTH_M) {
    if (!isWithinStationHall(distM, stations)) {
      bayDistances.push(distM);
    }
  }
  const n = bayDistances.length;
  if (n === 0) {
    return;
  }
  const baseWidth = 10.8;
  const colGeo = new THREE.BoxGeometry(0.42, 5.1, 0.55);
  const beamGeo = new THREE.BoxGeometry(baseWidth, 0.36, 0.52);
  const cableGeo = new THREE.BoxGeometry(0.12, 0.14, BAY_LENGTH_M + 0.16);
  const lampGeo = new THREE.BoxGeometry(0.16, 0.24, 1.55);

  const colMat = new THREE.MeshStandardMaterial({ color: 0x3b424d, roughness: 0.72, metalness: 0.22 });
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.48, metalness: 0.55 });
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: 0xf59e0b,
    emissiveIntensity: 2.5,
    roughness: 0.2,
  });

  const cols = new THREE.InstancedMesh(colGeo, colMat, n * 3);
  const beams = new THREE.InstancedMesh(beamGeo, colMat, n);
  const cables = new THREE.InstancedMesh(cableGeo, cableMat, n * 6);
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, n * 2);

  const dummy = new THREE.Object3D();
  dummy.rotation.order = 'YXZ';
  const cableHeights = [1.32, 1.56, 1.8];

  bayDistances.forEach((distM, i) => {
    const s = alignment.sample(distM);
    const oppX = getOppositeTrackX(distM, stations);
    const leftWallX = oppX - 3.2;
    const spanW = RIGHT_WALL_X - leftWallX;
    const centerX = (leftWallX + RIGHT_WALL_X) * 0.5;
    const midColX = oppX * 0.5;

    const place = (latX: number, upY: number, scaleX = 1, distOffset = 0): void => {
      const sampleAt = distOffset === 0 ? s : alignment.sample(distM + distOffset);
      const pt = alignment.toWorldPoint(distM + distOffset, latX, upY, false);
      dummy.position.set(pt.x, pt.y, pt.z);
      dummy.rotation.set(sampleAt.pitch, sampleAt.yaw, 0);
      dummy.scale.set(scaleX, 1, 1);
      dummy.updateMatrix();
    };

    place(centerX, 4.92, spanW / baseWidth);
    beams.setMatrixAt(i, dummy.matrix);

    place(leftWallX + 0.28, 2.55);
    cols.setMatrixAt(i * 3, dummy.matrix);
    place(midColX, 2.55);
    cols.setMatrixAt(i * 3 + 1, dummy.matrix);
    place(RIGHT_WALL_X - 0.28, 2.55);
    cols.setMatrixAt(i * 3 + 2, dummy.matrix);

    cableHeights.forEach((h, tier) => {
      place(leftWallX + 0.18, h);
      cables.setMatrixAt(i * 6 + tier * 2, dummy.matrix);
      place(RIGHT_WALL_X - 0.18, h);
      cables.setMatrixAt(i * 6 + tier * 2 + 1, dummy.matrix);
    });

    place(leftWallX + 0.26, 3.65, 1, -3.5);
    lamps.setMatrixAt(i * 2, dummy.matrix);
    place(RIGHT_WALL_X - 0.26, 3.65, 1, -3.5);
    lamps.setMatrixAt(i * 2 + 1, dummy.matrix);
  });

  [cols, beams, cables, lamps].forEach((inst) => {
    inst.instanceMatrix.needsUpdate = true;
    inst.frustumCulled = false;
    root.add(inst);
  });
  disposables.push(colGeo, beamGeo, cableGeo, lampGeo, colMat, cableMat, lampMat);
}

function addSpeedLimitSigns(
  root: THREE.Group,
  alignment: TrackAlignment,
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
    const s = alignment.sample(zone.startM);
    const pt = alignment.toWorldPoint(zone.startM, -1.92, 0, false);
    const signTex = createSpeedSignTexture(zone.limitKmh, maxAnisotropy);
    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      emissiveMap: signTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.45,
      roughness: 0.35,
    });
    const signGroup = new THREE.Group();
    signGroup.position.set(pt.x, pt.y, pt.z);
    signGroup.rotation.set(0, s.yaw, 0);
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(0, 1.1, 0);
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 2.15, 0.06);
    signGroup.add(post, sign);
    root.add(signGroup);
    disposables.push(signTex, signMat);
  });
}

function addCurveWarningSigns(
  root: THREE.Group,
  alignment: TrackAlignment,
  maxAnisotropy: number,
  disposables: Array<{ dispose(): void }>,
): void {
  const postGeo = new THREE.CylinderGeometry(0.045, 0.05, 2.35, 8);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.7 });
  const signGeo = new THREE.PlaneGeometry(0.86, 0.86);
  const backGeo = new THREE.BoxGeometry(0.9, 0.9, 0.06);
  disposables.push(postGeo, postMat, signGeo, backGeo);

  alignment.curveZones.forEach((curve) => {
    if (curve.speedLimitKmh === undefined || curve.signDistanceM === undefined) {
      return;
    }
    const distM = curve.signDistanceM;
    const s = alignment.sample(distM);
    const pt = alignment.toWorldPoint(distM, 2.02, 0, false);
    const tex = createCurveLimitSignTexture(curve.speedLimitKmh, curve.direction, maxAnisotropy);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: 0xffffff,
      emissiveIntensity: 0.65,
      roughness: 0.3,
    });
    const signGroup = new THREE.Group();
    signGroup.position.set(pt.x, pt.y, pt.z);
    signGroup.rotation.set(0, s.yaw, 0);
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(0, 1.18, 0);
    const back = new THREE.Mesh(backGeo, postMat);
    back.position.set(0, 2.22, 0);
    const face = new THREE.Mesh(signGeo, mat);
    face.position.set(0, 2.22, 0.04);
    signGroup.add(post, back, face);
    root.add(signGroup);
    disposables.push(tex, mat);
  });
}

function addMeterMarkerPlaques(
  root: THREE.Group,
  alignment: TrackAlignment,
  routeLengthM: number,
  stations: readonly IStationSpec[],
  maxAnisotropy: number,
  disposables: Array<{ dispose(): void }>,
): void {
  const startBoundary = alignment.tunnelPortalDistanceM !== null ? alignment.tunnelPortalDistanceM + 20 : 100;
  const plaqueGeo = new THREE.BoxGeometry(0.06, 0.34, 0.64);
  const faceGeo = new THREE.PlaneGeometry(0.6, 0.3);
  const backingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.4 });
  disposables.push(plaqueGeo, faceGeo, backingMat);

  for (let distM = Math.ceil(startBoundary / 100) * 100; distM < routeLengthM - 80; distM += 100) {
    if (isWithinStationHall(distM, stations)) {
      continue;
    }
    const s = alignment.sample(distM);
    const pt = alignment.toWorldPoint(distM, 2.88, 2.28, false);
    const tex = createMeterMarkerTexture(distM, maxAnisotropy);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: 0xffffff,
      emissiveIntensity: 0.42,
      roughness: 0.4,
    });
    const holder = new THREE.Group();
    holder.position.set(pt.x, pt.y, pt.z);
    holder.rotation.set(0, s.yaw, 0);
    const backing = new THREE.Mesh(plaqueGeo, backingMat);
    const face = new THREE.Mesh(faceGeo, mat);
    face.position.set(-0.04, 0, 0);
    face.rotation.y = -Math.PI / 2;
    holder.add(backing, face);
    root.add(holder);
    disposables.push(tex, mat);
  }
}
