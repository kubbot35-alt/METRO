import * as THREE from 'three';
import { computeEffectivePassengers } from '../../domain/timeOfDayCatalog';
import type { TrackAlignment } from '../../domain/trackAlignment';
import { getStationPlatformLayout } from '../../domain/trackGeometry';
import type { IStationSpec } from '../../domain/types';

export const PLATFORM_TOP_Y = 1.08;
const COAT_COLORS = [0x1e3a5f, 0x334155, 0x7c2d12, 0x3f3f46, 0x1e40af, 0x4c1d95, 0x0f766e, 0x9a3412];
const TRAIN_DOOR_Z_OFFSETS = [6, 13, 21, 29, 37, 45, 53, 61, 69, 76];

export interface IPassengerUnit {
  readonly group: THREE.Group;
  readonly waitX: number;
  readonly doorEntryX: number;
  readonly baseZ: number;
  readonly targetDoorZ: number;
  readonly faceYaw: number;
  readonly startProgress: number;
  readonly endProgress: number;
  readonly phaseOffset: number;
}

export interface IAlightingPassengerUnit {
  readonly group: THREE.Group;
  readonly doorEntryX: number;
  readonly disperseX: number;
  readonly doorZ: number;
  readonly disperseZ: number;
  readonly startProgress: number;
  readonly endProgress: number;
  readonly phaseOffset: number;
}

export interface IStationCrowd {
  readonly stationIndex: number;
  readonly stationDistanceM: number;
  readonly stationGroup: THREE.Group;
  readonly baseWaiting: number;
  readonly playerUnits: readonly IPassengerUnit[];
  readonly alightingUnits: readonly IAlightingPassengerUnit[];
  readonly oppositeUnits: readonly IPassengerUnit[];
  cleared: boolean;
  aiBoardingProgress: number;
  aiCleared: boolean;
}

export interface IPassengerAssets {
  readonly legsGeo: THREE.BoxGeometry;
  readonly torsoGeo: THREE.CylinderGeometry;
  readonly headGeo: THREE.SphereGeometry;
  readonly legsMat: THREE.MeshStandardMaterial;
  readonly headMat: THREE.MeshStandardMaterial;
  readonly coatMats: readonly THREE.MeshStandardMaterial[];
}

export function createPassengerAssets(disposables: Array<{ dispose(): void }>): IPassengerAssets {
  const legsGeo = new THREE.BoxGeometry(0.28, 0.72, 0.24);
  const torsoGeo = new THREE.CylinderGeometry(0.18, 0.23, 0.74, 7);
  const headGeo = new THREE.SphereGeometry(0.145, 8, 8);
  const legsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9, metalness: 0.04 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xd6b89c, roughness: 0.78, metalness: 0.02 });
  const coatMats = COAT_COLORS.map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.84, metalness: 0.05 }));
  disposables.push(legsGeo, torsoGeo, headGeo, legsMat, headMat, ...coatMats);
  return { legsGeo, torsoGeo, headGeo, legsMat, headMat, coatMats };
}

export function createStationCrowd(
  root: THREE.Group, alignment: TrackAlignment, station: IStationSpec, stationIndex: number, assets: IPassengerAssets,
): IStationCrowd {
  const frame = alignment.sample(station.distanceM);
  const stationGroup = new THREE.Group();
  stationGroup.position.set(frame.x, frame.y, frame.z);
  stationGroup.rotation.set(0, frame.yaw, 0);
  root.add(stationGroup);
  const isIsland = getStationPlatformLayout(station) === 'island';
  const maxPlayerCount = Math.min(46, computeEffectivePassengers(station.waitingPassengers, 1.7));
  const maxOppCount = Math.max(6, Math.round(maxPlayerCount * 0.6));
  const playerUnits = spawnPlatformUnits(
    stationGroup, station.id, maxPlayerCount,
    isIsland ? -2.25 : 2.35, isIsland ? -1 : 1, isIsland ? -1.48 : 1.48, isIsland ? Math.PI / 2 : -Math.PI / 2, 17, assets,
  );
  const alightingUnits = spawnAlightingUnits(
    stationGroup, station.id, isIsland ? -1.48 : 1.48, isIsland ? -1 : 1, isIsland ? -Math.PI / 2 : Math.PI / 2, assets,
  );
  const oppositeUnits = spawnPlatformUnits(
    stationGroup, station.id, maxOppCount,
    isIsland ? -7.55 : -6.65, isIsland ? 1 : -1, isIsland ? -8.28 : -5.92, isIsland ? -Math.PI / 2 : Math.PI / 2, 29, assets,
  );
  return {
    stationIndex, stationDistanceM: station.distanceM, stationGroup, baseWaiting: station.waitingPassengers,
    playerUnits, alightingUnits, oppositeUnits, cleared: false, aiBoardingProgress: 0, aiCleared: false,
  };
}

function findNearestDoorZ(zPos: number): number {
  let nearest = TRAIN_DOOR_Z_OFFSETS[0];
  let bestDist = Math.abs(zPos - nearest);
  for (let i = 1; i < TRAIN_DOOR_Z_OFFSETS.length; i += 1) {
    const candidate = TRAIN_DOOR_Z_OFFSETS[i];
    const dist = Math.abs(zPos - candidate);
    if (dist < bestDist) { bestDist = dist; nearest = candidate; }
  }
  return nearest;
}

function spawnPlatformUnits(
  root: THREE.Group, stationId: number, maxCount: number, waitBaseX: number, spreadDir: -1 | 1,
  doorEntryX: number, faceYaw: number, seedPrime: number, assets: IPassengerAssets,
): readonly IPassengerUnit[] {
  const units: IPassengerUnit[] = [];
  for (let i = 0; i < maxCount; i += 1) {
    const seed = stationId * 31 + i * seedPrime;
    const waitX = waitBaseX + spreadDir * (((seed * 13) % 16) * 0.11);
    const spanT = maxCount > 1 ? i / (maxCount - 1) : 0.5;
    const baseZ = 4 + spanT * 74 + ((seed % 5) - 2) * 0.55;
    const targetDoorZ = findNearestDoorZ(baseZ);
    const pax = buildSilhouetteMesh(assets, seed, 0.92 + ((seed * 7) % 16) * 0.01);
    pax.position.set(waitX, PLATFORM_TOP_Y, baseZ);
    pax.rotation.y = faceYaw + (((seed % 9) - 4) * 0.06);
    root.add(pax);
    const startProgress = (i / Math.max(maxCount, 1)) * 0.55;
    units.push({
      group: pax, waitX, doorEntryX, baseZ, targetDoorZ, faceYaw,
      startProgress, endProgress: Math.min(0.98, startProgress + 0.4), phaseOffset: seed * 0.4,
    });
  }
  return units;
}

function spawnAlightingUnits(
  root: THREE.Group, stationId: number, doorEntryX: number, spreadDir: -1 | 1,
  awayYaw: number, assets: IPassengerAssets,
): readonly IAlightingPassengerUnit[] {
  const units: IAlightingPassengerUnit[] = [];
  for (let i = 0; i < 8; i += 1) {
    const seed = stationId * 43 + i * 23;
    const doorZ = TRAIN_DOOR_Z_OFFSETS[(i * 2 + (seed % 2)) % TRAIN_DOOR_Z_OFFSETS.length];
    const disperseX = doorEntryX + spreadDir * (1.85 + ((seed * 11) % 10) * 0.14);
    const disperseZ = doorZ + ((i % 2 === 0 ? 1 : -1) * (2.4 + ((seed % 5) * 0.7)));
    const pax = buildSilhouetteMesh(assets, seed + 5, 0.93 + ((seed * 5) % 14) * 0.01);
    pax.position.set(doorEntryX, PLATFORM_TOP_Y, doorZ);
    pax.rotation.y = awayYaw + (((seed % 7) - 3) * 0.12);
    pax.visible = false;
    root.add(pax);
    const startProgress = 0.04 + (i / 8) * 0.36;
    units.push({
      group: pax, doorEntryX, disperseX, doorZ, disperseZ,
      startProgress, endProgress: Math.min(0.95, startProgress + 0.48), phaseOffset: seed * 0.35,
    });
  }
  return units;
}

function buildSilhouetteMesh(assets: IPassengerAssets, seed: number, scaleY: number): THREE.Group {
  const pax = new THREE.Group();
  const legs = new THREE.Mesh(assets.legsGeo, assets.legsMat);
  legs.position.y = 0.36;
  const coat = new THREE.Mesh(assets.torsoGeo, assets.coatMats[seed % assets.coatMats.length]);
  coat.position.y = 1.04;
  const head = new THREE.Mesh(assets.headGeo, assets.headMat);
  head.position.y = 1.56;
  pax.add(legs, coat, head);
  pax.scale.set(1, scaleY, 1);
  return pax;
}
