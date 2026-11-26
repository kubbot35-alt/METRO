import { M1_TUNNEL_PORTAL_M } from './trackAlignment';
import type { IWeatherState, WeatherModeId } from './types';

export interface IWeatherStepResult {
  readonly wiperSweepTick: boolean;
  readonly brakeGripMultiplier: number;
  readonly state: IWeatherState;
}

export interface IWeatherController {
  setMode(mode: WeatherModeId): void;
  getMode(): WeatherModeId;
  reset(): void;
  step(
    hasSurfaceStart: boolean,
    positionM: number,
    outdoorBlend: number,
    speedKmh: number,
    serviceBrake: number,
    emergencyBrake: boolean,
    toggleWipersPressed: boolean,
    dtSec: number,
  ): IWeatherStepResult;
  getState(): IWeatherState;
}

const WET_TUNNEL_CARRYOVER_M = 150;
const WET_RAIL_GRIP_MULTIPLIER = 0.83; // ~20% longer braking distance on wet rails
const WIPER_ANGULAR_SPEED_RAD_S = 3.1;

export class MetroWeatherSystem implements IWeatherController {
  private mode: WeatherModeId = 'clear';
  private wipersOn = false;
  private wiperCycleRad = 0;
  private wiperPhaseRad = 0;
  private lastCycleHalf = 0;
  private rainIntensity = 0;
  private wetRailsActive = false;
  private wheelSlipActive = false;

  public setMode(mode: WeatherModeId): void {
    this.mode = mode;
    if (mode === 'clear') {
      this.rainIntensity = 0;
      this.wetRailsActive = false;
      this.wheelSlipActive = false;
    }
  }

  public getMode(): WeatherModeId {
    return this.mode;
  }

  public reset(): void {
    this.wipersOn = false;
    this.wiperCycleRad = 0;
    this.wiperPhaseRad = 0;
    this.lastCycleHalf = 0;
    this.rainIntensity = 0;
    this.wetRailsActive = false;
    this.wheelSlipActive = false;
  }

  public step(
    hasSurfaceStart: boolean,
    positionM: number,
    outdoorBlend: number,
    speedKmh: number,
    serviceBrake: number,
    emergencyBrake: boolean,
    toggleWipersPressed: boolean,
    dtSec: number,
  ): IWeatherStepResult {
    if (toggleWipersPressed) {
      this.wipersOn = !this.wipersOn;
    }

    const dt = Math.max(0, Math.min(dtSec, 0.05));
    const isRain = this.mode === 'rain';
    this.rainIntensity = isRain ? Math.max(0, Math.min(1, outdoorBlend)) : 0;

    // Wet rails on STP Kabaty surface section and the first 150 m inside the tunnel
    this.wetRailsActive =
      isRain && hasSurfaceStart && positionM <= M1_TUNNEL_PORTAL_M + WET_TUNNEL_CARRYOVER_M;

    const hardBraking = emergencyBrake || serviceBrake >= 0.45;
    this.wheelSlipActive = this.wetRailsActive && hardBraking && speedKmh >= 6;

    let wiperSweepTick = false;
    if (this.wipersOn) {
      this.wiperCycleRad += dt * WIPER_ANGULAR_SPEED_RAD_S;
      const halfIndex = Math.floor(this.wiperCycleRad / Math.PI);
      if (halfIndex > this.lastCycleHalf) {
        this.lastCycleHalf = halfIndex;
        wiperSweepTick = true;
      }
      // Smooth back-and-forth sweep in [0, 1]
      this.wiperPhaseRad = 0.5 - 0.5 * Math.cos(this.wiperCycleRad);
    } else if (this.wiperPhaseRad > 0.002) {
      // Smoothly return wiper to parked rest position
      this.wiperPhaseRad = Math.max(0, this.wiperPhaseRad - dt * 1.9);
      this.wiperCycleRad = 0;
      this.lastCycleHalf = 0;
    } else {
      this.wiperPhaseRad = 0;
    }

    return {
      wiperSweepTick,
      brakeGripMultiplier: this.wetRailsActive ? WET_RAIL_GRIP_MULTIPLIER : 1.0,
      state: this.getState(),
    };
  }

  public getState(): IWeatherState {
    return {
      mode: this.mode,
      wipersOn: this.wipersOn,
      wiperPhaseRad: this.wiperPhaseRad,
      rainIntensity: this.rainIntensity,
      wetRailsActive: this.wetRailsActive,
      wheelSlipActive: this.wheelSlipActive,
    };
  }
}
