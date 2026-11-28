import * as THREE from 'three';
import type { TrackAlignment } from '../../domain/trackAlignment';
import { getOppositeTrackX, getOppositeTrackYaw } from '../../domain/trackGeometry';
import type { IStationSpec } from '../../domain/types';

const SLEEPER_SPACING_M = 1.6;
const RAIL_SAMPLE_STEP_M = 4;
const TRACK_CHUNK_LENGTH_M = 600;

export type CullableRegistrar = (startM: number, endM: number, object: THREE.Object3D) => void;

export function addChunkedTrackBedAndRails(
  root: THREE.Group, alignment: TrackAlignment, routeLengthM: number, stations: readonly IStationSpec[],
  ballastTex: THREE.CanvasTexture, disposables: Array<{ dispose(): void }>, registerCullable: CullableRegistrar,
): void {
  const endDist = routeLengthM + 30;
  const floorMat = new THREE.MeshStandardMaterial({ map: ballastTex, roughness: 0.94, metalness: 0.04 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0xb8c4d4, roughness: 0.24, metalness: 0.88 });
  const thirdRailMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.55, metalness: 0.2 });
  disposables.push(floorMat, railMat, thirdRailMat);
  for (let chunkStart = -110; chunkStart < endDist; chunkStart += TRACK_CHUNK_LENGTH_M) {
    const chunkEnd = Math.min(endDist, chunkStart + TRACK_CHUNK_LENGTH_M + 4);
    const geos = buildTrackChunkGeometries(chunkStart, chunkEnd, alignment, stations);
    const chunkGroup = buildChunkGroup(geos, floorMat, railMat, thirdRailMat);
    root.add(chunkGroup);
    registerCullable(chunkStart, chunkEnd, chunkGroup);
    disposables.push(...geos);
  }
}

function buildChunkGroup(
  geos: readonly THREE.BufferGeometry[], floorMat: THREE.MeshStandardMaterial,
  railMat: THREE.MeshStandardMaterial, thirdRailMat: THREE.MeshStandardMaterial,
): THREE.Group {
  const chunkGroup = new THREE.Group();
  chunkGroup.add(
    new THREE.Mesh(geos[0], floorMat), new THREE.Mesh(geos[1], railMat), new THREE.Mesh(geos[2], railMat),
    new THREE.Mesh(geos[3], railMat), new THREE.Mesh(geos[4], railMat),
    new THREE.Mesh(geos[5], thirdRailMat), new THREE.Mesh(geos[6], thirdRailMat),
  );
  return chunkGroup;
}

function buildTrackChunkGeometries(
  chunkStart: number,
  chunkEnd: number,
  alignment: TrackAlignment,
  stations: readonly IStationSpec[],
): THREE.BufferGeometry[] {
  return [
    createTrackFloorRibbon(chunkStart, chunkEnd, alignment),
    createTrackBeamGeometry(chunkStart, chunkEnd, alignment, () => -0.72, 0.08, 0.14, 0.15, true),
    createTrackBeamGeometry(chunkStart, chunkEnd, alignment, () => 0.72, 0.08, 0.14, 0.15, true),
    createTrackBeamGeometry(chunkStart, chunkEnd, alignment, (d) => getOppositeTrackX(d, stations) - 0.72, 0.08, 0.14, 0.15, false),
    createTrackBeamGeometry(chunkStart, chunkEnd, alignment, (d) => getOppositeTrackX(d, stations) + 0.72, 0.08, 0.14, 0.15, false),
    createTrackBeamGeometry(chunkStart, chunkEnd, alignment, () => -1.32, 0.14, 0.12, 0.22, true),
    createTrackBeamGeometry(chunkStart, chunkEnd, alignment, (d) => getOppositeTrackX(d, stations) - 1.32, 0.14, 0.12, 0.22, false),
  ];
}

export function addChunkedInstancedSleepers(
  root: THREE.Group,
  alignment: TrackAlignment,
  routeLengthM: number,
  stations: readonly IStationSpec[],
  disposables: Array<{ dispose(): void }>,
  registerCullable: CullableRegistrar,
): void {
  const geo = new THREE.BoxGeometry(2.15, 0.08, 0.24);
  const mat = new THREE.MeshStandardMaterial({ color: 0x383634, roughness: 0.92, metalness: 0.05 });
  disposables.push(geo, mat);
  const dummy = new THREE.Object3D();
  dummy.rotation.order = 'YXZ';
  for (let chunkStart = -104; chunkStart < routeLengthM + 16; chunkStart += TRACK_CHUNK_LENGTH_M) {
    const chunkEnd = Math.min(routeLengthM + 16, chunkStart + TRACK_CHUNK_LENGTH_M);
    const count = Math.max(1, Math.floor((chunkEnd - chunkStart) / SLEEPER_SPACING_M));
    const mesh = new THREE.InstancedMesh(geo, mat, count * 2);
    populateSleeperChunk(mesh, dummy, chunkStart, count, alignment, stations);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    root.add(mesh);
    registerCullable(chunkStart, chunkEnd, mesh);
  }
}

function populateSleeperChunk(
  mesh: THREE.InstancedMesh,
  dummy: THREE.Object3D,
  chunkStart: number,
  count: number,
  alignment: TrackAlignment,
  stations: readonly IStationSpec[],
): void {
  for (let i = 0; i < count; i += 1) {
    const distM = chunkStart + i * SLEEPER_SPACING_M;
    const s = alignment.sample(distM);
    dummy.position.set(s.x, s.y + 0.045, s.z);
    dummy.rotation.set(s.pitch, s.yaw, s.cantRollRad);
    dummy.updateMatrix();
    mesh.setMatrixAt(i * 2, dummy.matrix);
    const oppPt = alignment.toWorldPoint(distM, getOppositeTrackX(distM, stations), 0.045, false);
    dummy.position.set(oppPt.x, oppPt.y, oppPt.z);
    dummy.rotation.set(s.pitch, s.yaw + getOppositeTrackYaw(distM, stations), 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i * 2 + 1, dummy.matrix);
  }
}

function createTrackBeamGeometry(
  startDistM: number, endDistM: number, alignment: TrackAlignment, getLateralX: (distM: number) => number,
  width: number, height: number, centerY: number, applyCant: boolean,
): THREE.BufferGeometry {
  const steps = Math.max(1, Math.ceil((endDistM - startDistM) / RAIL_SAMPLE_STEP_M));
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const distM = Math.min(endDistM, startDistM + i * RAIL_SAMPLE_STEP_M);
    appendBeamCrossSection(positions, indices, i, i < steps, distM, getLateralX(distM), width * 0.5, height * 0.5, centerY, applyCant, alignment);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function appendBeamCrossSection(
  positions: number[], indices: number[], i: number, hasNext: boolean, distM: number,
  cx: number, halfW: number, halfH: number, centerY: number, applyCant: boolean, alignment: TrackAlignment,
): void {
  const bl = alignment.toWorldPoint(distM, cx - halfW, centerY - halfH, applyCant);
  const br = alignment.toWorldPoint(distM, cx + halfW, centerY - halfH, applyCant);
  const tr = alignment.toWorldPoint(distM, cx + halfW, centerY + halfH, applyCant);
  const tl = alignment.toWorldPoint(distM, cx - halfW, centerY + halfH, applyCant);
  positions.push(bl.x, bl.y, bl.z, br.x, br.y, br.z, tr.x, tr.y, tr.z, tl.x, tl.y, tl.z);
  if (hasNext) {
    const a = i * 4;
    const b = (i + 1) * 4;
    indices.push(a + 3, a + 2, b + 2, a + 3, b + 2, b + 3, a + 2, a + 1, b + 1, a + 2, b + 1, b + 2, a, a + 3, b + 3, a, b + 3, b);
  }
}

function createTrackFloorRibbon(startDistM: number, endDistM: number, alignment: TrackAlignment): THREE.BufferGeometry {
  const steps = Math.max(1, Math.ceil((endDistM - startDistM) / RAIL_SAMPLE_STEP_M));
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const distM = Math.min(endDistM, startDistM + i * RAIL_SAMPLE_STEP_M);
    const pL = alignment.toWorldPoint(distM, -13.7, 0, false);
    const pR = alignment.toWorldPoint(distM, 7.5, 0, false);
    positions.push(pL.x, pL.y, pL.z, pR.x, pR.y, pR.z);
    uvs.push(0, distM / 8, 2.5, distM / 8);
    if (i < steps) { const a = i * 2; const b = (i + 1) * 2; indices.push(a, a + 1, b + 1, a, b + 1, b); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
