import { createInitialKinematics } from '../trainPhysics';
import type { IMetroLineSpec } from '../types';
import type { IModeRulesCoordinator } from './modeRulesCoordinator';
import type { ISimulationState, ISimulationSystems } from './simulationContracts';
import { getActiveBoardingDurationSec } from './simulationHelpers';

export function executeEnterTurnaroundSiding(state: ISimulationState, sys: ISimulationSystems): boolean {
  if (!sys.turnaround.enterSiding()) {
    return false;
  }
  state.phase = 'playing';
  state.atoEnabled = false;
  state.atoStatus = 'off';
  state.atpActive = false;
  state.doorState = 'closed';
  state.openDoorSide = null;
  state.kinematics = { ...state.kinematics, emergencyBrake: false, serviceBrake: 0, throttle: 0 };
  sys.feedback.push('Tor odstawczy: jedź powoli (max 20 km/h) przed kozioł oporowy', 0, 'neutral');
  return true;
}

export function executeBeginCabSwitch(state: ISimulationState, sys: ISimulationSystems): boolean {
  if (!sys.turnaround.beginCabSwitch()) {
    return false;
  }
  state.kinematics = {
    ...state.kinematics, speedMs: 0, speedKmh: 0, throttle: 0, serviceBrake: 1, emergencyBrake: false, netAccelerationMs2: 0,
  };
  state.pendingCabSwitchChime = true;
  return true;
}

function resetTrainLegState(state: ISimulationState, prevClockSec: number): void {
  state.activeScheduleStartClockSec = prevClockSec;
  state.legElapsedTimeSec = 0;
  state.kinematics = createInitialKinematics();
  state.doorState = 'closed';
  state.openDoorSide = null;
  state.boardingTimerSec = 0;
  state.boardingCompleted = false;
  state.stopAwarded = false;
  state.currentStationBoardedCount = 0;
  state.lastJointIndex = 0;
  state.atpActive = false;
  state.activeCautionLimitKmh = null;
  state.stationSplits = [];
}

export function executeCompleteCabSwitch(
  state: ISimulationState,
  sys: ISimulationSystems,
  modeRules: IModeRulesCoordinator,
  reversedLine: IMetroLineSpec,
): boolean {
  const prevClockSec = sys.schedule.getSnapshot(state.stationIndex, state.kinematics.positionM, state.legElapsedTimeSec).currentClockSec;
  sys.turnaround.finishLegSwap(state.kinematics.positionM);
  modeRules.applyLineSpec(state, sys, reversedLine, { hasSurfaceStart: false, tunnelPortalDistanceM: null });
  resetTrainLegState(state, prevClockSec);
  sys.schedule.configure?.(prevClockSec, getActiveBoardingDurationSec(state));
  modeRules.applyActiveModeOverrides(state, sys);
  state.phase = 'playing';
  sys.feedback.push('Zmieniono kabinę — wjedź na peron kursu powrotnego', 0, 'success');
  return true;
}
