import { canEnableAtoForMode } from '../atoSystem';
import { getTimeOfDaySpec } from '../timeOfDayCatalog';
import { getTrainModelSpec } from '../trainCatalog';
import { applyLiveryToTrainSpec } from '../trainLiveryCatalog';
import type { HeadlightMode, IMetroLineSpec, PaAnnouncementId, TimeOfDayId, TrainModelId } from '../types';
import type { IModeRulesCoordinator } from './modeRulesCoordinator';
import type { ISimulationState, ISimulationSystems } from './simulationContracts';
import { buildNextSignalProgress, buildStationProgress, getActiveBoardingDurationSec, isFreeRideMode } from './simulationHelpers';
import { executeBeginCabSwitch, executeCompleteCabSwitch, executeEnterTurnaroundSiding } from './turnaroundCommandHandler';

export interface ISimulationCommandHandler {
  toggleAto(state: ISimulationState, sys: ISimulationSystems): boolean;
  cycleHeadlightMode(state: ISimulationState, sys: ISimulationSystems): HeadlightMode;
  triggerPaAnnouncement(state: ISimulationState, sys: ISimulationSystems, id: PaAnnouncementId): { readonly accepted: boolean; readonly announcementId: number; readonly specId: PaAnnouncementId };
  enterTurnaroundSiding(state: ISimulationState, sys: ISimulationSystems): boolean;
  beginCabSwitch(state: ISimulationState, sys: ISimulationSystems): boolean;
  completeCabSwitch(state: ISimulationState, sys: ISimulationSystems, modeRules: IModeRulesCoordinator, reversedLine: IMetroLineSpec): boolean;
  triggerSandboxOncomingTrain(state: ISimulationState, sys: ISimulationSystems): void;
  cycleSandboxNextSignal(state: ISimulationState, sys: ISimulationSystems): void;
  applyTrainModel(state: ISimulationState, sys: ISimulationSystems, modelId: TrainModelId): void;
  applyTimeOfDay(state: ISimulationState, sys: ISimulationSystems, modeRules: IModeRulesCoordinator, timeOfDayId: TimeOfDayId): void;
}

export class SimulationCommandHandler implements ISimulationCommandHandler {
  public toggleAto(state: ISimulationState, sys: ISimulationSystems): boolean {
    if (!canEnableAtoForMode(state.gameMode)) {
      sys.feedback.push('ATO dostępne tylko w Sandbox / trybie Pasażera', 0, 'warning');
      return false;
    }
    state.atoEnabled = !state.atoEnabled;
    if (state.atoEnabled) {
      sys.ato.reset();
      sys.feedback.push('Autopilot ATO aktywny — automatyczne prowadzenie pociągu', 0, 'success');
    } else {
      state.atoStatus = 'off';
      sys.feedback.push('Autopilot ATO wyłączony — przejęto sterowanie ręczne', 0, 'neutral');
    }
    return state.atoEnabled;
  }

  public cycleHeadlightMode(state: ISimulationState, sys: ISimulationSystems): HeadlightMode {
    const result = sys.lighting.step({
      playerPositionM: state.kinematics.positionM, speedKmh: state.kinematics.speedKmh, throttle: state.kinematics.throttle,
      serviceBrake: state.kinematics.serviceBrake, emergencyBrake: state.kinematics.emergencyBrake, netAccelerationMs2: state.kinematics.netAccelerationMs2,
      turnoutSwayFactor: 0, oncomingTrain: sys.traffic.getState(), toggleHeadlightsPressed: true, toggleCabLightPressed: false, dtSec: 0,
    });
    const mode = sys.lighting.getState().headlightMode;
    if (result.dimCourtesyBonusAwarded) {
      const pts = isFreeRideMode(state) ? 0 : result.courtesyBonusPoints;
      state.score = Math.max(0, state.score + pts);
      sys.feedback.push('Przygaszono długie przed pociągiem z naprzeciwka', pts, 'success');
    } else {
      sys.feedback.push(mode === 'high' ? 'Światła długie (drogowe)' : mode === 'low' ? 'Światła krótkie (mijania)' : 'Reflektory wyłączone', 0, 'neutral');
    }
    return mode;
  }

  public triggerPaAnnouncement(state: ISimulationState, sys: ISimulationSystems, id: PaAnnouncementId) {
    const result = sys.paIntercom.trigger(id, {
      doorState: state.doorState, boardingCompleted: state.boardingCompleted, timeOfDayId: state.timeOfDay.id,
      speedKmh: state.kinematics.speedKmh, nextSignal: buildNextSignalProgress(state, sys),
      weatherMode: sys.weather.getState().mode, stationIndex: state.stationIndex,
    });
    if (!result.accepted) return { accepted: false, announcementId: 0, specId: id };
    if (result.boardingSpeedupSec > 0 && state.doorState === 'open' && !state.boardingCompleted) {
      state.boardingTimerSec = Math.min(getActiveBoardingDurationSec(state), state.boardingTimerSec + result.boardingSpeedupSec);
    }
    if (result.comfortBonus > 0) sys.comfort.applyBoost(result.comfortBonus);
    if (result.effectFeedbackPl) sys.feedback.push(result.effectFeedbackPl, 0, result.effectTone);
    state.pendingPaAudio = true;
    return { accepted: true, announcementId: result.announcementId, specId: result.spec.id };
  }

  public enterTurnaroundSiding(state: ISimulationState, sys: ISimulationSystems): boolean {
    return executeEnterTurnaroundSiding(state, sys);
  }

  public beginCabSwitch(state: ISimulationState, sys: ISimulationSystems): boolean {
    return executeBeginCabSwitch(state, sys);
  }

  public completeCabSwitch(state: ISimulationState, sys: ISimulationSystems, modeRules: IModeRulesCoordinator, reversedLine: IMetroLineSpec): boolean {
    return executeCompleteCabSwitch(state, sys, modeRules, reversedLine);
  }

  public triggerSandboxOncomingTrain(state: ISimulationState, sys: ISimulationSystems): void {
    if (state.gameMode !== 'sandbox') return;
    const progress = buildStationProgress(state);
    if (progress.distanceToTargetM <= 240 && progress.distanceToTargetM >= -25) {
      sys.traffic.forceSpawnAtStation?.(progress.station, progress.stationIndex, false);
      sys.feedback.push(`Sandbox: podstawiono skład AI przy stacji ${progress.station.name}`, 0, 'neutral');
      return;
    }
    sys.traffic.forceSpawnAhead?.(state.kinematics.positionM);
    sys.feedback.push('Sandbox: wywołano mijankę na sąsiednim torze', 0, 'neutral');
  }

  public cycleSandboxNextSignal(state: ISimulationState, sys: ISimulationSystems): void {
    if (state.gameMode !== 'sandbox') return;
    const aspect = sys.signals.cycleNextSignalAspect?.(state.kinematics.positionM);
    if (!aspect) return;
    sys.feedback.push(`Sandbox: najbliższy semafor → ${aspect === 'green' ? 'ZIELONY' : aspect === 'yellow' ? 'ŻÓŁTY' : 'CZERWONY'}`, 0, 'neutral');
  }

  public applyTrainModel(state: ISimulationState, sys: ISimulationSystems, modelId: TrainModelId): void {
    state.trainModel = applyLiveryToTrainSpec(getTrainModelSpec(modelId), state.selectedLiveryId);
    sys.physics.setConfig?.(state.trainModel.physics);
  }

  public applyTimeOfDay(state: ISimulationState, sys: ISimulationSystems, modeRules: IModeRulesCoordinator, timeOfDayId: TimeOfDayId): void {
    state.timeOfDay = getTimeOfDaySpec(timeOfDayId);
    state.timeOfDayConfigured = true;
    modeRules.applyActiveModeOverrides(state, sys);
  }
}
