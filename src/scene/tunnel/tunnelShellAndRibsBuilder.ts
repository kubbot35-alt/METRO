import * as THREE from 'three';
import type { TrackAlignment } from '../../domain/trackAlignment';
import { getOppositeTrackX, isWithinStationHall } from '../../domain/trackGeometry';
import type { IStationSpec } from '../../domain/types';
import type { CullableRegistrar } from './tunnelTrackBedBuilder';

const BAY_LENGTH_M = 16;
const RIGHT_WALL_X = 3.2;
const TRACK_CHUNK_LENGTH_M = 600;

export function addCurvedTunnelShells(
  root: THREE.Group,
  alignment: TrackAlignment,
  routeLengthM: number,
  stations: readonly IStationSpec[],
  concreteTex: THREE.CanvasTexture,
  disposables: Array<{ dispose(): void }>,
  registerCullable: CullableRegistrar,
): void {
  const spans = computeUndergroundTunnelSpans(alignment, routeLengthM, stations);
  const wallMat = new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.88, metalness: 0.08, side: THREE.DoubleSide });
  disposables.push(wallMat);
  spans.forEach((span) => {
    const geo = buildTunnelSpanShellGeometry(span.startM, span.endM, alignment, stations);
    const mesh = new THREE.Mesh(geo, wallMat);
    root.add(mesh);
    registerCullable(span.startM, span.endM, mesh);
    disposables.push(geo);
  });
}

function computeUndergroundTunnelSpans(alignment: TrackAlignment, routeLengthM: number, stations: readonly IStationSpec[]) {
  const startBoundary = alignment.tunnelPortalDistanceM ?? -112;
  const endBoundary = routeLengthM + 24;
  const spans: Array<{ readonly startM: number; readonly endM: number }> = [];
  let cursor = startBoundary;
  for (let i = 0; i < stations.length; i += 1) {
    const hallStart = stations[i].distanceM - 98;
    const hallEnd = stations[i].distanceM + 28;
    if (hallStart > cursor + 2) spans.push({ startM: cursor, endM: hallStart + 1 });
    cursor = Math.max(cursor, hallEnd - 1);
  }
  if (endBoundary > cursor + 2) spans.push({ startM: cursor, endM: endBoundary });
  return spans;
}

function buildTunnelSpanShellGeometry(startM: number, endM: number, alignment: TrackAlignment, stations: readonly IStationSpec[]): THREE.BufferGeometry {
  const steps = Math.max(1, Math.ceil((endM - startM) / 4));
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const d = Math.min(endM, startM + i * 4);
    const leftWallX = getOppositeTrackX(d, stations) - 3.2;
    const pts = [alignment.toWorldPoint(d, leftWallX, 0, false), alignment.toWorldPoint(d, leftWallX, 5.25, false), alignment.toWorldPoint(d, RIGHT_WALL_X, 5.25, false), alignment.toWorldPoint(d, RIGHT_WALL_X, 0, false)];
    pts.forEach((p) => positions.push(p.x, p.y, p.z));
    const u = d / 16;
    uvs.push(u, 0, u, 1, u, 2, u, 3);
    if (i < steps) {
      const a = i * 4;
      const b = (i + 1) * 4;
      indices.push(a, b, b + 1, a, b + 1, a + 1, a + 1, b + 1, b + 2, a + 1, b + 2, a + 2, a + 2, b + 2, b + 3, a + 2, b + 3, a + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function addChunkedTunnelRibsAndLamps(
  root: THREE.Group,
  alignment: TrackAlignment,
  routeLengthM: number,
  stations: readonly IStationSpec[],
  disposables: Array<{ dispose(): void }>,
  registerCullable: CullableRegistrar,
): void {
  const startBoundary = alignment.tunnelPortalDistanceM !== null ? alignment.tunnelPortalDistanceM + 8 : -112;
  const endBoundary = routeLengthM + 16;
  const assets = createRibAssets(disposables);
  const dummy = new THREE.Object3D();
  dummy.rotation.order = 'YXZ';
  for (let chunkStart = startBoundary; chunkStart < endBoundary; chunkStart += TRACK_CHUNK_LENGTH_M) {
    const chunkEnd = Math.min(endBoundary, chunkStart + TRACK_CHUNK_LENGTH_M);
    const bayDistances = collectBayDistances(chunkStart, chunkEnd, stations);
    if (bayDistances.length > 0) {
      const chunkGroup = buildRibChunkGroup(bayDistances, alignment, stations, assets, dummy);
      root.add(chunkGroup);
      registerCullable(chunkStart, chunkEnd, chunkGroup);
    }
  }
}

function createRibAssets(disposables: Array<{ dispose(): void }>) {
  const baseWidth = 10.8;
  const colGeo = new THREE.BoxGeometry(0.42, 5.1, 0.55);
  const beamGeo = new THREE.BoxGeometry(baseWidth, 0.36, 0.52);
  const cableGeo = new THREE.BoxGeometry(0.12, 0.14, BAY_LENGTH_M + 0.16);
  const lampGeo = new THREE.BoxGeometry(0.16, 0.24, 1.55);
  const colMat = new THREE.MeshStandardMaterial({ color: 0x3b424d, roughness: 0.72, metalness: 0.22 });
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.48, metalness: 0.55 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffedd5, emissive: 0xf59e0b, emissiveIntensity: 2.5, roughness: 0.2 });
  disposables.push(colGeo, beamGeo, cableGeo, lampGeo, colMat, cableMat, lampMat);
  return { baseWidth, colGeo, beamGeo, cableGeo, lampGeo, colMat, cableMat, lampMat };
}

function collectBayDistances(chunkStart: number, chunkEnd: number, stations: readonly IStationSpec[]): number[] {
  const out: number[] = [];
  for (let distM = chunkStart; distM < chunkEnd; distM += BAY_LENGTH_M) {
    if (!isWithinStationHall(distM, stations)) out.push(distM);
  }
  return out;
}

function buildRibChunkGroup(
  bayDistances: readonly number[],
  alignment: TrackAlignment,
  stations: readonly IStationSpec[],
  assets: ReturnType<typeof createRibAssets>,
  dummy: THREE.Object3D,
): THREE.Group {
  const n = bayDistances.length;
  const cols = new THREE.InstancedMesh(assets.colGeo, assets.colMat, n * 3);
  const beams = new THREE.InstancedMesh(assets.beamGeo, assets.colMat, n);
  const cables = new THREE.InstancedMesh(assets.cableGeo, assets.cableMat, n * 6);
  const lamps = new THREE.InstancedMesh(assets.lampGeo, assets.lampMat, n * 2);
  bayDistances.forEach((distM, i) => populateRibBay(distM, i, alignment, stations, assets.baseWidth, dummy, cols, beams, cables, lamps));
  const chunkGroup = new THREE.Group();
  [cols, beams, cables, lamps].forEach((inst) => { inst.instanceMatrix.needsUpdate = true; inst.frustumCulled = false; chunkGroup.add(inst); });
  return chunkGroup;
}

function composeRibMatrix(
  dummy: THREE.Object3D, alignment: TrackAlignment, baseSample: ReturnType<TrackAlignment['sample']>,
  distM: number, latX: number, upY: number, scaleX = 1, distOffset = 0,
): THREE.Matrix4 {
  const sampleAt = distOffset === 0 ? baseSample : alignment.sample(distM + distOffset);
  const pt = alignment.toWorldPoint(distM + distOffset, latX, upY, false);
  dummy.position.set(pt.x, pt.y, pt.z);
  dummy.rotation.set(sampleAt.pitch, sampleAt.yaw, 0);
  dummy.scale.set(scaleX, 1, 1);
  dummy.updateMatrix();
  return dummy.matrix;
}

function populateRibBay(
  distM: number, i: number, alignment: TrackAlignment, stations: readonly IStationSpec[], baseWidth: number,
  dummy: THREE.Object3D, cols: THREE.InstancedMesh, beams: THREE.InstancedMesh, cables: THREE.InstancedMesh, lamps: THREE.InstancedMesh,
): void {
  const s = alignment.sample(distM);
  const oppX = getOppositeTrackX(distM, stations);
  const leftWallX = oppX - 3.2;
  beams.setMatrixAt(i, composeRibMatrix(dummy, alignment, s, distM, (leftWallX + RIGHT_WALL_X) * 0.5, 4.92, (RIGHT_WALL_X - leftWallX) / baseWidth));
  cols.setMatrixAt(i * 3, composeRibMatrix(dummy, alignment, s, distM, leftWallX + 0.28, 2.55));
  cols.setMatrixAt(i * 3 + 1, composeRibMatrix(dummy, alignment, s, distM, oppX * 0.5, 2.55));
  cols.setMatrixAt(i * 3 + 2, composeRibMatrix(dummy, alignment, s, distM, RIGHT_WALL_X - 0.28, 2.55));
  [1.32, 1.56, 1.8].forEach((h, tier) => {
    cables.setMatrixAt(i * 6 + tier * 2, composeRibMatrix(dummy, alignment, s, distM, leftWallX + 0.18, h));
    cables.setMatrixAt(i * 6 + tier * 2 + 1, composeRibMatrix(dummy, alignment, s, distM, RIGHT_WALL_X - 0.18, h));
  });
  lamps.setMatrixAt(i * 2, composeRibMatrix(dummy, alignment, s, distM, leftWallX + 0.26, 3.65, 1, -3.5));
  lamps.setMatrixAt(i * 2 + 1, composeRibMatrix(dummy, alignment, s, distM, RIGHT_WALL_X - 0.26, 3.65, 1, -3.5));
}
