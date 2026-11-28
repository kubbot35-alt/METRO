import * as THREE from 'three';
import { DEFAULT_SCENE_CULL_RANGE_M, isWithinCullingRange } from '../../domain/routeVariant';
import { computeEffectivePassengers } from '../../domain/timeOfDayCatalog';
import type { ISimulationSnapshot } from '../../domain/types';
import {
  PLATFORM_TOP_Y,
  type IAlightingPassengerUnit,
  type IPassengerUnit,
  type IStationCrowd,
} from './passengerMeshFactory';

export function syncStationCrowds(
  crowds: readonly IStationCrowd[],
  snapshot: ISimulationSnapshot,
  walkClock: number,
  dtSec: number,
  densityMultiplier: number,
): void {
  const playerPosM = snapshot.kinematics.positionM;
  if (snapshot.challenge?.skipStations || snapshot.nightInspection.active || snapshot.timeOfDay.passengerMultiplier <= 0) {
    crowds.forEach((c) => { c.stationGroup.visible = false; });
    return;
  }
  const mult = snapshot.timeOfDay.passengerMultiplier * Math.max(0.25, Math.min(1, densityMultiplier));
  const isFreshRun = snapshot.stationsServed === 0 && snapshot.currentStation.stationIndex === 0 && playerPosM < 5 && snapshot.doorState === 'closed';
  if (isFreshRun) { resetAllCrowds(crowds, mult, playerPosM); return; }
  for (let i = 0; i < crowds.length; i += 1) {
    updateSingleStationCrowd(crowds[i], snapshot, walkClock, dtSec, mult, playerPosM);
  }
}

function updateSingleStationCrowd(
  crowd: IStationCrowd,
  snapshot: ISimulationSnapshot,
  walkClock: number,
  dtSec: number,
  mult: number,
  playerPosM: number,
): void {
  const inRange = isWithinCullingRange(crowd.stationDistanceM, playerPosM, DEFAULT_SCENE_CULL_RANGE_M);
  if (crowd.stationGroup.visible !== inRange) crowd.stationGroup.visible = inRange;
  if (!inRange) return;
  const activeIdx = snapshot.currentStation.stationIndex;
  if (crowd.stationIndex < activeIdx && !crowd.cleared) {
    crowd.cleared = true;
    crowd.playerUnits.forEach((u) => { u.group.visible = false; });
  } else if (crowd.stationIndex === activeIdx) {
    const doorsOpen = snapshot.doorState === 'open';
    updateUnitGroup(crowd.playerUnits, crowd.baseWaiting, mult, doorsOpen, snapshot.boardingCompletedForCurrent, snapshot.boardingProgress, walkClock);
    updateAlightingGroup(crowd.alightingUnits, crowd.baseWaiting, mult, doorsOpen, snapshot.boardingProgress, walkClock);
  }
  updateOppositePlatformCrowd(crowd, snapshot, walkClock, dtSec, mult);
}

function updateOppositePlatformCrowd(
  crowd: IStationCrowd, snapshot: ISimulationSnapshot, walkClock: number, dtSec: number, mult: number,
): void {
  const oncoming = snapshot.oncomingTrain;
  const aiAtThisStation = oncoming.active && oncoming.stationIndex === crowd.stationIndex && oncoming.doorsOpen;
  if (aiAtThisStation) {
    crowd.aiBoardingProgress = Math.min(1, crowd.aiBoardingProgress + dtSec * 0.25);
    updateUnitGroup(crowd.oppositeUnits, crowd.baseWaiting * 0.65, mult, true, crowd.aiBoardingProgress >= 1, crowd.aiBoardingProgress, walkClock);
    if (crowd.aiBoardingProgress >= 1) crowd.aiCleared = true;
    return;
  }
  if (crowd.aiCleared) return;
  const oppActiveCount = Math.min(crowd.oppositeUnits.length, Math.max(3, computeEffectivePassengers(Math.round(crowd.baseWaiting * 0.65), mult)));
  for (let j = 0; j < crowd.oppositeUnits.length; j += 1) {
    const u = crowd.oppositeUnits[j];
    u.group.visible = j < oppActiveCount;
    u.group.position.set(u.waitX, PLATFORM_TOP_Y, u.baseZ);
  }
}

function updateUnitGroup(
  units: readonly IPassengerUnit[], baseWaiting: number, multiplier: number,
  doorsOpen: boolean, completed: boolean, progress: number, walkClock: number,
): void {
  const activeCount = Math.min(units.length, computeEffectivePassengers(Math.round(baseWaiting), multiplier));
  for (let i = 0; i < units.length; i += 1) {
    const u = units[i];
    if (i >= activeCount || completed || (doorsOpen && progress >= u.endProgress)) { u.group.visible = false; continue; }
    if (!doorsOpen || progress <= u.startProgress) {
      u.group.visible = true;
      u.group.position.set(u.waitX, PLATFORM_TOP_Y, u.baseZ);
      u.group.rotation.y = u.faceYaw;
      continue;
    }
    const moveT = (progress - u.startProgress) / Math.max(0.01, u.endProgress - u.startProgress);
    const nextX = THREE.MathUtils.lerp(u.waitX, u.doorEntryX, moveT);
    const nextZ = THREE.MathUtils.lerp(u.baseZ, u.targetDoorZ, Math.min(1, moveT * 1.15));
    const stepBob = Math.abs(Math.sin(walkClock * 11 + u.phaseOffset)) * 0.058;
    u.group.visible = true;
    u.group.position.set(nextX, PLATFORM_TOP_Y + stepBob, nextZ);
    u.group.rotation.y = Math.atan2(u.doorEntryX - u.waitX, u.targetDoorZ - u.baseZ);
  }
}

function updateAlightingGroup(
  units: readonly IAlightingPassengerUnit[], baseWaiting: number, multiplier: number,
  doorsOpen: boolean, progress: number, walkClock: number,
): void {
  const alightingCount = Math.min(units.length, Math.max(2, Math.round(computeEffectivePassengers(baseWaiting, multiplier) * 0.25)));
  for (let i = 0; i < units.length; i += 1) {
    const u = units[i];
    if (i >= alightingCount || (!doorsOpen && progress <= 0.01) || progress < u.startProgress) {
      u.group.visible = false;
      continue;
    }
    const walkT = Math.min(1, (progress - u.startProgress) / Math.max(0.01, u.endProgress - u.startProgress));
    const nextX = THREE.MathUtils.lerp(u.doorEntryX, u.disperseX, walkT);
    const nextZ = THREE.MathUtils.lerp(u.doorZ, u.disperseZ, walkT);
    const stepBob = walkT < 0.99 ? Math.abs(Math.sin(walkClock * 10.5 + u.phaseOffset)) * 0.055 : 0;
    u.group.visible = true;
    u.group.position.set(nextX, PLATFORM_TOP_Y + stepBob, nextZ);
    u.group.rotation.y = Math.atan2(u.disperseX - u.doorEntryX, u.disperseZ - u.doorZ);
  }
}

function resetAllCrowds(crowds: readonly IStationCrowd[], multiplier: number, playerPosM: number): void {
  for (let i = 0; i < crowds.length; i += 1) {
    const crowd = crowds[i];
    crowd.stationGroup.visible = isWithinCullingRange(crowd.stationDistanceM, playerPosM, DEFAULT_SCENE_CULL_RANGE_M);
    const activeCount = Math.min(crowd.playerUnits.length, computeEffectivePassengers(crowd.baseWaiting, multiplier));
    const oppCount = Math.min(crowd.oppositeUnits.length, Math.max(3, computeEffectivePassengers(Math.round(crowd.baseWaiting * 0.65), multiplier)));
    crowd.cleared = false;
    crowd.aiBoardingProgress = 0;
    crowd.aiCleared = false;
    crowd.playerUnits.forEach((u, j) => { u.group.visible = j < activeCount; u.group.position.set(u.waitX, PLATFORM_TOP_Y, u.baseZ); });
    crowd.alightingUnits.forEach((u) => { u.group.visible = false; u.group.position.set(u.doorEntryX, PLATFORM_TOP_Y, u.doorZ); });
    crowd.oppositeUnits.forEach((u, j) => { u.group.visible = j < oppCount; u.group.position.set(u.waitX, PLATFORM_TOP_Y, u.baseZ); });
  }
}
