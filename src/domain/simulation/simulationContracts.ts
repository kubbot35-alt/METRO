import type { IAcademyController } from '../academySystem';
import type { IAnnouncementTracker } from '../announcementTracker';
import type { IAtoController } from '../atoSystem';
import type { IPassengerComfortController } from '../comfortSystem';
import type { IEcoDrivingController } from '../ecoDrivingSystem';
import type { IFeedbackTracker } from '../feedbackTracker';
import type { IIncidentController } from '../incidentSystem';
import type { ILightingAndSparksController } from '../lightingAndSparksSystem';
import type { INightInspectionController } from '../nightInspectionSystem';
import type { IPaIntercomController } from '../paIntercomSystem';
import type { IRadioController } from '../radioSystem';
import type { IScheduleController } from '../scheduleSystem';
import type { ISignalController } from '../signalSystem';
import type { ISop2Controller } from '../sop2System';
import type { ITachographRecorder } from '../tachographSystem';
import type { TrackAlignment } from '../trackAlignment';
import type { ITrafficController } from '../trafficSystem';
import type { ITurnaroundController } from '../turnaroundSystem';
import type {
  AtoStatus,
  CameraMode,
  ChallengeId,
  DoorSide,
  DoorState,
  GameModeId,
  GamePhase,
  ICameraNotice,
  IChallengeOutcome,
  IGhostStationSplit,
  IMetroLineSpec,
  IScoringEvaluator,
  ISpeedLimitZone,
  IStationSpec,
  ITimeOfDaySpec,
  ITrainKinematics,
  ITrainModelSpec,
  ITrainPhysicsModel,
  TrainLiveryId,
} from '../types';
import type { IWeatherController } from '../weatherSystem';

export interface ISimulationSystems {
  readonly physics: ITrainPhysicsModel;
  readonly scoring: IScoringEvaluator;
  readonly signals: ISignalController;
  readonly feedback: IFeedbackTracker;
  readonly announcements: IAnnouncementTracker;
  readonly schedule: IScheduleController;
  readonly incidents: IIncidentController;
  readonly traffic: ITrafficController;
  readonly radio: IRadioController;
  readonly weather: IWeatherController;
  readonly academy: IAcademyController;
  readonly tachograph: ITachographRecorder;
  readonly ato: IAtoController;
  readonly lighting: ILightingAndSparksController;
  readonly nightInspection: INightInspectionController;
  readonly comfort: IPassengerComfortController;
  readonly ecoDriving: IEcoDrivingController;
  readonly paIntercom: IPaIntercomController;
  readonly turnaround: ITurnaroundController;
  readonly sop2: ISop2Controller;
}

export interface ISimulationState {
  line: IMetroLineSpec;
  stations: readonly IStationSpec[];
  speedZones: readonly ISpeedLimitZone[];
  alignment: TrackAlignment;
  phase: GamePhase;
  gameMode: GameModeId;
  atoEnabled: boolean;
  atoStatus: AtoStatus;
  challengeId: ChallengeId;
  challengeOutcome: IChallengeOutcome | null;
  selectedLiveryId: TrainLiveryId;
  trainModel: ITrainModelSpec;
  timeOfDay: ITimeOfDaySpec;
  timeOfDayConfigured: boolean;
  cameraMode: CameraMode;
  cameraNotice: ICameraNotice | null;
  cameraNoticeId: number;
  kinematics: ITrainKinematics;
  doorState: DoorState;
  openDoorSide: DoorSide | null;
  stationIndex: number;
  boardingTimerSec: number;
  boardingCompleted: boolean;
  stopAwarded: boolean;
  stationsServed: number;
  stationsMissed: number;
  score: number;
  penaltiesCount: number;
  overspeedViolations: number;
  redSignalViolations: number;
  czuwakViolations: number;
  czuwakAcksCount: number;
  doorFaultsResolvedCount: number;
  bestStopErrorM: number | null;
  totalStopErrorM: number;
  elapsedTimeSec: number;
  legElapsedTimeSec: number;
  overspeedCooldownSec: number;
  lastJointIndex: number;
  hornActive: boolean;
  atpActive: boolean;
  activeCautionLimitKmh: number | null;
  leverTarget: number;
  passengersCarried: number;
  currentStationBoardedCount: number;
  stationSplits: IGhostStationSplit[];
  pendingPaAudio: boolean;
  pendingCabSwitchChime: boolean;
  activeScheduleStartClockSec: number | null;
  prevContactorNotch: number;
  prevAirBrakeHeld: boolean;
  turnoutThudCooldownSec: number;
  sop2SettingEnabled: boolean;
  sop2SandboxOverride: boolean;
}
