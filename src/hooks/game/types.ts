import type { RefObject } from 'react';
import type { IAudioEngine } from '../../audio/types';
import type { ISpeechAnnouncer } from '../../audio/speechAnnouncer';
import type { IAchievementService } from '../../domain/achievements';
import type { ICustomLineService } from '../../domain/customLines';
import type { IDriverProfileService } from '../../domain/driverProfile';
import type { IGhostRecordService } from '../../domain/ghostDelta';
import type { ILeaderboardService } from '../../domain/leaderboard';
import type { PhotoCameraController } from '../../domain/photoMode';
import type { ISettingsService } from '../../domain/settingsService';
import type { ITrainLiveryStorageService, SelectedLiveryMap } from '../../domain/trainLiveryCatalog';
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
  IMetroSimulation,
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
import type { IGamepadController } from '../../input/gamepadController';
import type { IInputController } from '../../input/types';
import type { IMetroSceneRenderer } from '../../scene/types';

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
  readonly selectedLiveryId: TrainLiveryId;
}

export interface IMetroGameActions {
  togglePaPanel: () => void;
  closePaPanel: () => void;
  triggerPaAnnouncement: (id: PaAnnouncementId) => void;
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

export interface IGameServiceBag {
  readonly leaderboard: ILeaderboardService;
  readonly achievements: IAchievementService;
  readonly settings: ISettingsService;
  readonly customLines: ICustomLineService;
  readonly driverProfile: IDriverProfileService;
  readonly ghostRecords: IGhostRecordService;
  readonly liveries: ITrainLiveryStorageService;
}

export interface IGameRuntimeRefs {
  readonly sim: RefObject<IMetroSimulation>;
  readonly services: IGameServiceBag;
  readonly renderer: RefObject<IMetroSceneRenderer | null>;
  readonly audio: RefObject<IAudioEngine | null>;
  readonly speech: RefObject<ISpeechAnnouncer | null>;
  readonly input: RefObject<IInputController | null>;
  readonly gamepad: RefObject<IGamepadController | null>;
  readonly photoController: RefObject<PhotoCameraController>;
  readonly settingsRef: RefObject<IGameSettings>;
  readonly selectedLiveriesRef: RefObject<SelectedLiveryMap>;
  readonly customLinesRef: RefObject<readonly ICustomLineDraft[]>;
  readonly baseLineRef: RefObject<IMetroLineSpec>;
  readonly routeDirectionRef: RefObject<RouteDirection>;
  readonly startStationIndexRef: RefObject<number>;
  readonly preAcademyLineRef: RefObject<IMetroLineSpec | null>;
  readonly preAcademyModeRef: RefObject<GameModeId>;
  readonly helpPausedGameRef: RefObject<boolean>;
  readonly helpOpenRef: RefObject<boolean>;
  readonly settingsOpenRef: RefObject<boolean>;
  readonly recordedGameOverRef: RefObject<boolean>;
  readonly toastQueueRef: RefObject<IAchievementSpec[]>;
  readonly activeToastRef: RefObject<IAchievementToast | null>;
  readonly photoModeActiveRef: RefObject<boolean>;
  readonly photoKeepInteriorRef: RefObject<boolean>;
  readonly photoKeysRef: RefObject<Set<string>>;
  readonly cctvPreviewOpenRef: RefObject<boolean>;
  readonly cctvChannelRef: RefObject<CctvPreviewChannel>;
  readonly cctvCanvasRef: RefObject<HTMLCanvasElement | null>;
  readonly paPanelOpenRef: RefObject<boolean>;
  readonly cabSwitchAppliedRef: RefObject<boolean>;
}
