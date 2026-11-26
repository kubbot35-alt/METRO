import type {
  IControlInput,
  ITrainKinematics,
  ITrainPhysicsConfig,
  ITrainPhysicsModel,
} from './types';

export const DEFAULT_METRO_PHYSICS_CONFIG: ITrainPhysicsConfig = {
  massKg: 185000,
  maxTractionForceN: 245000,
  maxServiceBrakeForceN: 290000,
  emergencyBrakeForceN: 460000,
  rollingResistanceCoeff: 0.0022,
  aeroDragCoeff: 18.5,
  maxSpeedKmh: 95,
  throttleRatePerSec: 0.95,
  brakeRampPerSec: 1.8,
};

const GRAVITY_MS2 = 9.81;
const MS_TO_KMH = 3.6;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class MetroTrainPhysics implements ITrainPhysicsModel {
  private config: ITrainPhysicsConfig;

  public constructor(config: ITrainPhysicsConfig = DEFAULT_METRO_PHYSICS_CONFIG) {
    this.config = config;
  }

  public setConfig(config: ITrainPhysicsConfig): void {
    this.config = config;
  }

  public step(
    current: ITrainKinematics,
    input: IControlInput,
    doorsOpen: boolean,
    dtSec: number,
    gradeFraction = 0,
  ): ITrainKinematics {
    const dt = clamp(dtSec, 0, 0.05);
    const emergencyBrake = this.resolveEmergencyBrake(current, input);
    const serviceBrake = this.resolveServiceBrake(current.serviceBrake, input, dt);
    const throttle = this.resolveThrottle(
      current.throttle,
      input,
      doorsOpen,
      emergencyBrake,
      serviceBrake,
      dt,
    );
    const netAccel = this.computeAcceleration(
      current.speedMs,
      throttle,
      serviceBrake,
      emergencyBrake,
      doorsOpen,
      gradeFraction,
    );
    return this.integrateMotion(current, throttle, serviceBrake, emergencyBrake, netAccel, dt);
  }

  private resolveEmergencyBrake(current: ITrainKinematics, input: IControlInput): boolean {
    if (input.forceEmergencyBrake) {
      return true;
    }
    if (input.emergencyBrakePressed) {
      return !current.emergencyBrake;
    }
    const releasingWithPower =
      input.throttleUp || (input.manualLeverAxis !== undefined && input.manualLeverAxis !== null && input.manualLeverAxis > 0.1);
    if (current.emergencyBrake && current.speedMs <= 0.05 && releasingWithPower) {
      return false;
    }
    return current.emergencyBrake;
  }

  private resolveServiceBrake(currentBrake: number, input: IControlInput, dt: number): number {
    const manualAxis = input.manualLeverAxis;
    let target = input.serviceBrake ? 1 : 0;
    if (manualAxis !== undefined && manualAxis !== null) {
      target = manualAxis < -0.05 ? clamp(-manualAxis, 0, 1) : 0;
    }
    const rate = target > currentBrake ? this.config.brakeRampPerSec : this.config.brakeRampPerSec * 1.8;
    if (currentBrake < target) {
      return Math.min(target, currentBrake + rate * dt);
    }
    return Math.max(target, currentBrake - rate * dt);
  }

  private resolveThrottle(
    currentThrottle: number,
    input: IControlInput,
    doorsOpen: boolean,
    emergencyBrake: boolean,
    serviceBrake: number,
    dt: number,
  ): number {
    if (doorsOpen || emergencyBrake || serviceBrake > 0.1) {
      return Math.max(0, currentThrottle - this.config.throttleRatePerSec * 3.0 * dt);
    }
    const manualAxis = input.manualLeverAxis;
    if (manualAxis !== undefined && manualAxis !== null) {
      const target = manualAxis > 0.05 ? clamp(manualAxis, 0, 1) : 0;
      const maxDelta = this.config.throttleRatePerSec * 2.2 * dt;
      if (currentThrottle < target) {
        return Math.min(target, currentThrottle + maxDelta);
      }
      return Math.max(target, currentThrottle - maxDelta);
    }
    let next = currentThrottle;
    if (input.throttleUp) {
      next += this.config.throttleRatePerSec * dt;
    }
    if (input.throttleDown) {
      next -= this.config.throttleRatePerSec * dt;
    }
    return clamp(next, 0, 1);
  }

  private computeAcceleration(
    speedMs: number,
    throttle: number,
    serviceBrake: number,
    emergencyBrake: boolean,
    doorsOpen: boolean,
    gradeFraction: number,
  ): number {
    const speedRatio = clamp(speedMs / (this.config.maxSpeedKmh / MS_TO_KMH), 0, 1);
    const tractionCurve = 1 - 0.35 * speedRatio;
    const tractionN = throttle * this.config.maxTractionForceN * tractionCurve;
    const brakeN = emergencyBrake
      ? this.config.emergencyBrakeForceN
      : serviceBrake * this.config.maxServiceBrakeForceN;
    const resistanceN = this.computePassiveResistance(speedMs);

    // Gravity component along track slope: positive grade (uphill) opposes motion,
    // negative grade (downhill) accelerates the train unless held by brakes/doors.
    const holdingStopped = speedMs <= 0.02 && (doorsOpen || emergencyBrake || serviceBrake > 0.05);
    const gravityN = holdingStopped ? 0 : -this.config.massKg * GRAVITY_MS2 * gradeFraction;

    return (tractionN + gravityN - brakeN - resistanceN) / this.config.massKg;
  }

  private computePassiveResistance(speedMs: number): number {
    if (speedMs <= 0.001) {
      return 0;
    }
    const rollingN = this.config.massKg * GRAVITY_MS2 * this.config.rollingResistanceCoeff;
    const aeroN = this.config.aeroDragCoeff * speedMs * speedMs;
    return rollingN + aeroN;
  }

  private integrateMotion(
    current: ITrainKinematics,
    throttle: number,
    serviceBrake: number,
    emergencyBrake: boolean,
    netAccel: number,
    dt: number,
  ): ITrainKinematics {
    const maxSpeedMs = this.config.maxSpeedKmh / MS_TO_KMH;
    let nextSpeedMs = clamp(current.speedMs + netAccel * dt, 0, maxSpeedMs);
    const isStopping = throttle < 0.01 && (serviceBrake > 0.05 || emergencyBrake);
    if (isStopping && nextSpeedMs < 0.08) {
      nextSpeedMs = 0;
    }
    const avgSpeedMs = (current.speedMs + nextSpeedMs) * 0.5;
    return {
      positionM: current.positionM + avgSpeedMs * dt,
      speedMs: nextSpeedMs,
      speedKmh: nextSpeedMs * MS_TO_KMH,
      throttle,
      serviceBrake,
      emergencyBrake,
      netAccelerationMs2: nextSpeedMs === 0 && netAccel < 0 ? 0 : netAccel,
    };
  }
}

export function createInitialKinematics(): ITrainKinematics {
  return {
    positionM: 0,
    speedMs: 0,
    speedKmh: 0,
    throttle: 0,
    serviceBrake: 0,
    emergencyBrake: false,
    netAccelerationMs2: 0,
  };
}
