import { computeDepotZoneState } from '../depotHallSystem';
import { SOP2_LOOKAHEAD_M, resolveSop2Target } from '../sop2TargetResolver';
import { getStationPlatformSide } from '../trackGeometry';
import { buildTrainspottingSpots, buildTrainspottingState } from '../trainspottingSystem';
import type { ISimulationSnapshot, ISop2State, IStationProgress } from '../types';
import {
  OVERSPEED_TOLERANCE_KMH,
  buildNextSignalProgress,
  buildStationProgress,
  canToggleDoorsNow,
  computeEffectiveSpeedLimit,
  getActiveBoardingDurationSec,
  getActiveChallenge,
  getEffectiveWaitingPassengers,
  shouldSkipPassengerStations,
} from './simulationHelpers';
import type { ISimulationState, ISimulationSystems } from './simulationState';

export interface ISnapshotAssembler {
  assemble(state: ISimulationState, sys: ISimulationSystems): ISimulationSnapshot;
}

function buildTrackProfileSnapshot(state: ISimulationState, posM: number): ISimulationSnapshot['trackProfile'] {
  const trackSample = state.alignment.sample(posM);
  const activeCurveLimit = state.alignment.getCurveSpeedLimitAt(posM);
  const upcomingCurve = state.alignment.getUpcomingCurveLimit(posM, 130);
  return {
    gradePercent: trackSample.gradePercent,
    elevationM: trackSample.y,
    curvatureRadPerM: trackSample.curvatureRadPerM,
    cantRollRad: trackSample.cantRollRad,
    turnoutSwayFactor: trackSample.turnoutSwayFactor,
    outdoorBlend: trackSample.outdoorBlend,
    inCurveLimitZone: activeCurveLimit !== null,
    upcomingCurveLimitKmh: upcomingCurve?.limitKmh ?? null,
    upcomingCurveDistanceM: upcomingCurve?.distanceAheadM ?? null,
  };
}

function buildSop2Snapshot(
  state: ISimulationState,
  sys: ISimulationSystems,
  currentStation: IStationProgress,
  speedLimitKmh: number,
  nextSignal: ISimulationSnapshot['nextSignal'],
): ISop2State {
  const base = sys.sop2.getState();
  const posM = state.kinematics.positionM;
  const target = resolveSop2Target({
    positionM: posM, currentLimitKmh: speedLimitKmh, speedZones: state.speedZones,
    upcomingCurve: state.alignment.getUpcomingCurveLimit(posM, SOP2_LOOKAHEAD_M),
    upcomingTrackworkDistanceM: sys.incidents.getUpcomingTrackworkDistance(posM),
    nextSignal, currentStation, skipStations: shouldSkipPassengerStations(state),
    stationPassLimitKmh: getActiveChallenge(state)?.stationPassLimitKmh ?? null,
  });
  return { ...base, currentLimitKmh: Math.round(speedLimitKmh), ...target };
}

function buildDoorSignalSnapshot(
  state: ISimulationState,
  sys: ISimulationSystems,
  currentStation: IStationProgress,
  speedLimitKmh: number,
) {
  const boardingDurationSec = getActiveBoardingDurationSec(state);
  const nextSignal = buildNextSignalProgress(state, sys);
  return {
    speedLimitKmh,
    isOverspeeding: state.kinematics.speedKmh > speedLimitKmh + OVERSPEED_TOLERANCE_KMH,
    doorState: state.doorState,
    openDoorSide: state.openDoorSide,
    canToggleDoors: canToggleDoorsNow(state, currentStation),
    boardingTimerSec: state.boardingTimerSec,
    boardingDurationSec,
    boardingProgress: Math.min(1, state.boardingTimerSec / boardingDurationSec),
    boardingCompletedForCurrent: state.boardingCompleted,
    currentStation,
    signals: sys.signals.getSignals(),
    nextSignal,
    atpActive: state.atpActive,
    sop2: buildSop2Snapshot(state, sys, currentStation, speedLimitKmh, nextSignal),
  };
}

function buildTrainSubsystemsSnapshot(state: ISimulationState, sys: ISimulationSystems, posM: number) {
  const lightingState = sys.lighting.getState();
  return {
    headlightsOn: lightingState.headlightMode !== 'off',
    headlightMode: lightingState.headlightMode,
    cabLightOn: lightingState.cabLightOn,
    lightingEffects: lightingState,
    nightInspection: sys.nightInspection.getState(),
    comfort: sys.comfort.getState(),
    ecoDriving: sys.ecoDriving.getState(),
    paIntercom: sys.paIntercom.getState(),
    turnaround: sys.turnaround.getState(posM),
  };
}

function buildWorldAndIncidentsSnapshot(
  state: ISimulationState,
  sys: ISimulationSystems,
  currentStation: IStationProgress,
  posM: number,
) {
  return {
    leverTarget: state.leverTarget,
    passengersCarried: state.passengersCarried,
    currentStationBoardedCount: state.currentStationBoardedCount,
    effectiveWaitingPassengers: getEffectiveWaitingPassengers(state, currentStation.station),
    announcement: sys.announcements.getCurrent(),
    schedule: sys.schedule.getSnapshot(state.stationIndex, posM, state.legElapsedTimeSec),
    trackworkZones: sys.incidents.getTrackworkZones(),
    activeTrackworkZone: sys.incidents.getActiveTrackworkZone(posM),
    upcomingTrackworkDistanceM: sys.incidents.getUpcomingTrackworkDistance(posM),
    doorFault: sys.incidents.getDoorFaultState(),
    czuwak: sys.incidents.getCzuwakState(),
    radio: sys.radio.getState(),
    weather: sys.weather.getState(),
  };
}

function buildRunSummarySnapshot(state: ISimulationState, sys: ISimulationSystems) {
  const driverGrade = sys.scoring.evaluateGrade({
    score: state.score, stationsServed: state.stationsServed, totalStations: state.stations.length,
    overspeedViolations: state.overspeedViolations, redSignalViolations: state.redSignalViolations, czuwakViolations: state.czuwakViolations,
  });
  return {
    totalStations: state.stations.length, stationsServed: state.stationsServed, stationsMissed: state.stationsMissed,
    score: state.score, penaltiesCount: state.penaltiesCount, overspeedViolations: state.overspeedViolations,
    redSignalViolations: state.redSignalViolations, czuwakViolations: state.czuwakViolations,
    czuwakAcksCount: state.czuwakAcksCount, doorFaultsResolvedCount: state.doorFaultsResolvedCount,
    bestStopErrorM: state.bestStopErrorM, driverGrade, totalStopErrorM: state.totalStopErrorM,
    elapsedTimeSec: state.elapsedTimeSec, feedback: sys.feedback.getCurrent(), hornActive: state.hornActive,
    tachograph: sys.tachograph.getSnapshot(), stationSplits: state.stationSplits.slice(),
  };
}

export class SnapshotAssembler implements ISnapshotAssembler {
  public assemble(state: ISimulationState, sys: ISimulationSystems): ISimulationSnapshot {
    const currentStation = buildStationProgress(state);
    const posM = state.kinematics.positionM;
    const speedLimitKmh = computeEffectiveSpeedLimit(state, sys);
    const depotZone = computeDepotZoneState(posM, state.kinematics.speedKmh, state.alignment.hasSurfaceStart, state.depotHallStart);
    const spots = buildTrainspottingSpots(state.line, state.stations);
    const trainspotting = buildTrainspottingState(state.gameMode === 'trainspotting', spots, state.trainspottingSpotIndex, state.trainspottingWalkOffsetM);
    return {
      phase: state.phase, gameMode: state.gameMode,
      atoEnabled: state.atoEnabled, atoStatus: state.atoEnabled ? state.atoStatus : 'off',
      challenge: getActiveChallenge(state), challengeOutcome: state.challengeOutcome,
      academy: state.gameMode === 'academy' ? sys.academy.getSnapshot(currentStation.inStopZone, getStationPlatformSide(currentStation.station), state.doorState) : null,
      line: state.line, stations: state.stations, trainModel: state.trainModel, timeOfDay: state.timeOfDay,
      cameraMode: state.cameraMode, cameraNotice: state.cameraNotice,
      oncomingTrain: sys.traffic.getState(), leadingTrain: sys.leadingTrain.getState(), kinematics: state.kinematics,
      trackProfile: buildTrackProfileSnapshot(state, posM),
      ...buildDoorSignalSnapshot(state, sys, currentStation, speedLimitKmh),
      ...buildTrainSubsystemsSnapshot(state, sys, posM),
      ...buildWorldAndIncidentsSnapshot(state, sys, currentStation, posM),
      ...buildRunSummarySnapshot(state, sys),
      depotZone,
      passengerView: { seatId: state.passengerSeatId, carIndex: state.passengerCarIndex },
      trainspotting,
    };
  }
}
