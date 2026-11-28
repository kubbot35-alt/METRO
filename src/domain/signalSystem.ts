import type { ISemaphoreState, SignalAspect } from './types';
import {
  SEMAPHORE_DISTANCES_M,
  buildSemaphoreDistances,
  toSemaphoreSnapshot,
  type IMutableSemaphore,
  type IScriptedSignalConfig,
  type ISignalController,
  type ISignalStepResult,
} from './signalCatalog';

export {
  SEMAPHORE_DISTANCES_M,
  buildSemaphoreDistances,
  type IScriptedSignalConfig,
  type ISignalController,
  type ISignalStepResult,
};

const RED_PROBABILITY = 0.2;
const CAUTION_SPEED_LIMIT_KMH = 30;
const WAIT_MIN_SEC = 5.0;
const WAIT_MAX_SEC = 8.0;
const STOP_DETECT_RANGE_M = 95;
const STOPPED_KMH = 0.35;

export class TunnelSignalSystem implements ISignalController {
  private distances: readonly number[];
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

  public setDistances(distances: readonly number[]): void {
    this.distances = distances;
    this.reset();
  }

  public setRedProbability(probability: number): void {
    this.redProbability = Math.max(0, Math.min(0.6, probability));
    this.reset();
  }

  public configureScriptedSignals(configs: readonly IScriptedSignalConfig[]): void {
    this.cautionActive = false;
    this.distances = configs.map((c) => c.distanceM);
    this.signals = configs.map((cfg, idx) => ({
      id: idx + 1, distanceM: cfg.distanceM, aspect: cfg.aspect,
      waitRequiredSec: cfg.waitSec, waitElapsedSec: 0, violated: false,
    }));
  }

  public cycleNextSignalAspect(positionM: number): SignalAspect | null {
    const next = this.findNextMutable(positionM);
    if (!next) return null;
    const nextAspect: SignalAspect =
      next.aspect === 'green' ? 'yellow' : next.aspect === 'yellow' ? 'red' : 'green';
    next.aspect = nextAspect;
    next.waitElapsedSec = 0;
    next.violated = false;
    if (nextAspect === 'green') this.cautionActive = false;
    return nextAspect;
  }

  public reset(): void {
    this.cautionActive = false;
    this.signals = this.distances.map((distanceM, idx) => ({
      id: idx + 1, distanceM, aspect: 'green',
      waitRequiredSec: WAIT_MIN_SEC + this.rng() * (WAIT_MAX_SEC - WAIT_MIN_SEC),
      waitElapsedSec: 0, violated: false,
    }));
    this.assignInitialAspects();
  }

  public step(prevPosM: number, nextPosM: number, speedKmh: number, dtSec: number): ISignalStepResult {
    const redSignalViolated = this.checkPassEvents(prevPosM, nextPosM);
    const { clearedToGreen, waitingRemaining } = this.updateRedClearance(nextPosM, speedKmh, dtSec);
    const nextSignal = this.findNextMutable(nextPosM);
    const approachingYellow =
      nextSignal !== null && nextSignal.aspect === 'yellow' && nextSignal.distanceM - nextPosM <= 140;
    return {
      redSignalViolated,
      clearedToGreen,
      activeCautionLimitKmh: this.cautionActive || approachingYellow ? CAUTION_SPEED_LIMIT_KMH : null,
      waitingAtRedRemainingSec: waitingRemaining,
    };
  }

  public getSignals(): readonly ISemaphoreState[] {
    return this.signals.map(toSemaphoreSnapshot);
  }

  public getNextSignal(positionM: number): ISemaphoreState | null {
    const next = this.findNextMutable(positionM);
    return next ? toSemaphoreSnapshot(next) : null;
  }

  private assignInitialAspects(): void {
    for (let i = 0; i < this.signals.length; i += 1) {
      const prevWasRed = i > 0 && this.signals[i - 1].aspect === 'red';
      if (!prevWasRed && this.rng() < this.redProbability) {
        this.signals[i].aspect = 'red';
        if (i > 0 && this.signals[i - 1].aspect === 'green') this.signals[i - 1].aspect = 'yellow';
      }
    }
  }

  private checkPassEvents(prevPosM: number, nextPosM: number): boolean {
    let violatedRed = false;
    for (let i = 0; i < this.signals.length; i += 1) {
      const sig = this.signals[i];
      if (prevPosM <= sig.distanceM && nextPosM > sig.distanceM) {
        if (this.applySignalPassage(sig)) violatedRed = true;
      }
    }
    return violatedRed;
  }

  private applySignalPassage(sig: IMutableSemaphore): boolean {
    if (sig.aspect === 'red' && !sig.violated) {
      sig.violated = true;
      this.cautionActive = false;
      return true;
    }
    if (sig.aspect === 'yellow') this.cautionActive = true;
    else if (sig.aspect === 'green') this.cautionActive = false;
    return false;
  }

  private updateRedClearance(
    positionM: number,
    speedKmh: number,
    dtSec: number,
  ): { clearedToGreen: boolean; waitingRemaining: number | null } {
    const next = this.findNextMutable(positionM);
    if (!next || next.aspect !== 'red') return { clearedToGreen: false, waitingRemaining: null };
    const distAhead = next.distanceM - positionM;
    if (distAhead <= 0 || distAhead > STOP_DETECT_RANGE_M || speedKmh > STOPPED_KMH) {
      return { clearedToGreen: false, waitingRemaining: null };
    }
    next.waitElapsedSec += dtSec;
    if (next.waitElapsedSec >= next.waitRequiredSec) {
      next.aspect = 'green';
      this.cautionActive = false;
      return { clearedToGreen: true, waitingRemaining: null };
    }
    return { clearedToGreen: false, waitingRemaining: Math.max(0, next.waitRequiredSec - next.waitElapsedSec) };
  }

  private findNextMutable(positionM: number): IMutableSemaphore | null {
    for (let i = 0; i < this.signals.length; i += 1) {
      if (this.signals[i].distanceM >= positionM) return this.signals[i];
    }
    return null;
  }
}
