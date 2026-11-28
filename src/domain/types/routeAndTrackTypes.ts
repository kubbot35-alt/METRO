import type {
  DoorSide,
  MetroLineId,
  OncomingTrainMode,
  PlatformLayout,
  RouteDirection,
  SignalAspect,
  TimeOfDayId,
  TrackAlignmentIntensity,
  TrainModelId,
} from './coreTypes';

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

export interface ISpeedLimitZone {
  readonly startM: number;
  readonly endM: number;
  readonly limitKmh: number;
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

export interface IStationProgress {
  readonly stationIndex: number;
  readonly station: IStationSpec;
  readonly distanceToTargetM: number;
  readonly inStopZone: boolean;
  readonly boarded: boolean;
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

export interface ITrackworkZone {
  readonly id: number;
  readonly startM: number;
  readonly endM: number;
  readonly limitKmh: number;
}
