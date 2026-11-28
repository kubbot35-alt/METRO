import { ACADEMY_SEMAPHORE_SPECS } from '../academySystem';
import { evaluateChallengeOutcome } from '../challengeCatalog';
import { buildSemaphoreDistances } from '../signalSystem';
import { getTimeOfDaySpec } from '../timeOfDayCatalog';
import { getLineTrackAlignment } from '../trackAlignment';
import type { IMetroLineSpec } from '../types';
import {
  evaluateAcademyStepRun,
  evaluateNightInspectionStep,
  type IAcademyStepContext,
  type IAcademyStepOutcome,
  type INightEvalOutcome,
} from './modeEvaluators';
import type { ISimulationState, ISimulationSystems } from './simulationContracts';
import {
  computeEffectiveSpeedLimit,
  getActiveChallenge,
  isFreeRideMode,
  isNightServiceActive,
  shouldSkipPassengerStations,
} from './simulationHelpers';

export type { IAcademyStepContext, IAcademyStepOutcome, INightEvalOutcome };

export interface IModeRulesCoordinator {
  applyLineSpec(
    state: ISimulationState,
    sys: ISimulationSystems,
    nextLine: IMetroLineSpec,
    alignmentOverride?: { readonly hasSurfaceStart: boolean; readonly tunnelPortalDistanceM: number | null },
  ): void;
  applyActiveModeOverrides(state: ISimulationState, sys: ISimulationSystems): void;
  evaluateNightInspection(state: ISimulationState, sys: ISimulationSystems): INightEvalOutcome;
  evaluateAcademyStep(state: ISimulationState, sys: ISimulationSystems, ctx: IAcademyStepContext): IAcademyStepOutcome;
  advanceToNextStation(state: ISimulationState, sys: ISimulationSystems): void;
}

export class ModeRulesCoordinator implements IModeRulesCoordinator {
  public applyLineSpec(
    state: ISimulationState,
    sys: ISimulationSystems,
    nextLine: IMetroLineSpec,
    alignmentOverride?: { readonly hasSurfaceStart: boolean; readonly tunnelPortalDistanceM: number | null },
  ): void {
    state.line = nextLine;
    state.stations = nextLine.stations;
    state.speedZones = nextLine.speedZones;
    state.alignment = getLineTrackAlignment(nextLine.id, nextLine.stations, {
      hasSurfaceStart: alignmentOverride?.hasSurfaceStart ?? nextLine.hasSurfaceStart,
      tunnelPortalDistanceM: alignmentOverride?.tunnelPortalDistanceM ?? nextLine.tunnelPortalDistanceM,
      alignmentIntensity: nextLine.alignmentIntensity,
    });
    state.stationIndex = 0;
    sys.signals.setDistances?.(buildSemaphoreDistances(nextLine.stations));
    sys.schedule.setStations?.(nextLine.stations);
    sys.incidents.setStations?.(nextLine.stations);
    sys.traffic.setStations?.(nextLine.stations);
    sys.radio.setStations(nextLine.stations);
    sys.nightInspection.setStations(nextLine.stations);
    sys.turnaround.setStations(nextLine.stations);
    sys.announcements.reset();
  }

  public applyActiveModeOverrides(state: ISimulationState, sys: ISimulationSystems): void {
    if (state.gameMode === 'academy') {
      this.applyAcademyOverrides(state, sys);
      return;
    }
    const challenge = getActiveChallenge(state);
    if (challenge?.forceTimeOfDay && state.timeOfDay.id !== challenge.forceTimeOfDay) {
      state.timeOfDay = getTimeOfDaySpec(challenge.forceTimeOfDay);
      state.timeOfDayConfigured = true;
    }
    const isNight = isNightServiceActive(state);
    sys.nightInspection.setActive(isNight);
    sys.signals.setRedProbability?.(challenge?.redSignalProbability ?? state.timeOfDay.redSignalProbability);
    sys.traffic.setSpawnIntervalRange?.(state.timeOfDay.trafficSpawnMinSec, state.timeOfDay.trafficSpawnMaxSec);
    sys.schedule.configure?.(state.activeScheduleStartClockSec ?? state.timeOfDay.startClockSec, state.timeOfDay.boardingDurationSec);
    sys.incidents.setEnabled?.(state.gameMode !== 'sandbox');
    sys.incidents.configureOverrides?.({
      doorFaultProbability: isNight ? 0 : challenge?.doorFaultProbability ?? null,
      czuwakMinSec: challenge?.czuwakMinSec ?? null, czuwakMaxSec: challenge?.czuwakMaxSec ?? null, disableTrackwork: isNight,
    });
    sys.radio.setEnabled(true);
    sys.radio.setAutoTrigger?.(!isNight);
    const sop2Enabled = state.gameMode === 'sandbox'
      ? (state.sop2SandboxOverride ? state.sop2SettingEnabled : false)
      : state.sop2SettingEnabled;
    sys.sop2.setInterventionEnabled(sop2Enabled);
  }

  public evaluateNightInspection(state: ISimulationState, sys: ISimulationSystems): INightEvalOutcome {
    return evaluateNightInspectionStep(state, sys);
  }

  public evaluateAcademyStep(state: ISimulationState, sys: ISimulationSystems, ctx: IAcademyStepContext): IAcademyStepOutcome {
    return evaluateAcademyStepRun(state, sys, ctx);
  }

  public advanceToNextStation(state: ISimulationState, sys: ISimulationSystems): void {
    state.boardingTimerSec = 0;
    state.boardingCompleted = false;
    state.stopAwarded = false;
    state.currentStationBoardedCount = 0;
    if (state.stationIndex + 1 >= state.stations.length) {
      this.finalizeTerminusArrival(state, sys);
      return;
    }
    state.stationIndex += 1;
  }

  private applyAcademyOverrides(state: ISimulationState, sys: ISimulationSystems): void {
    sys.signals.configureScriptedSignals?.(ACADEMY_SEMAPHORE_SPECS);
    sys.traffic.setSpawnIntervalRange?.(22, 36);
    sys.schedule.configure?.(state.timeOfDay.startClockSec, 3.0);
    sys.incidents.setEnabled?.(true);
    sys.incidents.configureOverrides?.({
      doorFaultProbability: 0, czuwakMinSec: 9999, czuwakMaxSec: 9999, disableTrackwork: true,
    });
    sys.radio.setEnabled(true);
    sys.radio.setAutoTrigger?.(false);
    sys.nightInspection.setActive(false);
    sys.sop2.setInterventionEnabled(state.sop2SettingEnabled);
  }

  private finalizeTerminusArrival(state: ISimulationState, sys: ISimulationSystems): void {
    const comfortBonus = sys.comfort.computeEndBonus(isFreeRideMode(state));
    if (comfortBonus > 0) {
      state.score += comfortBonus;
      sys.feedback.push(`Bonus za płynną jazdę (komfort ${sys.comfort.getState().averagePercent}%)`, comfortBonus, 'success');
    }
    const lastDist = state.stations[state.stations.length - 1]?.distanceM ?? 0;
    sys.turnaround.setCanEnterSiding(
      state.gameMode !== 'academy' && !shouldSkipPassengerStations(state) && state.stations.length >= 2 && state.kinematics.positionM <= lastDist + 35,
    );
    this.recordChallengeOutcome(state, sys);
    sys.tachograph.recordFinalSample(state.elapsedTimeSec, state.kinematics.positionM, state.kinematics.speedKmh, computeEffectiveSpeedLimit(state, sys));
    state.phase = 'gameover';
  }

  private recordChallengeOutcome(state: ISimulationState, sys: ISimulationSystems): void {
    const challenge = getActiveChallenge(state);
    if (!challenge) return;
    const sched = sys.schedule.getSnapshot(state.stationIndex, state.kinematics.positionM, state.legElapsedTimeSec);
    const nightState = sys.nightInspection.getState();
    state.challengeOutcome = evaluateChallengeOutcome({
      challenge,
      stationsServed: state.stationsServed, stationsMissed: state.stationsMissed, totalStations: state.stations.length,
      averageDeviationSec: sched.averageDeviationSec, finalDeviationSec: sched.deviationSec,
      redSignalViolations: state.redSignalViolations, overspeedViolations: state.overspeedViolations,
      czuwakViolations: state.czuwakViolations, nightCrewTotal: nightState.totalCount,
      nightCrewPassed: nightState.passedCount, nightCrewViolated: nightState.violatedCount,
    });
  }
}
