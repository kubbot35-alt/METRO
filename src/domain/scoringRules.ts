import type { IScoringEvaluator, IStopEvaluation } from './types';

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
}
