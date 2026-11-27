import {
  ACADEMY_LINE_SPEC,
  ACADEMY_SEMAPHORE_SPECS,
  AcademyController,
  type IAcademyController,
} from './academySystem';
import {
  StationAnnouncementTracker,
  type IAnnouncementTracker,
} from './announcementTracker';
import {
  canEnableAtoForMode,
  MetroAtoController,
  type IAtoContext,
  type IAtoController,
} from './atoSystem';
import { evaluateChallengeOutcome, getChallengeSpec } from './challengeCatalog';
import { FeedbackTracker, type IFeedbackTracker } from './feedbackTracker';
import { MetroIncidentSystem, type IIncidentController } from './incidentSystem';
import { DispatcherRadioSystem, type IRadioController } from './radioSystem';
import { TachographRecorder, type ITachographRecorder } from './tachographSystem';
import { MetroWeatherSystem, type IWeatherController } from './weatherSystem';
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
import { getLineTrackAlignment, type TrackAlignment } from './trackAlignment';
import { getStationPlatformSide } from './trackGeometry';
import {
  CAMERA_MODE_LABELS,
  getNextCameraMode,
  getTrainModelSpec,
} from './trainCatalog';
import { createInitialKinematics } from './trainPhysics';
import type {
  AtoStatus,
  CameraMode,
  ChallengeId,
  DoorSide,
  DoorState,
  FeedbackTone,
  GameModeId,
  GamePhase,
  IAudioEvents,
  ICameraNotice,
  IChallengeOutcome,
  IChallengeSpec,
  IControlInput,
  IGhostStationSplit,
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
  WeatherModeId,
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
  private readonly radio: IRadioController;
  private readonly weather: IWeatherController;
  private readonly academy: IAcademyController;
  private readonly tachograph: ITachographRecorder;
  private readonly ato: IAtoController;
  private line: IMetroLineSpec = METRO_LINE_M1;
  private stations: readonly IStationSpec[];
  private speedZones: readonly ISpeedLimitZone[];
  private alignment: TrackAlignment;

  private phase: GamePhase = 'title';
  private gameMode: GameModeId = 'duty';
  private atoEnabled = false;
  private atoStatus: AtoStatus = 'off';
  private challengeId: ChallengeId = 'inverter_fault';
  private challengeOutcome: IChallengeOutcome | null = null;
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
  private stationSplits: IGhostStationSplit[] = [];

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
    radio: IRadioController = new DispatcherRadioSystem(stations),
    weather: IWeatherController = new MetroWeatherSystem(),
    academy: IAcademyController = new AcademyController(),
    tachograph: ITachographRecorder = new TachographRecorder(),
    ato: IAtoController = new MetroAtoController(),
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
    this.radio = radio;
    this.weather = weather;
    this.academy = academy;
    this.tachograph = tachograph;
    this.ato = ato;
    this.traffic.setStations?.(stations);
    this.alignment = getLineTrackAlignment(this.line.id, stations);
    this.physics.setConfig?.(this.trainModel.physics);
  }

  public setMetroLine(lineId: MetroLineId): void {
    this.setMetroLineSpec(getMetroLineSpec(lineId));
  }

  public setMetroLineSpec(nextLine: IMetroLineSpec): void {
    this.line = nextLine;
    this.stations = nextLine.stations;
    this.speedZones = nextLine.speedZones;
    this.alignment = getLineTrackAlignment(nextLine.id, nextLine.stations, {
      hasSurfaceStart: nextLine.hasSurfaceStart,
      tunnelPortalDistanceM: nextLine.tunnelPortalDistanceM,
      alignmentIntensity: nextLine.alignmentIntensity,
    });
    this.stationIndex = 0;
    this.signals.setDistances?.(buildSemaphoreDistances(nextLine.stations));
    this.schedule.setStations?.(nextLine.stations);
    this.incidents.setStations?.(nextLine.stations);
    this.traffic.setStations?.(nextLine.stations);
    this.radio.setStations(nextLine.stations);
    this.announcements.reset();
    this.applyActiveModeOverrides();
  }

  public setGameMode(mode: GameModeId): void {
    this.gameMode = mode;
    if (!canEnableAtoForMode(mode)) {
      this.atoEnabled = false;
      this.atoStatus = 'off';
    } else if (mode === 'passenger') {
      this.atoEnabled = true;
      this.cameraMode = 'interior';
      this.ato.reset();
    }
    if (mode === 'academy' && this.line.id !== ACADEMY_LINE_SPEC.id) {
      this.setMetroLineSpec(ACADEMY_LINE_SPEC);
      return;
    }
    this.applyActiveModeOverrides();
  }

  public toggleAto(): boolean {
    if (!canEnableAtoForMode(this.gameMode)) {
      this.feedback.push('ATO dostępne tylko w Sandbox / trybie Pasażera', 0, 'warning');
      return false;
    }
    this.atoEnabled = !this.atoEnabled;
    if (this.atoEnabled) {
      this.ato.reset();
      this.feedback.push('Autopilot ATO aktywny — automatyczne prowadzenie pociągu', 0, 'success');
    } else {
      this.atoStatus = 'off';
      this.feedback.push('Autopilot ATO wyłączony — przejęto sterowanie ręczne', 0, 'neutral');
    }
    return this.atoEnabled;
  }

  public setChallenge(challengeId: ChallengeId): void {
    this.challengeId = challengeId;
    if (this.gameMode === 'challenge') {
      this.applyActiveModeOverrides();
    }
  }

  public setWeatherMode(mode: WeatherModeId): void {
    this.weather.setMode(mode);
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
    this.applyActiveModeOverrides();
  }

  public start(): void {
    if (this.phase === 'gameover') {
      this.reset();
    }
    if (this.gameMode === 'academy') {
      this.headlightsOn = false;
      this.academy.reset();
    }
    if (this.gameMode === 'passenger') {
      this.cameraMode = 'interior';
      this.atoEnabled = true;
      this.ato.reset();
    } else if (!canEnableAtoForMode(this.gameMode)) {
      this.atoEnabled = false;
      this.atoStatus = 'off';
    }
    this.challengeOutcome = null;
    this.applyActiveModeOverrides();
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
    this.headlightsOn = this.gameMode !== 'academy';
    this.leverTarget = 0;
    this.cameraMode = this.gameMode === 'passenger' ? 'interior' : 'cab';
    this.atoEnabled = this.gameMode === 'passenger';
    this.atoStatus = 'off';
    this.cameraNotice = null;
    this.passengersCarried = 0;
    this.currentStationBoardedCount = 0;
    this.stationSplits = [];
    this.challengeOutcome = null;
    this.feedback.reset();
    this.signals.reset();
    this.announcements.reset();
    this.schedule.reset();
    this.incidents.reset();
    this.traffic.reset();
    this.radio.reset();
    this.weather.reset();
    this.academy.reset();
    this.tachograph.reset();
    this.ato.reset();
    this.applyActiveModeOverrides();
  }

  public step(input: IControlInput, dtSec: number): IAudioEvents {
    const dt = Math.max(0, Math.min(dtSec, 0.05));
    if (this.phase !== 'playing') {
      return this.idleAudioEvents();
    }
    this.elapsedTimeSec += dt;
    if (input.toggleAtoPressed) {
      this.toggleAto();
    }
    const effectiveInput = this.resolveEffectiveInput(input);
    this.hornActive = effectiveInput.hornActive;
    if (effectiveInput.toggleHeadlightsPressed) {
      this.headlightsOn = !this.headlightsOn;
    }
    this.updateCameraState(Boolean(effectiveInput.cycleCameraPressed), dt);
    this.feedback.tick(dt);
    const prevPosM = this.kinematics.positionM;
    const prevSpeedKmh = this.kinematics.speedKmh;
    const preSample = this.alignment.sample(prevPosM);
    const weatherRes = this.weather.step(
      this.alignment.hasSurfaceStart,
      prevPosM,
      preSample.outdoorBlend,
      prevSpeedKmh,
      this.kinematics.serviceBrake,
      this.kinematics.emergencyBrake,
      Boolean(effectiveInput.toggleWipersPressed),
      dt,
    );
    const emergencyTriggered = this.advancePhysics(effectiveInput, dt, weatherRes.brakeGripMultiplier);
    this.leverTarget = this.computeLeverTarget(effectiveInput);
    const atpTriggered = this.evaluateSignals(prevPosM, dt);
    const incRes = this.evaluateIncidents(Boolean(effectiveInput.acknowledgeCzuwakPressed), dt);
    const radioRes = this.evaluateRadio(Boolean(effectiveInput.acknowledgeRadioPressed), dt);
    const trafficRes = this.traffic.step(this.kinematics.positionM, dt);
    const brakeStopHiss = this.checkBrakeStopHiss(prevSpeedKmh);
    const overspeedWarning = this.evaluateOverspeed(dt);
    const prevStationsServed = this.stationsServed;
    const doorRes = this.handleDoorToggle(effectiveInput, incRes.doorFaultResolvedClose);
    const stationServedNow = this.stationsServed > prevStationsServed;
    const boardingCompleteChime = this.updateBoarding(dt);
    this.checkStationOvershoot();
    const progress = this.buildStationProgress();
    const activeChallenge = this.getActiveChallenge();
    if (!activeChallenge?.skipStations) {
      this.announcements.update(
        progress.stationIndex,
        progress.station.name,
        progress.distanceToTargetM,
        this.kinematics.speedKmh,
        dt,
        getStationPlatformSide(progress.station),
      );
    }

    let czuwakAlertTriggered = incRes.czuwakAlertTriggered;
    let radioDispatchTriggered = radioRes.dispatchTriggered;
    let academyStepCompleted = false;
    if (this.gameMode === 'academy') {
      const academyRes = this.academy.step({
        positionM: this.kinematics.positionM,
        speedKmh: this.kinematics.speedKmh,
        headlightsOn: this.headlightsOn,
        hornActive: this.hornActive,
        redSignalClearedNow: atpTriggered.cleared,
        czuwakActive: this.incidents.getCzuwakState().active,
        czuwakAcknowledgedNow: incRes.czuwakAckChime,
        radioActive: this.radio.getState().active,
        radioAcknowledgedNow: radioRes.acknowledgedNow,
        inStopZone: progress.inStopZone,
        expectedPlatformSide: getStationPlatformSide(progress.station),
        doorState: this.doorState,
        boardingCompleted: this.boardingCompleted,
        stationServedNow,
        dtSec: dt,
      });
      if (academyRes.requestTriggerCzuwak) {
        czuwakAlertTriggered =
          czuwakAlertTriggered || (this.incidents.forceTriggerCzuwak?.(15) ?? false);
      }
      if (academyRes.requestTriggerRadio) {
        radioDispatchTriggered =
          radioDispatchTriggered ||
          (this.radio.forceTriggerDispatch?.(
            'Dyspozytor Akademii: Próba łączności radiowej. Potwierdź odbiór przyciskiem [R].',
            18,
          ) ?? false);
      }
      if (academyRes.stepCompletedNow) {
        academyStepCompleted = true;
        this.score += 50;
        const stepLabel = academyRes.academyFinishedNow
          ? 'Akademia ukończona! Przyznano Licencję Maszynisty'
          : `Akademia: Krok ${academyRes.completedStepNumber}/5 zaliczony!`;
        this.feedback.push(stepLabel, 50, 'success');
      }
      if (academyRes.academyFinishedNow) {
        this.tachograph.recordFinalSample(
          this.elapsedTimeSec,
          this.kinematics.positionM,
          this.kinematics.speedKmh,
          this.computeEffectiveSpeedLimit(),
        );
        this.phase = 'gameover';
      }
    }

    this.tachograph.recordStep(
      this.elapsedTimeSec,
      this.kinematics.positionM,
      this.kinematics.speedKmh,
      this.computeEffectiveSpeedLimit(),
    );

    return {
      hornActive: input.hornActive,
      doorToggledTo: doorRes.toggledTo,
      boardingCompleteChime,
      overspeedWarning,
      emergencyBrakeTriggered: emergencyTriggered || (this.gameMode !== 'academy' && incRes.czuwakTimedOut),
      railJointPulse: this.checkRailJoint(),
      brakeStopHiss,
      atpTriggered: atpTriggered.violated,
      signalClearedChime: atpTriggered.cleared,
      czuwakAlertTriggered,
      czuwakAckChime: incRes.czuwakAckChime,
      doorFaultBeep: doorRes.faultBeep,
      passingTrainWhoosh: trafficRes.passingTrainWhoosh,
      radioDispatchTriggered,
      radioAckChime: radioRes.acknowledgedNow,
      wiperSweepTick: weatherRes.wiperSweepTick,
      academyStepCompleted,
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
    const trackSample = this.alignment.sample(posM);
    const activeCurveLimit = this.alignment.getCurveSpeedLimitAt(posM);
    const upcomingCurve = this.alignment.getUpcomingCurveLimit(posM, 130);
    const activeChallenge = this.getActiveChallenge();
    return {
      phase: this.phase,
      gameMode: this.gameMode,
      atoEnabled: this.atoEnabled,
      atoStatus: this.atoEnabled ? this.atoStatus : 'off',
      challenge: activeChallenge,
      challengeOutcome: this.challengeOutcome,
      academy:
        this.gameMode === 'academy'
          ? this.academy.getSnapshot(
              currentStation.inStopZone,
              getStationPlatformSide(currentStation.station),
              this.doorState,
            )
          : null,
      line: this.line,
      stations: this.stations,
      trainModel: this.trainModel,
      timeOfDay: this.timeOfDay,
      cameraMode: this.cameraMode,
      cameraNotice: this.cameraNotice,
      oncomingTrain: this.traffic.getState(),
      kinematics: this.kinematics,
      trackProfile: {
        gradePercent: trackSample.gradePercent,
        elevationM: trackSample.y,
        curvatureRadPerM: trackSample.curvatureRadPerM,
        cantRollRad: trackSample.cantRollRad,
        turnoutSwayFactor: trackSample.turnoutSwayFactor,
        outdoorBlend: trackSample.outdoorBlend,
        inCurveLimitZone: activeCurveLimit !== null,
        upcomingCurveLimitKmh: upcomingCurve?.limitKmh ?? null,
        upcomingCurveDistanceM: upcomingCurve?.distanceAheadM ?? null,
      },
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
      radio: this.radio.getState(),
      weather: this.weather.getState(),
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
      tachograph: this.tachograph.getSnapshot(),
      stationSplits: this.stationSplits.slice(),
    };
  }

  private getActiveChallenge(): IChallengeSpec | null {
    return this.gameMode === 'challenge' ? getChallengeSpec(this.challengeId) : null;
  }

  private applyActiveModeOverrides(): void {
    if (this.gameMode === 'academy') {
      this.signals.configureScriptedSignals?.(ACADEMY_SEMAPHORE_SPECS);
      this.traffic.setSpawnIntervalRange?.(22, 36);
      this.schedule.configure?.(this.timeOfDay.startClockSec, 3.0);
      this.incidents.setEnabled?.(true);
      this.incidents.configureOverrides?.({
        doorFaultProbability: 0,
        czuwakMinSec: 9999,
        czuwakMaxSec: 9999,
        disableTrackwork: true,
      });
      this.radio.setEnabled(true);
      this.radio.setAutoTrigger?.(false);
      return;
    }
    const challenge = this.getActiveChallenge();
    if (challenge?.forceTimeOfDay && this.timeOfDay.id !== challenge.forceTimeOfDay) {
      this.timeOfDay = getTimeOfDaySpec(challenge.forceTimeOfDay);
      this.timeOfDayConfigured = true;
    }
    const redProb = challenge?.redSignalProbability ?? this.timeOfDay.redSignalProbability;
    this.signals.setRedProbability?.(redProb);
    this.traffic.setSpawnIntervalRange?.(
      this.timeOfDay.trafficSpawnMinSec,
      this.timeOfDay.trafficSpawnMaxSec,
    );
    this.schedule.configure?.(this.timeOfDay.startClockSec, this.timeOfDay.boardingDurationSec);
    this.incidents.setEnabled?.(this.gameMode !== 'sandbox');
    this.incidents.configureOverrides?.({
      doorFaultProbability: challenge?.doorFaultProbability ?? null,
      czuwakMinSec: challenge?.czuwakMinSec ?? null,
      czuwakMaxSec: challenge?.czuwakMaxSec ?? null,
      disableTrackwork: false,
    });
    this.radio.setEnabled(true);
    this.radio.setAutoTrigger?.(true);
  }

  private isFreeRideMode(): boolean {
    return this.gameMode === 'sandbox' || this.gameMode === 'passenger';
  }

  private resolveEffectiveInput(input: IControlInput): IControlInput {
    if (!this.atoEnabled || !canEnableAtoForMode(this.gameMode)) {
      this.atoStatus = 'off';
      return input;
    }
    const posM = this.kinematics.positionM;
    const progress = this.buildStationProgress();
    const trackSample = this.alignment.sample(posM);
    const upcomingCurve = this.alignment.getUpcomingCurveLimit(posM, 180);
    const weatherState = this.weather.getState();
    const atoCtx: IAtoContext = {
      speedKmh: this.kinematics.speedKmh,
      speedLimitKmh: this.computeEffectiveSpeedLimit(),
      gradePercent: trackSample.gradePercent,
      nextSignal: this.buildNextSignalProgress(),
      upcomingCurveLimitKmh: upcomingCurve?.limitKmh ?? null,
      upcomingCurveDistanceM: upcomingCurve?.distanceAheadM ?? null,
      upcomingTrackworkDistanceM: this.incidents.getUpcomingTrackworkDistance(posM),
      activeTrackworkZone: this.incidents.getActiveTrackworkZone(posM),
      currentStation: progress,
      expectedPlatformSide: getStationPlatformSide(progress.station),
      doorState: this.doorState,
      openDoorSide: this.openDoorSide,
      canToggleDoors: this.canToggleDoorsNow(progress),
      boardingCompletedForCurrent: this.boardingCompleted,
      doorFaultPhase: this.incidents.getDoorFaultState().phase,
      czuwakActive: this.incidents.getCzuwakState().active,
      radioActive: this.radio.getState().active,
      headlightsOn: this.headlightsOn,
      rainIntensity: weatherState.rainIntensity,
      wipersOn: weatherState.wipersOn,
      skipStations: Boolean(this.getActiveChallenge()?.skipStations),
      isEveningOrTunnel: this.timeOfDay.id === 'evening' || trackSample.outdoorBlend < 0.35,
    };
    const cmd = this.ato.computeControl(atoCtx);
    this.atoStatus = cmd.status;
    return {
      throttleUp: false,
      throttleDown: false,
      serviceBrake: false,
      manualLeverAxis: cmd.leverAxis,
      emergencyBrakePressed: input.emergencyBrakePressed,
      toggleDoorsPressed: false,
      toggleDoorsLeftPressed: Boolean(input.toggleDoorsLeftPressed) || cmd.toggleDoorsLeft,
      toggleDoorsRightPressed: Boolean(input.toggleDoorsRightPressed) || cmd.toggleDoorsRight,
      toggleHeadlightsPressed: Boolean(input.toggleHeadlightsPressed) || cmd.toggleHeadlights,
      toggleWipersPressed: Boolean(input.toggleWipersPressed) || cmd.toggleWipers,
      acknowledgeCzuwakPressed: Boolean(input.acknowledgeCzuwakPressed) || cmd.acknowledgeCzuwak,
      acknowledgeRadioPressed: Boolean(input.acknowledgeRadioPressed) || cmd.acknowledgeRadio,
      cycleCameraPressed: input.cycleCameraPressed,
      hornActive: input.hornActive,
    };
  }

  private evaluateRadio(ackRadioPressed: boolean, dt: number) {
    const res = this.radio.step(
      this.stationIndex,
      this.kinematics.positionM,
      this.kinematics.speedKmh,
      ackRadioPressed,
      dt,
    );
    if (res.acknowledgedNow) {
      const pts = this.isFreeRideMode() ? 0 : res.bonusPoints;
      this.score += pts;
      this.feedback.push(res.feedbackText ?? 'Radio potwierdzone', pts, 'success');
    } else if (res.expiredNow && res.feedbackText) {
      this.feedback.push(res.feedbackText, 0, 'warning');
    }
    return res;
  }

  private advancePhysics(input: IControlInput, dt: number, weatherGripMultiplier: number): boolean {
    const prevEmergency = this.kinematics.emergencyBrake;
    const effectiveInput: IControlInput = this.atpActive
      ? { ...input, forceEmergencyBrake: true }
      : input;
    const gradeFraction = this.alignment.sample(this.kinematics.positionM).gradeFraction;
    const challenge = this.getActiveChallenge();
    const tractionMultiplier = challenge ? challenge.tractionMultiplier : 1.0;
    const radioGrip = this.radio.getState().slipperyRailsActive ? 0.82 : 1.0;
    const brakeGripMultiplier = Math.min(radioGrip, weatherGripMultiplier);
    this.kinematics = this.physics.step(
      this.kinematics,
      effectiveInput,
      this.doorState === 'open',
      dt,
      gradeFraction,
      tractionMultiplier,
      brakeGripMultiplier,
    );
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
      if (this.isFreeRideMode()) {
        this.feedback.push('Sandbox: minięto czerwony semafor (bez kary)', 0, 'neutral');
      } else if (this.gameMode === 'academy') {
        this.atpActive = true;
        this.kinematics = { ...this.kinematics, emergencyBrake: true, throttle: 0 };
        this.signals.configureScriptedSignals?.([
          { distanceM: Math.round(this.kinematics.positionM + 115), aspect: 'red', waitSec: 3.0 },
        ]);
        this.feedback.push(
          'Akademia: Minięto czerwony semafor! Zatrzymaj się przed kolejnym światłem.',
          0,
          'warning',
        );
      } else {
        this.atpActive = true;
        this.redSignalViolations += 1;
        this.tachograph.recordViolation(
          this.elapsedTimeSec,
          this.kinematics.positionM,
          this.kinematics.speedKmh,
          'red_signal',
        );
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
      violated: !this.isFreeRideMode() && res.redSignalViolated,
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
      if (this.gameMode === 'academy') {
        this.feedback.push('Akademia: Czas czuwaka minął — spróbuj ponownie [C]', 0, 'warning');
      } else {
        this.czuwakViolations += 1;
        this.tachograph.recordViolation(
          this.elapsedTimeSec,
          this.kinematics.positionM,
          this.kinematics.speedKmh,
          'czuwak',
        );
        this.kinematics = { ...this.kinematics, emergencyBrake: true, throttle: 0 };
        this.applyPenalty(
          this.scoring.getCzuwakPenalty(),
          'CZUWAK: Brak reakcji [C]! Hamulec awaryjny',
          'danger',
        );
      }
    }
    return res;
  }

  private checkBrakeStopHiss(prevSpeedKmh: number): boolean {
    const braking = this.kinematics.serviceBrake > 0.08 || this.kinematics.emergencyBrake;
    return braking && prevSpeedKmh > 0.5 && this.kinematics.speedKmh <= 0.01;
  }

  private computeEffectiveSpeedLimit(): number {
    const posM = this.kinematics.positionM;
    let limit = getSpeedLimitAt(posM, this.speedZones);
    const curveLimit = this.alignment.getCurveSpeedLimitAt(posM);
    if (curveLimit !== null) {
      limit = Math.min(limit, curveLimit);
    }
    const challenge = this.getActiveChallenge();
    if (challenge?.stationPassLimitKmh != null) {
      for (let i = 0; i < this.stations.length; i += 1) {
        const st = this.stations[i];
        if (posM >= st.distanceM - 108 && posM <= st.distanceM + 26) {
          limit = Math.min(limit, challenge.stationPassLimitKmh);
          break;
        }
      }
    }
    if (this.activeCautionLimitKmh !== null) {
      limit = Math.min(limit, this.activeCautionLimitKmh);
    }
    const trackwork = this.incidents.getActiveTrackworkZone(posM);
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
    if (autoPressed && !leftPressed && !rightPressed && this.gameMode !== 'sandbox') {
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
      this.recordCurrentStationTelemetry();
      this.advanceToNextStation();
    }
    return 'closed';
  }

  private recordCurrentStationTelemetry(): void {
    const station = this.stations[this.stationIndex];
    if (!station) {
      return;
    }
    this.tachograph.recordStationStop(
      this.elapsedTimeSec,
      this.kinematics.positionM,
      station.code,
      station.name,
    );
    this.stationSplits.push({
      stationIndex: this.stationIndex,
      stationCode: station.code,
      elapsedTimeSec: Number(this.elapsedTimeSec.toFixed(1)),
      score: Math.round(this.score),
    });
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
    if (this.isFreeRideMode()) {
      const modeTag = this.gameMode === 'passenger' ? 'Przejazd ATO' : 'Wolna jazda';
      this.feedback.push(`${evaluation.label} · ${modeTag}`, 0, evaluation.tone);
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
    if (this.gameMode === 'academy') {
      return 3.0;
    }
    return this.timeOfDayConfigured ? this.timeOfDay.boardingDurationSec : BOARDING_DURATION_SEC;
  }

  private getEffectiveWaitingPassengers(station: IStationSpec): number {
    if (this.getActiveChallenge()?.skipStations) {
      return 0;
    }
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
    const activeChallenge = this.getActiveChallenge();
    if (activeChallenge?.skipStations) {
      if (this.kinematics.positionM >= station.distanceM + 18) {
        this.stationsServed += 1;
        this.score += 100;
        this.recordCurrentStationTelemetry();
        this.feedback.push(`Przejazd techniczny przez stację ${station.name}`, 100, 'success');
        this.advanceToNextStation();
      }
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
      const challenge = this.getActiveChallenge();
      if (challenge) {
        const sched = this.schedule.getSnapshot(this.stationIndex, this.kinematics.positionM, this.elapsedTimeSec);
        this.challengeOutcome = evaluateChallengeOutcome({
          challenge,
          stationsServed: this.stationsServed,
          stationsMissed: this.stationsMissed,
          totalStations: this.stations.length,
          averageDeviationSec: sched.averageDeviationSec,
          finalDeviationSec: sched.deviationSec,
          redSignalViolations: this.redSignalViolations,
          overspeedViolations: this.overspeedViolations,
          czuwakViolations: this.czuwakViolations,
        });
      }
      this.tachograph.recordFinalSample(
        this.elapsedTimeSec,
        this.kinematics.positionM,
        this.kinematics.speedKmh,
        this.computeEffectiveSpeedLimit(),
      );
      this.phase = 'gameover';
      return;
    }
    this.stationIndex += 1;
  }

  private evaluateOverspeed(dt: number): boolean {
    if (this.isFreeRideMode()) {
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
      this.tachograph.recordViolation(
        this.elapsedTimeSec,
        this.kinematics.positionM,
        this.kinematics.speedKmh,
        'overspeed',
      );
      this.applyPenalty(this.scoring.getOverspeedPenalty(), `Przekroczenie limitu (${limit} km/h)`, 'danger');
      return true;
    }
    return false;
  }

  private applyPenalty(points: number, text: string, tone: FeedbackTone): void {
    if (this.isFreeRideMode()) {
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
    if (this.getActiveChallenge()?.skipStations) {
      return false;
    }
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
      radioDispatchTriggered: false,
      radioAckChime: false,
      wiperSweepTick: false,
      academyStepCompleted: false,
    };
  }
}
