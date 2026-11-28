import type {
  AtoStatus,
  CameraMode,
  DoorSide,
  DoorState,
  FeedbackTone,
  GameModeId,
  GamePhase,
  HeadlightMode,
  ILightingAndSparksState,
  INightInspectionState,
  IWeatherState,
} from './coreTypes';
import type {
  IAcademySnapshot,
  IAnnouncementState,
  ICameraNotice,
  IChallengeOutcome,
  IChallengeSpec,
  ICzuwakState,
  IDoorFaultState,
  IFeedbackMessage,
  IPaIntercomState,
  IPassengerComfortState,
  IRadioDispatchState,
  IScheduleSnapshot,
  ISop2State,
  ITurnaroundState,
  PaAnnouncementId,
} from './gameplaySystemsTypes';
import type {
  IMetroLineSpec,
  IOncomingTrainState,
  ISemaphoreProgress,
  ISemaphoreState,
  IStationProgress,
  IStationSpec,
  ITimeOfDaySpec,
  ITrackProfileSnapshot,
  ITrackworkZone,
} from './routeAndTrackTypes';
import type { DriverGrade, IGhostStationSplit, ITachographSnapshot } from './telemetryAndCareerTypes';
import type {
  IEcoDrivingState,
  ITrainKinematics,
  ITrainModelSpec,
} from './trainAndPhysicsTypes';

export interface IStopEvaluation {
  readonly points: number;
  readonly label: string;
  readonly tone: FeedbackTone;
  readonly offsetM: number;
}

export interface IGradeInput {
  readonly score: number;
  readonly stationsServed: number;
  readonly totalStations: number;
  readonly overspeedViolations: number;
  readonly redSignalViolations: number;
  readonly czuwakViolations: number;
}

export interface IScoringEvaluator {
  evaluateStop(offsetM: number): IStopEvaluation;
  evaluatePunctuality(deviationSec: number): {
    readonly points: number;
    readonly label: string;
    readonly tone: FeedbackTone;
  };
  evaluateGrade(stats: IGradeInput): DriverGrade;
  getOverspeedPenalty(): number;
  getMissedStationPenalty(): number;
  getEmergencyBrakePenalty(): number;
  getRedSignalPenalty(): number;
  getCzuwakPenalty(): number;
  getWrongDoorSidePenalty?(): number;
}

export interface IAudioEvents {
  readonly hornActive: boolean;
  readonly doorToggledTo: DoorState | null;
  readonly boardingCompleteChime: boolean;
  readonly overspeedWarning: boolean;
  readonly emergencyBrakeTriggered: boolean;
  readonly railJointPulse: boolean;
  readonly brakeStopHiss: boolean;
  readonly atpTriggered: boolean;
  readonly signalClearedChime: boolean;
  readonly czuwakAlertTriggered: boolean;
  readonly czuwakAckChime: boolean;
  readonly doorFaultBeep: boolean;
  readonly passingTrainWhoosh: boolean;
  readonly radioDispatchTriggered?: boolean;
  readonly radioAckChime?: boolean;
  readonly wiperSweepTick?: boolean;
  readonly academyStepCompleted?: boolean;
  readonly thirdRailSparkCrackle?: boolean;
  readonly highBeamDimBonusChime?: boolean;
  readonly nightCrewClearedChime?: boolean;
  readonly nightCrewViolationBuzz?: boolean;
  readonly paAnnouncementTriggered?: boolean;
  readonly cabSwitchChime?: boolean;
  readonly contactorClick?: boolean;
  readonly airReleaseHiss?: boolean;
  readonly turnoutThud?: boolean;
  readonly sop2WarningBeep?: boolean;
  readonly sop2InterventionTriggered?: boolean;
}

export interface ISimulationSnapshot {
  readonly phase: GamePhase;
  readonly gameMode: GameModeId;
  readonly challenge: IChallengeSpec | null;
  readonly challengeOutcome: IChallengeOutcome | null;
  readonly academy: IAcademySnapshot | null;
  readonly line: IMetroLineSpec;
  readonly stations: readonly IStationSpec[];
  readonly trainModel: ITrainModelSpec;
  readonly timeOfDay: ITimeOfDaySpec;
  readonly cameraMode: CameraMode;
  readonly cameraNotice: ICameraNotice | null;
  readonly oncomingTrain: IOncomingTrainState;
  readonly kinematics: ITrainKinematics;
  readonly trackProfile: ITrackProfileSnapshot;
  readonly speedLimitKmh: number;
  readonly isOverspeeding: boolean;
  readonly doorState: DoorState;
  readonly openDoorSide: DoorSide | null;
  readonly canToggleDoors: boolean;
  readonly boardingTimerSec: number;
  readonly boardingDurationSec: number;
  readonly boardingProgress: number;
  readonly boardingCompletedForCurrent: boolean;
  readonly currentStation: IStationProgress;
  readonly signals: readonly ISemaphoreState[];
  readonly nextSignal: ISemaphoreProgress | null;
  readonly atpActive: boolean;
  readonly sop2: ISop2State;
  readonly headlightsOn: boolean;
  readonly headlightMode: HeadlightMode;
  readonly cabLightOn: boolean;
  readonly lightingEffects: ILightingAndSparksState;
  readonly nightInspection: INightInspectionState;
  readonly comfort: IPassengerComfortState;
  readonly ecoDriving: IEcoDrivingState;
  readonly paIntercom: IPaIntercomState;
  readonly turnaround: ITurnaroundState;
  readonly leverTarget: number;
  readonly passengersCarried: number;
  readonly currentStationBoardedCount: number;
  readonly effectiveWaitingPassengers: number;
  readonly announcement: IAnnouncementState | null;
  readonly schedule: IScheduleSnapshot;
  readonly trackworkZones: readonly ITrackworkZone[];
  readonly activeTrackworkZone: ITrackworkZone | null;
  readonly upcomingTrackworkDistanceM: number | null;
  readonly doorFault: IDoorFaultState;
  readonly czuwak: ICzuwakState;
  readonly radio: IRadioDispatchState;
  readonly weather: IWeatherState;
  readonly totalStations: number;
  readonly stationsServed: number;
  readonly stationsMissed: number;
  readonly score: number;
  readonly penaltiesCount: number;
  readonly overspeedViolations: number;
  readonly redSignalViolations: number;
  readonly czuwakViolations: number;
  readonly czuwakAcksCount: number;
  readonly doorFaultsResolvedCount: number;
  readonly bestStopErrorM: number | null;
  readonly driverGrade: DriverGrade;
  readonly totalStopErrorM: number;
  readonly elapsedTimeSec: number;
  readonly feedback: IFeedbackMessage | null;
  readonly hornActive: boolean;
  readonly atoEnabled: boolean;
  readonly atoStatus: AtoStatus;
  readonly tachograph: ITachographSnapshot;
  readonly stationSplits: readonly IGhostStationSplit[];
}
