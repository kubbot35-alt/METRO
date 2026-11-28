import type { ISop2State, Sop2Status, Sop2TargetReason } from './types';
import { resolveSop2Target, type ISop2TargetQuery } from './sop2TargetResolver';

export const SOP2_WARNING_EXCESS_KMH = 3;
export const SOP2_INTERVENTION_EXCESS_KMH = 7;
export const SOP2_INTERVENTION_HOLD_SEC = 2.5;
export const SOP2_WARNING_BEEP_INTERVAL_SEC = 1.25;
export const SOP2_INTERVENTION_PENALTY = -40;

export interface ISop2StepContext extends ISop2TargetQuery {
  readonly speedKmh: number;
  readonly isBraking: boolean;
  readonly dtSec: number;
}

export interface ISop2StepOutcome {
  readonly state: ISop2State;
  readonly warningBeep: boolean;
  readonly interventionTriggeredNow: boolean;
  readonly interventionReleasedNow: boolean;
}

export interface ISop2Controller {
  setInterventionEnabled(enabled: boolean): void;
  step(ctx: ISop2StepContext): ISop2StepOutcome;
  getState(): ISop2State;
  reset(): void;
}

export class Sop2System implements ISop2Controller {
  private currentLimitKmh = 60;
  private targetLimitKmh: number | null = null;
  private targetDistanceM: number | null = null;
  private targetReason: Sop2TargetReason = null;
  private excessKmh = 0;
  private overspeedHoldSec = 0;
  private warningBeepCooldownSec = 0;
  private interventionActive = false;
  private interventionEnabled = true;
  private interventionsCount = 0;

  public setInterventionEnabled(enabled: boolean): void {
    this.interventionEnabled = enabled;
    if (!enabled) {
      this.interventionActive = false;
      this.overspeedHoldSec = 0;
    }
  }

  public reset(): void {
    this.currentLimitKmh = 60;
    this.targetLimitKmh = null;
    this.targetDistanceM = null;
    this.targetReason = null;
    this.excessKmh = 0;
    this.overspeedHoldSec = 0;
    this.warningBeepCooldownSec = 0;
    this.interventionActive = false;
    this.interventionsCount = 0;
  }

  public step(ctx: ISop2StepContext): ISop2StepOutcome {
    this.syncLimitAndTarget(ctx);
    const excess = Math.max(0, ctx.speedKmh - ctx.currentLimitKmh);
    this.excessKmh = Number(excess.toFixed(1));
    this.warningBeepCooldownSec = Math.max(0, this.warningBeepCooldownSec - ctx.dtSec);
    if (this.interventionActive) {
      const released = this.stepActiveIntervention(ctx.speedKmh, ctx.currentLimitKmh);
      return { state: this.getState(), warningBeep: false, interventionTriggeredNow: false, interventionReleasedNow: released };
    }
    const warningBeep = this.evaluateWarningBeep(excess);
    const triggered = this.evaluateInterventionTrigger(excess, ctx.isBraking, ctx.dtSec);
    return { state: this.getState(), warningBeep, interventionTriggeredNow: triggered, interventionReleasedNow: false };
  }

  public getState(): ISop2State {
    const status = this.resolveStatus();
    return {
      currentLimitKmh: this.currentLimitKmh,
      targetLimitKmh: this.targetLimitKmh,
      targetDistanceM: this.targetDistanceM,
      targetReason: this.targetReason,
      status,
      excessKmh: this.excessKmh,
      overspeedHoldSec: Number(this.overspeedHoldSec.toFixed(2)),
      interventionActive: this.interventionActive,
      interventionEnabled: this.interventionEnabled,
      interventionsCount: this.interventionsCount,
    };
  }

  private syncLimitAndTarget(ctx: ISop2StepContext): void {
    this.currentLimitKmh = Math.max(0, Math.round(ctx.currentLimitKmh));
    const target = resolveSop2Target(ctx);
    this.targetLimitKmh = target.targetLimitKmh;
    this.targetDistanceM = target.targetDistanceM;
    this.targetReason = target.targetReason;
  }

  private stepActiveIntervention(speedKmh: number, limitKmh: number): boolean {
    const releaseThreshold = limitKmh <= 0 ? 0.25 : Math.max(0, limitKmh - 0.5);
    if (speedKmh <= releaseThreshold) {
      this.interventionActive = false;
      this.overspeedHoldSec = 0;
      return true;
    }
    return false;
  }

  private evaluateWarningBeep(excessKmh: number): boolean {
    if (excessKmh <= SOP2_WARNING_EXCESS_KMH) {
      this.warningBeepCooldownSec = 0;
      return false;
    }
    if (this.warningBeepCooldownSec > 0) return false;
    this.warningBeepCooldownSec = SOP2_WARNING_BEEP_INTERVAL_SEC;
    return true;
  }

  private evaluateInterventionTrigger(excessKmh: number, isBraking: boolean, dtSec: number): boolean {
    if (!this.interventionEnabled || excessKmh <= SOP2_INTERVENTION_EXCESS_KMH || isBraking) {
      this.overspeedHoldSec = 0;
      return false;
    }
    this.overspeedHoldSec += dtSec;
    if (this.overspeedHoldSec < SOP2_INTERVENTION_HOLD_SEC) return false;
    this.interventionActive = true;
    this.interventionsCount += 1;
    this.overspeedHoldSec = SOP2_INTERVENTION_HOLD_SEC;
    return true;
  }

  private resolveStatus(): Sop2Status {
    if (this.interventionActive) return 'intervention';
    if (this.excessKmh > SOP2_WARNING_EXCESS_KMH) return 'warning';
    return 'normal';
  }
}
