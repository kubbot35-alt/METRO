import { SOP2_INTERVENTION_PENALTY, type ISop2StepOutcome } from '../sop2System';
import { SOP2_LOOKAHEAD_M } from '../sop2TargetResolver';
import type { IControlInput, ITrackSample } from '../types';
import { AtoInputResolver, type IAtoInputResolver } from './atoInputResolver';
import { SignalIncidentEvaluator, type ISignalEvalOutcome, type ISignalIncidentEvaluator } from './signalIncidentEvaluator';
import type { ISimulationState, ISimulationSystems } from './simulationContracts';
import {
  STOPPED_SPEED_KMH,
  applyPenalty,
  buildNextSignalProgress,
  buildStationProgress,
  computeEffectiveSpeedLimit,
  getActiveChallenge,
  isFreeRideMode,
  shouldSkipPassengerStations,
} from './simulationHelpers';

export type { ISignalEvalOutcome };

export interface IMechanicalAudioOutcome {
  readonly contactorClick: boolean;
  readonly airReleaseHiss: boolean;
  readonly turnoutThud: boolean;
}

export interface IControlStepCoordinator {
  resolveEffectiveInput(state: ISimulationState, sys: ISimulationSystems, input: IControlInput): IControlInput;
  advancePhysics(state: ISimulationState, sys: ISimulationSystems, input: IControlInput, dt: number, weatherGrip: number): boolean;
  evaluateSignals(state: ISimulationState, sys: ISimulationSystems, prevPosM: number, dt: number): ISignalEvalOutcome;
  evaluateIncidents(state: ISimulationState, sys: ISimulationSystems, ackPressed: boolean, dt: number): ReturnType<ISimulationSystems['incidents']['step']>;
  evaluateRadio(state: ISimulationState, sys: ISimulationSystems, ackPressed: boolean, dt: number): ReturnType<ISimulationSystems['radio']['step']>;
  evaluateOverspeed(state: ISimulationState, sys: ISimulationSystems, dt: number): boolean;
  evaluateSop2(state: ISimulationState, sys: ISimulationSystems, dt: number): ISop2StepOutcome;
  evaluateComfortAndLighting(state: ISimulationState, sys: ISimulationSystems, input: IControlInput, dt: number, postSample: ITrackSample, emergencyTriggered: boolean): ReturnType<ISimulationSystems['lighting']['step']>;
  evaluateMechanicalAudio(state: ISimulationState, dt: number, postSample: ITrackSample): IMechanicalAudioOutcome;
}

export class ControlStepCoordinator implements IControlStepCoordinator {
  public constructor(
    private readonly atoResolver: IAtoInputResolver = new AtoInputResolver(),
    private readonly signalIncidents: ISignalIncidentEvaluator = new SignalIncidentEvaluator(),
  ) {}

  public resolveEffectiveInput(state: ISimulationState, sys: ISimulationSystems, input: IControlInput): IControlInput {
    return this.atoResolver.resolveEffectiveInput(state, sys, input);
  }

  public advancePhysics(
    state: ISimulationState,
    sys: ISimulationSystems,
    input: IControlInput,
    dt: number,
    weatherGripMultiplier: number,
  ): boolean {
    const prevEmergency = state.kinematics.emergencyBrake;
    const sop2Intervening = sys.sop2.getState().interventionActive;
    const effectiveInput: IControlInput = state.atpActive || sop2Intervening ? { ...input, forceEmergencyBrake: true } : input;
    const gradeFraction = state.alignment.sample(state.kinematics.positionM).gradeFraction;
    const tractionMultiplier = getActiveChallenge(state)?.tractionMultiplier ?? 1.0;
    const brakeGripMultiplier = Math.min(sys.radio.getState().slipperyRailsActive ? 0.82 : 1.0, weatherGripMultiplier);
    state.kinematics = sys.physics.step(state.kinematics, effectiveInput, state.doorState === 'open', dt, gradeFraction, tractionMultiplier, brakeGripMultiplier);
    if (state.atpActive && state.kinematics.speedKmh <= STOPPED_SPEED_KMH) {
      state.atpActive = false;
    }
    const triggered = !prevEmergency && state.kinematics.emergencyBrake && !state.atpActive && !sop2Intervening;
    if (triggered && state.kinematics.speedKmh > 5) {
      applyPenalty(state, sys, sys.scoring.getEmergencyBrakePenalty(), 'Hamowanie awaryjne', 'warning');
    }
    return triggered;
  }

  public evaluateSignals(state: ISimulationState, sys: ISimulationSystems, prevPosM: number, dt: number): ISignalEvalOutcome {
    return this.signalIncidents.evaluateSignals(state, sys, prevPosM, dt);
  }

  public evaluateIncidents(state: ISimulationState, sys: ISimulationSystems, ackPressed: boolean, dt: number) {
    return this.signalIncidents.evaluateIncidents(state, sys, ackPressed, dt);
  }

  public evaluateRadio(state: ISimulationState, sys: ISimulationSystems, ackPressed: boolean, dt: number) {
    return this.signalIncidents.evaluateRadio(state, sys, ackPressed, dt);
  }

  public evaluateOverspeed(state: ISimulationState, sys: ISimulationSystems, dt: number): boolean {
    return this.signalIncidents.evaluateOverspeed(state, sys, dt);
  }

  public evaluateSop2(state: ISimulationState, sys: ISimulationSystems, dt: number): ISop2StepOutcome {
    const posM = state.kinematics.positionM;
    const limitKmh = computeEffectiveSpeedLimit(state, sys);
    const res = sys.sop2.step({
      positionM: posM, currentLimitKmh: limitKmh, speedZones: state.speedZones,
      upcomingCurve: state.alignment.getUpcomingCurveLimit(posM, SOP2_LOOKAHEAD_M),
      upcomingTrackworkDistanceM: sys.incidents.getUpcomingTrackworkDistance(posM),
      nextSignal: buildNextSignalProgress(state, sys), currentStation: buildStationProgress(state),
      skipStations: shouldSkipPassengerStations(state), stationPassLimitKmh: getActiveChallenge(state)?.stationPassLimitKmh ?? null,
      speedKmh: state.kinematics.speedKmh, isBraking: state.kinematics.serviceBrake >= 0.05 || state.kinematics.emergencyBrake, dtSec: dt,
    });
    if (res.interventionTriggeredNow) {
      state.kinematics = { ...state.kinematics, throttle: 0, emergencyBrake: true };
      state.overspeedViolations += 1;
      applyPenalty(state, sys, SOP2_INTERVENTION_PENALTY, 'INTERWENCJA SOP-2: Przekroczono limit — hamowanie awaryjne!', 'danger');
      sys.tachograph.recordViolation(state.elapsedTimeSec, posM, state.kinematics.speedKmh, 'overspeed');
    } else if (res.interventionReleasedNow) {
      state.kinematics = { ...state.kinematics, emergencyBrake: false };
      sys.feedback.push('SOP-2: Prędkość poniżej limitu — hamowanie zwolnione', 0, 'neutral');
    }
    return res;
  }

  public evaluateComfortAndLighting(
    state: ISimulationState, sys: ISimulationSystems, input: IControlInput,
    dt: number, postSample: ITrackSample, emergencyTriggered: boolean,
  ): ReturnType<ISimulationSystems['lighting']['step']> {
    const comfortProgress = buildStationProgress(state);
    const comfortRes = sys.comfort.step({
      dtSec: dt, speedKmh: state.kinematics.speedKmh, netAccelerationMs2: state.kinematics.netAccelerationMs2,
      leverTarget: state.leverTarget, emergencyBrake: state.kinematics.emergencyBrake,
      curvatureRadPerM: postSample.curvatureRadPerM, curveLimitKmh: state.alignment.getCurveSpeedLimitAt(state.kinematics.positionM),
      distanceToStationM: comfortProgress.distanceToTargetM, doorsOpen: state.doorState === 'open',
    });
    if (comfortRes.event && !(emergencyTriggered && comfortRes.event.kind === 'emergency_brake')) {
      sys.feedback.push(comfortRes.event.messagePl, 0, 'warning');
    }
    return this.stepLightingAndEco(state, sys, input, dt, postSample);
  }

  public evaluateMechanicalAudio(state: ISimulationState, dt: number, postSample: ITrackSample): IMechanicalAudioOutcome {
    const notch = Math.round(state.leverTarget * 4);
    const contactorClick = state.trainModel.id === 'seria81' && notch !== state.prevContactorNotch;
    state.prevContactorNotch = notch;
    const airHeld = state.kinematics.serviceBrake > 0.25 || state.kinematics.emergencyBrake;
    const airReleaseHiss = state.trainModel.id === 'seria81' && state.prevAirBrakeHeld && !airHeld;
    state.prevAirBrakeHeld = airHeld;
    state.turnoutThudCooldownSec = Math.max(0, state.turnoutThudCooldownSec - dt);
    const turnoutThud = postSample.turnoutSwayFactor > 0.22 && state.kinematics.speedKmh > 12 && state.turnoutThudCooldownSec <= 0;
    if (turnoutThud) {
      state.turnoutThudCooldownSec = Math.max(1.2, 22 / Math.max(15, state.kinematics.speedKmh));
    }
    return { contactorClick, airReleaseHiss, turnoutThud };
  }

  private buildLightingStepContext(
    state: ISimulationState,
    sys: ISimulationSystems,
    input: IControlInput,
    dt: number,
    postSample: ITrackSample,
  ) {
    return {
      playerPositionM: state.kinematics.positionM,
      speedKmh: state.kinematics.speedKmh,
      throttle: state.kinematics.throttle,
      serviceBrake: state.kinematics.serviceBrake,
      emergencyBrake: state.kinematics.emergencyBrake,
      netAccelerationMs2: state.kinematics.netAccelerationMs2,
      turnoutSwayFactor: postSample.turnoutSwayFactor,
      oncomingTrain: sys.traffic.getState(),
      toggleHeadlightsPressed: Boolean(input.toggleHeadlightsPressed),
      toggleCabLightPressed: Boolean(input.toggleCabLightPressed),
      dtSec: dt,
    };
  }

  private stepLightingAndEco(
    state: ISimulationState,
    sys: ISimulationSystems,
    input: IControlInput,
    dt: number,
    postSample: ITrackSample,
  ): ReturnType<ISimulationSystems['lighting']['step']> {
    const lightRes = sys.lighting.step(this.buildLightingStepContext(state, sys, input, dt, postSample));
    if (lightRes.dimCourtesyBonusAwarded) {
      const pts = isFreeRideMode(state) ? 0 : lightRes.courtesyBonusPoints;
      state.score += pts;
      sys.feedback.push('Kultura jazdy: przygaszono długie światła', pts, 'success');
    }
    sys.ecoDriving.step({
      kinematics: state.kinematics,
      physicsConfig: state.trainModel.physics,
      trainModelId: state.trainModel.id,
      dtSec: dt,
    });
    return lightRes;
  }
}
