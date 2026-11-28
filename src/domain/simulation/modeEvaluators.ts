import type { IAcademyController } from '../academySystem';
import { getStationPlatformSide } from '../trackGeometry';
import {
  applyPenalty,
  buildStationProgress,
  computeEffectiveSpeedLimit,
  isFreeRideMode,
} from './simulationHelpers';
import type { ISimulationState, ISimulationSystems } from './simulationContracts';

export interface IAcademyStepContext {
  readonly redSignalClearedNow: boolean;
  readonly czuwakAckChime: boolean;
  readonly radioAcknowledgedNow: boolean;
  readonly stationServedNow: boolean;
  readonly dtSec: number;
}

export interface IAcademyStepOutcome {
  readonly czuwakTriggered: boolean;
  readonly radioTriggered: boolean;
  readonly stepCompleted: boolean;
}

export interface INightEvalOutcome {
  readonly clearedNow: boolean;
  readonly violatedNow: boolean;
  readonly radioTriggered: boolean;
}

function formatNightViolationReason(reason: string | null): string {
  if (reason === 'both') return 'Przekroczono 20 km/h i brak klaksonu [H]!';
  if (reason === 'speed') return 'Przekroczono 20 km/h przy ekipie torowej!';
  return 'Brak sygnału ostrzegawczego klaksonem [H]!';
}

export function evaluateNightInspectionStep(
  state: ISimulationState,
  sys: ISimulationSystems,
): INightEvalOutcome {
  const res = sys.nightInspection.step(state.kinematics.positionM, state.kinematics.speedKmh, state.hornActive);
  if (res.clearedCheckpoint) {
    const pts = isFreeRideMode(state) ? 0 : res.pointsDelta;
    state.score += pts;
    sys.feedback.push(`Punkt kontrolny #${res.clearedCheckpoint.id} zaliczony — ekipa torowa bezpieczna`, pts, 'success');
    const radioTriggered = res.radioConfirmText
      ? Boolean(sys.radio.forceTriggerDispatch?.(res.radioConfirmText, 6.5, 'inspection'))
      : false;
    return { clearedNow: true, violatedNow: false, radioTriggered };
  }
  if (res.violatedCheckpoint) {
    const msg = formatNightViolationReason(res.violationReason);
    applyPenalty(state, sys, res.pointsDelta, `BHP Ekipa #${res.violatedCheckpoint.id}: ${msg}`, 'danger');
    return { clearedNow: false, violatedNow: true, radioTriggered: false };
  }
  return { clearedNow: false, violatedNow: false, radioTriggered: false };
}

function applyAcademyOutcome(
  state: ISimulationState,
  sys: ISimulationSystems,
  res: ReturnType<IAcademyController['step']>,
): IAcademyStepOutcome {
  const czuwakTriggered = res.requestTriggerCzuwak && (sys.incidents.forceTriggerCzuwak?.(15) ?? false);
  const radioTriggered =
    res.requestTriggerRadio &&
    (sys.radio.forceTriggerDispatch?.('Dyspozytor Akademii: Próba łączności radiowej. Potwierdź odbiór przyciskiem [R].', 18) ?? false);
  if (res.stepCompletedNow) {
    state.score += 50;
    const label = res.academyFinishedNow
      ? 'Akademia ukończona! Przyznano Licencję Maszynisty'
      : `Akademia: Krok ${res.completedStepNumber}/5 zaliczony!`;
    sys.feedback.push(label, 50, 'success');
  }
  if (res.academyFinishedNow) {
    sys.tachograph.recordFinalSample(state.elapsedTimeSec, state.kinematics.positionM, state.kinematics.speedKmh, computeEffectiveSpeedLimit(state, sys));
    state.phase = 'gameover';
  }
  return { czuwakTriggered, radioTriggered, stepCompleted: res.stepCompletedNow };
}

export function evaluateAcademyStepRun(
  state: ISimulationState,
  sys: ISimulationSystems,
  ctx: IAcademyStepContext,
): IAcademyStepOutcome {
  const progress = buildStationProgress(state);
  const res = sys.academy.step({
    positionM: state.kinematics.positionM,
    speedKmh: state.kinematics.speedKmh,
    headlightsOn: sys.lighting.getState().headlightMode !== 'off',
    hornActive: state.hornActive,
    redSignalClearedNow: ctx.redSignalClearedNow,
    czuwakActive: sys.incidents.getCzuwakState().active,
    czuwakAcknowledgedNow: ctx.czuwakAckChime,
    radioActive: sys.radio.getState().active,
    radioAcknowledgedNow: ctx.radioAcknowledgedNow,
    inStopZone: progress.inStopZone,
    expectedPlatformSide: getStationPlatformSide(progress.station),
    doorState: state.doorState,
    boardingCompleted: state.boardingCompleted,
    stationServedNow: ctx.stationServedNow,
    dtSec: ctx.dtSec,
  });
  return applyAcademyOutcome(state, sys, res);
}
