import type {
  EcoDrivingGrade,
  IEcoDrivingState,
  ITrainKinematics,
  ITrainPhysicsConfig,
  TrainModelId,
} from './types';

export interface IEcoDrivingStepInput {
  readonly kinematics: ITrainKinematics;
  readonly physicsConfig: ITrainPhysicsConfig;
  readonly trainModelId: TrainModelId;
  readonly dtSec: number;
}

export interface IEcoDrivingController {
  getState(): IEcoDrivingState;
  reset(): void;
  step(input: IEcoDrivingStepInput): IEcoDrivingState;
}

export function evaluateEcoGrade(ecoScorePercent: number): {
  readonly grade: EcoDrivingGrade;
  readonly xpBonus: number;
} {
  if (ecoScorePercent >= 90) {
    return { grade: 'A+', xpBonus: 160 };
  }
  if (ecoScorePercent >= 78) {
    return { grade: 'A', xpBonus: 115 };
  }
  if (ecoScorePercent >= 64) {
    return { grade: 'B', xpBonus: 70 };
  }
  if (ecoScorePercent >= 48) {
    return { grade: 'C', xpBonus: 30 };
  }
  return { grade: 'D', xpBonus: 0 };
}

export function trainSupportsRegeneration(trainModelId: TrainModelId): boolean {
  return trainModelId === 'inspiro' || trainModelId === 'varsovia';
}

export class EcoDrivingSystem implements IEcoDrivingController {
  private currentPowerKw = 24;
  private consumedKwh = 0;
  private regeneratedKwh = 0;
  private netEnergyKwh = 0;
  private totalDrivenDistanceM = 0;
  private coastingDistanceM = 0;
  private harshThrottlePenaltyAccum = 0;
  private regeneratingActive = false;
  private coastingActive = false;

  public getState(): IEcoDrivingState {
    const coastingRatio =
      this.totalDrivenDistanceM > 25
        ? Math.min(1, this.coastingDistanceM / this.totalDrivenDistanceM)
        : 0;
    const ecoScorePercent = this.computeEcoScore(coastingRatio);
    const { grade, xpBonus } = evaluateEcoGrade(ecoScorePercent);

    return {
      currentPowerKw: Math.round(this.currentPowerKw),
      consumedKwh: Number(this.consumedKwh.toFixed(2)),
      regeneratedKwh: Number(this.regeneratedKwh.toFixed(2)),
      netEnergyKwh: Number(this.netEnergyKwh.toFixed(2)),
      coastingDistanceM: Math.round(this.coastingDistanceM),
      coastingRatio: Number(coastingRatio.toFixed(3)),
      ecoScorePercent: Math.round(ecoScorePercent),
      grade,
      xpBonus,
      regeneratingActive: this.regeneratingActive,
      coastingActive: this.coastingActive,
    };
  }

  public reset(): void {
    this.currentPowerKw = 24;
    this.consumedKwh = 0;
    this.regeneratedKwh = 0;
    this.netEnergyKwh = 0;
    this.totalDrivenDistanceM = 0;
    this.coastingDistanceM = 0;
    this.harshThrottlePenaltyAccum = 0;
    this.regeneratingActive = false;
    this.coastingActive = false;
  }

  public step(input: IEcoDrivingStepInput): IEcoDrivingState {
    const { kinematics, physicsConfig, trainModelId, dtSec } = input;
    if (dtSec <= 0) {
      return this.getState();
    }

    const speedMs = Math.max(0, kinematics.speedMs);
    const speedKmh = kinematics.speedKmh;
    const dM = speedMs * dtSec;
    this.totalDrivenDistanceM += dM;

    const hasRegen = trainSupportsRegeneration(trainModelId);
    const auxPowerKw = trainModelId === 'seria81' ? 32 : trainModelId === 'varsovia' ? 22 : 25;

    this.coastingActive =
      speedKmh > 10 &&
      kinematics.throttle < 0.02 &&
      kinematics.serviceBrake < 0.02 &&
      !kinematics.emergencyBrake;

    if (this.coastingActive) {
      this.coastingDistanceM += dM;
    }

    let instantaneousKw = auxPowerKw;
    this.regeneratingActive = false;

    if (kinematics.throttle > 0.01 && !kinematics.emergencyBrake && kinematics.serviceBrake < 0.01) {
      // Efficiency: Seria 81 DC rheostatic startup wastes more energy than IGBT/SiC inverters
      const motorEfficiency =
        trainModelId === 'varsovia' ? 0.92 : trainModelId === 'inspiro' ? 0.89 : 0.72;
      const mechanicalTractionKw =
        (kinematics.throttle * physicsConfig.maxTractionForceN * Math.max(speedMs, 2.2)) / 1000;
      const startupExcitationKw =
        kinematics.throttle * (trainModelId === 'seria81' ? 420 : 260) * Math.max(0, 1 - speedKmh / 45);
      const tractionElectricalKw = mechanicalTractionKw / motorEfficiency + startupExcitationKw;
      instantaneousKw = auxPowerKw + Math.min(2850, tractionElectricalKw);

      // Keeping full throttle above 62 km/h is energy-inefficient compared to coasting
      if (kinematics.throttle > 0.85 && speedKmh > 62) {
        this.harshThrottlePenaltyAccum += dtSec * 0.45;
      }
    } else if (
      hasRegen &&
      kinematics.serviceBrake > 0.02 &&
      !kinematics.emergencyBrake &&
      speedKmh > 4.5
    ) {
      // Smooth electrodynamic braking feeds power back into the 750V DC third rail
      // Very hard service braking (>0.85) blends friction pads, slightly reducing regen efficiency
      const smoothBrakeFactor =
        kinematics.serviceBrake <= 0.8
          ? 1.0
          : Math.max(0.45, 1.0 - (kinematics.serviceBrake - 0.8) * 2.2);
      const regenEfficiency = (trainModelId === 'varsovia' ? 0.68 : 0.62) * smoothBrakeFactor;
      const mechanicalBrakeKw =
        (kinematics.serviceBrake * physicsConfig.maxServiceBrakeForceN * speedMs) / 1000;
      const recoveredKw = Math.min(1650, mechanicalBrakeKw * regenEfficiency);

      if (recoveredKw > auxPowerKw + 8) {
        this.regeneratingActive = true;
        instantaneousKw = -(recoveredKw - auxPowerKw);
      } else {
        instantaneousKw = Math.max(0, auxPowerKw - recoveredKw);
      }
    } else if (kinematics.emergencyBrake && speedKmh > 8) {
      // Emergency pneumatic brake dumps kinetic energy into brake shoes/discs
      this.harshThrottlePenaltyAccum += dtSec * 2.5;
    }

    this.currentPowerKw = instantaneousKw;
    const dtHours = dtSec / 3600;

    if (instantaneousKw >= 0) {
      this.consumedKwh += instantaneousKw * dtHours;
    } else {
      const returnedKwh = Math.abs(instantaneousKw) * dtHours;
      this.regeneratedKwh += returnedKwh;
    }

    this.netEnergyKwh = Math.max(0.01, this.consumedKwh - this.regeneratedKwh);
    return this.getState();
  }

  private computeEcoScore(coastingRatio: number): number {
    if (this.totalDrivenDistanceM < 40) {
      return 88;
    }
    const distanceKm = Math.max(0.08, this.totalDrivenDistanceM / 1000);
    const netKwhPerKm = this.netEnergyKwh / distanceKm;
    // Baseline Warsaw Metro 6-car/4-car consist energy consumption is ~9.5 to 14.5 kWh/km
    const consumptionScore = Math.max(0, Math.min(100, 108 - netKwhPerKm * 3.1));
    const coastingBonus = Math.min(22, coastingRatio * 58);
    const regenRatio =
      this.consumedKwh > 0.05 ? Math.min(0.45, this.regeneratedKwh / this.consumedKwh) : 0;
    const regenBonus = regenRatio * 34;
    const raw = consumptionScore * 0.72 + 16 + coastingBonus + regenBonus - this.harshThrottlePenaltyAccum;
    return Math.max(15, Math.min(100, raw));
  }
}
