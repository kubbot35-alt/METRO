export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type DoorState = 'closed' | 'open';

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

export type GameModeId = 'duty' | 'sandbox' | 'challenge' | 'academy' | 'passenger';

export type LanguageId = 'pl' | 'en';

export type AtoStatus =
  | 'off'
  | 'cruising'
  | 'signal-hold'
  | 'approaching'
  | 'boarding'
  | 'departing';

export type ChallengeId = 'inverter_fault' | 'technical_run' | 'black_series' | 'night_service';

export type WeatherModeId = 'clear' | 'rain';

export type GraphicsQualityId = 'low' | 'medium' | 'high';

export type PlatformLayout = 'island' | 'side';

export type DoorSide = 'left' | 'right';

export type OncomingTrainMode =
  | 'cruise'
  | 'station-arriving'
  | 'station-dwelling'
  | 'station-departing';

export type AchievementId =
  | 'punctual_clockwork'
  | 'flawless_duty'
  | 'classic_driver'
  | 'm2_master'
  | 'night_owl'
  | 'nerves_of_steel'
  | 'first_station_stop'
  | 'precision_stop'
  | 'passenger_carrier'
  | 'challenge_inverter_fault'
  | 'challenge_technical_run'
  | 'challenge_black_series'
  | 'academy_license'
  | 'night_inspector';

export interface IAchievementSpec {
  readonly id: AchievementId;
  readonly title: string;
  readonly description: string;
  readonly category: 'course' | 'skill' | 'milestone' | 'challenge';
}

export interface IChallengeSpec {
  readonly id: ChallengeId;
  readonly title: string;
  readonly shortLabel: string;
  readonly badge: string;
  readonly description: string;
  readonly objectiveSummary: string;
  readonly tractionMultiplier: number;
  readonly skipStations: boolean;
  readonly stationPassLimitKmh: number | null;
  readonly maxAllowedDelaySec: number | null;
  readonly forceTimeOfDay: TimeOfDayId | null;
  readonly redSignalProbability: number | null;
  readonly doorFaultProbability: number | null;
  readonly czuwakMinSec: number | null;
  readonly czuwakMaxSec: number | null;
  readonly rewardAchievementId: AchievementId;
}

export interface IChallengeOutcome {
  readonly passed: boolean;
  readonly reason: string;
}

export type RadioDispatchCategory = 'traffic' | 'platform' | 'slippery' | 'inspection';

export interface IRadioDispatchState {
  readonly active: boolean;
  readonly messageId: number;
  readonly text: string;
  readonly spokenText: string;
  readonly stationName?: string;
  readonly category: RadioDispatchCategory;
  readonly remainingSec: number;
  readonly maxWindowSec: number;
  readonly acknowledgedCount: number;
  readonly slipperyRailsActive: boolean;
}

export interface IWeatherState {
  readonly mode: WeatherModeId;
  readonly wipersOn: boolean;
  readonly wiperPhaseRad: number;
  readonly rainIntensity: number;
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

export type NightCrewStatus = 'upcoming' | 'approaching' | 'passed_ok' | 'violated';

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

export type TouchControlsMode = 'auto' | 'on' | 'off';

export interface IGameSettings {
  readonly masterVolume: number;
  readonly trainVolume: number;
  readonly voiceVolume: number;
  readonly graphicsQuality: GraphicsQualityId;
  readonly cabFovDeg: number;
  readonly showFps: boolean;
  readonly gamepadVibration: boolean;
  readonly touchControlsMode: TouchControlsMode;
  readonly liveMirrorsEnabled: boolean;
  readonly language: LanguageId;
}

export type TachographViolationKind = 'overspeed' | 'red_signal' | 'czuwak';

export interface ITachographSample {
  readonly timeSec: number;
  readonly distanceM: number;
  readonly speedKmh: number;
  readonly speedLimitKmh: number;
}

export interface ITachographStationMark {
  readonly timeSec: number;
  readonly distanceM: number;
  readonly stationCode: string;
  readonly stationName: string;
}

export interface ITachographViolationMark {
  readonly timeSec: number;
  readonly distanceM: number;
  readonly speedKmh: number;
  readonly kind: TachographViolationKind;
}

export interface ITachographSnapshot {
  readonly samples: readonly ITachographSample[];
  readonly stationMarks: readonly ITachographStationMark[];
  readonly violationMarks: readonly ITachographViolationMark[];
  readonly maxSpeedKmh: number;
  readonly totalDurationSec: number;
  readonly totalDistanceM: number;
}

export interface IGhostStationSplit {
  readonly stationIndex: number;
  readonly stationCode: string;
  readonly elapsedTimeSec: number;
  readonly score: number;
}

export interface ILineGhostRecord {
  readonly lineId: MetroLineId;
  readonly finalScore: number;
  readonly totalTimeSec: number;
  readonly recordedAtIso: string;
  readonly splits: readonly IGhostStationSplit[];
}

export interface IGhostDeltaSnapshot {
  readonly lineId: MetroLineId;
  readonly ghostBestScore: number;
  readonly ghostTotalTimeSec: number;
  readonly hasSplitComparison: boolean;
  readonly lastStationCode: string | null;
  readonly scoreDelta: number;
  readonly timeDeltaSec: number;
  readonly isScoreAhead: boolean;
  readonly isTimeAhead: boolean;
}

export type AcademyStepNumber = 1 | 2 | 3 | 4 | 5;

export type AcademyHighlightTarget =
  | 'headlights'
  | 'horn'
  | 'throttle'
  | 'signal'
  | 'czuwak'
  | 'radio'
  | 'doors-left'
  | 'doors-right'
  | null;

export interface IAcademySubTask {
  readonly label: string;
  readonly done: boolean;
}

export interface IAcademySnapshot {
  readonly currentStep: AcademyStepNumber;
  readonly totalSteps: number;
  readonly title: string;
  readonly instruction: string;
  readonly gamepadHint: string;
  readonly subTasks: readonly IAcademySubTask[];
  readonly highlightTarget: AcademyHighlightTarget;
  readonly completed: boolean;
  readonly stepFlashSec: number;
}

export type GamepadBrand = 'xbox' | 'playstation' | 'generic';

export interface IGamepadStatus {
  readonly connected: boolean;
  readonly name: string;
  readonly brand: GamepadBrand;
  readonly supportsVibration: boolean;
}

export interface IGamepadButtonMapping {
  readonly action: string;
  readonly xbox: string;
  readonly playstation: string;
  readonly keyboard: string;
}

export interface IGraphicsQualityPreset {
  readonly id: GraphicsQualityId;
  readonly label: string;
  readonly description: string;
  readonly drawDistanceM: number;
  readonly passengerDensity: number;
  readonly rainDensity: number;
  readonly pixelRatioCap: number;
  readonly enableShadows: boolean;
  readonly mirrorUpdateInterval: number;
}

export interface IAchievementRecord {
  readonly id: AchievementId;
  readonly unlockedAtIso: string;
}

export interface IAchievementToast {
  readonly spec: IAchievementSpec;
  readonly remainingSec: number;
}

export interface ICurveZoneSpec {
  readonly startM: number;
  readonly endM: number;
  readonly direction: 'left' | 'right';
  readonly maxCurvatureRadPerM: number;
  readonly speedLimitKmh?: number;
  readonly signDistanceM?: number;
}

export interface ITrackSample {
  readonly distanceM: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  readonly pitch: number;
  readonly gradeFraction: number;
  readonly gradePercent: number;
  readonly curvatureRadPerM: number;
  readonly cantRollRad: number;
  readonly turnoutSwayFactor: number;
  readonly outdoorBlend: number;
}

export interface ITrackProfileSnapshot {
  readonly gradePercent: number;
  readonly elevationM: number;
  readonly curvatureRadPerM: number;
  readonly cantRollRad: number;
  readonly turnoutSwayFactor: number;
  readonly outdoorBlend: number;
  readonly inCurveLimitZone: boolean;
  readonly upcomingCurveLimitKmh: number | null;
  readonly upcomingCurveDistanceM: number | null;
}

export interface ICustomStationDraft {
  readonly name: string;
  readonly wallHex: string;
  readonly platformLayout: PlatformLayout;
  readonly spacingFromPrevM: number;
}

export interface ICustomLineDraft {
  readonly id: string;
  readonly name: string;
  readonly destinationLed: string;
  readonly cssColor: string;
  readonly hasSurfaceStart: boolean;
  readonly alignmentIntensity: TrackAlignmentIntensity;
  readonly stations: readonly ICustomStationDraft[];
}

export interface IMetroLineSpec {
  readonly id: MetroLineId;
  readonly badgeCode?: string;
  readonly isCustom?: boolean;
  readonly name: string;
  readonly routeLabel: string;
  readonly destinationLed: string;
  readonly oppositeDestinationLed: string;
  readonly colorHex: number;
  readonly cssColor: string;
  readonly hasSurfaceStart: boolean;
  readonly tunnelPortalDistanceM: number | null;
  readonly alignmentIntensity?: TrackAlignmentIntensity;
  readonly direction?: RouteDirection;
  readonly startStationIndex?: number;
  readonly fullStationCount?: number;
  readonly stations: readonly IStationSpec[];
  readonly speedZones: readonly ISpeedLimitZone[];
}

export type DriverRankId =
  | 'trainee'
  | 'junior'
  | 'driver'
  | 'senior'
  | 'instructor'
  | 'legend';

export interface IDriverRankSpec {
  readonly id: DriverRankId;
  readonly title: string;
  readonly minXp: number;
  readonly badgeColor: string;
  readonly description: string;
}

export interface IDriverProfileStats {
  readonly totalDistanceKm: number;
  readonly totalPassengers: number;
  readonly completedCourses: number;
  readonly totalDriveTimeSec: number;
  readonly highestGrade: DriverGrade | null;
  readonly punctualArrivals: number;
  readonly totalArrivals: number;
  readonly xp: number;
}

export interface ICourseXpReward {
  readonly gainedXp: number;
  readonly baseXp: number;
  readonly distanceXp: number;
  readonly scoreXp: number;
  readonly modeMultiplier: number;
  readonly previousRank: IDriverRankSpec;
  readonly newRank: IDriverRankSpec;
  readonly rankedUp: boolean;
  readonly totalXpAfter: number;
}

export interface ITimeOfDaySpec {
  readonly id: TimeOfDayId;
  readonly name: string;
  readonly clockLabel: string;
  readonly description: string;
  readonly startClockSec: number;
  readonly boardingDurationSec: number;
  readonly passengerMultiplier: number;
  readonly redSignalProbability: number;
  readonly trafficSpawnMinSec: number;
  readonly trafficSpawnMaxSec: number;
  readonly stationLightIntensityA: number;
  readonly stationLightIntensityB: number;
  readonly ambientLightIntensity: number;
  readonly stationLightColorHex: number;
  readonly fogDensity: number;
}

export interface ILeaderboardEntry {
  readonly id: string;
  readonly score: number;
  readonly grade: DriverGrade;
  readonly trainModelId: TrainModelId;
  readonly trainName: string;
  readonly timeOfDayId: TimeOfDayId;
  readonly timeOfDayLabel: string;
  readonly dateIso: string;
}

export interface ITrainAudioProfile {
  readonly baseFreqHz: number;
  readonly maxFreqSpanHz: number;
  readonly harmonicRatio: number;
  readonly gainScale: number;
  readonly waveMain: 'triangle' | 'sawtooth' | 'sine';
  readonly waveHarm: 'sawtooth' | 'sine';
  readonly regenerativeHum?: boolean;
  readonly brakeSquealScale?: number;
}

export interface ITrainVisualProfile {
  readonly bodyHex: number;
  readonly stripeHex: number;
  readonly roofHex: number;
  readonly noseHex: number;
  readonly cabAccentHex: number;
  readonly theme: TrainVisualTheme;
}

export interface IPhotoFilterSpec {
  readonly id: PhotoFilterId;
  readonly label: string;
  readonly shortDesc: string;
  readonly cssFilter: string;
}

export interface IPhotoCameraState {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  readonly pitch: number;
  readonly rollDeg: number;
  readonly fovDeg: number;
  readonly filter: PhotoFilterId;
}

export interface IPhotoMoveInput {
  readonly forward: boolean;
  readonly backward: boolean;
  readonly left: boolean;
  readonly right: boolean;
  readonly up: boolean;
  readonly down: boolean;
  readonly boost: boolean;
}

export interface ITrainModelSpec {
  readonly id: TrainModelId;
  readonly name: string;
  readonly subtitle: string;
  readonly description: string;
  readonly massLabel: string;
  readonly accelLabel: string;
  readonly brakeLabel: string;
  readonly physics: ITrainPhysicsConfig;
  readonly audio: ITrainAudioProfile;
  readonly visual: ITrainVisualProfile;
}

export interface ICameraNotice {
  readonly id: number;
  readonly label: string;
  readonly remainingSec: number;
}

export interface IOncomingTrainState {
  readonly active: boolean;
  readonly mode: OncomingTrainMode;
  readonly stationIndex: number | null;
  readonly positionM: number;
  readonly speedMs: number;
  readonly modelId: TrainModelId;
  readonly doorsOpen: boolean;
  readonly doorSide: DoorSide | null;
  readonly headlightsOn: boolean;
}

export interface ISemaphoreState {
  readonly id: number;
  readonly distanceM: number;
  readonly aspect: SignalAspect;
  readonly violated: boolean;
  readonly waitRemainingSec: number | null;
}

export interface ISemaphoreProgress {
  readonly signal: ISemaphoreState;
  readonly distanceAheadM: number;
}

export interface IFeedbackMessage {
  readonly id: number;
  readonly text: string;
  readonly pointsDelta: number;
  readonly tone: FeedbackTone;
  readonly remainingSec: number;
}

export interface IStationSpec {
  readonly id: number;
  readonly name: string;
  readonly code: string;
  readonly distanceM: number;
  readonly stopZoneHalfWidthM: number;
  readonly platformLengthM: number;
  readonly platformLayout?: PlatformLayout;
  readonly platformSide?: DoorSide;
  readonly accentHex: number;
  readonly wallBaseHex?: number;
  readonly waitingPassengers: number;
}

export interface IAnnouncementState {
  readonly id: number;
  readonly text: string;
  readonly spokenText?: string;
  readonly stationName?: string;
  readonly platformSide?: DoorSide;
  readonly kind: 'next' | 'arrival';
  readonly remainingSec: number;
}

export interface ISpeedLimitZone {
  readonly startM: number;
  readonly endM: number;
  readonly limitKmh: number;
}

export type DriverGrade = 'S' | 'A' | 'B' | 'C' | 'D';

export type PunctualityStatus = 'on-time' | 'slight-delay' | 'heavy-delay';

export type DoorFaultPhase = 'none' | 'awaiting-retry' | 'resetting';

export interface IScheduleSnapshot {
  readonly currentClockSec: number;
  readonly nextArrivalClockSec: number;
  readonly deviationSec: number;
  readonly status: PunctualityStatus;
  readonly averageDeviationSec: number;
  readonly punctualitySamples: number;
  readonly punctualArrivalsCount?: number;
}

export interface ITrackworkZone {
  readonly id: number;
  readonly startM: number;
  readonly endM: number;
  readonly limitKmh: number;
}

export interface IDoorFaultState {
  readonly phase: DoorFaultPhase;
  readonly remainingSec: number;
}

export interface ICzuwakState {
  readonly active: boolean;
  readonly remainingSec: number;
  readonly maxWindowSec: number;
}

export interface IControlInput {
  readonly throttleUp: boolean;
  readonly throttleDown: boolean;
  readonly serviceBrake: boolean;
  readonly emergencyBrakePressed: boolean;
  readonly forceEmergencyBrake?: boolean;
  readonly toggleDoorsPressed: boolean;
  readonly toggleDoorsLeftPressed?: boolean;
  readonly toggleDoorsRightPressed?: boolean;
  readonly toggleHeadlightsPressed?: boolean;
  readonly toggleCabLightPressed?: boolean;
  readonly toggleWipersPressed?: boolean;
  readonly acknowledgeCzuwakPressed?: boolean;
  readonly acknowledgeRadioPressed?: boolean;
  readonly cycleCameraPressed?: boolean;
  readonly toggleAtoPressed?: boolean;
  readonly manualLeverAxis?: number | null;
  readonly hornActive: boolean;
}

export interface ITrainKinematics {
  readonly positionM: number;
  readonly speedMs: number;
  readonly speedKmh: number;
  readonly throttle: number;
  readonly serviceBrake: number;
  readonly emergencyBrake: boolean;
  readonly netAccelerationMs2: number;
}

export interface ITrainPhysicsConfig {
  readonly massKg: number;
  readonly maxTractionForceN: number;
  readonly maxServiceBrakeForceN: number;
  readonly emergencyBrakeForceN: number;
  readonly rollingResistanceCoeff: number;
  readonly aeroDragCoeff: number;
  readonly maxSpeedKmh: number;
  readonly throttleRatePerSec: number;
  readonly brakeRampPerSec: number;
}

export interface ITrainPhysicsModel {
  setConfig?(config: ITrainPhysicsConfig): void;
  step(
    current: ITrainKinematics,
    input: IControlInput,
    doorsOpen: boolean,
    dtSec: number,
    gradeFraction?: number,
    tractionMultiplier?: number,
    brakeGripMultiplier?: number,
  ): ITrainKinematics;
}

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
  evaluatePunctuality(deviationSec: number): { readonly points: number; readonly label: string; readonly tone: FeedbackTone };
  evaluateGrade(stats: IGradeInput): DriverGrade;
  getOverspeedPenalty(): number;
  getMissedStationPenalty(): number;
  getEmergencyBrakePenalty(): number;
  getRedSignalPenalty(): number;
  getCzuwakPenalty(): number;
  getWrongDoorSidePenalty?(): number;
}

export interface IStationProgress {
  readonly stationIndex: number;
  readonly station: IStationSpec;
  readonly distanceToTargetM: number;
  readonly inStopZone: boolean;
  readonly boarded: boolean;
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
  readonly headlightsOn: boolean;
  readonly headlightMode: HeadlightMode;
  readonly cabLightOn: boolean;
  readonly lightingEffects: ILightingAndSparksState;
  readonly nightInspection: INightInspectionState;
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

export interface IMetroSimulation {
  getSnapshot(): ISimulationSnapshot;
  setMetroLine(lineId: MetroLineId): void;
  setMetroLineSpec?(spec: IMetroLineSpec): void;
  setGameMode(mode: GameModeId): void;
  setChallenge?(challengeId: ChallengeId): void;
  setWeatherMode?(mode: WeatherModeId): void;
  setTrainModel(modelId: TrainModelId): void;
  setTimeOfDay(timeOfDayId: TimeOfDayId): void;
  triggerSandboxOncomingTrain(): void;
  cycleSandboxNextSignal(): void;
  toggleAto?(): boolean;
  toggleCabLight?(): boolean;
  cycleHeadlightMode?(): HeadlightMode;
  start(): void;
  pause(): void;
  resume(): void;
  reset(): void;
  step(input: IControlInput, dtSec: number): IAudioEvents;
}
