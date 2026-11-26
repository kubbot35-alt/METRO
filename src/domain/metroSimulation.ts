import {
  StationAnnouncementTracker,
  type IAnnouncementTracker,
} from './announcementTracker';
import { FeedbackTracker, type IFeedbackTracker } from './feedbackTracker';
import { MetroIncidentSystem, type IIncidentController } from './incidentSystem';
import {
  BOARDING_DURATION_SEC,
  LINE_M1_SPEED_ZONES,
  LINE_M1_STATIONS,
  METRO_LINE_M1,
  getMetroLineSpec,
  getSpeedLimitAt,
} from './routeData';
import { MetroScheduleController, type IScheduleController } from './scheduleSystem';
import {
  TunnelSignalSystem,
  buildSemaphoreDistances,
  type ISignalController,
} from './signalSystem';
import { OppositeTrackTrafficSystem, type ITrafficController } from './trafficSystem';
import {
  computeEffectivePassengers,
  getTimeOfDaySpec,
  RUSH_HOUR_SPEC,
} from './timeOfDayCatalog';
import { getStationPlatformSide } from './trackGeometry';
import {
  CAMERA_MODE_LABELS,
  getNextCameraMode,
  getTrainModelSpec,
} from './trainCatalog';
import { createInitialKinematics } from './trainPhysics';
import type {
  CameraMode,
  DoorSide,
  DoorState,
  FeedbackTone,
  GameModeId,
  GamePhase,
  IAudioEvents,
  ICameraNotice,
  IControlInput,
  IMetroLineSpec,
  IMetroSimulation,
  IScoringEvaluator,
  ISemaphoreProgress,
  ISimulationSnapshot,
  ISpeedLimitZone,
  IStationProgress,
  IStationSpec,
  ITimeOfDaySpec,
  ITrainKinematics,
  ITrainModelSpec,
  ITrainPhysicsModel,
  MetroLineId,
  TimeOfDayId,
  TrainModelId,
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
  private readonly announcements: IAnnouncementTracker;
  private readonly schedule: IScheduleController;
  private readonly incidents: IIncidentController;
  private readonly traffic: ITrafficController;
  private line: IMetroLineSpec = METRO_LINE_M1;
  private stations: readonly IStationSpec[];
  private speedZones: readonly ISpeedLimitZone[];

  private phase: GamePhase = 'title';
  private gameMode: GameModeId = 'duty';
  private trainModel: ITrainModelSpec = getTrainModelSpec('inspiro');
  private timeOfDay: ITimeOfDaySpec = RUSH_HOUR_SPEC;
  private timeOfDayConfigured = false;
  private cameraMode: CameraMode = 'cab';
  private cameraNotice: ICameraNotice | null = null;
  private cameraNoticeId = 1;
  private kinematics: ITrainKinematics = createInitialKinematics();
  private doorState: DoorState = 'closed';
  private openDoorSide: DoorSide | null = null;
  private stationIndex = 0;
  private boardingTimerSec = 0;
  private boardingCompleted = false;
  private stopAwarded = false;
  private stationsServed = 0;
  private stationsMissed = 0;
  private score = 0;
  private penaltiesCount = 0;
  private overspeedViolations = 0;
  private redSignalViolations = 0;
  private czuwakViolations = 0;
  private czuwakAcksCount = 0;
  private doorFaultsResolvedCount = 0;
  private bestStopErrorM: number | null = null;
  private totalStopErrorM = 0;
  private elapsedTimeSec = 0;
  private overspeedCooldownSec = 0;
  private lastJointIndex = 0;
  private hornActive = false;
  private atpActive = false;
  private activeCautionLimitKmh: number | null = null;
  private headlightsOn = true;
  private leverTarget = 0;
  private passengersCarried = 0;
  private currentStationBoardedCount = 0;

  public constructor(
    physics: ITrainPhysicsModel,
    scoring: IScoringEvaluator,
    stations: readonly IStationSpec[] = LINE_M1_STATIONS,
    speedZones: readonly ISpeedLimitZone[] = LINE_M1_SPEED_ZONES,
    feedback: IFeedbackTracker = new FeedbackTracker(),
    signals: ISignalController = new TunnelSignalSystem(),
    announcements: IAnnouncementTracker = new StationAnnouncementTracker(),
    schedule: IScheduleController = new MetroScheduleController(stations),
    incidents: IIncidentController = new MetroIncidentSystem(stations),
    traffic: ITrafficController = new OppositeTrackTrafficSystem(),
  ) {
    this.physics = physics;
    this.scoring = scoring;
    this.stations = stations;
    this.speedZones = speedZones;
    this.feedback = feedback;
    this.signals = signals;
    this.announcements = announcements;
    this.schedule = schedule;
    this.incidents = incidents;
    this.traffic = traffic;
    this.traffic.setStations?.(stations);
    this.physics.setConfig?.(this.trainModel.physics);
  }

  public setMetroLine(lineId: MetroLineId): void {
    const nextLine = getMetroLineSpec(lineId);
    this.line = nextLine;
    this.stations = nextLine.stations;
    this.speedZones = nextLine.speedZones;
    this.stationIndex = 0;
    this.signals.setDistances?.(buildSemaphoreDistances(nextLine.stations));
    this.schedule.setStations?.(nextLine.stations);
    this.incidents.setStations?.(nextLine.stations);
    this.traffic.setStations?.(nextLine.stations);
    this.announcements.reset();
  }

  public setGameMode(mode: GameModeId): void {
    this.gameMode = mode;
    this.incidents.setEnabled?.(mode === 'duty');
  }

  public triggerSandboxOncomingTrain(): void {
    if (this.gameMode !== 'sandbox') {
      return;
    }
    const progress = this.buildStationProgress();
    if (progress.distanceToTargetM <= 240 && progress.distanceToTargetM >= -25) {
      this.traffic.forceSpawnAtStation?.(progress.station, progress.stationIndex, false);
      this.feedback.push(
        `Sandbox: podstawiono skład AI przy stacji ${progress.station.name}`,
        0,
        'neutral',
      );
      return;
    }
    this.traffic.forceSpawnAhead?.(this.kinematics.positionM);
    this.feedback.push('Sandbox: wywołano mijankę na sąsiednim torze', 0, 'neutral');
  }

  public cycleSandboxNextSignal(): void {
    if (this.gameMode !== 'sandbox') {
      return;
    }
    const aspect = this.signals.cycleNextSignalAspect?.(this.kinematics.positionM);
    if (!aspect) {
      return;
    }
    const label = aspect === 'green' ? 'ZIELONY' : aspect === 'yellow' ? 'ŻÓŁTY' : 'CZERWONY';
    this.feedback.push(`Sandbox: najbliższy semafor → ${label}`, 0, 'neutral');
  }

  public setTrainModel(modelId: TrainModelId): void {
    this.trainModel = getTrainModelSpec(modelId);
    this.physics.setConfig?.(this.trainModel.physics);
  }

  public setTimeOfDay(timeOfDayId: TimeOfDayId): void {
    this.timeOfDay = getTimeOfDaySpec(timeOfDayId);
    this.timeOfDayConfigured = true;
    this.signals.setRedProbability?.(this.timeOfDay.redSignalProbability);
    this.traffic.setSpawnIntervalRange?.(
      this.timeOfDay.trafficSpawnMinSec,
      this.timeOfDay.trafficSpawnMaxSec,
    );
    this.schedule.configure?.(this.timeOfDay.startClockSec, this.timeOfDay.boardingDurationSec);
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
    this.openDoorSide = null;
    this.stationIndex = 0;
    this.boardingTimerSec = 0;
    this.boardingCompleted = false;
    this.stopAwarded = false;
    this.stationsServed = 0;
    this.stationsMissed = 0;
    this.score = 0;
    this.penaltiesCount = 0;
    this.overspeedViolations = 0;
    this.redSignalViolations = 0;
    this.czuwakViolations = 0;
    this.czuwakAcksCount = 0;
    this.doorFaultsResolvedCount = 0;
    this.bestStopErrorM = null;
    this.totalStopErrorM = 0;
    this.elapsedTimeSec = 0;
    this.overspeedCooldownSec = 0;
    this.lastJointIndex = 0;
    this.hornActive = false;
    this.atpActive = false;
    this.activeCautionLimitKmh = null;
    this.headlightsOn = true;
    this.leverTarget = 0;
    this.cameraMode = 'cab';
    this.cameraNotice = null;
    this.passengersCarried = 0;
    this.currentStationBoardedCount = 0;
    this.feedback.reset();
    this.signals.reset();
    this.announcements.reset();
    this.schedule.reset();
    this.incidents.reset();
    this.traffic.reset();
  }

  public step(input: IControlInput, dtSec: number): IAudioEvents {
    const dt = Math.max(0, Math.min(dtSec, 0.05));
    if (this.phase !== 'playing') {
      return this.idleAudioEvents();
    }
    this.elapsedTimeSec += dt;
    this.hornActive = input.hornActive;
    if (input.toggleHeadlightsPressed) {
      this.headlightsOn = !this.headlightsOn;
    }
    this.updateCameraState(Boolean(input.cycleCameraPressed), dt);
    this.feedback.tick(dt);
    const prevPosM = this.kinematics.positionM;
    const prevSpeedKmh = this.kinematics.speedKmh;
    const emergencyTriggered = this.advancePhysics(input, dt);
    this.leverTarget = this.computeLeverTarget(input);
    const atpTriggered = this.evaluateSignals(prevPosM, dt);
    const incRes = this.evaluateIncidents(Boolean(input.acknowledgeCzuwakPressed), dt);
    const trafficRes = this.traffic.step(this.kinematics.positionM, dt);
    const brakeStopHiss = this.checkBrakeStopHiss(prevSpeedKmh);
    const overspeedWarning = this.evaluateOverspeed(dt);
    const doorRes = this.handleDoorToggle(input, incRes.doorFaultResolvedClose);
    const boardingCompleteChime = this.updateBoarding(dt);
    this.checkStationOvershoot();
    const progress = this.buildStationProgress();
    this.announcements.update(
      progress.stationIndex,
      progress.station.name,
      progress.distanceToTargetM,
      this.kinematics.speedKmh,
      dt,
      getStationPlatformSide(progress.station),
    );
    return {
      hornActive: input.hornActive,
      doorToggledTo: doorRes.toggledTo,
      boardingCompleteChime,
      overspeedWarning,
      emergencyBrakeTriggered: emergencyTriggered || incRes.czuwakTimedOut,
      railJointPulse: this.checkRailJoint(),
      brakeStopHiss,
      atpTriggered: atpTriggered.violated,
      signalClearedChime: atpTriggered.cleared,
      czuwakAlertTriggered: incRes.czuwakAlertTriggered,
      czuwakAckChime: incRes.czuwakAckChime,
      doorFaultBeep: doorRes.faultBeep,
      passingTrainWhoosh: trafficRes.passingTrainWhoosh,
    };
  }

  public getSnapshot(): ISimulationSnapshot {
    const currentStation = this.buildStationProgress();
    const speedLimitKmh = this.computeEffectiveSpeedLimit();
    const posM = this.kinematics.positionM;
    const driverGrade = this.scoring.evaluateGrade({
      score: this.score,
      stationsServed: this.stationsServed,
      totalStations: this.stations.length,
      overspeedViolations: this.overspeedViolations,
      redSignalViolations: this.redSignalViolations,
      czuwakViolations: this.czuwakViolations,
    });
    const boardingDurationSec = this.getActiveBoardingDurationSec();
    const effectiveWaitingPassengers = this.getEffectiveWaitingPassengers(currentStation.station);
    return {
      phase: this.phase,
      gameMode: this.gameMode,
      line: this.line,
      stations: this.stations,
      trainModel: this.trainModel,
      timeOfDay: this.timeOfDay,
      cameraMode: this.cameraMode,
      cameraNotice: this.cameraNotice,
      oncomingTrain: this.traffic.getState(),
      kinematics: this.kinematics,
      speedLimitKmh,
      isOverspeeding: this.kinematics.speedKmh > speedLimitKmh + OVERSPEED_TOLERANCE_KMH,
      doorState: this.doorState,
      openDoorSide: this.openDoorSide,
      canToggleDoors: this.canToggleDoorsNow(currentStation),
      boardingTimerSec: this.boardingTimerSec,
      boardingDurationSec,
      boardingProgress: Math.min(1, this.boardingTimerSec / boardingDurationSec),
      boardingCompletedForCurrent: this.boardingCompleted,
      currentStation,
      signals: this.signals.getSignals(),
      nextSignal: this.buildNextSignalProgress(),
      atpActive: this.atpActive,
      headlightsOn: this.headlightsOn,
      leverTarget: this.leverTarget,
      passengersCarried: this.passengersCarried,
      currentStationBoardedCount: this.currentStationBoardedCount,
      effectiveWaitingPassengers,
      announcement: this.announcements.getCurrent(),
      schedule: this.schedule.getSnapshot(this.stationIndex, posM, this.elapsedTimeSec),
      trackworkZones: this.incidents.getTrackworkZones(),
      activeTrackworkZone: this.incidents.getActiveTrackworkZone(posM),
      upcomingTrackworkDistanceM: this.incidents.getUpcomingTrackworkDistance(posM),
      doorFault: this.incidents.getDoorFaultState(),
      czuwak: this.incidents.getCzuwakState(),
      totalStations: this.stations.length,
      stationsServed: this.stationsServed,
      stationsMissed: this.stationsMissed,
      score: this.score,
      penaltiesCount: this.penaltiesCount,
      overspeedViolations: this.overspeedViolations,
      redSignalViolations: this.redSignalViolations,
      czuwakViolations: this.czuwakViolations,
      czuwakAcksCount: this.czuwakAcksCount,
      doorFaultsResolvedCount: this.doorFaultsResolvedCount,
      bestStopErrorM: this.bestStopErrorM,
      driverGrade,
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
      if (this.gameMode === 'sandbox') {
        this.feedback.push('Sandbox: minięto czerwony semafor (bez kary)', 0, 'neutral');
      } else {
        this.atpActive = true;
        this.redSignalViolations += 1;
        this.kinematics = { ...this.kinematics, emergencyBrake: true, throttle: 0 };
        this.applyPenalty(
          this.scoring.getRedSignalPenalty(),
          'ATP: Przejechano czerwone światło! Hamulec bezpieczeństwa',
          'danger',
        );
      }
    }
    if (res.clearedToGreen) {
      this.feedback.push('Semafor zielony — droga wolna', 0, 'success');
    }
    return {
      violated: this.gameMode === 'duty' && res.redSignalViolated,
      cleared: res.clearedToGreen,
    };
  }

  private evaluateIncidents(ackCzuwakPressed: boolean, dt: number) {
    const res = this.incidents.step(
      this.kinematics.positionM,
      this.kinematics.speedKmh,
      this.doorState === 'open',
      ackCzuwakPressed,
      dt,
    );
    if (res.enteredTrackworkWarning) {
      this.feedback.push(
        `Roboty torowe – max ${res.enteredTrackworkWarning.limitKmh} km/h (200 m)`,
        0,
        'warning',
      );
    }
    if (res.czuwakAckChime) {
      this.czuwakAcksCount += 1;
      this.feedback.push('Czuwak potwierdzony', 0, 'success');
    }
    if (res.doorFaultResolvedClose) {
      this.doorFaultsResolvedCount += 1;
    }
    if (res.czuwakTimedOut) {
      this.czuwakViolations += 1;
      this.kinematics = { ...this.kinematics, emergencyBrake: true, throttle: 0 };
      this.applyPenalty(
        this.scoring.getCzuwakPenalty(),
        'CZUWAK: Brak reakcji [C]! Hamulec awaryjny',
        'danger',
      );
    }
    return res;
  }

  private checkBrakeStopHiss(prevSpeedKmh: number): boolean {
    const braking = this.kinematics.serviceBrake > 0.08 || this.kinematics.emergencyBrake;
    return braking && prevSpeedKmh > 0.5 && this.kinematics.speedKmh <= 0.01;
  }

  private computeEffectiveSpeedLimit(): number {
    let limit = getSpeedLimitAt(this.kinematics.positionM, this.speedZones);
    if (this.activeCautionLimitKmh !== null) {
      limit = Math.min(limit, this.activeCautionLimitKmh);
    }
    const trackwork = this.incidents.getActiveTrackworkZone(this.kinematics.positionM);
    if (trackwork !== null) {
      limit = Math.min(limit, trackwork.limitKmh);
    }
    return limit;
  }

  private handleDoorToggle(
    input: IControlInput,
    faultResetFinished: boolean,
  ): { toggledTo: DoorState | null; faultBeep: boolean } {
    if (faultResetFinished && this.doorState === 'open') {
      return { toggledTo: this.completeDoorClose(), faultBeep: false };
    }
    const leftPressed = Boolean(input.toggleDoorsLeftPressed);
    const rightPressed = Boolean(input.toggleDoorsRightPressed);
    const autoPressed = Boolean(input.toggleDoorsPressed);
    if (!leftPressed && !rightPressed && !autoPressed) {
      return { toggledTo: null, faultBeep: false };
    }

    const progress = this.buildStationProgress();
    const expectedSide = getStationPlatformSide(progress.station);
    if (autoPressed && !leftPressed && !rightPressed && this.gameMode === 'duty') {
      const expectedKey = expectedSide === 'left' ? 'Q' : 'E';
      const expectedLabel = expectedSide === 'left' ? 'LEWEJ' : 'PRAWEJ';
      this.feedback.push(
        `Użyj [Q] (Lewe) lub [E] (Prawe) — peron po ${expectedLabel} [${expectedKey}]`,
        0,
        'warning',
      );
      return { toggledTo: null, faultBeep: false };
    }

    const requestedSide: DoorSide = leftPressed
      ? 'left'
      : rightPressed
        ? 'right'
        : this.openDoorSide ?? expectedSide;

    if (!this.canToggleDoorsNow(progress)) {
      return { toggledTo: null, faultBeep: false };
    }

    if (this.doorState === 'closed') {
      if (requestedSide !== expectedSide) {
        const sideLabel = expectedSide === 'left' ? 'LEWEJ [Q]' : 'PRAWEJ [E]';
        const penalty = this.scoring.getWrongDoorSidePenalty?.() ?? -25;
        if (this.gameMode === 'sandbox') {
          this.feedback.push(
            `Blokada bezpieczeństwa: tor po tej stronie! Peron po ${sideLabel}`,
            0,
            'warning',
          );
        } else {
          this.applyPenalty(
            penalty,
            `Blokada drzwi! Peron po ${sideLabel} — strona torów zablokowana`,
            'danger',
          );
        }
        return { toggledTo: null, faultBeep: true };
      }
      this.doorState = 'open';
      this.openDoorSide = requestedSide;
      this.awardStationStop(progress);
      return { toggledTo: 'open', faultBeep: false };
    }

    if (this.openDoorSide && requestedSide !== this.openDoorSide) {
      const openKey = this.openDoorSide === 'left' ? 'Q' : 'E';
      const openLabel = this.openDoorSide === 'left' ? 'LEWEJ' : 'PRAWEJ';
      this.feedback.push(`Drzwi otwarte po ${openLabel} — zamknij [${openKey}]`, 0, 'warning');
      return { toggledTo: null, faultBeep: false };
    }

    if (this.boardingCompleted) {
      const attempt = this.incidents.attemptDoorClose(this.stationIndex);
      const closeKey = this.openDoorSide === 'right' ? 'E' : 'Q';
      if (attempt.faultTriggered) {
        this.feedback.push(`Awaria drzwi – powtórz zamykanie [${closeKey}]`, 0, 'warning');
        return { toggledTo: null, faultBeep: true };
      }
      if (attempt.retryStarted) {
        this.feedback.push('Ponowne zamykanie drzwi — oczekiwanie 3 s', 0, 'neutral');
        return { toggledTo: null, faultBeep: false };
      }
      if (!attempt.allowedToCloseNow) {
        return { toggledTo: null, faultBeep: false };
      }
    }
    return { toggledTo: this.completeDoorClose(), faultBeep: false };
  }

  private completeDoorClose(): DoorState {
    this.doorState = 'closed';
    this.openDoorSide = null;
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
    const absOffset = Math.abs(evaluation.offsetM);
    this.bestStopErrorM =
      this.bestStopErrorM === null ? absOffset : Math.min(this.bestStopErrorM, absOffset);
    this.totalStopErrorM += absOffset;
    if (this.gameMode === 'sandbox') {
      this.feedback.push(`${evaluation.label} · Wolna jazda`, 0, evaluation.tone);
      return;
    }
    const deviationSec = this.schedule.recordStationArrival(
      progress.stationIndex,
      this.elapsedTimeSec,
    );
    const punctuality = this.scoring.evaluatePunctuality(deviationSec);
    const combinedPoints = evaluation.points + punctuality.points;
    this.score += combinedPoints;
    const summaryLabel =
      punctuality.points !== 0
        ? `${evaluation.label} · ${punctuality.label}`
        : evaluation.label;
    this.feedback.push(summaryLabel, combinedPoints, punctuality.points < 0 ? 'warning' : evaluation.tone);
  }

  private updateBoarding(dt: number): boolean {
    if (this.doorState !== 'open' || this.boardingCompleted) {
      return false;
    }
    const station = this.stations[this.stationIndex];
    const waiting = station ? this.getEffectiveWaitingPassengers(station) : 0;
    const durationSec = this.getActiveBoardingDurationSec();
    this.boardingTimerSec = Math.min(durationSec, this.boardingTimerSec + dt);
    const progress = this.boardingTimerSec / durationSec;
    const targetBoarded = Math.min(waiting, Math.floor(progress * waiting + 0.0001));
    if (targetBoarded > this.currentStationBoardedCount) {
      this.passengersCarried += targetBoarded - this.currentStationBoardedCount;
      this.currentStationBoardedCount = targetBoarded;
    }
    if (this.boardingTimerSec >= durationSec) {
      if (waiting > this.currentStationBoardedCount) {
        this.passengersCarried += waiting - this.currentStationBoardedCount;
        this.currentStationBoardedCount = waiting;
      }
      this.boardingCompleted = true;
      const closeKey = this.openDoorSide === 'right' ? 'E' : 'Q';
      this.feedback.push(`Wymiana pasażerów zakończona — zamknij drzwi [${closeKey}]`, 0, 'success');
      return true;
    }
    return false;
  }

  private getActiveBoardingDurationSec(): number {
    return this.timeOfDayConfigured ? this.timeOfDay.boardingDurationSec : BOARDING_DURATION_SEC;
  }

  private getEffectiveWaitingPassengers(station: IStationSpec): number {
    if (!this.timeOfDayConfigured) {
      return station.waitingPassengers;
    }
    return computeEffectivePassengers(station.waitingPassengers, this.timeOfDay.passengerMultiplier);
  }

  private computeLeverTarget(input: IControlInput): number {
    if (this.kinematics.emergencyBrake) {
      return -1;
    }
    if (this.kinematics.serviceBrake > 0.01) {
      return -this.kinematics.serviceBrake;
    }
    if (this.kinematics.throttle > 0.01) {
      return this.kinematics.throttle;
    }
    return input.throttleDown ? -0.35 : 0;
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
    this.currentStationBoardedCount = 0;
    if (this.stationIndex + 1 >= this.stations.length) {
      this.phase = 'gameover';
      return;
    }
    this.stationIndex += 1;
  }

  private evaluateOverspeed(dt: number): boolean {
    if (this.gameMode === 'sandbox') {
      return false;
    }
    const limit = this.computeEffectiveSpeedLimit();
    if (this.kinematics.speedKmh <= limit + OVERSPEED_TOLERANCE_KMH) {
      this.overspeedCooldownSec = Math.max(0, this.overspeedCooldownSec - dt);
      return false;
    }
    this.overspeedCooldownSec -= dt;
    if (this.overspeedCooldownSec <= 0) {
      this.overspeedCooldownSec = OVERSPEED_INTERVAL_SEC;
      this.overspeedViolations += 1;
      this.applyPenalty(this.scoring.getOverspeedPenalty(), `Przekroczenie limitu (${limit} km/h)`, 'danger');
      return true;
    }
    return false;
  }

  private applyPenalty(points: number, text: string, tone: FeedbackTone): void {
    if (this.gameMode === 'sandbox') {
      return;
    }
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

  private updateCameraState(cyclePressed: boolean, dt: number): void {
    if (this.cameraNotice) {
      const rem = this.cameraNotice.remainingSec - dt;
      this.cameraNotice = rem <= 0 ? null : { ...this.cameraNotice, remainingSec: rem };
    }
    if (cyclePressed) {
      this.cameraMode = getNextCameraMode(this.cameraMode);
      this.cameraNotice = {
        id: this.cameraNoticeId,
        label: CAMERA_MODE_LABELS[this.cameraMode],
        remainingSec: 2.5,
      };
      this.cameraNoticeId += 1;
    }
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
      czuwakAlertTriggered: false,
      czuwakAckChime: false,
      doorFaultBeep: false,
      passingTrainWhoosh: false,
    };
  }
}
