import { FeedbackTracker, type IFeedbackTracker } from './feedbackTracker';
import {
  BOARDING_DURATION_SEC,
  LINE_M1_SPEED_ZONES,
  LINE_M1_STATIONS,
  getSpeedLimitAt,
} from './routeData';
import { TunnelSignalSystem, type ISignalController } from './signalSystem';
import { createInitialKinematics } from './trainPhysics';
import type {
  DoorState,
  FeedbackTone,
  GamePhase,
  IAudioEvents,
  IControlInput,
  IMetroSimulation,
  IScoringEvaluator,
  ISemaphoreProgress,
  ISimulationSnapshot,
  ISpeedLimitZone,
  IStationProgress,
  IStationSpec,
  ITrainKinematics,
  ITrainPhysicsModel,
} from './types';

const STOPPED_SPEED_KMH = 0.25;
const OVERSPEED_TOLERANCE_KMH = 2.0;
const OVERSPEED_INTERVAL_SEC = 2.0;
const RAIL_JOINT_SPACING_M = 24;

export class MetroSimulationEngine implements IMetroSimulation {
  private readonly physics: ITrainPhysicsModel;
  private readonly scoring: IScoringEvaluator;
  private readonly signals: ISignalController;
  private readonly feedback: IFeedbackTracker;
  private readonly stations: readonly IStationSpec[];
  private readonly speedZones: readonly ISpeedLimitZone[];

  private phase: GamePhase = 'title';
  private kinematics: ITrainKinematics = createInitialKinematics();
  private doorState: DoorState = 'closed';
  private stationIndex = 0;
  private boardingTimerSec = 0;
  private boardingCompleted = false;
  private stopAwarded = false;
  private stationsServed = 0;
  private stationsMissed = 0;
  private score = 0;
  private penaltiesCount = 0;
  private totalStopErrorM = 0;
  private elapsedTimeSec = 0;
  private overspeedCooldownSec = 0;
  private lastJointIndex = 0;
  private hornActive = false;
  private atpActive = false;
  private activeCautionLimitKmh: number | null = null;

  public constructor(
    physics: ITrainPhysicsModel,
    scoring: IScoringEvaluator,
    stations: readonly IStationSpec[] = LINE_M1_STATIONS,
    speedZones: readonly ISpeedLimitZone[] = LINE_M1_SPEED_ZONES,
    feedback: IFeedbackTracker = new FeedbackTracker(),
    signals: ISignalController = new TunnelSignalSystem(),
  ) {
    this.physics = physics;
    this.scoring = scoring;
    this.stations = stations;
    this.speedZones = speedZones;
    this.feedback = feedback;
    this.signals = signals;
  }

  public start(): void {
    if (this.phase === 'gameover') {
      this.reset();
    }
    this.phase = 'playing';
  }

  public pause(): void {
    if (this.phase === 'playing') {
      this.phase = 'paused';
    }
  }

  public resume(): void {
    if (this.phase === 'paused') {
      this.phase = 'playing';
    }
  }

  public reset(): void {
    this.phase = 'playing';
    this.kinematics = createInitialKinematics();
    this.doorState = 'closed';
    this.stationIndex = 0;
    this.boardingTimerSec = 0;
    this.boardingCompleted = false;
    this.stopAwarded = false;
    this.stationsServed = 0;
    this.stationsMissed = 0;
    this.score = 0;
    this.penaltiesCount = 0;
    this.totalStopErrorM = 0;
    this.elapsedTimeSec = 0;
    this.overspeedCooldownSec = 0;
    this.lastJointIndex = 0;
    this.hornActive = false;
    this.atpActive = false;
    this.activeCautionLimitKmh = null;
    this.feedback.reset();
    this.signals.reset();
  }

  public step(input: IControlInput, dtSec: number): IAudioEvents {
    const dt = Math.max(0, Math.min(dtSec, 0.05));
    if (this.phase !== 'playing') {
      return this.idleAudioEvents();
    }
    this.elapsedTimeSec += dt;
    this.hornActive = input.hornActive;
    this.feedback.tick(dt);
    const prevPosM = this.kinematics.positionM;
    const prevSpeedKmh = this.kinematics.speedKmh;
    const emergencyTriggered = this.advancePhysics(input, dt);
    const atpTriggered = this.evaluateSignals(prevPosM, dt);
    const brakeStopHiss = this.checkBrakeStopHiss(prevSpeedKmh);
    const overspeedWarning = this.evaluateOverspeed(dt);
    const doorToggledTo = this.handleDoorToggle(input.toggleDoorsPressed);
    const boardingCompleteChime = this.updateBoarding(dt);
    this.checkStationOvershoot();
    return {
      hornActive: input.hornActive,
      doorToggledTo,
      boardingCompleteChime,
      overspeedWarning,
      emergencyBrakeTriggered: emergencyTriggered,
      railJointPulse: this.checkRailJoint(),
      brakeStopHiss,
      atpTriggered: atpTriggered.violated,
      signalClearedChime: atpTriggered.cleared,
    };
  }

  public getSnapshot(): ISimulationSnapshot {
    const currentStation = this.buildStationProgress();
    const speedLimitKmh = this.computeEffectiveSpeedLimit();
    return {
      phase: this.phase,
      kinematics: this.kinematics,
      speedLimitKmh,
      isOverspeeding: this.kinematics.speedKmh > speedLimitKmh + OVERSPEED_TOLERANCE_KMH,
      doorState: this.doorState,
      canToggleDoors: this.canToggleDoorsNow(currentStation),
      boardingTimerSec: this.boardingTimerSec,
      boardingDurationSec: BOARDING_DURATION_SEC,
      boardingCompletedForCurrent: this.boardingCompleted,
      currentStation,
      signals: this.signals.getSignals(),
      nextSignal: this.buildNextSignalProgress(),
      atpActive: this.atpActive,
      totalStations: this.stations.length,
      stationsServed: this.stationsServed,
      stationsMissed: this.stationsMissed,
      score: this.score,
      penaltiesCount: this.penaltiesCount,
      totalStopErrorM: this.totalStopErrorM,
      elapsedTimeSec: this.elapsedTimeSec,
      feedback: this.feedback.getCurrent(),
      hornActive: this.hornActive,
    };
  }

  private advancePhysics(input: IControlInput, dt: number): boolean {
    const prevEmergency = this.kinematics.emergencyBrake;
    const effectiveInput: IControlInput = this.atpActive
      ? { ...input, forceEmergencyBrake: true }
      : input;
    this.kinematics = this.physics.step(this.kinematics, effectiveInput, this.doorState === 'open', dt);
    if (this.atpActive && this.kinematics.speedKmh <= STOPPED_SPEED_KMH) {
      this.atpActive = false;
    }
    const triggered = !prevEmergency && this.kinematics.emergencyBrake && !this.atpActive;
    if (triggered && this.kinematics.speedKmh > 5) {
      this.applyPenalty(this.scoring.getEmergencyBrakePenalty(), 'Hamowanie awaryjne', 'warning');
    }
    return triggered;
  }

  private evaluateSignals(prevPosM: number, dt: number): { violated: boolean; cleared: boolean } {
    const res = this.signals.step(prevPosM, this.kinematics.positionM, this.kinematics.speedKmh, dt);
    this.activeCautionLimitKmh = res.activeCautionLimitKmh;
    if (res.redSignalViolated) {
      this.atpActive = true;
      this.kinematics = { ...this.kinematics, emergencyBrake: true, throttle: 0 };
      this.applyPenalty(
        this.scoring.getRedSignalPenalty(),
        'ATP: Przejechano czerwone światło! Hamulec bezpieczeństwa',
        'danger',
      );
    }
    if (res.clearedToGreen) {
      this.feedback.push('Semafor zielony — droga wolna', 0, 'success');
    }
    return { violated: res.redSignalViolated, cleared: res.clearedToGreen };
  }

  private checkBrakeStopHiss(prevSpeedKmh: number): boolean {
    const braking = this.kinematics.serviceBrake > 0.08 || this.kinematics.emergencyBrake;
    return braking && prevSpeedKmh > 0.5 && this.kinematics.speedKmh <= 0.01;
  }

  private computeEffectiveSpeedLimit(): number {
    const routeLimit = getSpeedLimitAt(this.kinematics.positionM, this.speedZones);
    if (this.activeCautionLimitKmh !== null) {
      return Math.min(routeLimit, this.activeCautionLimitKmh);
    }
    return routeLimit;
  }

  private handleDoorToggle(pressed: boolean): DoorState | null {
    if (!pressed) {
      return null;
    }
    const progress = this.buildStationProgress();
    if (!this.canToggleDoorsNow(progress)) {
      return null;
    }
    if (this.doorState === 'closed') {
      this.doorState = 'open';
      this.awardStationStop(progress);
      return 'open';
    }
    this.doorState = 'closed';
    if (this.boardingCompleted) {
      this.stationsServed += 1;
      this.advanceToNextStation();
    }
    return 'closed';
  }

  private awardStationStop(progress: IStationProgress): void {
    if (this.stopAwarded) {
      return;
    }
    this.stopAwarded = true;
    const evaluation = this.scoring.evaluateStop(progress.distanceToTargetM);
    this.score += evaluation.points;
    this.totalStopErrorM += Math.abs(evaluation.offsetM);
    this.feedback.push(evaluation.label, evaluation.points, evaluation.tone);
  }

  private updateBoarding(dt: number): boolean {
    if (this.doorState !== 'open' || this.boardingCompleted) {
      return false;
    }
    this.boardingTimerSec = Math.min(BOARDING_DURATION_SEC, this.boardingTimerSec + dt);
    if (this.boardingTimerSec >= BOARDING_DURATION_SEC) {
      this.boardingCompleted = true;
      this.feedback.push('Wymiana pasażerów zakończona — zamknij drzwi [O]', 0, 'success');
      return true;
    }
    return false;
  }

  private checkStationOvershoot(): void {
    const station = this.stations[this.stationIndex];
    if (!station || this.doorState === 'open') {
      return;
    }
    if (this.kinematics.positionM > station.distanceM + station.stopZoneHalfWidthM + 2) {
      this.stationsMissed += 1;
      this.applyPenalty(this.scoring.getMissedStationPenalty(), `Przejechano stację ${station.name}!`, 'danger');
      this.advanceToNextStation();
    }
  }

  private advanceToNextStation(): void {
    this.boardingTimerSec = 0;
    this.boardingCompleted = false;
    this.stopAwarded = false;
    if (this.stationIndex + 1 >= this.stations.length) {
      this.phase = 'gameover';
      return;
    }
    this.stationIndex += 1;
  }

  private evaluateOverspeed(dt: number): boolean {
    const limit = this.computeEffectiveSpeedLimit();
    if (this.kinematics.speedKmh <= limit + OVERSPEED_TOLERANCE_KMH) {
      this.overspeedCooldownSec = Math.max(0, this.overspeedCooldownSec - dt);
      return false;
    }
    this.overspeedCooldownSec -= dt;
    if (this.overspeedCooldownSec <= 0) {
      this.overspeedCooldownSec = OVERSPEED_INTERVAL_SEC;
      this.applyPenalty(this.scoring.getOverspeedPenalty(), `Przekroczenie limitu (${limit} km/h)`, 'danger');
      return true;
    }
    return false;
  }

  private applyPenalty(points: number, text: string, tone: FeedbackTone): void {
    this.score += points;
    this.penaltiesCount += 1;
    this.feedback.push(text, points, tone);
  }

  private buildStationProgress(): IStationProgress {
    const station = this.stations[this.stationIndex] ?? this.stations[this.stations.length - 1];
    const distanceToTargetM = station.distanceM - this.kinematics.positionM;
    return {
      stationIndex: this.stationIndex,
      station,
      distanceToTargetM,
      inStopZone: Math.abs(distanceToTargetM) <= station.stopZoneHalfWidthM,
      boarded: this.boardingCompleted,
    };
  }

  private buildNextSignalProgress(): ISemaphoreProgress | null {
    const signal = this.signals.getNextSignal(this.kinematics.positionM);
    if (!signal) {
      return null;
    }
    return { signal, distanceAheadM: signal.distanceM - this.kinematics.positionM };
  }

  private canToggleDoorsNow(progress: IStationProgress): boolean {
    return this.doorState === 'open' || (this.kinematics.speedKmh <= STOPPED_SPEED_KMH && progress.inStopZone);
  }

  private checkRailJoint(): boolean {
    const jointIndex = Math.floor(this.kinematics.positionM / RAIL_JOINT_SPACING_M);
    if (jointIndex > this.lastJointIndex && this.kinematics.speedKmh > 6) {
      this.lastJointIndex = jointIndex;
      return true;
    }
    return false;
  }

  private idleAudioEvents(): IAudioEvents {
    return {
      hornActive: false,
      doorToggledTo: null,
      boardingCompleteChime: false,
      overspeedWarning: false,
      emergencyBrakeTriggered: false,
      railJointPulse: false,
      brakeStopHiss: false,
      atpTriggered: false,
      signalClearedChime: false,
    };
  }
}
