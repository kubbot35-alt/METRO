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
  syncLeadingTrainBlocks?(leadPosM: number | null, trainLengthM?: number): void;
  reset(): void;
  step(prevPosM: number, nextPosM: number, speedKmh: number, dtSec: number): ISignalStepResult;
  getSignals(): readonly ISemaphoreState[];
  getNextSignal(positionM: number): ISemaphoreState | null;
}

export interface IMutableSemaphore {
  readonly id: number;
  readonly distanceM: number;
  aspect: SignalAspect;
  baseAspect: SignalAspect;
  blockOverride: SignalAspect | null;
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

function setBlockOverride(sig: IMutableSemaphore | undefined, aspect: SignalAspect): void {
  if (!sig || (aspect === 'yellow' && sig.aspect === 'red')) return;
  sig.blockOverride = aspect;
  sig.aspect = aspect;
}

export function applyLeadingTrainBlockOverrides(
  signals: readonly IMutableSemaphore[],
  leadPosM: number | null,
  trainLengthM: number,
): void {
  for (let i = 0; i < signals.length; i += 1) {
    const sig = signals[i];
    if (sig.blockOverride !== null) { sig.blockOverride = null; sig.aspect = sig.baseAspect; }
  }
  if (leadPosM === null) return;
  let occIdx = -1;
  for (let i = 0; i < signals.length; i += 1) {
    if (signals[i].distanceM <= leadPosM) occIdx = i;
    else break;
  }
  if (occIdx < 0) return;
  setBlockOverride(signals[occIdx], 'red');
  if (leadPosM - trainLengthM < signals[occIdx].distanceM && occIdx - 1 >= 0) {
    setBlockOverride(signals[occIdx - 1], 'red');
    setBlockOverride(signals[occIdx - 2], 'yellow');
  } else {
    setBlockOverride(signals[occIdx - 1], 'yellow');
  }
}
