import { ControlStepCoordinator } from './controlStepCoordinator';
import { DoorBoardingCoordinator } from './doorBoardingCoordinator';
import { ModeRulesCoordinator, type IModeRulesCoordinator } from './modeRulesCoordinator';
import { SimulationCommandHandler, type ISimulationCommandHandler } from './simulationCommandHandler';
import type { ISimulationState, ISimulationSystems } from './simulationContracts';
import { buildDefaultSystems, createInitialSimulationState } from './simulationState';
import { SimulationStepPipeline, type ISimulationStepPipeline } from './simulationStepPipeline';
import { SnapshotAssembler, type ISnapshotAssembler } from './snapshotAssembler';
import { getLineTrackAlignment } from '../trackAlignment';
import type { IScoringEvaluator, ISpeedLimitZone, IStationSpec, ITrainPhysicsModel } from '../types';

export interface IMetroSimulationCollaborators {
  readonly modeRules?: IModeRulesCoordinator;
  readonly commands?: ISimulationCommandHandler;
  readonly pipeline?: ISimulationStepPipeline;
  readonly snapshotAssembler?: ISnapshotAssembler;
}

export interface IEngineRuntimeContext {
  readonly sys: ISimulationSystems;
  readonly state: ISimulationState;
  readonly modeRules: IModeRulesCoordinator;
  readonly commands: ISimulationCommandHandler;
  readonly pipeline: ISimulationStepPipeline;
  readonly snapshotAssembler: ISnapshotAssembler;
}

export function createEngineRuntimeContext(
  physics: ITrainPhysicsModel,
  scoring: IScoringEvaluator,
  stations: readonly IStationSpec[],
  speedZones: readonly ISpeedLimitZone[],
  overrides: Partial<ISimulationSystems>,
  collaborators?: IMetroSimulationCollaborators,
): IEngineRuntimeContext {
  const sys = buildDefaultSystems(physics, scoring, stations, overrides);
  const state = createInitialSimulationState(stations, speedZones);
  const modeRules = collaborators?.modeRules ?? new ModeRulesCoordinator();
  const commands = collaborators?.commands ?? new SimulationCommandHandler();
  const pipeline =
    collaborators?.pipeline ??
    new SimulationStepPipeline(new ControlStepCoordinator(), new DoorBoardingCoordinator(), modeRules, commands);
  const snapshotAssembler = collaborators?.snapshotAssembler ?? new SnapshotAssembler();
  sys.traffic.setStations?.(stations);
  sys.turnaround.setStations(stations);
  state.alignment = getLineTrackAlignment(state.line.id, stations);
  sys.physics.setConfig?.(state.trainModel.physics);
  return { sys, state, modeRules, commands, pipeline, snapshotAssembler };
}
