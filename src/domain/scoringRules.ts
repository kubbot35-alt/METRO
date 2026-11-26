import type {
  DriverGrade,
  FeedbackTone,
  IGradeInput,
  IScoringEvaluator,
  IStopEvaluation,
} from './types';

export class MetroScoringRules implements IScoringEvaluator {
  public evaluateStop(offsetM: number): IStopEvaluation {
    const absError = Math.abs(offsetM);
    if (absError <= 3.0) {
      return {
        points: 300,
        label: `Idealne zatrzymanie (${absError.toFixed(1)} m)`,
        tone: 'success',
        offsetM,
      };
    }
    if (absError <= 8.0) {
      return {
        points: 200,
        label: `Bardzo dobre zatrzymanie (${absError.toFixed(1)} m)`,
        tone: 'success',
        offsetM,
      };
    }
    return {
      points: 100,
      label: `Poprawne zatrzymanie (${absError.toFixed(1)} m)`,
      tone: 'neutral',
      offsetM,
    };
  }

  public evaluatePunctuality(
    deviationSec: number,
  ): { readonly points: number; readonly label: string; readonly tone: FeedbackTone } {
    if (Math.abs(deviationSec) <= 10) {
      return { points: 150, label: 'Punktualny przyjazd', tone: 'success' };
    }
    if (deviationSec > 30) {
      return { points: -100, label: 'Duże opóźnienie rozkładowe', tone: 'danger' };
    }
    if (deviationSec > 15) {
      return { points: -40, label: 'Opóźnienie rozkładowe', tone: 'warning' };
    }
    return { points: 0, label: '', tone: 'neutral' };
  }

  public evaluateGrade(stats: IGradeInput): DriverGrade {
    const servedRatio = stats.totalStations > 0 ? stats.stationsServed / stats.totalStations : 0;
    const violations =
      stats.overspeedViolations + stats.redSignalViolations + stats.czuwakViolations;
    if (servedRatio >= 1 && violations === 0 && stats.score >= stats.totalStations * 300) {
      return 'S';
    }
    if (servedRatio >= 0.85 && violations <= 2 && stats.score >= stats.totalStations * 200) {
      return 'A';
    }
    if (servedRatio >= 0.65 && stats.score >= stats.totalStations * 110) {
      return 'B';
    }
    if (servedRatio >= 0.45 && stats.score >= 0) {
      return 'C';
    }
    return 'D';
  }

  public getOverspeedPenalty(): number {
    return -25;
  }

  public getMissedStationPenalty(): number {
    return -250;
  }

  public getEmergencyBrakePenalty(): number {
    return -30;
  }

  public getRedSignalPenalty(): number {
    return -200;
  }

  public getCzuwakPenalty(): number {
    return -100;
  }
}
