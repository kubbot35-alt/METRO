import { getStationPlatformSide } from '../trackGeometry';
import type { DoorSide, DoorState, IControlInput, IStationProgress } from '../types';
import type { ISimulationState, ISimulationSystems } from './simulationContracts';
import {
  applyPenalty, buildStationProgress, canToggleDoorsNow, getActiveBoardingDurationSec,
  getEffectiveWaitingPassengers, isFreeRideMode, isNightServiceActive, shouldSkipPassengerStations,
} from './simulationHelpers';

export interface IDoorToggleOutcome {
  readonly toggledTo: DoorState | null;
  readonly faultBeep: boolean;
}

export interface IDoorBoardingCoordinator {
  handleDoorToggle(
    state: ISimulationState, sys: ISimulationSystems, input: IControlInput,
    faultResetFinished: boolean, onAdvanceStation: () => void,
  ): IDoorToggleOutcome;
  updateBoarding(state: ISimulationState, sys: ISimulationSystems, dt: number): boolean;
  checkStationOvershoot(state: ISimulationState, sys: ISimulationSystems, onAdvanceStation: () => void): void;
}

export class DoorBoardingCoordinator implements IDoorBoardingCoordinator {
  public handleDoorToggle(
    state: ISimulationState, sys: ISimulationSystems, input: IControlInput,
    faultResetFinished: boolean, onAdvanceStation: () => void,
  ): IDoorToggleOutcome {
    if (faultResetFinished && state.doorState === 'open') {
      return { toggledTo: this.completeDoorClose(state, sys, onAdvanceStation), faultBeep: false };
    }
    const left = Boolean(input.toggleDoorsLeftPressed);
    const right = Boolean(input.toggleDoorsRightPressed);
    const auto = Boolean(input.toggleDoorsPressed);
    if (!left && !right && !auto) return { toggledTo: null, faultBeep: false };
    const progress = buildStationProgress(state);
    const expectedSide = getStationPlatformSide(progress.station);
    if (auto && !left && !right && state.gameMode !== 'sandbox') {
      sys.feedback.push(`Użyj [Q] (Lewe) lub [E] (Prawe) — peron po ${expectedSide === 'left' ? 'LEWEJ [Q]' : 'PRAWEJ [E]'}`, 0, 'warning');
      return { toggledTo: null, faultBeep: false };
    }
    const requestedSide: DoorSide = left ? 'left' : right ? 'right' : state.openDoorSide ?? expectedSide;
    if (!canToggleDoorsNow(state, progress)) return { toggledTo: null, faultBeep: false };
    return state.doorState === 'closed'
      ? this.tryOpenDoors(state, sys, progress, requestedSide, expectedSide)
      : this.tryCloseDoors(state, sys, requestedSide, onAdvanceStation);
  }

  public updateBoarding(state: ISimulationState, sys: ISimulationSystems, dt: number): boolean {
    if (state.doorState !== 'open' || state.boardingCompleted) return false;
    const station = state.stations[state.stationIndex];
    const waiting = station ? getEffectiveWaitingPassengers(state, station) : 0;
    const durationSec = getActiveBoardingDurationSec(state);
    state.boardingTimerSec = Math.min(durationSec, state.boardingTimerSec + dt);
    const targetBoarded = Math.min(waiting, Math.floor((state.boardingTimerSec / durationSec) * waiting + 0.0001));
    if (targetBoarded > state.currentStationBoardedCount) {
      state.passengersCarried += targetBoarded - state.currentStationBoardedCount;
      state.currentStationBoardedCount = targetBoarded;
    }
    if (state.boardingTimerSec < durationSec) return false;
    if (waiting > state.currentStationBoardedCount) {
      state.passengersCarried += waiting - state.currentStationBoardedCount;
      state.currentStationBoardedCount = waiting;
    }
    state.boardingCompleted = true;
    sys.feedback.push(`Wymiana pasażerów zakończona — zamknij drzwi [${state.openDoorSide === 'right' ? 'E' : 'Q'}]`, 0, 'success');
    return true;
  }

  public checkStationOvershoot(state: ISimulationState, sys: ISimulationSystems, onAdvanceStation: () => void): void {
    const station = state.stations[state.stationIndex];
    if (!station || state.doorState === 'open') return;
    if (shouldSkipPassengerStations(state)) {
      if (state.kinematics.positionM >= station.distanceM + 18) {
        state.stationsServed += 1;
        const pts = isFreeRideMode(state) ? 0 : isNightServiceActive(state) ? 50 : 100;
        state.score += pts;
        this.recordCurrentStationTelemetry(state, sys);
        const prefix = isNightServiceActive(state) ? 'Inspekcja nocna: minięto stację' : 'Przejazd techniczny przez stację';
        sys.feedback.push(`${prefix} ${station.name}`, pts, 'success');
        onAdvanceStation();
      }
      return;
    }
    if (state.kinematics.positionM > station.distanceM + station.stopZoneHalfWidthM + 2) {
      state.stationsMissed += 1;
      applyPenalty(state, sys, sys.scoring.getMissedStationPenalty(), `Przejechano stację ${station.name}!`, 'danger');
      onAdvanceStation();
    }
  }

  private tryOpenDoors(
    state: ISimulationState,
    sys: ISimulationSystems,
    progress: IStationProgress,
    requestedSide: DoorSide,
    expectedSide: DoorSide,
  ): IDoorToggleOutcome {
    if (requestedSide !== expectedSide) {
      const sideLabel = expectedSide === 'left' ? 'LEWEJ [Q]' : 'PRAWEJ [E]';
      if (state.gameMode === 'sandbox') {
        sys.feedback.push(`Blokada bezpieczeństwa: tor po tej stronie! Peron po ${sideLabel}`, 0, 'warning');
      } else {
        applyPenalty(state, sys, sys.scoring.getWrongDoorSidePenalty?.() ?? -25, `Blokada drzwi! Peron po ${sideLabel} — strona torów zablokowana`, 'danger');
      }
      return { toggledTo: null, faultBeep: true };
    }
    state.doorState = 'open';
    state.openDoorSide = requestedSide;
    this.awardStationStop(state, sys, progress);
    return { toggledTo: 'open', faultBeep: false };
  }

  private tryCloseDoors(
    state: ISimulationState, sys: ISimulationSystems, requestedSide: DoorSide, onAdvanceStation: () => void,
  ): IDoorToggleOutcome {
    if (state.openDoorSide && requestedSide !== state.openDoorSide) {
      const openKey = state.openDoorSide === 'left' ? 'Q' : 'E';
      sys.feedback.push(`Drzwi otwarte po ${state.openDoorSide === 'left' ? 'LEWEJ' : 'PRAWEJ'} — zamknij [${openKey}]`, 0, 'warning');
      return { toggledTo: null, faultBeep: false };
    }
    if (state.boardingCompleted) {
      const faultOutcome = this.checkDoorCloseFault(state, sys);
      if (faultOutcome) return faultOutcome;
    } else {
      this.warnIfPrematureDoorClose(state, sys);
    }
    return { toggledTo: this.completeDoorClose(state, sys, onAdvanceStation), faultBeep: false };
  }

  private checkDoorCloseFault(state: ISimulationState, sys: ISimulationSystems): IDoorToggleOutcome | null {
    const faultScale = sys.paIntercom.isDoorFaultProtected(state.stationIndex) ? 0.35 : 1.0;
    const attempt = sys.incidents.attemptDoorClose(state.stationIndex, faultScale);
    if (attempt.faultTriggered) {
      sys.feedback.push(`Awaria drzwi – powtórz zamykanie [${state.openDoorSide === 'right' ? 'E' : 'Q'}]`, 0, 'warning');
      return { toggledTo: null, faultBeep: true };
    }
    if (attempt.retryStarted) {
      sys.feedback.push('Ponowne zamykanie drzwi — oczekiwanie 3 s', 0, 'neutral');
      return { toggledTo: null, faultBeep: false };
    }
    return attempt.allowedToCloseNow ? null : { toggledTo: null, faultBeep: false };
  }

  private warnIfPrematureDoorClose(state: ISimulationState, sys: ISimulationSystems): void {
    const station = state.stations[state.stationIndex];
    const waiting = station ? getEffectiveWaitingPassengers(state, station) : 0;
    if (waiting > 0 && state.boardingTimerSec < getActiveBoardingDurationSec(state)) {
      sys.comfort.applyBoost(-12);
      sys.feedback.push('Przedwczesne zamknięcie drzwi — wymiana pasażerów nieukończona! (-12% komfortu)', 0, 'warning');
    }
  }

  private completeDoorClose(state: ISimulationState, sys: ISimulationSystems, onAdvanceStation: () => void): DoorState {
    state.doorState = 'closed';
    state.openDoorSide = null;
    if (state.boardingCompleted) {
      state.stationsServed += 1;
      this.recordCurrentStationTelemetry(state, sys);
      onAdvanceStation();
    }
    return 'closed';
  }

  private recordCurrentStationTelemetry(state: ISimulationState, sys: ISimulationSystems): void {
    const station = state.stations[state.stationIndex];
    if (!station) return;
    sys.tachograph.recordStationStop(state.elapsedTimeSec, state.kinematics.positionM, station.code, station.name);
    state.stationSplits.push({
      stationIndex: state.stationIndex, stationCode: station.code,
      elapsedTimeSec: Number(state.elapsedTimeSec.toFixed(1)), score: Math.round(state.score),
    });
  }

  private awardStationStop(state: ISimulationState, sys: ISimulationSystems, progress: IStationProgress): void {
    if (state.stopAwarded) return;
    state.stopAwarded = true;
    const evaluation = sys.scoring.evaluateStop(progress.distanceToTargetM);
    const absOffset = Math.abs(evaluation.offsetM);
    state.bestStopErrorM = state.bestStopErrorM === null ? absOffset : Math.min(state.bestStopErrorM, absOffset);
    state.totalStopErrorM += absOffset;
    if (isFreeRideMode(state)) {
      sys.feedback.push(`${evaluation.label} · ${state.gameMode === 'passenger' ? 'Przejazd ATO' : 'Wolna jazda'}`, 0, evaluation.tone);
      return;
    }
    const deviationSec = sys.schedule.recordStationArrival(progress.stationIndex, state.legElapsedTimeSec);
    const punctuality = sys.scoring.evaluatePunctuality(deviationSec);
    const combinedPoints = evaluation.points + punctuality.points;
    state.score += combinedPoints;
    const summary = punctuality.points !== 0 ? `${evaluation.label} · ${punctuality.label}` : evaluation.label;
    sys.feedback.push(summary, combinedPoints, punctuality.points < 0 ? 'warning' : evaluation.tone);
  }
}
