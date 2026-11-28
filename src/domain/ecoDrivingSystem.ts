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
    if (dtSec <= 0) return this.getState();
    const dM = Math.max(0, kinematics.speedMs) * dtSec;
    this.totalDrivenDistanceM += dM;
    const auxKw = trainModelId === 'seria81' ? 32 : trainModelId === 'varsovia' ? 22 : 25;
    this.coastingActive = kinematics.speedKmh > 10 && kinematics.throttle < 0.02 && kinematics.serviceBrake < 0.02 && !kinematics.emergencyBrake;
    if (this.coastingActive) this.coastingDistanceM += dM;
    this.integrateEnergyStep(this.computeInstantaneousKw(kinematics, physicsConfig, trainModelId, auxKw, dtSec), dtSec);
    return this.getState();
  }

  private computeInstantaneousKw(
    kin: ITrainKinematics,
    cfg: ITrainPhysicsConfig,
    modelId: TrainModelId,
    auxKw: number,
    dtSec: number,
  ): number {
    this.regeneratingActive = false;
    if (kin.throttle > 0.01 && !kin.emergencyBrake && kin.serviceBrake < 0.01) {
      return this.computeTractionKw(kin, cfg, modelId, auxKw, dtSec);
    }
    if (trainSupportsRegeneration(modelId) && kin.serviceBrake > 0.02 && !kin.emergencyBrake && kin.speedKmh > 4.5) {
      return this.computeRegenKw(kin, cfg, modelId, auxKw);
    }
    if (kin.emergencyBrake && kin.speedKmh > 8) this.harshThrottlePenaltyAccum += dtSec * 2.5;
    return auxKw;
  }

  private computeTractionKw(kin: ITrainKinematics, cfg: ITrainPhysicsConfig, modelId: TrainModelId, auxKw: number, dtSec: number): number {
    const motorEff = modelId === 'varsovia' ? 0.92 : modelId === 'inspiro' ? 0.89 : 0.72;
    const mechKw = (kin.throttle * cfg.maxTractionForceN * Math.max(0, kin.speedMs, 2.2)) / 1000;
    const excKw = kin.throttle * (modelId === 'seria81' ? 420 : 260) * Math.max(0, 1 - kin.speedKmh / 45);
    if (kin.throttle > 0.85 && kin.speedKmh > 62) this.harshThrottlePenaltyAccum += dtSec * 0.45;
    return auxKw + Math.min(2850, mechKw / motorEff + excKw);
  }

  private computeRegenKw(kin: ITrainKinematics, cfg: ITrainPhysicsConfig, modelId: TrainModelId, auxKw: number): number {
    const smooth = kin.serviceBrake <= 0.8 ? 1.0 : Math.max(0.45, 1.0 - (kin.serviceBrake - 0.8) * 2.2);
    const regenEff = (modelId === 'varsovia' ? 0.68 : 0.62) * smooth;
    const mechKw = (kin.serviceBrake * cfg.maxServiceBrakeForceN * Math.max(0, kin.speedMs)) / 1000;
    const recovered = Math.min(1650, mechKw * regenEff);
    if (recovered > auxKw + 8) {
      this.regeneratingActive = true;
      return -(recovered - auxKw);
    }
    return Math.max(0, auxKw - recovered);
  }

  private integrateEnergyStep(instantaneousKw: number, dtSec: number): void {
    this.currentPowerKw = instantaneousKw;
    const dtHours = dtSec / 3600;
    if (instantaneousKw >= 0) this.consumedKwh += instantaneousKw * dtHours;
    else this.regeneratedKwh += Math.abs(instantaneousKw) * dtHours;
    this.netEnergyKwh = Math.max(0.01, this.consumedKwh - this.regeneratedKwh);
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
