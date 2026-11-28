import { ACADEMY_LINE_SPEC, type IAcademyController } from './academySystem';
import type { IAnnouncementTracker } from './announcementTracker';
import { canEnableAtoForMode, type IAtoController } from './atoSystem';
import type { IPassengerComfortController } from './comfortSystem';
import type { IEcoDrivingController } from './ecoDrivingSystem';
import type { IFeedbackTracker } from './feedbackTracker';
import type { IIncidentController } from './incidentSystem';
import type { ILightingAndSparksController } from './lightingAndSparksSystem';
import type { INightInspectionController } from './nightInspectionSystem';
import type { IPaIntercomController } from './paIntercomSystem';
import type { IRadioController } from './radioSystem';
import { LINE_M1_SPEED_ZONES, LINE_M1_STATIONS, getMetroLineSpec } from './routeData';
import type { IScheduleController } from './scheduleSystem';
import type { ISignalController } from './signalSystem';
import { createEngineRuntimeContext, type IEngineRuntimeContext, type IMetroSimulationCollaborators } from './simulation/simulationContextFactory';
import { resetRunMetrics, resetSubsystemControllers, resolveInitialTrainPositionM } from './simulation/simulationState';
import type { PassengerSeatId } from './passengerViewModel';
import type { ITachographRecorder } from './tachographSystem';
import type { ITrafficController } from './trafficSystem';
import { getTrainModelSpec } from './trainCatalog';
import { applyLiveryToTrainSpec } from './trainLiveryCatalog';
import type { ITurnaroundController } from './turnaroundSystem';
import type {
  ChallengeId, GameModeId, HeadlightMode, IAudioEvents, IControlInput, IMetroLineSpec,
  IMetroSimulation, IScoringEvaluator, ISimulationSnapshot, ISpeedLimitZone, IStationSpec,
  ITrainPhysicsModel, MetroLineId, PaAnnouncementId, TimeOfDayId, TrainLiveryId, TrainModelId, WeatherModeId,
} from './types';
import type { IWeatherController } from './weatherSystem';

export class MetroSimulationEngine implements IMetroSimulation {
  private readonly ctx: IEngineRuntimeContext;

  public constructor(
    physics: ITrainPhysicsModel, scoring: IScoringEvaluator,
    stations: readonly IStationSpec[] = LINE_M1_STATIONS, speedZones: readonly ISpeedLimitZone[] = LINE_M1_SPEED_ZONES,
    feedback?: IFeedbackTracker, signals?: ISignalController, announcements?: IAnnouncementTracker,
    schedule?: IScheduleController, incidents?: IIncidentController, traffic?: ITrafficController,
    radio?: IRadioController, weather?: IWeatherController, academy?: IAcademyController,
    tachograph?: ITachographRecorder, ato?: IAtoController, lighting?: ILightingAndSparksController,
    nightInspection?: INightInspectionController, comfort?: IPassengerComfortController,
    paIntercom?: IPaIntercomController, turnaround?: ITurnaroundController,
    ecoDriving?: IEcoDrivingController, collaborators?: IMetroSimulationCollaborators,
  ) {
    this.ctx = createEngineRuntimeContext(
      physics, scoring, stations, speedZones,
      { feedback, signals, announcements, schedule, incidents, traffic, radio, weather, academy, tachograph, ato, lighting, nightInspection, comfort, paIntercom, turnaround, ecoDriving },
      collaborators,
    );
  }

  public setMetroLine(lineId: MetroLineId): void {
    this.setMetroLineSpec(getMetroLineSpec(lineId));
  }

  public setMetroLineSpec(nextLine: IMetroLineSpec): void {
    this.ctx.modeRules.applyLineSpec(this.ctx.state, this.ctx.sys, nextLine);
    this.ctx.modeRules.applyActiveModeOverrides(this.ctx.state, this.ctx.sys);
  }

  public setGameMode(mode: GameModeId): void {
    this.ctx.state.gameMode = mode;
    this.ctx.state.sop2SandboxOverride = false;
    if (!canEnableAtoForMode(mode)) {
      this.ctx.state.atoEnabled = false;
      this.ctx.state.atoStatus = 'off';
    } else if (mode === 'passenger') {
      this.ctx.state.atoEnabled = true; this.ctx.state.cameraMode = 'interior'; this.ctx.sys.ato.reset();
    }
    if (mode === 'trainspotting') { this.ctx.state.cameraMode = 'station'; this.ctx.state.atoEnabled = false; }
    if (mode === 'academy' && this.ctx.state.line.id !== ACADEMY_LINE_SPEC.id) {
      this.setMetroLineSpec(ACADEMY_LINE_SPEC);
      return;
    }
    this.ctx.modeRules.applyActiveModeOverrides(this.ctx.state, this.ctx.sys);
  }

  public toggleAto(): boolean {
    return this.ctx.commands.toggleAto(this.ctx.state, this.ctx.sys);
  }

  public cycleHeadlightMode(): HeadlightMode {
    return this.ctx.commands.cycleHeadlightMode(this.ctx.state, this.ctx.sys);
  }

  public toggleCabLight(): boolean {
    const next = this.ctx.sys.lighting.toggleCabLight();
    this.ctx.sys.feedback.push(next ? 'Lampka kabiny: WŁ.' : 'Lampka kabiny: WYŁ.', 0, 'neutral');
    return next;
  }

  public setSop2InterventionEnabled(enabled: boolean): void {
    this.ctx.state.sop2SettingEnabled = enabled;
    this.ctx.state.sop2SandboxOverride = this.ctx.state.gameMode === 'sandbox';
    this.ctx.sys.sop2.setInterventionEnabled(enabled);
  }

  public triggerPaAnnouncement(id: PaAnnouncementId) {
    return this.ctx.commands.triggerPaAnnouncement(this.ctx.state, this.ctx.sys, id);
  }

  public enterTurnaroundSiding(): boolean {
    return this.ctx.commands.enterTurnaroundSiding(this.ctx.state, this.ctx.sys);
  }

  public beginCabSwitch(): boolean {
    return this.ctx.commands.beginCabSwitch(this.ctx.state, this.ctx.sys);
  }

  public completeCabSwitch(reversedLine: IMetroLineSpec): boolean {
    return this.ctx.commands.completeCabSwitch(this.ctx.state, this.ctx.sys, this.ctx.modeRules, reversedLine);
  }

  public setChallenge(challengeId: ChallengeId): void {
    this.ctx.state.challengeId = challengeId;
    if (this.ctx.state.gameMode === 'challenge') {
      this.ctx.modeRules.applyActiveModeOverrides(this.ctx.state, this.ctx.sys);
    }
  }

  public setWeatherMode(mode: WeatherModeId): void {
    this.ctx.sys.weather.setMode(mode);
  }

  public triggerSandboxOncomingTrain(): void {
    this.ctx.commands.triggerSandboxOncomingTrain(this.ctx.state, this.ctx.sys);
  }

  public cycleSandboxNextSignal(): void {
    this.ctx.commands.cycleSandboxNextSignal(this.ctx.state, this.ctx.sys);
  }

  public setTrainModel(modelId: TrainModelId): void {
    this.ctx.commands.applyTrainModel(this.ctx.state, this.ctx.sys, modelId);
  }

  public setTrainLivery(liveryId: TrainLiveryId): void {
    this.ctx.state.selectedLiveryId = liveryId;
    this.ctx.state.trainModel = applyLiveryToTrainSpec(getTrainModelSpec(this.ctx.state.trainModel.id), liveryId);
  }

  public setTimeOfDay(timeOfDayId: TimeOfDayId): void {
    this.ctx.commands.applyTimeOfDay(this.ctx.state, this.ctx.sys, this.ctx.modeRules, timeOfDayId);
  }

  public setDepotHallStart(enabled: boolean): void { this.ctx.commands.setDepotHallStart(this.ctx.state, enabled); }
  public setPassengerSeat(seatId: PassengerSeatId): void { this.ctx.commands.setPassengerSeat(this.ctx.state, seatId); }
  public setPassengerCarIndex(carIndex: number): void { this.ctx.commands.setPassengerCarIndex(this.ctx.state, carIndex); }
  public setTrainspottingSpotIndex(spotIndex: number): void { this.ctx.commands.setTrainspottingSpotIndex(this.ctx.state, this.ctx.sys, spotIndex); }
  public stepTrainspottingWalk(deltaM: number): void { this.ctx.commands.stepTrainspottingWalk(this.ctx.state, deltaM); }

  public start(): void {
    const s = this.ctx.state;
    if (s.phase === 'gameover') this.reset();
    if (s.gameMode === 'academy') { this.ctx.sys.lighting.setHeadlightMode('off'); this.ctx.sys.academy.reset(); }
    if (s.gameMode === 'passenger') { s.cameraMode = 'interior'; s.atoEnabled = true; this.ctx.sys.ato.reset(); }
    else if (s.gameMode === 'trainspotting') { s.cameraMode = 'station'; s.atoEnabled = false; this.ctx.commands.setTrainspottingSpotIndex(s, this.ctx.sys, s.trainspottingSpotIndex); }
    else if (!canEnableAtoForMode(s.gameMode)) { s.atoEnabled = false; s.atoStatus = 'off'; }
    if (s.gameMode !== 'trainspotting' && s.phase === 'title') {
      s.kinematics = { ...s.kinematics, positionM: resolveInitialTrainPositionM(s) };
    }
    s.challengeOutcome = null;
    this.ctx.modeRules.applyActiveModeOverrides(s, this.ctx.sys);
    s.phase = 'playing';
  }

  public pause(): void {
    if (this.ctx.state.phase === 'playing') this.ctx.state.phase = 'paused';
  }

  public resume(): void {
    if (this.ctx.state.phase === 'paused') this.ctx.state.phase = 'playing';
  }

  public reset(): void {
    resetRunMetrics(this.ctx.state);
    resetSubsystemControllers(this.ctx.state, this.ctx.sys);
    this.ctx.modeRules.applyActiveModeOverrides(this.ctx.state, this.ctx.sys);
  }

  public step(input: IControlInput, dtSec: number): IAudioEvents {
    return this.ctx.pipeline.step(this.ctx.state, this.ctx.sys, input, dtSec);
  }

  public getSnapshot(): ISimulationSnapshot {
    return this.ctx.snapshotAssembler.assemble(this.ctx.state, this.ctx.sys);
  }
}
