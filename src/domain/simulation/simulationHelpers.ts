import { getChallengeSpec } from '../challengeCatalog';
import { BOARDING_DURATION_SEC, getSpeedLimitAt } from '../routeData';
import { computeEffectivePassengers } from '../timeOfDayCatalog';
import { CAMERA_MODE_LABELS, getNextCameraMode } from '../trainCatalog';
import { TURNAROUND_SPEED_LIMIT_KMH } from '../turnaroundSystem';
import type {
  FeedbackTone,
  IAudioEvents,
  IChallengeSpec,
  IControlInput,
  ISemaphoreProgress,
  IStationProgress,
  IStationSpec,
} from '../types';
import type { ISimulationState, ISimulationSystems } from './simulationState';

export const STOPPED_SPEED_KMH = 0.25;
export const OVERSPEED_TOLERANCE_KMH = 2.0;
export const OVERSPEED_INTERVAL_SEC = 2.0;
export const RAIL_JOINT_SPACING_M = 24;

export function getActiveChallenge(state: ISimulationState): IChallengeSpec | null {
  return state.gameMode === 'challenge' ? getChallengeSpec(state.challengeId) : null;
}

export function isFreeRideMode(state: ISimulationState): boolean {
  return state.gameMode === 'sandbox' || state.gameMode === 'passenger';
}

export function isNightServiceActive(state: ISimulationState): boolean {
  return state.timeOfDay.id === 'night_service' || getActiveChallenge(state)?.id === 'night_service';
}

export function shouldSkipPassengerStations(state: ISimulationState): boolean {
  return Boolean(getActiveChallenge(state)?.skipStations) || isNightServiceActive(state);
}

export function applyPenalty(
  state: ISimulationState,
  sys: ISimulationSystems,
  points: number,
  text: string,
  tone: FeedbackTone,
): void {
  if (isFreeRideMode(state)) {
    return;
  }
  state.score += points;
  state.penaltiesCount += 1;
  sys.feedback.push(text, points, tone);
}

export function buildStationProgress(state: ISimulationState): IStationProgress {
  const station = state.stations[state.stationIndex] ?? state.stations[state.stations.length - 1];
  const distanceToTargetM = station.distanceM - state.kinematics.positionM;
  return {
    stationIndex: state.stationIndex,
    station,
    distanceToTargetM,
    inStopZone: Math.abs(distanceToTargetM) <= station.stopZoneHalfWidthM,
    boarded: state.boardingCompleted,
  };
}

export function buildNextSignalProgress(
  state: ISimulationState,
  sys: ISimulationSystems,
): ISemaphoreProgress | null {
  const signal = sys.signals.getNextSignal(state.kinematics.positionM);
  return signal ? { signal, distanceAheadM: signal.distanceM - state.kinematics.positionM } : null;
}

export function canToggleDoorsNow(state: ISimulationState, progress: IStationProgress): boolean {
  if (shouldSkipPassengerStations(state)) {
    return false;
  }
  return (
    state.doorState === 'open' ||
    (state.kinematics.speedKmh <= STOPPED_SPEED_KMH && progress.inStopZone)
  );
}

export function computeDynamicBoardingDurationSec(effectiveWaiting: number): number {
  if (effectiveWaiting <= 0) return 4.0;
  const raw = 4.6 + effectiveWaiting * 0.105;
  return Math.max(4.0, Math.min(9.0, Math.round(raw * 10) / 10));
}

export function getActiveBoardingDurationSec(state: ISimulationState): number {
  if (state.gameMode === 'academy') {
    return 3.0;
  }
  const station = state.stations[state.stationIndex];
  if (!state.timeOfDayConfigured || !station) {
    return BOARDING_DURATION_SEC;
  }
  return computeDynamicBoardingDurationSec(getEffectiveWaitingPassengers(state, station));
}

export function getEffectiveWaitingPassengers(
  state: ISimulationState,
  station: IStationSpec,
): number {
  if (shouldSkipPassengerStations(state)) {
    return 0;
  }
  return state.timeOfDayConfigured
    ? computeEffectivePassengers(station.waitingPassengers, state.timeOfDay.passengerMultiplier)
    : station.waitingPassengers;
}

export function computeEffectiveSpeedLimit(
  state: ISimulationState,
  sys: ISimulationSystems,
): number {
  const posM = state.kinematics.positionM;
  if (sys.turnaround.getState(posM).phase !== 'inactive') {
    return TURNAROUND_SPEED_LIMIT_KMH;
  }
  let limit = getSpeedLimitAt(posM, state.speedZones);
  const curveLimit = state.alignment.getCurveSpeedLimitAt(posM);
  if (curveLimit !== null) {
    limit = Math.min(limit, curveLimit);
  }
  const passLimit = getActiveChallenge(state)?.stationPassLimitKmh;
  if (passLimit != null && state.stations.some((st) => posM >= st.distanceM - 108 && posM <= st.distanceM + 26)) {
    limit = Math.min(limit, passLimit);
  }
  if (state.activeCautionLimitKmh !== null) {
    limit = Math.min(limit, state.activeCautionLimitKmh);
  }
  const trackwork = sys.incidents.getActiveTrackworkZone(posM);
  return trackwork !== null ? Math.min(limit, trackwork.limitKmh) : limit;
}

export function computeLeverTarget(state: ISimulationState, input: IControlInput): number {
  if (state.kinematics.emergencyBrake) {
    return -1;
  }
  if (state.kinematics.serviceBrake > 0.01) {
    return -state.kinematics.serviceBrake;
  }
  if (state.kinematics.throttle > 0.01) {
    return state.kinematics.throttle;
  }
  return input.throttleDown ? -0.35 : 0;
}

export function checkRailJoint(state: ISimulationState): boolean {
  const jointIndex = Math.floor(state.kinematics.positionM / RAIL_JOINT_SPACING_M);
  if (jointIndex > state.lastJointIndex && state.kinematics.speedKmh > 6) {
    state.lastJointIndex = jointIndex;
    return true;
  }
  return false;
}

export function updateCameraState(
  state: ISimulationState,
  cyclePressed: boolean,
  dt: number,
): void {
  if (state.cameraNotice) {
    const rem = state.cameraNotice.remainingSec - dt;
    state.cameraNotice = rem <= 0 ? null : { ...state.cameraNotice, remainingSec: rem };
  }
  if (cyclePressed) {
    state.cameraMode = getNextCameraMode(state.cameraMode);
    state.cameraNotice = {
      id: state.cameraNoticeId,
      label: CAMERA_MODE_LABELS[state.cameraMode],
      remainingSec: 2.5,
    };
    state.cameraNoticeId += 1;
  }
}

export function createIdleAudioEvents(): IAudioEvents {
  return {
    hornActive: false, doorToggledTo: null, boardingCompleteChime: false, overspeedWarning: false,
    emergencyBrakeTriggered: false, railJointPulse: false, brakeStopHiss: false, atpTriggered: false,
    signalClearedChime: false, czuwakAlertTriggered: false, czuwakAckChime: false, doorFaultBeep: false,
    passingTrainWhoosh: false, radioDispatchTriggered: false, radioAckChime: false, wiperSweepTick: false,
    academyStepCompleted: false, thirdRailSparkCrackle: false, highBeamDimBonusChime: false,
    nightCrewClearedChime: false, nightCrewViolationBuzz: false, paAnnouncementTriggered: false, cabSwitchChime: false,
    sop2WarningBeep: false, sop2InterventionTriggered: false,
  };
}
