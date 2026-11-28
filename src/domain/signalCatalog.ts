import { LINE_M1_STATIONS } from './routeData';
import type { ISemaphoreState, IStationSpec, SignalAspect } from './types';

export interface ISignalStepResult {
  readonly redSignalViolated: boolean;
  readonly clearedToGreen: boolean;
  readonly activeCautionLimitKmh: number | null;
  readonly waitingAtRedRemainingSec: number | null;
}

export interface IScriptedSignalConfig {
  readonly distanceM: number;
  readonly aspect: SignalAspect;
  readonly waitSec: number;
}

export interface ISignalController {
  setRedProbability?(probability: number): void;
  setDistances?(distances: readonly number[]): void;
  configureScriptedSignals?(configs: readonly IScriptedSignalConfig[]): void;
  cycleNextSignalAspect?(positionM: number): SignalAspect | null;
  reset(): void;
  step(prevPosM: number, nextPosM: number, speedKmh: number, dtSec: number): ISignalStepResult;
  getSignals(): readonly ISemaphoreState[];
  getNextSignal(positionM: number): ISemaphoreState | null;
}

export interface IMutableSemaphore {
  readonly id: number;
  readonly distanceM: number;
  aspect: SignalAspect;
  waitRequiredSec: number;
  waitElapsedSec: number;
  violated: boolean;
}

export function buildSemaphoreDistances(stations: readonly IStationSpec[]): readonly number[] {
  const distances: number[] = [];
  stations.forEach((station, idx) => {
    const midDistance = idx === 0 ? 250 : station.distanceM - 410;
    const homeDistance = station.distanceM - 105;
    distances.push(midDistance, homeDistance);
  });
  return distances;
}

export const SEMAPHORE_DISTANCES_M: readonly number[] = buildSemaphoreDistances(LINE_M1_STATIONS);

export function toSemaphoreSnapshot(s: IMutableSemaphore): ISemaphoreState {
  return {
    id: s.id,
    distanceM: s.distanceM,
    aspect: s.aspect,
    violated: s.violated,
    waitRemainingSec:
      s.aspect === 'red' && s.waitElapsedSec > 0
        ? Math.max(0, s.waitRequiredSec - s.waitElapsedSec)
        : null,
  };
}
