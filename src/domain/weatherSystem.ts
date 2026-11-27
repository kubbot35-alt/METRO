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
const SNOW_TUNNEL_CARRYOVER_M = 200;
const WET_RAIL_GRIP_MULTIPLIER = 0.83; // ~20% longer braking distance on wet rails
const SNOW_RAIL_GRIP_MULTIPLIER = 0.76; // ~31% longer braking distance on snowy/icy rails
const WIPER_ANGULAR_SPEED_RAD_S = 3.1;

export class MetroWeatherSystem implements IWeatherController {
  private mode: WeatherModeId = 'clear';
  private wipersOn = false;
  private wiperCycleRad = 0;
  private wiperPhaseRad = 0;
  private lastCycleHalf = 0;
  private rainIntensity = 0;
  private snowIntensity = 0;
  private frostIntensity = 0;
  private wetRailsActive = false;
  private wheelSlipActive = false;

  public setMode(mode: WeatherModeId): void {
    this.mode = mode;
    if (mode === 'clear') {
      this.rainIntensity = 0;
      this.snowIntensity = 0;
      this.frostIntensity = 0;
      this.wetRailsActive = false;
      this.wheelSlipActive = false;
    } else if (mode === 'rain') {
      this.snowIntensity = 0;
      this.frostIntensity = 0;
    } else if (mode === 'snow') {
      this.rainIntensity = 0;
      this.frostIntensity = Math.max(this.frostIntensity, 0.42);
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
    this.snowIntensity = 0;
    this.frostIntensity = this.mode === 'snow' ? 0.42 : 0;
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
    const clampedOutdoor = Math.max(0, Math.min(1, outdoorBlend));
    const isRain = this.mode === 'rain';
    const isSnow = this.mode === 'snow';

    this.rainIntensity = isRain ? clampedOutdoor : 0;
    this.snowIntensity = isSnow ? clampedOutdoor : 0;

    if (isSnow) {
      if (this.wipersOn) {
        this.frostIntensity = Math.max(0.06, this.frostIntensity - dt * 0.35);
      } else if (clampedOutdoor > 0.05) {
        const targetFrost = Math.min(0.85, 0.32 + clampedOutdoor * 0.48);
        this.frostIntensity = Math.min(
          targetFrost,
          this.frostIntensity + dt * (0.12 + clampedOutdoor * 0.14),
        );
      } else {
        // Slowly thaws inside the warmer underground tunnel
        this.frostIntensity = Math.max(0, this.frostIntensity - dt * 0.06);
      }
    } else {
      this.frostIntensity = 0;
    }

    // Slippery rails on STP Kabaty surface section and the first 150 m (rain) or 200 m (snow) inside the tunnel
    const carryoverM = isSnow ? SNOW_TUNNEL_CARRYOVER_M : WET_TUNNEL_CARRYOVER_M;
    this.wetRailsActive =
      (isRain || isSnow) && hasSurfaceStart && positionM <= M1_TUNNEL_PORTAL_M + carryoverM;

    const slipThreshold = isSnow ? 0.35 : 0.45;
    const hardBraking = emergencyBrake || serviceBrake >= slipThreshold;
    this.wheelSlipActive = this.wetRailsActive && hardBraking && speedKmh >= 5;

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

    const brakeGripMultiplier = !this.wetRailsActive
      ? 1.0
      : isSnow
        ? SNOW_RAIL_GRIP_MULTIPLIER
        : WET_RAIL_GRIP_MULTIPLIER;

    return {
      wiperSweepTick,
      brakeGripMultiplier,
      state: this.getState(),
    };
  }

  public getState(): IWeatherState {
    return {
      mode: this.mode,
      wipersOn: this.wipersOn,
      wiperPhaseRad: this.wiperPhaseRad,
      rainIntensity: this.rainIntensity,
      snowIntensity: this.snowIntensity,
      frostIntensity: Number(this.frostIntensity.toFixed(3)),
      wetRailsActive: this.wetRailsActive,
      wheelSlipActive: this.wheelSlipActive,
    };
  }
}
