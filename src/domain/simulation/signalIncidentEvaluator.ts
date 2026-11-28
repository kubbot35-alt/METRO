import type { ISimulationState, ISimulationSystems } from './simulationContracts';
import {
  OVERSPEED_INTERVAL_SEC,
  OVERSPEED_TOLERANCE_KMH,
  applyPenalty,
  computeEffectiveSpeedLimit,
  isFreeRideMode,
} from './simulationHelpers';

export interface ISignalEvalOutcome {
  readonly violated: boolean;
  readonly cleared: boolean;
}

export interface ISignalIncidentEvaluator {
  evaluateSignals(state: ISimulationState, sys: ISimulationSystems, prevPosM: number, dt: number): ISignalEvalOutcome;
  evaluateIncidents(
    state: ISimulationState,
    sys: ISimulationSystems,
    ackCzuwakPressed: boolean,
    dt: number,
  ): ReturnType<ISimulationSystems['incidents']['step']>;
  evaluateRadio(
    state: ISimulationState,
    sys: ISimulationSystems,
    ackRadioPressed: boolean,
    dt: number,
  ): ReturnType<ISimulationSystems['radio']['step']>;
  evaluateOverspeed(state: ISimulationState, sys: ISimulationSystems, dt: number): boolean;
}

export class SignalIncidentEvaluator implements ISignalIncidentEvaluator {
  public evaluateSignals(
    state: ISimulationState,
    sys: ISimulationSystems,
    prevPosM: number,
    dt: number,
  ): ISignalEvalOutcome {
    const res = sys.signals.step(prevPosM, state.kinematics.positionM, state.kinematics.speedKmh, dt);
    state.activeCautionLimitKmh = res.activeCautionLimitKmh;
    if (res.redSignalViolated) {
      this.handleRedSignalViolation(state, sys);
    }
    if (res.clearedToGreen) {
      sys.feedback.push('Semafor zielony — droga wolna', 0, 'success');
    }
    return { violated: !isFreeRideMode(state) && res.redSignalViolated, cleared: res.clearedToGreen };
  }

  public evaluateIncidents(
    state: ISimulationState,
    sys: ISimulationSystems,
    ackCzuwakPressed: boolean,
    dt: number,
  ): ReturnType<ISimulationSystems['incidents']['step']> {
    const res = sys.incidents.step(state.kinematics.positionM, state.kinematics.speedKmh, state.doorState === 'open', ackCzuwakPressed, dt);
    if (res.enteredTrackworkWarning) {
      sys.feedback.push(`Roboty torowe – max ${res.enteredTrackworkWarning.limitKmh} km/h (200 m)`, 0, 'warning');
    }
    if (res.czuwakAckChime) {
      state.czuwakAcksCount += 1;
      sys.feedback.push('Czuwak potwierdzony', 0, 'success');
    }
    if (res.doorFaultResolvedClose) {
      state.doorFaultsResolvedCount += 1;
    }
    if (res.czuwakTimedOut) {
      this.handleCzuwakTimeout(state, sys);
    }
    return res;
  }

  public evaluateRadio(
    state: ISimulationState,
    sys: ISimulationSystems,
    ackRadioPressed: boolean,
    dt: number,
  ): ReturnType<ISimulationSystems['radio']['step']> {
    const res = sys.radio.step(state.stationIndex, state.kinematics.positionM, state.kinematics.speedKmh, ackRadioPressed, dt);
    if (res.acknowledgedNow) {
      const pts = isFreeRideMode(state) ? 0 : res.bonusPoints;
      state.score += pts;
      sys.feedback.push(res.feedbackText ?? 'Radio potwierdzone', pts, 'success');
    } else if (res.expiredNow && res.feedbackText) {
      sys.feedback.push(res.feedbackText, 0, 'warning');
    }
    return res;
  }

  public evaluateOverspeed(state: ISimulationState, sys: ISimulationSystems, dt: number): boolean {
    if (isFreeRideMode(state)) {
      return false;
    }
    const limit = computeEffectiveSpeedLimit(state, sys);
    if (state.kinematics.speedKmh <= limit + OVERSPEED_TOLERANCE_KMH) {
      state.overspeedCooldownSec = Math.max(0, state.overspeedCooldownSec - dt);
      return false;
    }
    state.overspeedCooldownSec -= dt;
    if (state.overspeedCooldownSec > 0) {
      return false;
    }
    state.overspeedCooldownSec = OVERSPEED_INTERVAL_SEC;
    state.overspeedViolations += 1;
    sys.tachograph.recordViolation(state.elapsedTimeSec, state.kinematics.positionM, state.kinematics.speedKmh, 'overspeed');
    applyPenalty(state, sys, sys.scoring.getOverspeedPenalty(), `Przekroczenie limitu (${limit} km/h)`, 'danger');
    return true;
  }

  private handleRedSignalViolation(state: ISimulationState, sys: ISimulationSystems): void {
    if (isFreeRideMode(state)) {
      sys.feedback.push('Sandbox: minięto czerwony semafor (bez kary)', 0, 'neutral');
      return;
    }
    state.atpActive = true;
    state.kinematics = { ...state.kinematics, emergencyBrake: true, throttle: 0 };
    if (state.gameMode === 'academy') {
      sys.signals.configureScriptedSignals?.([{ distanceM: Math.round(state.kinematics.positionM + 115), aspect: 'red', waitSec: 3.0 }]);
      sys.feedback.push('Akademia: Minięto czerwony semafor! Zatrzymaj się przed kolejnym światłem.', 0, 'warning');
      return;
    }
    state.redSignalViolations += 1;
    sys.tachograph.recordViolation(state.elapsedTimeSec, state.kinematics.positionM, state.kinematics.speedKmh, 'red_signal');
    applyPenalty(state, sys, sys.scoring.getRedSignalPenalty(), 'ATP: Przejechano czerwone światło! Hamulec bezpieczeństwa', 'danger');
  }

  private handleCzuwakTimeout(state: ISimulationState, sys: ISimulationSystems): void {
    if (state.gameMode === 'academy') {
      sys.feedback.push('Akademia: Czas czuwaka minął — spróbuj ponownie [C]', 0, 'warning');
      return;
    }
    state.czuwakViolations += 1;
    sys.tachograph.recordViolation(state.elapsedTimeSec, state.kinematics.positionM, state.kinematics.speedKmh, 'czuwak');
    state.kinematics = { ...state.kinematics, emergencyBrake: true, throttle: 0 };
    applyPenalty(state, sys, sys.scoring.getCzuwakPenalty(), 'CZUWAK: Brak reakcji [C]! Hamulec awaryjny', 'danger');
  }
}
