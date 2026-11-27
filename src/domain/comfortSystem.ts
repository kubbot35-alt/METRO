import type { ComfortEventKind, IPassengerComfortState } from './types';

export interface IComfortStepInput {
  readonly dtSec: number;
  readonly speedKmh: number;
  readonly netAccelerationMs2: number;
  readonly leverTarget: number;
  readonly emergencyBrake: boolean;
  readonly curvatureRadPerM: number;
  readonly curveLimitKmh: number | null;
  readonly distanceToStationM: number;
  readonly doorsOpen: boolean;
}

export interface IComfortEvent {
  readonly kind: ComfortEventKind;
  readonly penaltyAmount: number;
  readonly messagePl: string;
}

export interface IComfortStepResult {
  readonly state: IPassengerComfortState;
  readonly event: IComfortEvent | null;
}

export interface IPassengerComfortController {
  reset(): void;
  step(input: IComfortStepInput): IComfortStepResult;
  applyBoost(deltaPercent: number): number;
  computeEndBonus(isFreeRide: boolean): number;
  getState(): IPassengerComfortState;
}

const GRAVITY_MS2 = 9.81;
const MIN_COMFORT = 0;
const MAX_COMFORT = 100;

export function calculateComfortEndBonus(averagePercent: number, isFreeRide: boolean): number {
  if (isFreeRide) {
    return 0;
  }
  if (averagePercent >= 95) {
    return 150;
  }
  if (averagePercent >= 88) {
    return 100;
  }
  if (averagePercent >= 78) {
    return 50;
  }
  return 0;
}

export class PassengerComfortSystem implements IPassengerComfortController {
  private currentPercent = 100;
  private weightedSum = 0;
  private weightedTimeSec = 0;
  private longitudinalG = 0;
  private lateralG = 0;
  private totalG = 0;
  private smoothDrivingActive = false;
  private harshEventsCount = 0;
  private endBonusPoints = 0;
  private prevLeverTarget = 0;
  private prevEmergencyBrake = false;
  private harshBrakeCooldownSec = 0;
  private leverJerkCooldownSec = 0;
  private fastCurveCooldownSec = 0;

  public reset(): void {
    this.currentPercent = 100;
    this.weightedSum = 0;
    this.weightedTimeSec = 0;
    this.longitudinalG = 0;
    this.lateralG = 0;
    this.totalG = 0;
    this.smoothDrivingActive = false;
    this.harshEventsCount = 0;
    this.endBonusPoints = 0;
    this.prevLeverTarget = 0;
    this.prevEmergencyBrake = false;
    this.harshBrakeCooldownSec = 0;
    this.leverJerkCooldownSec = 0;
    this.fastCurveCooldownSec = 0;
  }

  public applyBoost(deltaPercent: number): number {
    const before = this.currentPercent;
    this.currentPercent = clampComfort(this.currentPercent + deltaPercent);
    return Number((this.currentPercent - before).toFixed(1));
  }

  public computeEndBonus(isFreeRide: boolean): number {
    this.endBonusPoints = calculateComfortEndBonus(this.getAveragePercent(), isFreeRide);
    return this.endBonusPoints;
  }

  public step(input: IComfortStepInput): IComfortStepResult {
    const dt = Math.max(0.001, input.dtSec);
    this.tickCooldowns(dt);
    this.updateGForces(input.speedKmh, input.netAccelerationMs2, input.curvatureRadPerM);

    const event = this.detectDiscomfortEvent(input, dt);
    if (event) {
      this.currentPercent = clampComfort(this.currentPercent - event.penaltyAmount);
      this.harshEventsCount += 1;
      this.smoothDrivingActive = false;
    } else {
      this.applySmoothRegeneration(input, dt);
    }

    this.prevLeverTarget = input.leverTarget;
    this.prevEmergencyBrake = input.emergencyBrake;
    this.weightedSum += this.currentPercent * dt;
    this.weightedTimeSec += dt;

    return { state: this.getState(), event };
  }

  public getState(): IPassengerComfortState {
    return {
      currentPercent: Math.round(this.currentPercent),
      averagePercent: Math.round(this.getAveragePercent()),
      longitudinalG: Number(this.longitudinalG.toFixed(2)),
      lateralG: Number(this.lateralG.toFixed(2)),
      totalG: Number(this.totalG.toFixed(2)),
      smoothDrivingActive: this.smoothDrivingActive,
      harshEventsCount: this.harshEventsCount,
      endBonusPoints: this.endBonusPoints,
    };
  }

  private getAveragePercent(): number {
    if (this.weightedTimeSec <= 0.01) {
      return this.currentPercent;
    }
    return clampComfort(this.weightedSum / this.weightedTimeSec);
  }

  private tickCooldowns(dt: number): void {
    this.harshBrakeCooldownSec = Math.max(0, this.harshBrakeCooldownSec - dt);
    this.leverJerkCooldownSec = Math.max(0, this.leverJerkCooldownSec - dt);
    this.fastCurveCooldownSec = Math.max(0, this.fastCurveCooldownSec - dt);
  }

  private updateGForces(speedKmh: number, netAccelMs2: number, curvatureRadPerM: number): void {
    const speedMs = speedKmh / 3.6;
    const rawLongG = netAccelMs2 / GRAVITY_MS2;
    const rawLatG = (speedMs * speedMs * curvatureRadPerM) / GRAVITY_MS2;
    this.longitudinalG = this.longitudinalG * 0.6 + rawLongG * 0.4;
    this.lateralG = this.lateralG * 0.6 + rawLatG * 0.4;
    this.totalG = Math.hypot(this.longitudinalG, this.lateralG);
  }

  private detectDiscomfortEvent(input: IComfortStepInput, dt: number): IComfortEvent | null {
    if (input.emergencyBrake && !this.prevEmergencyBrake && input.speedKmh > 6) {
      this.harshBrakeCooldownSec = 2.6;
      return {
        kind: 'emergency_brake',
        penaltyAmount: 14,
        messagePl: 'Hamowanie awaryjne — gwałtowne szarpnięcie!',
      };
    }

    if (this.fastCurveCooldownSec <= 0 && input.speedKmh > 12) {
      const overCurveLimit = input.curveLimitKmh !== null && input.speedKmh > input.curveLimitKmh + 4;
      if (Math.abs(this.lateralG) > 0.14 || overCurveLimit) {
        this.fastCurveCooldownSec = 2.8;
        return {
          kind: 'fast_curve',
          penaltyAmount: 6,
          messagePl: 'Zbyt szybki wjazd w zakręt!',
        };
      }
    }

    if (this.harshBrakeCooldownSec <= 0 && !input.emergencyBrake && input.speedKmh > 4) {
      const lastSecondHardBrake =
        input.distanceToStationM > -8 &&
        input.distanceToStationM < 90 &&
        input.netAccelerationMs2 < -0.96;
      if (input.netAccelerationMs2 < -1.16 || lastSecondHardBrake) {
        this.harshBrakeCooldownSec = 2.4;
        return {
          kind: 'harsh_brake',
          penaltyAmount: lastSecondHardBrake ? 7 : 5,
          messagePl: 'Zbyt ostre hamowanie!',
        };
      }
    }

    if (this.leverJerkCooldownSec <= 0 && input.speedKmh > 4 && !input.doorsOpen) {
      const leverDelta = Math.abs(input.leverTarget - this.prevLeverTarget);
      const leverRate = leverDelta / dt;
      const signFlip = input.leverTarget * this.prevLeverTarget < -0.18 && leverDelta > 0.6;
      if (leverRate > 12.5 || signFlip) {
        this.leverJerkCooldownSec = 2.4;
        return {
          kind: 'lever_jerk',
          penaltyAmount: 4,
          messagePl: 'Gwałtowne szarpnięcie nastawnikiem!',
        };
      }
    }

    return null;
  }

  private applySmoothRegeneration(input: IComfortStepInput, dt: number): void {
    const absAccel = Math.abs(input.netAccelerationMs2);
    const gentleAccel = input.netAccelerationMs2 >= 0.14 && input.netAccelerationMs2 <= 0.85;
    const gentleBrake = input.netAccelerationMs2 <= -0.16 && input.netAccelerationMs2 >= -0.86;
    const lowLateral = Math.abs(this.lateralG) < 0.09;
    const steadyCruise = input.speedKmh >= 18 && absAccel <= 0.15 && lowLateral;

    this.smoothDrivingActive = !input.doorsOpen && lowLateral && (gentleAccel || gentleBrake || steadyCruise);
    if (this.smoothDrivingActive && this.currentPercent < MAX_COMFORT) {
      const rate = gentleAccel || gentleBrake ? 1.8 : 0.75;
      this.currentPercent = clampComfort(this.currentPercent + rate * dt);
    }
  }
}

function clampComfort(value: number): number {
  return Math.max(MIN_COMFORT, Math.min(MAX_COMFORT, value));
}
