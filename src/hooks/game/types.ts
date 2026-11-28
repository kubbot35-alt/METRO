import type { ICabHoverTooltip } from '../../domain/cabControlsCatalog';
import type { PassengerSeatId } from '../../domain/passengerViewModel';
import type {
  CctvPreviewChannel,
  ChallengeId,
  GameModeId,
  GamepadBrand,
  IAchievementRecord,
  IAchievementSpec,
  IAchievementToast,
  ICourseXpReward,
  ICustomLineDraft,
  IDriverProfileStats,
  IGamepadStatus,
  IGameSettings,
  IGhostDeltaSnapshot,
  ILeaderboardEntry,
  IMetroLineSpec,
  IPhotoCameraState,
  ISimulationSnapshot,
  LanguageId,
  MetroLineId,
  PaAnnouncementId,
  PhotoFilterId,
  RouteDirection,
  TimeOfDayId,
  TrainLiveryId,
  TrainModelId,
  WeatherModeId,
} from '../../domain/types';

export type { IGameRuntimeRefs, IGameServiceBag } from './runtimeRefsTypes';

export interface IGamepadToastState {
  readonly name: string;
  readonly brand: GamepadBrand;
}

export interface IMetroGameState {
  readonly snapshot: ISimulationSnapshot;
  readonly settings: IGameSettings;
  readonly fps: number;
  readonly muted: boolean;
  readonly helpOpen: boolean;
  readonly settingsOpen: boolean;
  readonly achievementsOpen: boolean;
  readonly profileOpen: boolean;
  readonly customLines: readonly ICustomLineDraft[];
  readonly baseLineSpec: IMetroLineSpec;
  readonly routeDirection: RouteDirection;
  readonly startStationIndex: number;
  readonly lineBuilderDraft: ICustomLineDraft | null;
  readonly lineBuilderEditing: boolean;
  readonly driverProfile: IDriverProfileStats;
  readonly lastCourseXpReward: ICourseXpReward | null;
  readonly achievementCatalog: readonly IAchievementSpec[];
  readonly unlockedAchievements: readonly IAchievementRecord[];
  readonly achievementToast: IAchievementToast | null;
  readonly leaderboard: readonly ILeaderboardEntry[];
  readonly isNewRecord: boolean;
  readonly photoModeActive: boolean;
  readonly photoState: IPhotoCameraState;
  readonly photoCapturing: boolean;
  readonly photoSavedNotice: boolean;
  readonly gamepadStatus: IGamepadStatus;
  readonly gamepadToast: IGamepadToastState | null;
  readonly touchControlsActive: boolean;
  readonly showPortraitHint: boolean;
  readonly ghostDelta: IGhostDeltaSnapshot | null;
  readonly cctvPreviewOpen: boolean;
  readonly cctvChannel: CctvPreviewChannel;
  readonly paPanelOpen: boolean;
  readonly dispatchMapOpen: boolean;
  readonly selectedLiveryId: TrainLiveryId;
  readonly cabHoverTooltip: ICabHoverTooltip | null;
}

export interface IMetroGameActions {
  togglePaPanel: () => void;
  closePaPanel: () => void;
  triggerPaAnnouncement: (id: PaAnnouncementId) => void;
  toggleDispatchMap: () => void;
  closeDispatchMap: () => void;
  enterTurnaroundSiding: () => void;
  triggerCabSwitch: () => void;
  toggleCctvPreview: () => void;
  closeCctvPreview: () => void;
  selectCctvChannel: (channel: CctvPreviewChannel) => void;
  registerCctvCanvas: (canvas: HTMLCanvasElement | null) => void;
  dismissPortraitHint: () => void;
  selectMetroLine: (lineId: MetroLineId) => void;
  selectRouteDirection: (direction: RouteDirection) => void;
  selectStartStation: (startIndex: number) => void;
  selectGameMode: (mode: GameModeId) => void;
  selectChallenge: (challengeId: ChallengeId) => void;
  selectWeatherMode: (mode: WeatherModeId) => void;
  selectTrainModel: (modelId: TrainModelId) => void;
  selectTrainLivery: (liveryId: TrainLiveryId) => void;
  selectTimeOfDay: (timeOfDayId: TimeOfDayId) => void;
  setDepotHallStart: (enabled: boolean) => void;
  setPassengerSeat: (seatId: PassengerSeatId) => void;
  setPassengerCarIndex: (carIndex: number) => void;
  selectTrainspottingSpot: (spotIndex: number) => void;
  stepTrainspottingWalk: (deltaM: number) => void;
  triggerSandboxOncomingTrain: () => void;
  cycleSandboxNextSignal: () => void;
  openAchievements: () => void;
  closeAchievements: () => void;
  openProfile: () => void;
  closeProfile: () => void;
  resetDriverProfile: () => void;
  openLineBuilder: (editDraft?: ICustomLineDraft) => void;
  closeLineBuilder: () => void;
  saveCustomLine: (draft: ICustomLineDraft) => void;
  deleteCustomLine: (id: string) => void;
  openSettings: () => void;
  closeSettings: () => void;
  updateSettings: (partial: Partial<IGameSettings>) => void;
  setLanguage: (language: LanguageId) => void;
  resetSettings: () => void;
  startGame: () => void;
  startAcademy: () => void;
  startPassengerAto: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  returnToTitle: () => void;
  toggleMute: () => void;
  toggleHelp: () => void;
  closeHelp: () => void;
  toggleDoors: () => void;
  toggleDoorsLeft: () => void;
  toggleDoorsRight: () => void;
  toggleHeadlights: () => void;
  toggleCabLight: () => void;
  toggleWipers: () => void;
  toggleAto: () => void;
  acknowledgeCzuwak: () => void;
  acknowledgeRadio: () => void;
  cycleCamera: () => void;
  triggerEmergencyBrake: () => void;
  setHornActive: (active: boolean) => void;
  setManualLeverAxis: (axis: number | null) => void;
  enterPhotoMode: () => void;
  exitPhotoMode: () => void;
  togglePhotoMode: () => void;
  setPhotoFov: (fovDeg: number) => void;
  setPhotoTilt: (rollDeg: number) => void;
  setPhotoFilter: (filter: PhotoFilterId) => void;
  resetPhotoCamera: () => void;
  capturePhotoPng: () => void;
}

export type IMetroGameController = IMetroGameState & IMetroGameActions;
