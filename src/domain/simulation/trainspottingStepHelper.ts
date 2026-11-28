import { buildTrainspottingSpots, clampTrainspottingWalkOffset, TRAINSPOTTING_WALK_SPEED_MS } from '../trainspottingSystem';
import type { IAudioEvents, IControlInput } from '../types';
import { createIdleAudioEvents } from './simulationHelpers';
import type { ISimulationState, ISimulationSystems } from './simulationState';

function ensureTrack1LeadingTrain(state: ISimulationState, sys: ISimulationSystems, targetDistM: number): void {
  sys.leadingTrain.setEnabled(true);
  const lead = sys.leadingTrain.getState();
  const outOfRange = !lead.active || lead.positionM > targetDistM + 220 || lead.positionM < targetDistM - 280;
  if (outOfRange) {
    const spawnM = Math.max(-110, targetDistM - 82);
    sys.leadingTrain.forcePosition?.(spawnM, 14.5);
  }
}

function ensureTrack2OncomingTrain(
  state: ISimulationState,
  sys: ISimulationSystems,
  targetDistM: number,
  stationIndex: number,
): void {
  const oncoming = sys.traffic.getState();
  const outOfRange = !oncoming.active || oncoming.positionM < targetDistM - 220 || oncoming.positionM > targetDistM + 360;
  if (!outOfRange) return;
  const st = stationIndex >= 0 ? state.stations[stationIndex] : undefined;
  if (st && sys.traffic.forceSpawnAtStation) {
    sys.traffic.forceSpawnAtStation(st, stationIndex, true);
  } else {
    sys.traffic.forceSpawnAhead?.(targetDistM + 40);
  }
}

export function stepTrainspottingSimulation(
  state: ISimulationState,
  sys: ISimulationSystems,
  input: IControlInput,
  dt: number,
): IAudioEvents {
  const spots = buildTrainspottingSpots(state.line, state.stations);
  const spot = spots[Math.max(0, Math.min(spots.length - 1, state.trainspottingSpotIndex))] ?? spots[0];
  if (!spot) return createIdleAudioEvents();
  const walkDir = (input.throttleUp ? 1 : 0) - (input.throttleDown ? 1 : 0);
  if (walkDir !== 0) {
    state.trainspottingWalkOffsetM = clampTrainspottingWalkOffset(
      state.trainspottingWalkOffsetM + walkDir * TRAINSPOTTING_WALK_SPEED_MS * dt,
    );
  }
  const focusPosM = spot.distanceM;
  state.stationIndex = Math.max(0, spot.stationIndex);
  state.kinematics = { ...state.kinematics, positionM: focusPosM, speedMs: 0, speedKmh: 0, throttle: 0, serviceBrake: 0, emergencyBrake: false };
  ensureTrack1LeadingTrain(state, sys, focusPosM);
  ensureTrack2OncomingTrain(state, sys, focusPosM, spot.stationIndex);
  const prevLeadDoors = sys.leadingTrain.getState().doorsOpen;
  const prevOnDoors = sys.traffic.getState().doorsOpen;
  sys.leadingTrain.step(focusPosM - 360, 0, sys.signals.getSignals(), dt);
  const trafficRes = sys.traffic.step(focusPosM, dt);
  sys.weather.step(state.alignment.hasSurfaceStart, focusPosM, state.alignment.sample(focusPosM).outdoorBlend, 0, 0, false, false, dt);
  const nextLeadDoors = sys.leadingTrain.getState().doorsOpen;
  const nextOnDoors = sys.traffic.getState().doorsOpen;
  const doorChanged = nextLeadDoors !== prevLeadDoors || nextOnDoors !== prevOnDoors;
  const openedNow = (nextLeadDoors && !prevLeadDoors) || (nextOnDoors && !prevOnDoors);
  return {
    ...createIdleAudioEvents(),
    passingTrainWhoosh: trafficRes.passingTrainWhoosh,
    doorToggledTo: doorChanged ? (openedNow ? 'open' : 'closed') : null,
  };
}
