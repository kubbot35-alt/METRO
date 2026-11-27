import type {
  DoorSide,
  HeadlightMode,
  ILightingAndSparksState,
  IOncomingTrainState,
} from './types';

export interface ILightingStepContext {
  readonly playerPositionM: number;
  readonly speedKmh: number;
  readonly throttle: number;
  readonly serviceBrake: number;
  readonly emergencyBrake: boolean;
  readonly netAccelerationMs2: number;
  readonly turnoutSwayFactor: number;
  readonly oncomingTrain: IOncomingTrainState;
  readonly toggleHeadlightsPressed: boolean;
  readonly toggleCabLightPressed: boolean;
  readonly dtSec: number;
}

export interface ILightingStepResult {
  readonly headlightChangedTo: HeadlightMode | null;
  readonly cabLightChangedTo: boolean | null;
  readonly dimCourtesyBonusAwarded: boolean;
  readonly courtesyBonusPoints: number;
  readonly sparkTriggeredNow: boolean;
}

export interface ILightingAndSparksController {
  reset(initialHeadlightMode?: HeadlightMode): void;
  setHeadlightMode(mode: HeadlightMode): void;
  cycleHeadlightMode(): HeadlightMode;
  toggleCabLight(): boolean;
  step(ctx: ILightingStepContext): ILightingStepResult;
  getState(): ILightingAndSparksState;
}

export const HIGH_BEAM_COURTESY_BONUS_PTS = 25;
const GLARE_MIN_AHEAD_M = 14;
const GLARE_MAX_AHEAD_M = 195;
const SPARK_DECAY_PER_SEC = 5.4;

export function getNextHeadlightMode(current: HeadlightMode): HeadlightMode {
  if (current === 'off') {
    return 'low';
  }
  if (current === 'low') {
    return 'high';
  }
  return 'off';
}

export class LightingAndSparksSystem implements ILightingAndSparksController {
  private readonly rng: () => number;
  private headlightMode: HeadlightMode = 'low';
  private cabLightOn = false;
  private dimHighBeamPromptActive = false;
  private highBeamCourtesyCount = 0;
  private encounterRewarded = false;
  private sparkIntensity = 0;
  private sparkSide: DoorSide = 'right';
  private sparkEventId = 0;
  private sparkCooldownSec = 0;

  public constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }

  public reset(initialHeadlightMode: HeadlightMode = 'low'): void {
    this.headlightMode = initialHeadlightMode;
    this.cabLightOn = false;
    this.dimHighBeamPromptActive = false;
    this.highBeamCourtesyCount = 0;
    this.encounterRewarded = false;
    this.sparkIntensity = 0;
    this.sparkSide = 'right';
    this.sparkEventId = 0;
    this.sparkCooldownSec = 0;
  }

  public setHeadlightMode(mode: HeadlightMode): void {
    this.headlightMode = mode;
  }

  public cycleHeadlightMode(): HeadlightMode {
    this.headlightMode = getNextHeadlightMode(this.headlightMode);
    return this.headlightMode;
  }

  public toggleCabLight(): boolean {
    this.cabLightOn = !this.cabLightOn;
    return this.cabLightOn;
  }

  public step(ctx: ILightingStepContext): ILightingStepResult {
    const dt = Math.max(0, Math.min(ctx.dtSec, 0.1));
    const inGlareRange = this.isOncomingInGlareRange(ctx.playerPositionM, ctx.oncomingTrain);
    if (!ctx.oncomingTrain.active || ctx.oncomingTrain.positionM - ctx.playerPositionM < -12) {
      this.encounterRewarded = false;
    }

    const prevMode = this.headlightMode;
    let headlightChangedTo: HeadlightMode | null = null;
    if (ctx.toggleHeadlightsPressed) {
      headlightChangedTo = this.cycleHeadlightMode();
    }

    let cabLightChangedTo: boolean | null = null;
    if (ctx.toggleCabLightPressed) {
      cabLightChangedTo = this.toggleCabLight();
    }

    let dimCourtesyBonusAwarded = false;
    if (
      inGlareRange &&
      !this.encounterRewarded &&
      prevMode === 'high' &&
      this.headlightMode !== 'high'
    ) {
      this.encounterRewarded = true;
      this.highBeamCourtesyCount += 1;
      dimCourtesyBonusAwarded = true;
    }
    this.dimHighBeamPromptActive =
      inGlareRange && !this.encounterRewarded && this.headlightMode === 'high';

    const sparkTriggeredNow = this.stepThirdRailSparks(ctx, dt);
    return {
      headlightChangedTo,
      cabLightChangedTo,
      dimCourtesyBonusAwarded,
      courtesyBonusPoints: dimCourtesyBonusAwarded ? HIGH_BEAM_COURTESY_BONUS_PTS : 0,
      sparkTriggeredNow,
    };
  }

  public getState(): ILightingAndSparksState {
    return {
      headlightMode: this.headlightMode,
      cabLightOn: this.cabLightOn,
      dimHighBeamPromptActive: this.dimHighBeamPromptActive,
      highBeamCourtesyCount: this.highBeamCourtesyCount,
      sparkIntensity: this.sparkIntensity,
      sparkSide: this.sparkSide,
      sparkEventId: this.sparkEventId,
    };
  }

  private isOncomingInGlareRange(
    playerPositionM: number,
    oncoming: IOncomingTrainState,
  ): boolean {
    if (!oncoming.active) {
      return false;
    }
    const distAhead = oncoming.positionM - playerPositionM;
    return distAhead >= GLARE_MIN_AHEAD_M && distAhead <= GLARE_MAX_AHEAD_M;
  }

  private stepThirdRailSparks(ctx: ILightingStepContext, dt: number): boolean {
    this.sparkIntensity = Math.max(0, this.sparkIntensity - dt * SPARK_DECAY_PER_SEC);
    this.sparkCooldownSec = Math.max(0, this.sparkCooldownSec - dt);
    if (this.sparkCooldownSec > 0 || ctx.speedKmh < 7) {
      return false;
    }

    const isTurnout = Math.abs(ctx.turnoutSwayFactor) >= 0.14 && ctx.speedKmh >= 8;
    const isStrongAccel =
      ctx.throttle >= 0.72 && ctx.netAccelerationMs2 >= 0.45 && ctx.speedKmh >= 8;
    const isHardBrake =
      (ctx.serviceBrake >= 0.65 || ctx.emergencyBrake) && ctx.speedKmh >= 12;

    if (!isTurnout && !isStrongAccel && !isHardBrake) {
      return false;
    }

    this.sparkEventId += 1;
    this.sparkSide = this.rng() < 0.5 ? 'left' : 'right';
    this.sparkIntensity = isTurnout ? 1.0 : isHardBrake ? 0.88 : 0.76;
    this.sparkCooldownSec = isTurnout
      ? 0.24 + this.rng() * 0.34
      : 0.52 + this.rng() * 0.82;
    return true;
  }
}
