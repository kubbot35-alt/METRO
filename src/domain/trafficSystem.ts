import type { IOncomingTrainState, TrainModelId } from './types';

export interface ITrafficStepResult {
  readonly passingTrainWhoosh: boolean;
}

export interface ITrafficController {
  setSpawnIntervalRange?(minSec: number, maxSec: number): void;
  reset(): void;
  step(playerPositionM: number, dtSec: number): ITrafficStepResult;
  getState(): IOncomingTrainState;
}

const SPAWN_MIN_INTERVAL_SEC = 40;
const SPAWN_MAX_INTERVAL_SEC = 70;
const SPAWN_AHEAD_DIST_M = 270;
const DESPAWN_BEHIND_DIST_M = 125;
const WHOOSH_TRIGGER_DIST_M = 20;

export class OppositeTrackTrafficSystem implements ITrafficController {
  private readonly rng: () => number;
  private spawnMinSec = SPAWN_MIN_INTERVAL_SEC;
  private spawnMaxSec = SPAWN_MAX_INTERVAL_SEC;
  private nextSpawnCountdownSec = 45;
  private active = false;
  private positionM = 0;
  private speedMs = 21;
  private modelId: TrainModelId = 'inspiro';
  private whooshTriggeredForPass = false;

  public constructor(rng: () => number = Math.random) {
    this.rng = rng;
    this.reset();
  }

  public setSpawnIntervalRange(minSec: number, maxSec: number): void {
    this.spawnMinSec = Math.max(10, minSec);
    this.spawnMaxSec = Math.max(this.spawnMinSec, maxSec);
    this.reset();
  }

  public reset(): void {
    this.active = false;
    this.positionM = 0;
    this.whooshTriggeredForPass = false;
    this.nextSpawnCountdownSec = this.rollNextInterval();
  }

  public step(playerPositionM: number, dtSec: number): ITrafficStepResult {
    if (!this.active) {
      this.nextSpawnCountdownSec -= dtSec;
      if (this.nextSpawnCountdownSec <= 0) {
        this.spawnAhead(playerPositionM);
      }
      return { passingTrainWhoosh: false };
    }

    const prevDist = this.positionM - playerPositionM;
    this.positionM -= this.speedMs * dtSec;
    const nextDist = this.positionM - playerPositionM;

    let whoosh = false;
    if (!this.whooshTriggeredForPass && prevDist > WHOOSH_TRIGGER_DIST_M && nextDist <= WHOOSH_TRIGGER_DIST_M) {
      this.whooshTriggeredForPass = true;
      whoosh = true;
    }

    if (nextDist < -DESPAWN_BEHIND_DIST_M) {
      this.active = false;
      this.nextSpawnCountdownSec = this.rollNextInterval();
    }
    return { passingTrainWhoosh: whoosh };
  }

  public getState(): IOncomingTrainState {
    return {
      active: this.active,
      positionM: this.positionM,
      speedMs: this.speedMs,
      modelId: this.modelId,
    };
  }

  private spawnAhead(playerPositionM: number): void {
    this.active = true;
    this.positionM = playerPositionM + SPAWN_AHEAD_DIST_M;
    this.speedMs = 19 + this.rng() * 5.5;
    this.modelId = this.rng() < 0.5 ? 'seria81' : 'inspiro';
    this.whooshTriggeredForPass = false;
  }

  private rollNextInterval(): number {
    return this.spawnMinSec + this.rng() * (this.spawnMaxSec - this.spawnMinSec);
  }
}
