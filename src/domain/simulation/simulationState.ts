import { AcademyController } from '../academySystem';
import { StationAnnouncementTracker } from '../announcementTracker';
import { MetroAtoController } from '../atoSystem';
import { PassengerComfortSystem } from '../comfortSystem';
import { EcoDrivingSystem } from '../ecoDrivingSystem';
import { FeedbackTracker } from '../feedbackTracker';
import { MetroIncidentSystem } from '../incidentSystem';
import { LightingAndSparksSystem } from '../lightingAndSparksSystem';
import { NightInspectionSystem } from '../nightInspectionSystem';
import { PaIntercomSystem } from '../paIntercomSystem';
import { DispatcherRadioSystem } from '../radioSystem';
import { METRO_LINE_M1 } from '../routeData';
import { MetroScheduleController } from '../scheduleSystem';
import { TunnelSignalSystem } from '../signalSystem';
import { Sop2System } from '../sop2System';
import { TachographRecorder } from '../tachographSystem';
import { RUSH_HOUR_SPEC } from '../timeOfDayCatalog';
import { getLineTrackAlignment } from '../trackAlignment';
import { OppositeTrackTrafficSystem } from '../trafficSystem';
import { getTrainModelSpec } from '../trainCatalog';
import { applyLiveryToTrainSpec } from '../trainLiveryCatalog';
import { createInitialKinematics } from '../trainPhysics';
import { TerminusTurnaroundSystem } from '../turnaroundSystem';
import type {
  AtoStatus,
  CameraMode,
  ChallengeId,
  DoorSide,
  DoorState,
  GameModeId,
  GamePhase,
  IScoringEvaluator,
  ISpeedLimitZone,
  IStationSpec,
  ITrainPhysicsModel,
  TrainLiveryId,
} from '../types';
import { MetroWeatherSystem } from '../weatherSystem';
import type { ISimulationState, ISimulationSystems } from './simulationContracts';

export type { ISimulationState, ISimulationSystems };

export function buildDefaultSystems(
  physics: ITrainPhysicsModel, scoring: IScoringEvaluator,
  stations: readonly IStationSpec[], overrides: Partial<ISimulationSystems>,
): ISimulationSystems {
  return {
    physics, scoring,
    signals: overrides.signals ?? new TunnelSignalSystem(),
    feedback: overrides.feedback ?? new FeedbackTracker(),
    announcements: overrides.announcements ?? new StationAnnouncementTracker(),
    schedule: overrides.schedule ?? new MetroScheduleController(stations),
    incidents: overrides.incidents ?? new MetroIncidentSystem(stations),
    traffic: overrides.traffic ?? new OppositeTrackTrafficSystem(),
    radio: overrides.radio ?? new DispatcherRadioSystem(stations),
    weather: overrides.weather ?? new MetroWeatherSystem(),
    academy: overrides.academy ?? new AcademyController(),
    tachograph: overrides.tachograph ?? new TachographRecorder(),
    ato: overrides.ato ?? new MetroAtoController(),
    lighting: overrides.lighting ?? new LightingAndSparksSystem(),
    nightInspection: overrides.nightInspection ?? new NightInspectionSystem(stations),
    comfort: overrides.comfort ?? new PassengerComfortSystem(),
    ecoDriving: overrides.ecoDriving ?? new EcoDrivingSystem(),
    paIntercom: overrides.paIntercom ?? new PaIntercomSystem(),
    turnaround: overrides.turnaround ?? new TerminusTurnaroundSystem(),
    sop2: overrides.sop2 ?? new Sop2System(),
  };
}

function createInitialModeAndConfig(stations: readonly IStationSpec[], speedZones: readonly ISpeedLimitZone[]) {
  return {
    line: METRO_LINE_M1,
    stations,
    speedZones,
    alignment: getLineTrackAlignment(METRO_LINE_M1.id, stations),
    phase: 'title' as GamePhase,
    gameMode: 'duty' as GameModeId,
    atoEnabled: false,
    atoStatus: 'off' as AtoStatus,
    challengeId: 'inverter_fault' as ChallengeId,
    challengeOutcome: null,
    selectedLiveryId: 'default' as TrainLiveryId,
    trainModel: applyLiveryToTrainSpec(getTrainModelSpec('inspiro'), 'default'),
    timeOfDay: RUSH_HOUR_SPEC,
    timeOfDayConfigured: false,
    cameraMode: 'cab' as CameraMode,
    cameraNotice: null,
    cameraNoticeId: 1,
  };
}

function createInitialTelemetryCounters() {
  return {
    kinematics: createInitialKinematics(),
    doorState: 'closed' as DoorState, openDoorSide: null as DoorSide | null,
    stationIndex: 0, boardingTimerSec: 0, boardingCompleted: false, stopAwarded: false,
    stationsServed: 0, stationsMissed: 0, score: 0, penaltiesCount: 0,
    overspeedViolations: 0, redSignalViolations: 0, czuwakViolations: 0, czuwakAcksCount: 0,
    doorFaultsResolvedCount: 0, bestStopErrorM: null as number | null, totalStopErrorM: 0,
    elapsedTimeSec: 0, legElapsedTimeSec: 0, overspeedCooldownSec: 0, lastJointIndex: 0,
  };
}

export function createInitialSimulationState(
  stations: readonly IStationSpec[],
  speedZones: readonly ISpeedLimitZone[],
): ISimulationState {
  return {
    ...createInitialModeAndConfig(stations, speedZones),
    ...createInitialTelemetryCounters(),
    hornActive: false,
    atpActive: false,
    activeCautionLimitKmh: null,
    leverTarget: 0,
    passengersCarried: 0,
    currentStationBoardedCount: 0,
    stationSplits: [],
    pendingPaAudio: false,
    pendingCabSwitchChime: false,
    activeScheduleStartClockSec: null,
    prevContactorNotch: 0,
    prevAirBrakeHeld: false,
    turnoutThudCooldownSec: 0,
    sop2SettingEnabled: true,
    sop2SandboxOverride: false,
  };
}

export function resetRunMetrics(state: ISimulationState): void {
  Object.assign(state, createInitialTelemetryCounters());
  state.phase = 'playing';
  state.activeScheduleStartClockSec = null;
  state.hornActive = false;
  state.atpActive = false;
  state.activeCautionLimitKmh = null;
  state.leverTarget = 0;
  state.cameraMode = state.gameMode === 'passenger' ? 'interior' : 'cab';
  state.atoEnabled = state.gameMode === 'passenger';
  state.atoStatus = 'off';
  state.cameraNotice = null;
  state.passengersCarried = 0;
  state.currentStationBoardedCount = 0;
  state.stationSplits = [];
  state.pendingPaAudio = false;
  state.pendingCabSwitchChime = false;
  state.challengeOutcome = null;
  state.prevContactorNotch = 0;
  state.prevAirBrakeHeld = false;
  state.turnoutThudCooldownSec = 0;
}

export function resetSubsystemControllers(state: ISimulationState, sys: ISimulationSystems): void {
  sys.lighting.reset(state.gameMode === 'academy' ? 'off' : 'low');
  sys.feedback.reset();
  sys.signals.reset();
  sys.announcements.reset();
  sys.schedule.reset();
  sys.incidents.reset();
  sys.traffic.reset();
  sys.radio.reset();
  sys.weather.reset();
  sys.academy.reset();
  sys.tachograph.reset();
  sys.ato.reset();
  sys.nightInspection.reset();
  sys.comfort.reset();
  sys.ecoDriving.reset();
  sys.paIntercom.reset();
  sys.turnaround.reset();
  sys.sop2.reset();
}
