import { LINE_M1_STATIONS } from './routeData';
import type { ISemaphoreState, IStationSpec, SignalAspect } from './types';

export interface ISignalStepResult {
  readonly redSignalViolated: boolean;
  readonly clearedToGreen: boolean;
  readonly activeCautionLimitKmh: number | null;
  readonly waitingAtRedRemainingSec: number | null;
}

export interface ISignalController {
  setRedProbability?(probability: number): void;
  reset(): void;
  step(prevPosM: number, nextPosM: number, speedKmh: number, dtSec: number): ISignalStepResult;
  getSignals(): readonly ISemaphoreState[];
  getNextSignal(positionM: number): ISemaphoreState | null;
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

const RED_PROBABILITY = 0.2;
const CAUTION_SPEED_LIMIT_KMH = 30;
const WAIT_MIN_SEC = 5.0;
const WAIT_MAX_SEC = 8.0;
const STOP_DETECT_RANGE_M = 95;
const STOPPED_KMH = 0.35;

interface IMutableSemaphore {
  readonly id: number;
  readonly distanceM: number;
  aspect: SignalAspect;
  waitRequiredSec: number;
  waitElapsedSec: number;
  violated: boolean;
}

export class TunnelSignalSystem implements ISignalController {
  private readonly distances: readonly number[];
  private readonly rng: () => number;
  private redProbability = RED_PROBABILITY;
  private signals: IMutableSemaphore[] = [];
  private cautionActive = false;

  public constructor(
    distances: readonly number[] = SEMAPHORE_DISTANCES_M,
    rng: () => number = Math.random,
  ) {
    this.distances = distances;
    this.rng = rng;
    this.reset();
  }

  public setRedProbability(probability: number): void {
    this.redProbability = Math.max(0, Math.min(0.6, probability));
    this.reset();
  }

  public reset(): void {
    this.cautionActive = false;
    this.signals = this.distances.map((distanceM, idx) => ({
      id: idx + 1,
      distanceM,
      aspect: 'green',
      waitRequiredSec: WAIT_MIN_SEC + this.rng() * (WAIT_MAX_SEC - WAIT_MIN_SEC),
      waitElapsedSec: 0,
      violated: false,
    }));
    this.assignInitialAspects();
  }

  public step(
    prevPosM: number,
    nextPosM: number,
    speedKmh: number,
    dtSec: number,
  ): ISignalStepResult {
    const redSignalViolated = this.checkPassEvents(prevPosM, nextPosM);
    const { clearedToGreen, waitingRemaining } = this.updateRedClearance(nextPosM, speedKmh, dtSec);
    const nextSignal = this.findNextMutable(nextPosM);
    const approachingYellow =
      nextSignal !== null &&
      nextSignal.aspect === 'yellow' &&
      nextSignal.distanceM - nextPosM <= 140;

    return {
      redSignalViolated,
      clearedToGreen,
      activeCautionLimitKmh: this.cautionActive || approachingYellow ? CAUTION_SPEED_LIMIT_KMH : null,
      waitingAtRedRemainingSec: waitingRemaining,
    };
  }

  public getSignals(): readonly ISemaphoreState[] {
    return this.signals.map((s) => ({
      id: s.id,
      distanceM: s.distanceM,
      aspect: s.aspect,
      violated: s.violated,
      waitRemainingSec:
        s.aspect === 'red' && s.waitElapsedSec > 0
          ? Math.max(0, s.waitRequiredSec - s.waitElapsedSec)
          : null,
    }));
  }

  public getNextSignal(positionM: number): ISemaphoreState | null {
    const next = this.findNextMutable(positionM);
    if (!next) {
      return null;
    }
    return {
      id: next.id,
      distanceM: next.distanceM,
      aspect: next.aspect,
      violated: next.violated,
      waitRemainingSec:
        next.aspect === 'red' && next.waitElapsedSec > 0
          ? Math.max(0, next.waitRequiredSec - next.waitElapsedSec)
          : null,
    };
  }

  private assignInitialAspects(): void {
    for (let i = 0; i < this.signals.length; i += 1) {
      const prevWasRed = i > 0 && this.signals[i - 1].aspect === 'red';
      if (!prevWasRed && this.rng() < this.redProbability) {
        this.signals[i].aspect = 'red';
        if (i > 0 && this.signals[i - 1].aspect === 'green') {
          this.signals[i - 1].aspect = 'yellow';
        }
      }
    }
  }

  private checkPassEvents(prevPosM: number, nextPosM: number): boolean {
    let violatedRed = false;
    for (let i = 0; i < this.signals.length; i += 1) {
      const sig = this.signals[i];
      if (prevPosM <= sig.distanceM && nextPosM > sig.distanceM) {
        if (sig.aspect === 'red' && !sig.violated) {
          sig.violated = true;
          violatedRed = true;
          this.cautionActive = false;
        } else if (sig.aspect === 'yellow') {
          this.cautionActive = true;
        } else if (sig.aspect === 'green') {
          this.cautionActive = false;
        }
      }
    }
    return violatedRed;
  }

  private updateRedClearance(
    positionM: number,
    speedKmh: number,
    dtSec: number,
  ): { clearedToGreen: boolean; waitingRemaining: number | null } {
    const next = this.findNextMutable(positionM);
    if (!next || next.aspect !== 'red') {
      return { clearedToGreen: false, waitingRemaining: null };
    }
    const distAhead = next.distanceM - positionM;
    if (distAhead > 0 && distAhead <= STOP_DETECT_RANGE_M && speedKmh <= STOPPED_KMH) {
      next.waitElapsedSec += dtSec;
      if (next.waitElapsedSec >= next.waitRequiredSec) {
        next.aspect = 'green';
        this.cautionActive = false;
        return { clearedToGreen: true, waitingRemaining: null };
      }
      return {
        clearedToGreen: false,
        waitingRemaining: Math.max(0, next.waitRequiredSec - next.waitElapsedSec),
      };
    }
    return { clearedToGreen: false, waitingRemaining: null };
  }

  private findNextMutable(positionM: number): IMutableSemaphore | null {
    for (let i = 0; i < this.signals.length; i += 1) {
      if (this.signals[i].distanceM >= positionM) {
        return this.signals[i];
      }
    }
    return null;
  }
}
