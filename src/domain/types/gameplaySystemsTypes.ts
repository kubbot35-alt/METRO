import type { ChallengeId, DoorSide, FeedbackTone, TimeOfDayId } from './coreTypes';
import type { AchievementId } from './telemetryAndCareerTypes';

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

export type RadioDispatchCategory = 'traffic' | 'platform' | 'slippery' | 'inspection' | 'headway';

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

export type AcademyStepNumber = 1 | 2 | 3 | 4 | 5;

export type AcademyHighlightTarget =
  | 'headlights' | 'horn' | 'throttle' | 'signal'
  | 'czuwak' | 'radio' | 'doors-left' | 'doors-right' | null;

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

export interface ICameraNotice {
  readonly id: number;
  readonly label: string;
  readonly remainingSec: number;
}

export interface IFeedbackMessage {
  readonly id: number;
  readonly text: string;
  readonly pointsDelta: number;
  readonly tone: FeedbackTone;
  readonly remainingSec: number;
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

export interface IDoorFaultState {
  readonly phase: DoorFaultPhase;
  readonly remainingSec: number;
}

export interface ICzuwakState {
  readonly active: boolean;
  readonly remainingSec: number;
  readonly maxWindowSec: number;
}

export type ComfortEventKind = 'harsh_brake' | 'emergency_brake' | 'lever_jerk' | 'fast_curve';

export interface IPassengerComfortState {
  readonly currentPercent: number;
  readonly averagePercent: number;
  readonly longitudinalG: number;
  readonly lateralG: number;
  readonly totalG: number;
  readonly smoothDrivingActive: boolean;
  readonly harshEventsCount: number;
  readonly endBonusPoints: number;
}

export type PaAnnouncementId = 'stand_clear_doors' | 'tunnel_stop_apology' | 'wet_rails_caution';

export interface IPaAnnouncementSpec {
  readonly id: PaAnnouncementId;
  readonly shortTitlePl: string;
  readonly shortTitleEn: string;
  readonly textPl: string;
  readonly textEn: string;
  readonly effectHintPl: string;
  readonly effectHintEn: string;
  readonly cooldownSec: number;
}

export interface IPaActiveMessage {
  readonly id: number;
  readonly specId: PaAnnouncementId;
  readonly textPl: string;
  readonly textEn: string;
  readonly remainingSec: number;
}

export interface IPaIntercomState {
  readonly activeMessage: IPaActiveMessage | null;
  readonly cooldownRemainingSec: number;
  readonly announcementsUsedCount: number;
  readonly doorFaultProtectionActive: boolean;
}

export type TurnaroundPhase = 'inactive' | 'entering_siding' | 'ready_to_switch' | 'switching_cab';

export interface ITurnaroundState {
  readonly phase: TurnaroundPhase;
  readonly canEnterSiding: boolean;
  readonly sidingStartM: number;
  readonly bufferStopM: number;
  readonly distanceToBufferM: number;
  readonly inStopZone: boolean;
  readonly maxSidingSpeedKmh: number;
  readonly switchProgress: number;
  readonly legsCompleted: number;
  readonly cumulativeDistanceM: number;
}

export type Sop2Status = 'normal' | 'warning' | 'intervention';

export type Sop2TargetReason = 'curve' | 'station' | 'signal' | 'trackwork' | 'zone' | null;

export interface ISop2State {
  readonly currentLimitKmh: number;
  readonly targetLimitKmh: number | null;
  readonly targetDistanceM: number | null;
  readonly targetReason: Sop2TargetReason;
  readonly status: Sop2Status;
  readonly excessKmh: number;
  readonly overspeedHoldSec: number;
  readonly interventionActive: boolean;
  readonly interventionEnabled: boolean;
  readonly interventionsCount: number;
}
