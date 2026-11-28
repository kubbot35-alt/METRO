import type { GraphicsQualityId, MetroLineId, PhotoFilterId, TimeOfDayId, TrainModelId } from './coreTypes';
import type { IAchievementSpec } from './gameplaySystemsTypes';

export type DriverGrade = 'S' | 'A' | 'B' | 'C' | 'D';

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
  readonly ecoXp: number;
  readonly modeMultiplier: number;
  readonly previousRank: IDriverRankSpec;
  readonly newRank: IDriverRankSpec;
  readonly rankedUp: boolean;
  readonly totalXpAfter: number;
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
