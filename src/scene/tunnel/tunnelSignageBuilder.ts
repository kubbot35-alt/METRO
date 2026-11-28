import * as THREE from 'three';
import type { TrackAlignment } from '../../domain/trackAlignment';
import { isWithinStationHall } from '../../domain/trackGeometry';
import type { ISpeedLimitZone, IStationSpec } from '../../domain/types';
import { createCurveLimitSignTexture, createMeterMarkerTexture, createSpeedSignTexture } from '../proceduralTextures';
import type { CullableRegistrar } from './tunnelTrackBedBuilder';

export function addSpeedLimitSigns(
  root: THREE.Group, alignment: TrackAlignment, speedZones: readonly ISpeedLimitZone[],
  maxAnisotropy: number, disposables: Array<{ dispose(): void }>, registerCullable: CullableRegistrar,
): void {
  const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8);
  const bracketGeo = new THREE.BoxGeometry(0.42, 0.07, 0.07);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.45, metalness: 0.72 });
  const discGeo = new THREE.CircleGeometry(0.42, 24);
  const ringGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.05, 24);
  ringGeo.rotateX(Math.PI / 2);
  disposables.push(postGeo, bracketGeo, postMat, discGeo, ringGeo);
  const cachedMats = new Map<number, THREE.MeshStandardMaterial>();
  speedZones.forEach((zone) => {
    if (zone.startM <= 10) return;
    const signMat = getOrCreateSignMat(cachedMats, zone.limitKmh, () => createSpeedSignTexture(zone.limitKmh, maxAnisotropy), 0.78, disposables);
    placeTrackSignPost(root, alignment, zone.startM, -2.02, postGeo, postMat, discGeo, signMat, registerCullable);
    placeTunnelWallSpeedDisc(root, alignment, zone.startM, 2.52, bracketGeo, postMat, ringGeo, discGeo, signMat, registerCullable);
  });
}

export function addCurveWarningSigns(
  root: THREE.Group, alignment: TrackAlignment, maxAnisotropy: number,
  disposables: Array<{ dispose(): void }>, registerCullable: CullableRegistrar,
): void {
  const postGeo = new THREE.CylinderGeometry(0.048, 0.055, 2.35, 8);
  const bracketGeo = new THREE.BoxGeometry(0.42, 0.07, 0.07);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.7 });
  const signGeo = new THREE.PlaneGeometry(1.12, 1.12);
  const backGeo = new THREE.BoxGeometry(1.18, 1.18, 0.07);
  const discGeo = new THREE.CircleGeometry(0.42, 24);
  const ringGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.05, 24);
  ringGeo.rotateX(Math.PI / 2);
  disposables.push(postGeo, bracketGeo, postMat, signGeo, backGeo, discGeo, ringGeo);
  const cachedMats = new Map<string, THREE.MeshStandardMaterial>();
  const discMats = new Map<number, THREE.MeshStandardMaterial>();
  alignment.curveZones.forEach((curve) => {
    if (curve.speedLimitKmh === undefined || curve.signDistanceM === undefined) return;
    const key = `${curve.speedLimitKmh}:${curve.direction}`;
    const mat = getOrCreateSignMat(cachedMats, key, () => createCurveLimitSignTexture(curve.speedLimitKmh!, curve.direction, maxAnisotropy), 0.85, disposables);
    const discMat = getOrCreateSignMat(discMats, curve.speedLimitKmh, () => createSpeedSignTexture(curve.speedLimitKmh!, maxAnisotropy), 0.82, disposables);
    placeCurvePost(root, alignment, curve.signDistanceM, postGeo, postMat, backGeo, signGeo, mat, registerCullable);
    placeTunnelWallSpeedDisc(root, alignment, Math.max(20, curve.startM - 25), -2.52, bracketGeo, postMat, ringGeo, discGeo, discMat, registerCullable);
  });
}

export function addMeterMarkerPlaques(
  root: THREE.Group, alignment: TrackAlignment, routeLengthM: number, stations: readonly IStationSpec[],
  maxAnisotropy: number, disposables: Array<{ dispose(): void }>, registerCullable: CullableRegistrar,
): void {
  const startBoundary = alignment.tunnelPortalDistanceM !== null ? alignment.tunnelPortalDistanceM + 20 : 100;
  const plaqueGeo = new THREE.BoxGeometry(0.06, 0.34, 0.64);
  const faceGeo = new THREE.PlaneGeometry(0.6, 0.3);
  const backingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.4 });
  disposables.push(plaqueGeo, faceGeo, backingMat);
  for (let distM = Math.ceil(startBoundary / 100) * 100; distM < routeLengthM - 80; distM += 100) {
    if (isWithinStationHall(distM, stations)) continue;
    attachMeterPlaque(root, alignment, distM, plaqueGeo, faceGeo, backingMat, maxAnisotropy, disposables, registerCullable);
  }
}

function getOrCreateSignMat<K>(
  cache: Map<K, THREE.MeshStandardMaterial>, key: K, createTex: () => THREE.CanvasTexture,
  emissiveIntensity: number, disposables: Array<{ dispose(): void }>,
): THREE.MeshStandardMaterial {
  const existing = cache.get(key);
  if (existing) return existing;
  const tex = createTex();
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity, roughness: 0.32 });
  disposables.push(tex, mat);
  cache.set(key, mat);
  return mat;
}

function placeTrackSignPost(
  root: THREE.Group, alignment: TrackAlignment, distM: number, latX: number,
  postGeo: THREE.CylinderGeometry, postMat: THREE.MeshStandardMaterial, signGeo: THREE.BufferGeometry,
  signMat: THREE.MeshStandardMaterial, registerCullable: CullableRegistrar,
): void {
  const s = alignment.sample(distM);
  const pt = alignment.toWorldPoint(distM, latX, 0, false);
  const signGroup = new THREE.Group();
  signGroup.position.set(pt.x, pt.y, pt.z);
  signGroup.rotation.set(0, s.yaw, 0);
  const post = new THREE.Mesh(postGeo, postMat);
  post.position.set(0, 1.1, 0);
  const sign = new THREE.Mesh(signGeo, signMat);
  sign.position.set(0, 2.15, 0.06);
  signGroup.add(post, sign);
  root.add(signGroup);
  registerCullable(distM, distM, signGroup);
}

function placeTunnelWallSpeedDisc(
  root: THREE.Group, alignment: TrackAlignment, distM: number, wallX: number,
  bracketGeo: THREE.BoxGeometry, postMat: THREE.MeshStandardMaterial,
  ringGeo: THREE.CylinderGeometry, discGeo: THREE.CircleGeometry,
  discMat: THREE.MeshStandardMaterial, registerCullable: CullableRegistrar,
): void {
  if (alignment.tunnelPortalDistanceM !== null && distM < alignment.tunnelPortalDistanceM + 10) return;
  const s = alignment.sample(distM);
  const pt = alignment.toWorldPoint(distM, wallX, 2.28, false);
  const holder = new THREE.Group();
  holder.position.set(pt.x, pt.y, pt.z);
  holder.rotation.set(0, s.yaw, 0);
  const bracket = new THREE.Mesh(bracketGeo, postMat);
  bracket.position.set(wallX > 0 ? 0.24 : -0.24, 0, -0.02);
  const ring = new THREE.Mesh(ringGeo, postMat);
  const face = new THREE.Mesh(discGeo, discMat);
  face.position.set(0, 0, 0.032);
  holder.add(bracket, ring, face);
  root.add(holder);
  registerCullable(distM, distM, holder);
}

function placeCurvePost(
  root: THREE.Group, alignment: TrackAlignment, distM: number,
  postGeo: THREE.CylinderGeometry, postMat: THREE.MeshStandardMaterial, backGeo: THREE.BoxGeometry,
  signGeo: THREE.PlaneGeometry, faceMat: THREE.MeshStandardMaterial, registerCullable: CullableRegistrar,
): void {
  const s = alignment.sample(distM);
  const pt = alignment.toWorldPoint(distM, 2.18, 0, false);
  const signGroup = new THREE.Group();
  signGroup.position.set(pt.x, pt.y, pt.z);
  signGroup.rotation.set(0, s.yaw, 0);
  const post = new THREE.Mesh(postGeo, postMat);
  post.position.set(0, 1.18, 0);
  const back = new THREE.Mesh(backGeo, postMat);
  back.position.set(0, 2.18, 0);
  const face = new THREE.Mesh(signGeo, faceMat);
  face.position.set(0, 2.18, 0.045);
  signGroup.add(post, back, face);
  root.add(signGroup);
  registerCullable(distM, distM, signGroup);
}

function attachMeterPlaque(
  root: THREE.Group, alignment: TrackAlignment, distM: number,
  plaqueGeo: THREE.BoxGeometry, faceGeo: THREE.PlaneGeometry, backingMat: THREE.MeshStandardMaterial,
  maxAnisotropy: number, disposables: Array<{ dispose(): void }>, registerCullable: CullableRegistrar,
): void {
  const s = alignment.sample(distM);
  const pt = alignment.toWorldPoint(distM, 2.88, 2.28, false);
  const tex = createMeterMarkerTexture(distM, maxAnisotropy);
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.42, roughness: 0.4 });
  const holder = new THREE.Group();
  holder.position.set(pt.x, pt.y, pt.z);
  holder.rotation.set(0, s.yaw, 0);
  const face = new THREE.Mesh(faceGeo, mat);
  face.position.set(-0.04, 0, 0);
  face.rotation.y = -Math.PI / 2;
  holder.add(new THREE.Mesh(plaqueGeo, backingMat), face);
  root.add(holder);
  registerCullable(distM, distM, holder);
  disposables.push(tex, mat);
}
