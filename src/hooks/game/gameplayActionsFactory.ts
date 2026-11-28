import { compileCustomLineSpec } from '../../domain/customLines';
import { getRankForXp } from '../../domain/driverProfile';
import { getMetroLineSpec, METRO_LINE_M1 } from '../../domain/routeData';
import { compileRouteVariant } from '../../domain/routeVariant';
import { isLiverySelectable, type SelectedLiveryMap } from '../../domain/trainLiveryCatalog';
import type {
  ChallengeId,
  GameModeId,
  IMetroLineSpec,
  MetroLineId,
  RouteDirection,
  TimeOfDayId,
  TrainLiveryId,
  TrainModelId,
  WeatherModeId,
} from '../../domain/types';
import type { IGameRuntimeRefs } from './types';

export interface IGameplayActionDeps {
  readonly refs: IGameRuntimeRefs;
  readonly syncNow: () => void;
  readonly setBaseLineSpec: (line: IMetroLineSpec) => void;
  readonly setRouteDirection: (dir: RouteDirection) => void;
  readonly setStartStationIndex: (idx: number) => void;
  readonly setSelectedLiveries: (map: SelectedLiveryMap) => void;
}

function resolveEffectiveLivery(refs: IGameRuntimeRefs, modelId: TrainModelId, mode: GameModeId): TrainLiveryId {
  const desired = refs.selectedLiveriesRef.current[modelId] ?? 'default';
  const rankId = getRankForXp(refs.services.driverProfile.load().xp).id;
  return isLiverySelectable(desired, modelId, rankId, mode) ? desired : 'default';
}

export function createRouteVariantApplicator(deps: IGameplayActionDeps) {
  return (baseLine: IMetroLineSpec, direction: RouteDirection, startIdx: number): void => {
    const compiled = compileRouteVariant(baseLine, direction, startIdx);
    deps.refs.baseLineRef.current = baseLine;
    deps.refs.routeDirectionRef.current = direction;
    deps.refs.startStationIndexRef.current = compiled.startStationIndex ?? 0;
    deps.setBaseLineSpec(baseLine);
    deps.setRouteDirection(direction);
    deps.setStartStationIndex(compiled.startStationIndex ?? 0);
    deps.refs.sim.current.setMetroLineSpec?.(compiled);
    deps.syncNow();
  };
}

function createModeSelectionActions({ refs, syncNow }: IGameplayActionDeps) {
  return {
    selectGameMode: (mode: GameModeId): void => {
      refs.sim.current.setGameMode(mode);
      const modelId = refs.sim.current.getSnapshot().trainModel.id;
      refs.sim.current.setTrainLivery?.(resolveEffectiveLivery(refs, modelId, mode));
      syncNow();
    },
    selectChallenge: (id: ChallengeId): void => { refs.sim.current.setChallenge?.(id); syncNow(); },
    selectWeatherMode: (mode: WeatherModeId): void => { refs.sim.current.setWeatherMode?.(mode); syncNow(); },
    selectTimeOfDay: (timeOfDayId: TimeOfDayId): void => { refs.sim.current.setTimeOfDay(timeOfDayId); syncNow(); },
  };
}

function createTrainAndLiveryActions(deps: IGameplayActionDeps) {
  const { refs, syncNow } = deps;
  return {
    selectTrainModel: (modelId: TrainModelId): void => {
      refs.sim.current.setTrainModel(modelId);
      const mode = refs.sim.current.getSnapshot().gameMode;
      refs.sim.current.setTrainLivery?.(resolveEffectiveLivery(refs, modelId, mode));
      syncNow();
    },
    selectTrainLivery: (liveryId: TrainLiveryId): void => {
      const snap = refs.sim.current.getSnapshot();
      const rankId = getRankForXp(refs.services.driverProfile.load().xp).id;
      if (!isLiverySelectable(liveryId, snap.trainModel.id, rankId, snap.gameMode)) return;
      const updated = refs.services.liveries.saveForTrain(snap.trainModel.id, liveryId);
      refs.selectedLiveriesRef.current = updated;
      deps.setSelectedLiveries(updated);
      refs.sim.current.setTrainLivery?.(liveryId);
      syncNow();
    },
  };
}

function createCabInputActions(refs: IGameRuntimeRefs) {
  return {
    toggleDoors: (): void => refs.input.current?.triggerDoorToggle(),
    toggleDoorsLeft: (): void => refs.input.current?.triggerDoorLeftToggle(),
    toggleDoorsRight: (): void => refs.input.current?.triggerDoorRightToggle(),
    toggleWipers: (): void => refs.input.current?.triggerWipersToggle(),
    acknowledgeCzuwak: (): void => refs.input.current?.triggerCzuwakAck(),
    acknowledgeRadio: (): void => refs.input.current?.triggerRadioAck(),
    cycleCamera: (): void => refs.input.current?.triggerCameraCycle(),
    triggerEmergencyBrake: (): void => refs.input.current?.triggerEmergencyBrake(),
    setHornActive: (active: boolean): void => refs.input.current?.setVirtualHorn(active),
    setManualLeverAxis: (axis: number | null): void => refs.input.current?.setVirtualLeverAxis(axis),
  };
}

function createCabSystemActions(refs: IGameRuntimeRefs, syncNow: () => void) {
  return {
    toggleHeadlights: (): void => { refs.audio.current?.unlock(); refs.sim.current.cycleHeadlightMode?.(); syncNow(); },
    toggleCabLight: (): void => { refs.audio.current?.unlock(); refs.sim.current.toggleCabLight?.(); syncNow(); },
    toggleAto: (): void => { refs.audio.current?.unlock(); refs.sim.current.toggleAto?.(); syncNow(); },
  };
}

export function createGameplayQuickActions(deps: IGameplayActionDeps) {
  const { refs, syncNow } = deps;
  const applyRouteVariant = createRouteVariantApplicator(deps);
  return {
    applyRouteVariant,
    selectMetroLine: (lineId: MetroLineId): void => {
      const custom = lineId === 'M1' || lineId === 'M2' ? null : refs.customLinesRef.current.find((i) => i.id === lineId);
      applyRouteVariant(lineId === 'M1' || lineId === 'M2' ? getMetroLineSpec(lineId) : custom ? compileCustomLineSpec(custom) : METRO_LINE_M1, 'normal', 0);
    },
    selectRouteDirection: (dir: RouteDirection): void => applyRouteVariant(refs.baseLineRef.current, dir, 0),
    selectStartStation: (idx: number): void => applyRouteVariant(refs.baseLineRef.current, refs.routeDirectionRef.current, idx),
    triggerSandboxOncomingTrain: (): void => { refs.sim.current.triggerSandboxOncomingTrain(); syncNow(); },
    cycleSandboxNextSignal: (): void => { refs.sim.current.cycleSandboxNextSignal(); syncNow(); },
    ...createModeSelectionActions(deps),
    ...createTrainAndLiveryActions(deps),
    ...createCabInputActions(refs),
    ...createCabSystemActions(refs, syncNow),
  };
}
