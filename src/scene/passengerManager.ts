import * as THREE from 'three';
import { computeEffectivePassengers } from '../domain/timeOfDayCatalog';
import type { ISimulationSnapshot, IStationSpec } from '../domain/types';

export interface IPassengerRig {
  sync(snapshot: ISimulationSnapshot, dtSec: number): void;
  dispose(): void;
}

interface IPassengerUnit {
  readonly group: THREE.Group;
  readonly waitX: number;
  readonly baseZ: number;
  readonly startProgress: number;
  readonly endProgress: number;
  readonly phaseOffset: number;
}

interface IStationCrowd {
  readonly stationIndex: number;
  readonly baseWaiting: number;
  readonly units: readonly IPassengerUnit[];
  cleared: boolean;
}

const PLATFORM_TOP_Y = 1.08;
const DOOR_ENTRY_X = 1.72;
const COAT_COLORS = [0x1e3a5f, 0x334155, 0x7c2d12, 0x3f3f46, 0x1e40af, 0x4c1d95];

export function buildStationPassengers(
  scene: THREE.Scene,
  stations: readonly IStationSpec[],
): IPassengerRig {
  const disposables: Array<{ dispose(): void }> = [];
  const root = new THREE.Group();
  root.name = 'StationPassengersGroup';
  scene.add(root);

  const shared = createPassengerAssets(disposables);
  const crowds = stations.map((station, idx) => createStationCrowd(root, station, idx, shared));
  let walkClock = 0;

  return {
    sync: (snapshot, dtSec) => {
      walkClock += dtSec;
      syncCrowds(crowds, snapshot, walkClock);
    },
    dispose: () => {
      scene.remove(root);
      disposables.forEach((item) => item.dispose());
    },
  };
}

interface IPassengerAssets {
  readonly legsGeo: THREE.BoxGeometry;
  readonly torsoGeo: THREE.CylinderGeometry;
  readonly headGeo: THREE.SphereGeometry;
  readonly legsMat: THREE.MeshStandardMaterial;
  readonly headMat: THREE.MeshStandardMaterial;
  readonly coatMats: readonly THREE.MeshStandardMaterial[];
}

function createPassengerAssets(disposables: Array<{ dispose(): void }>): IPassengerAssets {
  const legsGeo = new THREE.BoxGeometry(0.28, 0.72, 0.24);
  const torsoGeo = new THREE.CylinderGeometry(0.18, 0.23, 0.74, 7);
  const headGeo = new THREE.SphereGeometry(0.145, 8, 8);
  const legsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9, metalness: 0.04 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xd6b89c, roughness: 0.78, metalness: 0.02 });
  const coatMats = COAT_COLORS.map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.84, metalness: 0.05 }),
  );
  disposables.push(legsGeo, torsoGeo, headGeo, legsMat, headMat, ...coatMats);
  return { legsGeo, torsoGeo, headGeo, legsMat, headMat, coatMats };
}

function createStationCrowd(
  root: THREE.Group,
  station: IStationSpec,
  stationIndex: number,
  assets: IPassengerAssets,
): IStationCrowd {
  const maxCount = computeEffectivePassengers(station.waitingPassengers, 1.7);
  const units: IPassengerUnit[] = [];
  for (let i = 0; i < maxCount; i += 1) {
    const seed = station.id * 31 + i * 17;
    const waitX = 2.6 + ((seed * 13) % 18) * 0.11;
    const spanT = maxCount > 1 ? i / (maxCount - 1) : 0.5;
    const baseZ = -(station.distanceM - 78 + spanT * 84) + ((seed % 5) - 2) * 0.55;
    const scaleY = 0.92 + ((seed * 7) % 16) * 0.01;
    const pax = buildSilhouetteMesh(assets, seed, scaleY);
    pax.position.set(waitX, PLATFORM_TOP_Y, baseZ);
    pax.rotation.y = -Math.PI / 2 + (((seed % 9) - 4) * 0.06);
    root.add(pax);
    const startProgress = (i / Math.max(maxCount, 1)) * 0.54;
    units.push({
      group: pax,
      waitX,
      baseZ,
      startProgress,
      endProgress: Math.min(0.98, startProgress + 0.42),
      phaseOffset: seed * 0.4,
    });
  }
  return { stationIndex, baseWaiting: station.waitingPassengers, units, cleared: false };
}

function buildSilhouetteMesh(
  assets: IPassengerAssets,
  seed: number,
  scaleY: number,
): THREE.Group {
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

function syncCrowds(
  crowds: readonly IStationCrowd[],
  snapshot: ISimulationSnapshot,
  walkClock: number,
): void {
  const mult = snapshot.timeOfDay.passengerMultiplier;
  const isFreshRun =
    snapshot.stationsServed === 0 &&
    snapshot.currentStation.stationIndex === 0 &&
    snapshot.kinematics.positionM < 5 &&
    snapshot.doorState === 'closed';

  if (isFreshRun) {
    resetAllCrowds(crowds, mult);
    return;
  }

  const activeIdx = snapshot.currentStation.stationIndex;
  for (let i = 0; i < crowds.length; i += 1) {
    const crowd = crowds[i];
    if (crowd.stationIndex < activeIdx && !crowd.cleared) {
      crowd.cleared = true;
      crowd.units.forEach((u) => {
        u.group.visible = false;
      });
    } else if (crowd.stationIndex === activeIdx) {
      updateActiveStationCrowd(crowd, snapshot, walkClock, mult);
    }
  }
}

function updateActiveStationCrowd(
  crowd: IStationCrowd,
  snapshot: ISimulationSnapshot,
  walkClock: number,
  multiplier: number,
): void {
  const activeCount = Math.min(
    crowd.units.length,
    computeEffectivePassengers(crowd.baseWaiting, multiplier),
  );
  const progress = snapshot.boardingProgress;
  const doorsOpen = snapshot.doorState === 'open';
  for (let i = 0; i < crowd.units.length; i += 1) {
    const unit = crowd.units[i];
    if (i >= activeCount) {
      unit.group.visible = false;
      continue;
    }
    if (!doorsOpen && !snapshot.boardingCompletedForCurrent) {
      unit.group.visible = true;
      unit.group.position.set(unit.waitX, PLATFORM_TOP_Y, unit.baseZ);
      continue;
    }
    if (snapshot.boardingCompletedForCurrent || progress >= unit.endProgress) {
      unit.group.visible = false;
      continue;
    }
    if (progress <= unit.startProgress) {
      unit.group.visible = true;
      unit.group.position.set(unit.waitX, PLATFORM_TOP_Y, unit.baseZ);
      continue;
    }
    const moveT = (progress - unit.startProgress) / Math.max(0.01, unit.endProgress - unit.startProgress);
    const nextX = THREE.MathUtils.lerp(unit.waitX, DOOR_ENTRY_X, moveT);
    const stepBob = Math.abs(Math.sin(walkClock * 11 + unit.phaseOffset)) * 0.055;
    unit.group.visible = true;
    unit.group.position.set(nextX, PLATFORM_TOP_Y + stepBob, unit.baseZ);
  }
}

function resetAllCrowds(crowds: readonly IStationCrowd[], multiplier: number): void {
  for (let i = 0; i < crowds.length; i += 1) {
    const crowd = crowds[i];
    const activeCount = Math.min(
      crowd.units.length,
      computeEffectivePassengers(crowd.baseWaiting, multiplier),
    );
    crowd.cleared = false;
    for (let j = 0; j < crowd.units.length; j += 1) {
      const unit = crowd.units[j];
      unit.group.visible = j < activeCount;
      unit.group.position.set(unit.waitX, PLATFORM_TOP_Y, unit.baseZ);
    }
  }
}
