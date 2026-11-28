export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type DoorState = 'closed' | 'open';

export type DoorSide = 'left' | 'right';

export type SignalAspect = 'green' | 'yellow' | 'red';

export type FeedbackTone = 'neutral' | 'success' | 'warning' | 'danger';

export type TrainModelId = 'seria81' | 'inspiro' | 'varsovia';

export type TrainVisualTheme = 'retro' | 'modern' | 'varsovia';

export type PhotoFilterId = 'normal' | 'cinematic' | 'vhs' | 'noir';

export type CameraMode = 'cab' | 'mirror' | 'exterior' | 'interior' | 'bogie' | 'station';

export type CctvPreviewChannel = 'auto' | 'left' | 'right' | 'interior';

export type TimeOfDayId = 'rush' | 'evening' | 'night_service';

export type HeadlightMode = 'off' | 'low' | 'high';

export type MetroLineId = string;

export type RouteDirection = 'normal' | 'reverse';

export type TrackAlignmentIntensity = 'flat' | 'moderate' | 'curvy';

export type GameModeId = 'duty' | 'sandbox' | 'challenge' | 'academy' | 'passenger' | 'trainspotting';

export type LanguageId = 'pl' | 'en';

export type AtoStatus =
  | 'off'
  | 'cruising'
  | 'signal-hold'
  | 'approaching'
  | 'boarding'
  | 'departing';

export type ChallengeId = 'inverter_fault' | 'technical_run' | 'black_series' | 'night_service';

export type WeatherModeId = 'clear' | 'rain' | 'snow';

export type GraphicsQualityId = 'low' | 'medium' | 'high';

export type PlatformLayout = 'island' | 'side';

export type TouchControlsMode = 'auto' | 'on' | 'off';

export type OncomingTrainMode =
  | 'cruise'
  | 'station-arriving'
  | 'station-dwelling'
  | 'station-departing';

export type NightCrewStatus = 'upcoming' | 'approaching' | 'passed_ok' | 'violated';

export interface IWeatherState {
  readonly mode: WeatherModeId;
  readonly wipersOn: boolean;
  readonly wiperPhaseRad: number;
  readonly rainIntensity: number;
  readonly snowIntensity: number;
  readonly frostIntensity: number;
  readonly wetRailsActive: boolean;
  readonly wheelSlipActive: boolean;
}

export interface ILightingAndSparksState {
  readonly headlightMode: HeadlightMode;
  readonly cabLightOn: boolean;
  readonly dimHighBeamPromptActive: boolean;
  readonly highBeamCourtesyCount: number;
  readonly sparkIntensity: number;
  readonly sparkSide: DoorSide;
  readonly sparkEventId: number;
}

export interface INightCrewCheckpoint {
  readonly id: number;
  readonly distanceM: number;
  readonly side: DoorSide;
  readonly locationKind: 'tunnel' | 'station';
  readonly locationLabel: string;
  readonly status: NightCrewStatus;
  readonly hornSounded: boolean;
  readonly maxPassSpeedKmh: number;
}

export interface INightInspectionState {
  readonly active: boolean;
  readonly checkpoints: readonly INightCrewCheckpoint[];
  readonly activeApproachCrew: INightCrewCheckpoint | null;
  readonly activeApproachDistanceM: number | null;
  readonly speedSafeNow: boolean;
  readonly totalCount: number;
  readonly passedCount: number;
  readonly violatedCount: number;
}

export interface IGameSettings {
  readonly masterVolume: number;
  readonly trainVolume: number;
  readonly voiceVolume: number;
  readonly alertsVolume: number;
  readonly graphicsQuality: GraphicsQualityId;
  readonly cabFovDeg: number;
  readonly showFps: boolean;
  readonly gamepadVibration: boolean;
  readonly touchControlsMode: TouchControlsMode;
  readonly liveMirrorsEnabled: boolean;
  readonly sop2InterventionEnabled: boolean;
  readonly language: LanguageId;
}
