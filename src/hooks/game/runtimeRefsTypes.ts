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
  GameModeId,
  IAchievementSpec,
  IAchievementToast,
  ICustomLineDraft,
  IGameSettings,
  IMetroLineSpec,
  IMetroSimulation,
  RouteDirection,
} from '../../domain/types';
import type { IGamepadController } from '../../input/gamepadController';
import type { IInputController } from '../../input/types';
import type { IMetroSceneRenderer } from '../../scene/types';

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
  readonly dispatchMapOpenRef: RefObject<boolean>;
  readonly cabSwitchAppliedRef: RefObject<boolean>;
}
