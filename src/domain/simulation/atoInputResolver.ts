import { canEnableAtoForMode, type IAtoContext } from '../atoSystem';
import { getStationPlatformSide } from '../trackGeometry';
import type { IControlInput } from '../types';
import type { ISimulationState, ISimulationSystems } from './simulationContracts';
import {
  buildNextSignalProgress,
  buildStationProgress,
  canToggleDoorsNow,
  computeEffectiveSpeedLimit,
  shouldSkipPassengerStations,
} from './simulationHelpers';

export interface IAtoInputResolver {
  resolveEffectiveInput(state: ISimulationState, sys: ISimulationSystems, input: IControlInput): IControlInput;
}

function buildAtoStationDoorContext(state: ISimulationState, sys: ISimulationSystems) {
  const progress = buildStationProgress(state);
  return {
    currentStation: progress,
    expectedPlatformSide: getStationPlatformSide(progress.station),
    doorState: state.doorState,
    openDoorSide: state.openDoorSide,
    canToggleDoors: canToggleDoorsNow(state, progress),
    boardingCompletedForCurrent: state.boardingCompleted,
    doorFaultPhase: sys.incidents.getDoorFaultState().phase,
    czuwakActive: sys.incidents.getCzuwakState().active,
    radioActive: sys.radio.getState().active,
  };
}

function buildAtoContext(state: ISimulationState, sys: ISimulationSystems): IAtoContext {
  const posM = state.kinematics.positionM;
  const trackSample = state.alignment.sample(posM);
  const upcomingCurve = state.alignment.getUpcomingCurveLimit(posM, 180);
  const weatherState = sys.weather.getState();
  return {
    speedKmh: state.kinematics.speedKmh,
    speedLimitKmh: computeEffectiveSpeedLimit(state, sys),
    gradePercent: trackSample.gradePercent,
    nextSignal: buildNextSignalProgress(state, sys),
    upcomingCurveLimitKmh: upcomingCurve?.limitKmh ?? null,
    upcomingCurveDistanceM: upcomingCurve?.distanceAheadM ?? null,
    upcomingTrackworkDistanceM: sys.incidents.getUpcomingTrackworkDistance(posM),
    activeTrackworkZone: sys.incidents.getActiveTrackworkZone(posM),
    headlightsOn: sys.lighting.getState().headlightMode !== 'off',
    rainIntensity: weatherState.rainIntensity,
    wipersOn: weatherState.wipersOn,
    skipStations: shouldSkipPassengerStations(state),
    isEveningOrTunnel: state.timeOfDay.id !== 'rush' || trackSample.outdoorBlend < 0.35,
    ...buildAtoStationDoorContext(state, sys),
  };
}

function buildAtoControlInput(
  cmd: ReturnType<ISimulationSystems['ato']['computeControl']>,
  input: IControlInput,
): IControlInput {
  return {
    throttleUp: false, throttleDown: false, serviceBrake: false,
    manualLeverAxis: cmd.leverAxis,
    emergencyBrakePressed: input.emergencyBrakePressed,
    toggleDoorsPressed: false,
    toggleDoorsLeftPressed: Boolean(input.toggleDoorsLeftPressed) || cmd.toggleDoorsLeft,
    toggleDoorsRightPressed: Boolean(input.toggleDoorsRightPressed) || cmd.toggleDoorsRight,
    toggleHeadlightsPressed: Boolean(input.toggleHeadlightsPressed) || cmd.toggleHeadlights,
    toggleCabLightPressed: input.toggleCabLightPressed,
    toggleWipersPressed: Boolean(input.toggleWipersPressed) || cmd.toggleWipers,
    acknowledgeCzuwakPressed: Boolean(input.acknowledgeCzuwakPressed) || cmd.acknowledgeCzuwak,
    acknowledgeRadioPressed: Boolean(input.acknowledgeRadioPressed) || cmd.acknowledgeRadio,
    cycleCameraPressed: input.cycleCameraPressed,
    hornActive: input.hornActive,
  };
}

export class AtoInputResolver implements IAtoInputResolver {
  public resolveEffectiveInput(
    state: ISimulationState,
    sys: ISimulationSystems,
    input: IControlInput,
  ): IControlInput {
    if (!state.atoEnabled || !canEnableAtoForMode(state.gameMode)) {
      state.atoStatus = 'off';
      return input;
    }
    const cmd = sys.ato.computeControl(buildAtoContext(state, sys));
    state.atoStatus = cmd.status;
    return buildAtoControlInput(cmd, input);
  }
}
