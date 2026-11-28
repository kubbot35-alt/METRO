import { getStationPlatformSide } from '../trackGeometry';
import type { IAudioEvents, IControlInput } from '../types';
import type { ISimulationCommandHandler } from './simulationCommandHandler';
import type { IControlStepCoordinator } from './controlStepCoordinator';
import type { IDoorBoardingCoordinator } from './doorBoardingCoordinator';
import type { IModeRulesCoordinator } from './modeRulesCoordinator';
import {
  applyPenalty,
  buildStationProgress,
  checkRailJoint,
  computeEffectiveSpeedLimit,
  computeLeverTarget,
  createIdleAudioEvents,
  shouldSkipPassengerStations,
  updateCameraState,
} from './simulationHelpers';
import type { ISimulationState, ISimulationSystems } from './simulationState';

export interface ISimulationStepPipeline {
  step(state: ISimulationState, sys: ISimulationSystems, input: IControlInput, dtSec: number): IAudioEvents;
}

export class SimulationStepPipeline implements ISimulationStepPipeline {
  public constructor(
    private readonly controls: IControlStepCoordinator,
    private readonly doors: IDoorBoardingCoordinator,
    private readonly modeRules: IModeRulesCoordinator,
    private readonly commands: ISimulationCommandHandler,
  ) {}

  public step(state: ISimulationState, sys: ISimulationSystems, input: IControlInput, dtSec: number): IAudioEvents {
    const dt = Math.max(0, Math.min(dtSec, 0.05));
    if (state.phase !== 'playing') {
      return createIdleAudioEvents();
    }
    state.elapsedTimeSec += dt;
    state.legElapsedTimeSec += dt;
    sys.paIntercom.step(dt);
    const paAudioNow = state.pendingPaAudio;
    const cabSwitchChimeNow = state.pendingCabSwitchChime;
    state.pendingPaAudio = false;
    state.pendingCabSwitchChime = false;
    if (sys.turnaround.getState(state.kinematics.positionM).phase === 'switching_cab') {
      sys.turnaround.step(state.kinematics.positionM, 0, dt);
      sys.feedback.tick(dt);
      return { ...createIdleAudioEvents(), paAnnouncementTriggered: paAudioNow, cabSwitchChime: cabSwitchChimeNow };
    }
    return this.executeActiveStep(state, sys, input, dt, paAudioNow, cabSwitchChimeNow);
  }

  private executeActiveStep(
    state: ISimulationState,
    sys: ISimulationSystems,
    input: IControlInput,
    dt: number,
    paAudioNow: boolean,
    cabSwitchChimeNow: boolean,
  ): IAudioEvents {
    if (input.toggleAtoPressed) {
      this.commands.toggleAto(state, sys);
    }
    const eff = this.controls.resolveEffectiveInput(state, sys, input);
    state.hornActive = eff.hornActive;
    updateCameraState(state, Boolean(eff.cycleCameraPressed), dt);
    sys.feedback.tick(dt);
    const prevPosM = state.kinematics.positionM;
    const prevSpeedKmh = state.kinematics.speedKmh;
    const weatherRes = sys.weather.step(state.alignment.hasSurfaceStart, prevPosM, state.alignment.sample(prevPosM).outdoorBlend, prevSpeedKmh, state.kinematics.serviceBrake, state.kinematics.emergencyBrake, Boolean(eff.toggleWipersPressed), dt);
    const emergencyTriggered = this.controls.advancePhysics(state, sys, eff, dt, weatherRes.brakeGripMultiplier);
    state.leverTarget = computeLeverTarget(state, eff);
    const turnaroundStep = this.handleTurnaroundStep(state, sys, dt);
    return this.evaluatePostPhysics(state, sys, input, eff, dt, prevPosM, prevSpeedKmh, emergencyTriggered, turnaroundStep.bufferCollision, weatherRes.wiperSweepTick, paAudioNow, cabSwitchChimeNow);
  }

  private handleTurnaroundStep(state: ISimulationState, sys: ISimulationSystems, dt: number) {
    const res = sys.turnaround.step(state.kinematics.positionM, state.kinematics.speedKmh, dt);
    if (res.clampedPositionM !== null) {
      state.kinematics = { ...state.kinematics, positionM: res.clampedPositionM, speedMs: 0, speedKmh: 0, throttle: 0, emergencyBrake: res.bufferCollision || state.kinematics.emergencyBrake };
      if (res.bufferCollision) {
        applyPenalty(state, sys, -50, 'Zderzenie z kozłem oporowym! Hamulec awaryjny', 'danger');
      }
    }
    return res;
  }

  private evaluatePostPhysics(
    state: ISimulationState, sys: ISimulationSystems, rawInput: IControlInput, eff: IControlInput,
    dt: number, prevPosM: number, prevSpeedKmh: number, emergencyTriggered: boolean,
    bufferCollision: boolean, wiperSweepTick: boolean, paAudioNow: boolean, cabSwitchChimeNow: boolean,
  ): IAudioEvents {
    const step = this.stepPostPhysicsSubsystems(state, sys, eff, dt, prevPosM, emergencyTriggered);
    const brakeStopHiss = (state.kinematics.serviceBrake > 0.08 || state.kinematics.emergencyBrake) && prevSpeedKmh > 0.5 && state.kinematics.speedKmh <= 0.01;
    return {
      hornActive: rawInput.hornActive, doorToggledTo: step.doorRes.toggledTo, boardingCompleteChime: step.boardingDone,
      overspeedWarning: this.controls.evaluateOverspeed(state, sys, dt),
      emergencyBrakeTriggered: emergencyTriggered || bufferCollision || (state.gameMode !== 'academy' && step.inc.czuwakTimedOut),
      railJointPulse: checkRailJoint(state), brakeStopHiss, atpTriggered: step.atp.violated, signalClearedChime: step.atp.cleared,
      czuwakAlertTriggered: step.inc.czuwakAlertTriggered || step.acad.czuwakTriggered, czuwakAckChime: step.inc.czuwakAckChime,
      doorFaultBeep: step.doorRes.faultBeep, passingTrainWhoosh: step.traffic.passingTrainWhoosh,
      radioDispatchTriggered: step.radio.dispatchTriggered || step.night.radioTriggered || step.acad.radioTriggered,
      radioAckChime: step.radio.acknowledgedNow, wiperSweepTick, academyStepCompleted: step.acad.stepCompleted,
      thirdRailSparkCrackle: step.light.sparkTriggeredNow, highBeamDimBonusChime: step.light.dimCourtesyBonusAwarded,
      nightCrewClearedChime: step.night.clearedNow, nightCrewViolationBuzz: step.night.violatedNow,
      paAnnouncementTriggered: paAudioNow, cabSwitchChime: cabSwitchChimeNow,
      sop2WarningBeep: step.sop2.warningBeep, sop2InterventionTriggered: step.sop2.interventionTriggeredNow,
      ...step.mech,
    };
  }

  private stepPostPhysicsSubsystems(
    state: ISimulationState, sys: ISimulationSystems, eff: IControlInput,
    dt: number, prevPosM: number, emergencyTriggered: boolean,
  ) {
    const inSiding = sys.turnaround.getState(state.kinematics.positionM).phase !== 'inactive';
    const atp = this.controls.evaluateSignals(state, sys, prevPosM, dt);
    const inc = this.controls.evaluateIncidents(state, sys, Boolean(eff.acknowledgeCzuwakPressed), dt);
    const radio = this.controls.evaluateRadio(state, sys, Boolean(eff.acknowledgeRadioPressed), dt);
    const traffic = sys.traffic.step(state.kinematics.positionM, dt);
    const postSample = state.alignment.sample(state.kinematics.positionM);
    const light = this.controls.evaluateComfortAndLighting(state, sys, eff, dt, postSample, emergencyTriggered);
    const mech = this.controls.evaluateMechanicalAudio(state, dt, postSample);
    const night = this.modeRules.evaluateNightInspection(state, sys);
    const { doorRes, boardingDone, acad } = this.stepDoorsAndAcademy(state, sys, eff, dt, inSiding, atp.cleared, inc.czuwakAckChime, radio.acknowledgedNow, inc.doorFaultResolvedClose);
    const sop2 = this.controls.evaluateSop2(state, sys, dt);
    sys.tachograph.recordStep(state.elapsedTimeSec, state.kinematics.positionM, state.kinematics.speedKmh, computeEffectiveSpeedLimit(state, sys));
    return { atp, inc, radio, traffic, light, mech, night, doorRes, boardingDone, acad, sop2 };
  }

  private stepDoorsAndAcademy(
    state: ISimulationState, sys: ISimulationSystems, eff: IControlInput, dt: number,
    inSiding: boolean, cleared: boolean, czuwakAckChime: boolean, radioAck: boolean, faultResolvedClose: boolean,
  ) {
    const prevServed = state.stationsServed;
    const doorRes = inSiding ? { toggledTo: null, faultBeep: false } : this.doors.handleDoorToggle(state, sys, eff, faultResolvedClose, () => this.modeRules.advanceToNextStation(state, sys));
    const boardingDone = inSiding ? false : this.doors.updateBoarding(state, sys, dt);
    if (!inSiding) this.doors.checkStationOvershoot(state, sys, () => this.modeRules.advanceToNextStation(state, sys));
    const progress = buildStationProgress(state);
    if (!shouldSkipPassengerStations(state) && !inSiding) {
      sys.announcements.update(progress.stationIndex, progress.station.name, progress.distanceToTargetM, state.kinematics.speedKmh, dt, getStationPlatformSide(progress.station));
    }
    const acad = state.gameMode === 'academy'
      ? this.modeRules.evaluateAcademyStep(state, sys, { redSignalClearedNow: cleared, czuwakAckChime, radioAcknowledgedNow: radioAck, stationServedNow: state.stationsServed > prevServed, dtSec: dt })
      : { czuwakTriggered: false, radioTriggered: false, stepCompleted: false };
    return { doorRes, boardingDone, acad };
  }
}
