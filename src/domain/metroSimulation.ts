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
import { PassengerComfortSystem, type IPassengerComfortController } from './comfortSystem';
import { EcoDrivingSystem, type IEcoDrivingController } from './ecoDrivingSystem';
import { FeedbackTracker, type IFeedbackTracker } from './feedbackTracker';
import { MetroIncidentSystem, type IIncidentController } from './incidentSystem';
import { applyLiveryToTrainSpec } from './trainLiveryCatalog';
import {
  LightingAndSparksSystem,
  type ILightingAndSparksController,
} from './lightingAndSparksSystem';
import {
  NightInspectionSystem,
  type INightInspectionController,
} from './nightInspectionSystem';
import { PaIntercomSystem, type IPaIntercomController } from './paIntercomSystem';
import { DispatcherRadioSystem, type IRadioController } from './radioSystem';
import { TachographRecorder, type ITachographRecorder } from './tachographSystem';
import {
  TerminusTurnaroundSystem,
  TURNAROUND_SPEED_LIMIT_KMH,
  type ITurnaroundController,
} from './turnaroundSystem';
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
  HeadlightMode,
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
  PaAnnouncementId,
  TimeOfDayId,
  TrainLiveryId,
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
  private readonly lighting: ILightingAndSparksController;
  private readonly nightInspection: INightInspectionController;
  private readonly comfort: IPassengerComfortController;
  private readonly ecoDriving: IEcoDrivingController;
  private readonly paIntercom: IPaIntercomController;
  private readonly turnaround: ITurnaroundController;
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
  private selectedLiveryId: TrainLiveryId = 'default';
  private trainModel: ITrainModelSpec = applyLiveryToTrainSpec(getTrainModelSpec('inspiro'), 'default');
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
  private legElapsedTimeSec = 0;
  private overspeedCooldownSec = 0;
  private lastJointIndex = 0;
  private hornActive = false;
  private atpActive = false;
  private activeCautionLimitKmh: number | null = null;
  private leverTarget = 0;
  private passengersCarried = 0;
  private currentStationBoardedCount = 0;
  private stationSplits: IGhostStationSplit[] = [];
  private pendingPaAudio = false;
  private pendingCabSwitchChime = false;
  private activeScheduleStartClockSec: number | null = null;
  private prevContactorNotch = 0;
  private prevAirBrakeHeld = false;
  private turnoutThudCooldownSec = 0;

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
    lighting: ILightingAndSparksController = new LightingAndSparksSystem(),
    nightInspection: INightInspectionController = new NightInspectionSystem(stations),
    comfort: IPassengerComfortController = new PassengerComfortSystem(),
    paIntercom: IPaIntercomController = new PaIntercomSystem(),
    turnaround: ITurnaroundController = new TerminusTurnaroundSystem(),
    ecoDriving: IEcoDrivingController = new EcoDrivingSystem(),
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
    this.lighting = lighting;
    this.nightInspection = nightInspection;
    this.comfort = comfort;
    this.ecoDriving = ecoDriving;
    this.paIntercom = paIntercom;
    this.turnaround = turnaround;
    this.traffic.setStations?.(stations);
    this.turnaround.setStations(stations);
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
    this.nightInspection.setStations(nextLine.stations);
    this.turnaround.setStations(nextLine.stations);
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

  public cycleHeadlightMode(): HeadlightMode {
    const result = this.lighting.step({
      playerPositionM: this.kinematics.positionM,
      speedKmh: this.kinematics.speedKmh,
      throttle: this.kinematics.throttle,
      serviceBrake: this.kinematics.serviceBrake,
      emergencyBrake: this.kinematics.emergencyBrake,
      netAccelerationMs2: this.kinematics.netAccelerationMs2,
      turnoutSwayFactor: 0,
      oncomingTrain: this.traffic.getState(),
      toggleHeadlightsPressed: true,
      toggleCabLightPressed: false,
      dtSec: 0,
    });
    const mode = this.lighting.getState().headlightMode;
    if (result.dimCourtesyBonusAwarded) {
      const pts = this.gameMode !== 'sandbox' && this.gameMode !== 'passenger' ? result.courtesyBonusPoints : 0;
      this.score = Math.max(0, this.score + pts);
      this.feedback.push('Przygaszono długie przed pociągiem z naprzeciwka', pts, 'success');
    } else {
      const label =
        mode === 'high'
          ? 'Światła długie (drogowe)'
          : mode === 'low'
            ? 'Światła krótkie (mijania)'
            : 'Reflektory wyłączone';
      this.feedback.push(label, 0, 'neutral');
    }
    return mode;
  }

  public toggleCabLight(): boolean {
    const next = this.lighting.toggleCabLight();
    this.feedback.push(next ? 'Lampka kabiny: WŁ.' : 'Lampka kabiny: WYŁ.', 0, 'neutral');
    return next;
  }

  public triggerPaAnnouncement(id: PaAnnouncementId): {
    readonly accepted: boolean;
    readonly announcementId: number;
    readonly specId: PaAnnouncementId;
  } {
    const result = this.paIntercom.trigger(id, {
      doorState: this.doorState,
      boardingCompleted: this.boardingCompleted,
      timeOfDayId: this.timeOfDay.id,
      speedKmh: this.kinematics.speedKmh,
      nextSignal: this.buildNextSignalProgress(),
      weatherMode: this.weather.getState().mode,
      stationIndex: this.stationIndex,
    });
    if (!result.accepted) {
      return { accepted: false, announcementId: 0, specId: id };
    }
    if (result.boardingSpeedupSec > 0 && this.doorState === 'open' && !this.boardingCompleted) {
      const dur = this.getActiveBoardingDurationSec();
      this.boardingTimerSec = Math.min(dur, this.boardingTimerSec + result.boardingSpeedupSec);
    }
    if (result.comfortBonus > 0) {
      this.comfort.applyBoost(result.comfortBonus);
    }
    if (result.effectFeedbackPl) {
      this.feedback.push(result.effectFeedbackPl, 0, result.effectTone);
    }
    this.pendingPaAudio = true;
    return { accepted: true, announcementId: result.announcementId, specId: result.spec.id };
  }

  public enterTurnaroundSiding(): boolean {
    if (!this.turnaround.enterSiding()) {
      return false;
    }
    this.phase = 'playing';
    this.atoEnabled = false;
    this.atoStatus = 'off';
    this.atpActive = false;
    this.doorState = 'closed';
    this.openDoorSide = null;
    this.kinematics = {
      ...this.kinematics,
      emergencyBrake: false,
      serviceBrake: 0,
      throttle: 0,
    };
    this.feedback.push('Tor odstawczy: jedź powoli (max 20 km/h) przed kozioł oporowy', 0, 'neutral');
    return true;
  }

  public beginCabSwitch(): boolean {
    if (!this.turnaround.beginCabSwitch()) {
      return false;
    }
    this.kinematics = {
      ...this.kinematics,
      speedMs: 0,
      speedKmh: 0,
      throttle: 0,
      serviceBrake: 1,
      emergencyBrake: false,
      netAccelerationMs2: 0,
    };
    this.pendingCabSwitchChime = true;
    return true;
  }

  public completeCabSwitch(reversedLine: IMetroLineSpec): boolean {
    const prevClockSec = this.schedule.getSnapshot(
      this.stationIndex,
      this.kinematics.positionM,
      this.legElapsedTimeSec,
    ).currentClockSec;
    this.turnaround.finishLegSwap(this.kinematics.positionM);
    this.activeScheduleStartClockSec = prevClockSec;
    this.legElapsedTimeSec = 0;
    this.line = reversedLine;
    this.stations = reversedLine.stations;
    this.speedZones = reversedLine.speedZones;
    this.alignment = getLineTrackAlignment(reversedLine.id, reversedLine.stations, {
      hasSurfaceStart: false,
      tunnelPortalDistanceM: null,
      alignmentIntensity: reversedLine.alignmentIntensity,
    });
    this.stationIndex = 0;
    this.kinematics = createInitialKinematics();
    this.doorState = 'closed';
    this.openDoorSide = null;
    this.boardingTimerSec = 0;
    this.boardingCompleted = false;
    this.stopAwarded = false;
    this.currentStationBoardedCount = 0;
    this.lastJointIndex = 0;
    this.atpActive = false;
    this.activeCautionLimitKmh = null;
    this.stationSplits = [];
    this.signals.setDistances?.(buildSemaphoreDistances(reversedLine.stations));
    this.schedule.setStations?.(reversedLine.stations);
    this.schedule.configure?.(prevClockSec, this.getActiveBoardingDurationSec());
    this.incidents.setStations?.(reversedLine.stations);
    this.traffic.setStations?.(reversedLine.stations);
    this.radio.setStations(reversedLine.stations);
    this.nightInspection.setStations(reversedLine.stations);
    this.turnaround.setStations(reversedLine.stations);
    this.announcements.reset();
    this.applyActiveModeOverrides();
    this.phase = 'playing';
    this.feedback.push('Zmieniono kabinę — wjedź na peron kursu powrotnego', 0, 'success');
    return true;
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
    const baseSpec = getTrainModelSpec(modelId);
    this.trainModel = applyLiveryToTrainSpec(baseSpec, this.selectedLiveryId);
    this.physics.setConfig?.(this.trainModel.physics);
  }

  public setTrainLivery(liveryId: TrainLiveryId): void {
    this.selectedLiveryId = liveryId;
    const baseSpec = getTrainModelSpec(this.trainModel.id);
    this.trainModel = applyLiveryToTrainSpec(baseSpec, liveryId);
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
      this.lighting.setHeadlightMode('off');
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
    this.legElapsedTimeSec = 0;
    this.activeScheduleStartClockSec = null;
    this.overspeedCooldownSec = 0;
    this.lastJointIndex = 0;
    this.hornActive = false;
    this.atpActive = false;
    this.activeCautionLimitKmh = null;
    this.lighting.reset(this.gameMode === 'academy' ? 'off' : 'low');
    this.leverTarget = 0;
    this.cameraMode = this.gameMode === 'passenger' ? 'interior' : 'cab';
    this.atoEnabled = this.gameMode === 'passenger';
    this.atoStatus = 'off';
    this.cameraNotice = null;
    this.passengersCarried = 0;
    this.currentStationBoardedCount = 0;
    this.stationSplits = [];
    this.pendingPaAudio = false;
    this.pendingCabSwitchChime = false;
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
    this.nightInspection.reset();
    this.comfort.reset();
    this.ecoDriving.reset();
    this.paIntercom.reset();
    this.turnaround.reset();
    this.prevContactorNotch = 0;
    this.prevAirBrakeHeld = false;
    this.turnoutThudCooldownSec = 0;
    this.applyActiveModeOverrides();
  }

  public step(input: IControlInput, dtSec: number): IAudioEvents {
    const dt = Math.max(0, Math.min(dtSec, 0.05));
    if (this.phase !== 'playing') {
      return this.idleAudioEvents();
    }
    this.elapsedTimeSec += dt;
    this.legElapsedTimeSec += dt;
    this.paIntercom.step(dt);
    const paAudioNow = this.pendingPaAudio;
    const cabSwitchChimeNow = this.pendingCabSwitchChime;
    this.pendingPaAudio = false;
    this.pendingCabSwitchChime = false;

    const preTurnaround = this.turnaround.getState(this.kinematics.positionM);
    if (preTurnaround.phase === 'switching_cab') {
      this.turnaround.step(this.kinematics.positionM, 0, dt);
      this.feedback.tick(dt);
      return {
        ...this.idleAudioEvents(),
        paAnnouncementTriggered: paAudioNow,
        cabSwitchChime: cabSwitchChimeNow,
      };
    }

    if (input.toggleAtoPressed) {
      this.toggleAto();
    }
    const effectiveInput = this.resolveEffectiveInput(input);
    this.hornActive = effectiveInput.hornActive;
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
    const turnaroundStep = this.turnaround.step(
      this.kinematics.positionM,
      this.kinematics.speedKmh,
      dt,
    );
    if (turnaroundStep.clampedPositionM !== null) {
      this.kinematics = {
        ...this.kinematics,
        positionM: turnaroundStep.clampedPositionM,
        speedMs: 0,
        speedKmh: 0,
        throttle: 0,
        emergencyBrake: turnaroundStep.bufferCollision || this.kinematics.emergencyBrake,
      };
      if (turnaroundStep.bufferCollision) {
        this.applyPenalty(-50, 'Zderzenie z kozłem oporowym! Hamulec awaryjny', 'danger');
      }
    }

    const inTurnaroundSiding = this.turnaround.getState(this.kinematics.positionM).phase !== 'inactive';
    const atpTriggered = this.evaluateSignals(prevPosM, dt);
    const incRes = this.evaluateIncidents(Boolean(effectiveInput.acknowledgeCzuwakPressed), dt);
    const radioRes = this.evaluateRadio(Boolean(effectiveInput.acknowledgeRadioPressed), dt);
    const trafficRes = this.traffic.step(this.kinematics.positionM, dt);
    const postSample = this.alignment.sample(this.kinematics.positionM);
    const comfortProgress = this.buildStationProgress();
    const comfortRes = this.comfort.step({
      dtSec: dt,
      speedKmh: this.kinematics.speedKmh,
      netAccelerationMs2: this.kinematics.netAccelerationMs2,
      leverTarget: this.leverTarget,
      emergencyBrake: this.kinematics.emergencyBrake,
      curvatureRadPerM: postSample.curvatureRadPerM,
      curveLimitKmh: this.alignment.getCurveSpeedLimitAt(this.kinematics.positionM),
      distanceToStationM: comfortProgress.distanceToTargetM,
      doorsOpen: this.doorState === 'open',
    });
    if (comfortRes.event && !(emergencyTriggered && comfortRes.event.kind === 'emergency_brake')) {
      this.feedback.push(comfortRes.event.messagePl, 0, 'warning');
    }

    const lightRes = this.lighting.step({
      playerPositionM: this.kinematics.positionM,
      speedKmh: this.kinematics.speedKmh,
      throttle: this.kinematics.throttle,
      serviceBrake: this.kinematics.serviceBrake,
      emergencyBrake: this.kinematics.emergencyBrake,
      netAccelerationMs2: this.kinematics.netAccelerationMs2,
      turnoutSwayFactor: postSample.turnoutSwayFactor,
      oncomingTrain: this.traffic.getState(),
      toggleHeadlightsPressed: Boolean(effectiveInput.toggleHeadlightsPressed),
      toggleCabLightPressed: Boolean(effectiveInput.toggleCabLightPressed),
      dtSec: dt,
    });
    if (lightRes.dimCourtesyBonusAwarded) {
      const pts = this.isFreeRideMode() ? 0 : lightRes.courtesyBonusPoints;
      this.score += pts;
      this.feedback.push('Kultura jazdy: przygaszono długie światła', pts, 'success');
    }
    this.ecoDriving.step({
      kinematics: this.kinematics,
      physicsConfig: this.trainModel.physics,
      trainModelId: this.trainModel.id,
      dtSec: dt,
    });
    const contactorNotch = Math.round(this.leverTarget * 4);
    const contactorClick =
      this.trainModel.id === 'seria81' && contactorNotch !== this.prevContactorNotch;
    this.prevContactorNotch = contactorNotch;

    const airBrakeHeldNow = this.kinematics.serviceBrake > 0.25 || this.kinematics.emergencyBrake;
    const airReleaseHiss =
      this.trainModel.id === 'seria81' && this.prevAirBrakeHeld && !airBrakeHeldNow;
    this.prevAirBrakeHeld = airBrakeHeldNow;

    this.turnoutThudCooldownSec = Math.max(0, this.turnoutThudCooldownSec - dt);
    let turnoutThud = false;
    if (
      postSample.turnoutSwayFactor > 0.22 &&
      this.kinematics.speedKmh > 12 &&
      this.turnoutThudCooldownSec <= 0
    ) {
      turnoutThud = true;
      this.turnoutThudCooldownSec = Math.max(1.2, 22 / Math.max(15, this.kinematics.speedKmh));
    }

    const nightRes = this.evaluateNightInspection();
    const brakeStopHiss = this.checkBrakeStopHiss(prevSpeedKmh);
    const overspeedWarning = this.evaluateOverspeed(dt);
    const prevStationsServed = this.stationsServed;
    const doorRes = inTurnaroundSiding
      ? { toggledTo: null, faultBeep: false }
      : this.handleDoorToggle(effectiveInput, incRes.doorFaultResolvedClose);
    const stationServedNow = this.stationsServed > prevStationsServed;
    const boardingCompleteChime = inTurnaroundSiding ? false : this.updateBoarding(dt);
    if (!inTurnaroundSiding) {
      this.checkStationOvershoot();
    }
    const progress = this.buildStationProgress();
    if (!this.shouldSkipPassengerStations() && !inTurnaroundSiding) {
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
    let radioDispatchTriggered = radioRes.dispatchTriggered || nightRes.radioTriggered;
    let academyStepCompleted = false;
    if (this.gameMode === 'academy') {
      const academyRes = this.academy.step({
        positionM: this.kinematics.positionM,
        speedKmh: this.kinematics.speedKmh,
        headlightsOn: this.lighting.getState().headlightMode !== 'off',
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
      emergencyBrakeTriggered:
        emergencyTriggered ||
        turnaroundStep.bufferCollision ||
        (this.gameMode !== 'academy' && incRes.czuwakTimedOut),
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
      thirdRailSparkCrackle: lightRes.sparkTriggeredNow,
      highBeamDimBonusChime: lightRes.dimCourtesyBonusAwarded,
      nightCrewClearedChime: nightRes.clearedNow,
      nightCrewViolationBuzz: nightRes.violatedNow,
      paAnnouncementTriggered: paAudioNow,
      cabSwitchChime: cabSwitchChimeNow,
      contactorClick,
      airReleaseHiss,
      turnoutThud,
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
      headlightsOn: this.lighting.getState().headlightMode !== 'off',
      headlightMode: this.lighting.getState().headlightMode,
      cabLightOn: this.lighting.getState().cabLightOn,
      lightingEffects: this.lighting.getState(),
      nightInspection: this.nightInspection.getState(),
      comfort: this.comfort.getState(),
      ecoDriving: this.ecoDriving.getState(),
      paIntercom: this.paIntercom.getState(),
      turnaround: this.turnaround.getState(posM),
      leverTarget: this.leverTarget,
      passengersCarried: this.passengersCarried,
      currentStationBoardedCount: this.currentStationBoardedCount,
      effectiveWaitingPassengers,
      announcement: this.announcements.getCurrent(),
      schedule: this.schedule.getSnapshot(this.stationIndex, posM, this.legElapsedTimeSec),
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
      this.nightInspection.setActive(false);
      return;
    }
    const challenge = this.getActiveChallenge();
    if (challenge?.forceTimeOfDay && this.timeOfDay.id !== challenge.forceTimeOfDay) {
      this.timeOfDay = getTimeOfDaySpec(challenge.forceTimeOfDay);
      this.timeOfDayConfigured = true;
    }
    const isNightService = this.isNightServiceActive();
    this.nightInspection.setActive(isNightService);
    const redProb = challenge?.redSignalProbability ?? this.timeOfDay.redSignalProbability;
    this.signals.setRedProbability?.(redProb);
    this.traffic.setSpawnIntervalRange?.(
      this.timeOfDay.trafficSpawnMinSec,
      this.timeOfDay.trafficSpawnMaxSec,
    );
    this.schedule.configure?.(
      this.activeScheduleStartClockSec ?? this.timeOfDay.startClockSec,
      this.timeOfDay.boardingDurationSec,
    );
    this.incidents.setEnabled?.(this.gameMode !== 'sandbox');
    this.incidents.configureOverrides?.({
      doorFaultProbability: isNightService ? 0 : challenge?.doorFaultProbability ?? null,
      czuwakMinSec: challenge?.czuwakMinSec ?? null,
      czuwakMaxSec: challenge?.czuwakMaxSec ?? null,
      disableTrackwork: isNightService,
    });
    this.radio.setEnabled(true);
    this.radio.setAutoTrigger?.(!isNightService);
  }

  private isNightServiceActive(): boolean {
    return this.timeOfDay.id === 'night_service' || this.getActiveChallenge()?.id === 'night_service';
  }

  private shouldSkipPassengerStations(): boolean {
    return Boolean(this.getActiveChallenge()?.skipStations) || this.isNightServiceActive();
  }

  private evaluateNightInspection(): {
    readonly clearedNow: boolean;
    readonly violatedNow: boolean;
    readonly radioTriggered: boolean;
  } {
    const res = this.nightInspection.step(
      this.kinematics.positionM,
      this.kinematics.speedKmh,
      this.hornActive,
    );
    if (res.clearedCheckpoint) {
      const pts = this.isFreeRideMode() ? 0 : res.pointsDelta;
      this.score += pts;
      this.feedback.push(
        `Punkt kontrolny #${res.clearedCheckpoint.id} zaliczony — ekipa torowa bezpieczna`,
        pts,
        'success',
      );
      const radioTriggered = res.radioConfirmText
        ? Boolean(this.radio.forceTriggerDispatch?.(res.radioConfirmText, 6.5, 'inspection'))
        : false;
      return { clearedNow: true, violatedNow: false, radioTriggered };
    }
    if (res.violatedCheckpoint) {
      const reasonText =
        res.violationReason === 'both'
          ? 'Przekroczono 20 km/h i brak klaksonu [H]!'
          : res.violationReason === 'speed'
            ? 'Przekroczono 20 km/h przy ekipie torowej!'
            : 'Brak sygnału ostrzegawczego klaksonem [H]!';
      this.applyPenalty(
        res.pointsDelta,
        `BHP Ekipa #${res.violatedCheckpoint.id}: ${reasonText}`,
        'danger',
      );
      return { clearedNow: false, violatedNow: true, radioTriggered: false };
    }
    return { clearedNow: false, violatedNow: false, radioTriggered: false };
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
      headlightsOn: this.lighting.getState().headlightMode !== 'off',
      rainIntensity: weatherState.rainIntensity,
      wipersOn: weatherState.wipersOn,
      skipStations: this.shouldSkipPassengerStations(),
      isEveningOrTunnel: this.timeOfDay.id !== 'rush' || trackSample.outdoorBlend < 0.35,
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
      toggleCabLightPressed: input.toggleCabLightPressed,
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
    if (this.turnaround.getState(posM).phase !== 'inactive') {
      return TURNAROUND_SPEED_LIMIT_KMH;
    }
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
      const faultScale = this.paIntercom.isDoorFaultProtected(this.stationIndex) ? 0.35 : 1.0;
      const attempt = this.incidents.attemptDoorClose(this.stationIndex, faultScale);
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
      this.legElapsedTimeSec,
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
    if (this.shouldSkipPassengerStations()) {
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
    if (this.shouldSkipPassengerStations()) {
      if (this.kinematics.positionM >= station.distanceM + 18) {
        this.stationsServed += 1;
        const pts = this.isFreeRideMode() ? 0 : this.isNightServiceActive() ? 50 : 100;
        this.score += pts;
        this.recordCurrentStationTelemetry();
        const label = this.isNightServiceActive()
          ? `Inspekcja nocna: minięto stację ${station.name}`
          : `Przejazd techniczny przez stację ${station.name}`;
        this.feedback.push(label, pts, 'success');
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
      const comfortBonus = this.comfort.computeEndBonus(this.isFreeRideMode());
      if (comfortBonus > 0) {
        this.score += comfortBonus;
        this.feedback.push(
          `Bonus za płynną jazdę (komfort ${this.comfort.getState().averagePercent}%)`,
          comfortBonus,
          'success',
        );
      }
      const canTurnaround =
        this.gameMode !== 'academy' &&
        !this.shouldSkipPassengerStations() &&
        this.stations.length >= 2 &&
        this.kinematics.positionM <= (this.stations[this.stations.length - 1]?.distanceM ?? 0) + 35;
      this.turnaround.setCanEnterSiding(canTurnaround);
      const challenge = this.getActiveChallenge();
      if (challenge) {
        const sched = this.schedule.getSnapshot(
          this.stationIndex,
          this.kinematics.positionM,
          this.legElapsedTimeSec,
        );
        const nightState = this.nightInspection.getState();
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
          nightCrewTotal: nightState.totalCount,
          nightCrewPassed: nightState.passedCount,
          nightCrewViolated: nightState.violatedCount,
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
    if (this.shouldSkipPassengerStations()) {
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
      thirdRailSparkCrackle: false,
      highBeamDimBonusChime: false,
      nightCrewClearedChime: false,
      nightCrewViolationBuzz: false,
      paAnnouncementTriggered: false,
      cabSwitchChime: false,
    };
  }
}
