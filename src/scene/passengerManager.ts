import * as THREE from 'three';
import { computeEffectivePassengers } from '../domain/timeOfDayCatalog';
import { getStationPlatformLayout } from '../domain/trackGeometry';
import type { ISimulationSnapshot, IStationSpec } from '../domain/types';

export interface IPassengerRig {
  sync(snapshot: ISimulationSnapshot, dtSec: number): void;
  dispose(): void;
}

interface IPassengerUnit {
  readonly group: THREE.Group;
  readonly waitX: number;
  readonly doorEntryX: number;
  readonly baseZ: number;
  readonly startProgress: number;
  readonly endProgress: number;
  readonly phaseOffset: number;
}

interface IStationCrowd {
  readonly stationIndex: number;
  readonly baseWaiting: number;
  readonly playerUnits: readonly IPassengerUnit[];
  readonly oppositeUnits: readonly IPassengerUnit[];
  cleared: boolean;
  aiBoardingProgress: number;
  aiCleared: boolean;
}

const PLATFORM_TOP_Y = 1.08;
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
      syncCrowds(crowds, snapshot, walkClock, dtSec);
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
  const layout = getStationPlatformLayout(station);
  const maxPlayerCount = computeEffectivePassengers(station.waitingPassengers, 1.7);
  const maxOppCount = Math.max(6, Math.round(maxPlayerCount * 0.65));

  // Player-side passengers: left of player track for island, right of player track for side
  const playerWaitBaseX = layout === 'island' ? -2.25 : 2.35;
  const playerWaitSpreadDir = layout === 'island' ? -1 : 1;
  const playerDoorEntryX = layout === 'island' ? -1.52 : 1.52;
  const playerFaceYaw = layout === 'island' ? Math.PI / 2 : -Math.PI / 2;

  const playerUnits = spawnPlatformUnits(
    root,
    station,
    maxPlayerCount,
    playerWaitBaseX,
    playerWaitSpreadDir,
    playerDoorEntryX,
    playerFaceYaw,
    17,
    assets,
  );

  // Opposite-track passengers: left edge of island facing -X, or left outer platform facing +X
  const oppWaitBaseX = layout === 'island' ? -7.55 : -6.65;
  const oppWaitSpreadDir = layout === 'island' ? 1 : -1;
  const oppDoorEntryX = layout === 'island' ? -8.28 : -5.92;
  const oppFaceYaw = layout === 'island' ? -Math.PI / 2 : Math.PI / 2;

  const oppositeUnits = spawnPlatformUnits(
    root,
    station,
    maxOppCount,
    oppWaitBaseX,
    oppWaitSpreadDir,
    oppDoorEntryX,
    oppFaceYaw,
    29,
    assets,
  );

  return {
    stationIndex,
    baseWaiting: station.waitingPassengers,
    playerUnits,
    oppositeUnits,
    cleared: false,
    aiBoardingProgress: 0,
    aiCleared: false,
  };
}

function spawnPlatformUnits(
  root: THREE.Group,
  station: IStationSpec,
  maxCount: number,
  waitBaseX: number,
  spreadDir: -1 | 1,
  doorEntryX: number,
  faceYaw: number,
  seedPrime: number,
  assets: IPassengerAssets,
): readonly IPassengerUnit[] {
  const units: IPassengerUnit[] = [];
  for (let i = 0; i < maxCount; i += 1) {
    const seed = station.id * 31 + i * seedPrime;
    const waitX = waitBaseX + spreadDir * (((seed * 13) % 14) * 0.09);
    const spanT = maxCount > 1 ? i / (maxCount - 1) : 0.5;
    const baseZ = -(station.distanceM - 78 + spanT * 84) + ((seed % 5) - 2) * 0.55;
    const scaleY = 0.92 + ((seed * 7) % 16) * 0.01;
    const pax = buildSilhouetteMesh(assets, seed, scaleY);
    pax.position.set(waitX, PLATFORM_TOP_Y, baseZ);
    pax.rotation.y = faceYaw + (((seed % 9) - 4) * 0.06);
    root.add(pax);
    const startProgress = (i / Math.max(maxCount, 1)) * 0.54;
    units.push({
      group: pax,
      waitX,
      doorEntryX,
      baseZ,
      startProgress,
      endProgress: Math.min(0.98, startProgress + 0.42),
      phaseOffset: seed * 0.4,
    });
  }
  return units;
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
  dtSec: number,
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
  const oncoming = snapshot.oncomingTrain;

  for (let i = 0; i < crowds.length; i += 1) {
    const crowd = crowds[i];
    if (crowd.stationIndex < activeIdx && !crowd.cleared) {
      crowd.cleared = true;
      crowd.playerUnits.forEach((u) => {
        u.group.visible = false;
      });
    } else if (crowd.stationIndex === activeIdx) {
      updateActivePlayerCrowd(crowd, snapshot, walkClock, mult);
    }

    // Opposite-track crowd boards when AI train stops & opens doors at this station
    const aiAtThisStation =
      oncoming.active &&
      oncoming.stationIndex === crowd.stationIndex &&
      oncoming.doorsOpen;
    if (aiAtThisStation) {
      crowd.aiBoardingProgress = Math.min(1, crowd.aiBoardingProgress + dtSec * 0.25);
      updateUnitGroup(crowd.oppositeUnits, crowd.baseWaiting * 0.65, mult, true, crowd.aiBoardingProgress >= 1, crowd.aiBoardingProgress, walkClock);
      if (crowd.aiBoardingProgress >= 1) {
        crowd.aiCleared = true;
      }
    } else if (!crowd.aiCleared) {
      const oppActiveCount = Math.min(
        crowd.oppositeUnits.length,
        Math.max(3, computeEffectivePassengers(Math.round(crowd.baseWaiting * 0.65), mult)),
      );
      for (let j = 0; j < crowd.oppositeUnits.length; j += 1) {
        const u = crowd.oppositeUnits[j];
        u.group.visible = j < oppActiveCount;
        u.group.position.set(u.waitX, PLATFORM_TOP_Y, u.baseZ);
      }
    }
  }
}

function updateActivePlayerCrowd(
  crowd: IStationCrowd,
  snapshot: ISimulationSnapshot,
  walkClock: number,
  multiplier: number,
): void {
  updateUnitGroup(
    crowd.playerUnits,
    crowd.baseWaiting,
    multiplier,
    snapshot.doorState === 'open',
    snapshot.boardingCompletedForCurrent,
    snapshot.boardingProgress,
    walkClock,
  );
}

function updateUnitGroup(
  units: readonly IPassengerUnit[],
  baseWaiting: number,
  multiplier: number,
  doorsOpen: boolean,
  completed: boolean,
  progress: number,
  walkClock: number,
): void {
  const activeCount = Math.min(
    units.length,
    computeEffectivePassengers(Math.round(baseWaiting), multiplier),
  );
  for (let i = 0; i < units.length; i += 1) {
    const unit = units[i];
    if (i >= activeCount) {
      unit.group.visible = false;
      continue;
    }
    if (!doorsOpen && !completed) {
      unit.group.visible = true;
      unit.group.position.set(unit.waitX, PLATFORM_TOP_Y, unit.baseZ);
      continue;
    }
    if (completed || progress >= unit.endProgress) {
      unit.group.visible = false;
      continue;
    }
    if (progress <= unit.startProgress) {
      unit.group.visible = true;
      unit.group.position.set(unit.waitX, PLATFORM_TOP_Y, unit.baseZ);
      continue;
    }
    const moveT = (progress - unit.startProgress) / Math.max(0.01, unit.endProgress - unit.startProgress);
    const nextX = THREE.MathUtils.lerp(unit.waitX, unit.doorEntryX, moveT);
    const stepBob = Math.abs(Math.sin(walkClock * 11 + unit.phaseOffset)) * 0.055;
    unit.group.visible = true;
    unit.group.position.set(nextX, PLATFORM_TOP_Y + stepBob, unit.baseZ);
  }
}

function resetAllCrowds(crowds: readonly IStationCrowd[], multiplier: number): void {
  for (let i = 0; i < crowds.length; i += 1) {
    const crowd = crowds[i];
    const activeCount = Math.min(
      crowd.playerUnits.length,
      computeEffectivePassengers(crowd.baseWaiting, multiplier),
    );
    const oppCount = Math.min(
      crowd.oppositeUnits.length,
      Math.max(3, computeEffectivePassengers(Math.round(crowd.baseWaiting * 0.65), multiplier)),
    );
    crowd.cleared = false;
    crowd.aiBoardingProgress = 0;
    crowd.aiCleared = false;
    for (let j = 0; j < crowd.playerUnits.length; j += 1) {
      const unit = crowd.playerUnits[j];
      unit.group.visible = j < activeCount;
      unit.group.position.set(unit.waitX, PLATFORM_TOP_Y, unit.baseZ);
    }
    for (let j = 0; j < crowd.oppositeUnits.length; j += 1) {
      const unit = crowd.oppositeUnits[j];
      unit.group.visible = j < oppCount;
      unit.group.position.set(unit.waitX, PLATFORM_TOP_Y, unit.baseZ);
    }
  }
}
