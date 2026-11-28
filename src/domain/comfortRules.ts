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

export function calculateComfortEndBonus(averagePercent: number, isFreeRide: boolean): number {
  if (isFreeRide) return 0;
  if (averagePercent >= 95) return 150;
  if (averagePercent >= 88) return 100;
  if (averagePercent >= 78) return 50;
  return 0;
}

export function clampComfortPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}
