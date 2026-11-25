export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type DoorState = 'closed' | 'open';

export type SignalAspect = 'green' | 'yellow' | 'red';

export type FeedbackTone = 'neutral' | 'success' | 'warning' | 'danger';

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
  readonly accentHex: number;
}

export interface ISpeedLimitZone {
  readonly startM: number;
  readonly endM: number;
  readonly limitKmh: number;
}

export interface IControlInput {
  readonly throttleUp: boolean;
  readonly throttleDown: boolean;
  readonly serviceBrake: boolean;
  readonly emergencyBrakePressed: boolean;
  readonly forceEmergencyBrake?: boolean;
  readonly toggleDoorsPressed: boolean;
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
  step(
    current: ITrainKinematics,
    input: IControlInput,
    doorsOpen: boolean,
    dtSec: number,
  ): ITrainKinematics;
}

export interface IStopEvaluation {
  readonly points: number;
  readonly label: string;
  readonly tone: FeedbackTone;
  readonly offsetM: number;
}

export interface IScoringEvaluator {
  evaluateStop(offsetM: number): IStopEvaluation;
  getOverspeedPenalty(): number;
  getMissedStationPenalty(): number;
  getEmergencyBrakePenalty(): number;
  getRedSignalPenalty(): number;
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
}

export interface ISimulationSnapshot {
  readonly phase: GamePhase;
  readonly kinematics: ITrainKinematics;
  readonly speedLimitKmh: number;
  readonly isOverspeeding: boolean;
  readonly doorState: DoorState;
  readonly canToggleDoors: boolean;
  readonly boardingTimerSec: number;
  readonly boardingDurationSec: number;
  readonly boardingCompletedForCurrent: boolean;
  readonly currentStation: IStationProgress;
  readonly signals: readonly ISemaphoreState[];
  readonly nextSignal: ISemaphoreProgress | null;
  readonly atpActive: boolean;
  readonly totalStations: number;
  readonly stationsServed: number;
  readonly stationsMissed: number;
  readonly score: number;
  readonly penaltiesCount: number;
  readonly totalStopErrorM: number;
  readonly elapsedTimeSec: number;
  readonly feedback: IFeedbackMessage | null;
  readonly hornActive: boolean;
}

export interface IMetroSimulation {
  getSnapshot(): ISimulationSnapshot;
  start(): void;
  pause(): void;
  resume(): void;
  reset(): void;
  step(input: IControlInput, dtSec: number): IAudioEvents;
}
