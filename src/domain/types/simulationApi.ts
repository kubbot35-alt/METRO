import type {
  ChallengeId,
  GameModeId,
  HeadlightMode,
  MetroLineId,
  TimeOfDayId,
  TrainModelId,
  WeatherModeId,
} from './coreTypes';
import type { PaAnnouncementId } from './gameplaySystemsTypes';
import type { IMetroLineSpec } from './routeAndTrackTypes';
import type { IAudioEvents, ISimulationSnapshot } from './simulationContracts';
import type { IControlInput, TrainLiveryId } from './trainAndPhysicsTypes';

export interface IMetroSimulation {
  getSnapshot(): ISimulationSnapshot;
  setMetroLine(lineId: MetroLineId): void;
  setMetroLineSpec?(spec: IMetroLineSpec): void;
  setGameMode(mode: GameModeId): void;
  setChallenge?(challengeId: ChallengeId): void;
  setWeatherMode?(mode: WeatherModeId): void;
  setTrainModel(modelId: TrainModelId): void;
  setTrainLivery?(liveryId: TrainLiveryId): void;
  setTimeOfDay(timeOfDayId: TimeOfDayId): void;
  triggerSandboxOncomingTrain(): void;
  cycleSandboxNextSignal(): void;
  toggleAto?(): boolean;
  toggleCabLight?(): boolean;
  cycleHeadlightMode?(): HeadlightMode;
  setSop2InterventionEnabled?(enabled: boolean): void;
  triggerPaAnnouncement?(id: PaAnnouncementId): {
    readonly accepted: boolean;
    readonly announcementId: number;
    readonly specId: PaAnnouncementId;
  };
  enterTurnaroundSiding?(): boolean;
  beginCabSwitch?(): boolean;
  completeCabSwitch?(reversedLine: IMetroLineSpec): boolean;
  setDepotHallStart?(enabled: boolean): void;
  setPassengerSeat?(seatId: 'window_left' | 'window_right' | 'behind_cab'): void;
  setPassengerCarIndex?(carIndex: number): void;
  setTrainspottingSpotIndex?(spotIndex: number): void;
  stepTrainspottingWalk?(deltaM: number): void;
  start(): void;
  pause(): void;
  resume(): void;
  reset(): void;
  step(input: IControlInput, dtSec: number): IAudioEvents;
}
