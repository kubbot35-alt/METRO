import type {
  ISimulationSnapshot,
  OncomingTrainMode,
  SignalAspect,
  TrainModelId,
} from './types';

export type DispatchStationStatus = 'served' | 'current' | 'upcoming';

export interface IDispatchMapStationNode {
  readonly id: number;
  readonly index: number;
  readonly name: string;
  readonly code: string;
  readonly distanceM: number;
  readonly progress01: number;
  readonly status: DispatchStationStatus;
}

export interface IDispatchMapSignalNode {
  readonly id: number;
  readonly distanceM: number;
  readonly progress01: number;
  readonly aspect: SignalAspect;
}

export interface IDispatchMapTrainMarker {
  readonly kind: 'player' | 'leading' | 'opposite';
  readonly progress01: number;
  readonly direction: 'forward' | 'reverse';
  readonly modelId: TrainModelId;
  readonly speedKmh: number;
  readonly doorsOpen: boolean;
  readonly mode: OncomingTrainMode | 'player';
  readonly delayed: boolean;
}

export interface IDispatchMapModel {
  readonly lineBadge: string;
  readonly lineName: string;
  readonly lineColorCss: string;
  readonly routeLabel: string;
  readonly totalDistanceM: number;
  readonly stations: readonly IDispatchMapStationNode[];
  readonly signals: readonly IDispatchMapSignalNode[];
  readonly playerMarker: IDispatchMapTrainMarker;
  readonly leadingMarker: IDispatchMapTrainMarker | null;
  readonly oppositeMarker: IDispatchMapTrainMarker | null;
  readonly headwayDistanceM: number | null;
  readonly headwayBlocks: number | null;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function resolveStationStatus(
  idx: number,
  currentIdx: number,
  currentBoarded: boolean,
): DispatchStationStatus {
  if (idx < currentIdx) return 'served';
  if (idx === currentIdx && currentBoarded) return 'served';
  return idx === currentIdx ? 'current' : 'upcoming';
}

export function formatShortTrainModel(modelId: TrainModelId): string {
  if (modelId === 'varsovia') return 'VARSOVIA';
  return modelId === 'seria81' ? 'SERIA 81' : 'INSPIRO';
}

function buildStationNodes(
  snapshot: ISimulationSnapshot,
  toProgress: (distM: number) => number,
): readonly IDispatchMapStationNode[] {
  return snapshot.stations.map((st, idx): IDispatchMapStationNode => ({
    id: st.id, index: idx, name: st.name, code: st.code, distanceM: st.distanceM,
    progress01: toProgress(st.distanceM),
    status: resolveStationStatus(idx, snapshot.currentStation.stationIndex, snapshot.currentStation.boarded),
  }));
}

function buildSignalNodes(
  snapshot: ISimulationSnapshot,
  toProgress: (distM: number) => number,
): readonly IDispatchMapSignalNode[] {
  return snapshot.signals.map((sig): IDispatchMapSignalNode => ({
    id: sig.id, distanceM: sig.distanceM, progress01: toProgress(sig.distanceM), aspect: sig.aspect,
  }));
}

function buildPlayerMarker(
  snapshot: ISimulationSnapshot,
  toProgress: (distM: number) => number,
): IDispatchMapTrainMarker {
  return {
    kind: 'player', progress01: toProgress(snapshot.kinematics.positionM),
    direction: 'forward', modelId: snapshot.trainModel.id,
    speedKmh: Math.round(snapshot.kinematics.speedKmh),
    doorsOpen: snapshot.doorState === 'open', mode: 'player', delayed: false,
  };
}

export function buildDispatchMapModel(snapshot: ISimulationSnapshot): IDispatchMapModel {
  const lastStationDist = snapshot.stations[snapshot.stations.length - 1]?.distanceM ?? 1;
  const totalDistanceM = Math.max(lastStationDist, 1);
  const toProgress = (distM: number): number => clamp01(distM / totalDistanceM);
  return {
    lineBadge: snapshot.line.badgeCode ?? snapshot.line.id,
    lineName: snapshot.line.name,
    lineColorCss: snapshot.line.cssColor,
    routeLabel: snapshot.line.routeLabel,
    totalDistanceM,
    stations: buildStationNodes(snapshot, toProgress),
    signals: buildSignalNodes(snapshot, toProgress),
    playerMarker: buildPlayerMarker(snapshot, toProgress),
    leadingMarker: buildLeadingMarker(snapshot, toProgress),
    oppositeMarker: buildOppositeMarker(snapshot, toProgress),
    headwayDistanceM: snapshot.leadingTrain.active ? snapshot.leadingTrain.distanceAheadM : null,
    headwayBlocks: snapshot.leadingTrain.active ? snapshot.leadingTrain.blocksAhead : null,
  };
}

function buildLeadingMarker(
  snapshot: ISimulationSnapshot,
  toProgress: (distM: number) => number,
): IDispatchMapTrainMarker | null {
  const lead = snapshot.leadingTrain;
  if (!lead.active) return null;
  return {
    kind: 'leading',
    progress01: toProgress(lead.positionM),
    direction: 'forward',
    modelId: lead.modelId,
    speedKmh: Math.round(lead.speedKmh),
    doorsOpen: lead.doorsOpen,
    mode: lead.mode,
    delayed: lead.delayed,
  };
}

function buildOppositeMarker(
  snapshot: ISimulationSnapshot,
  toProgress: (distM: number) => number,
): IDispatchMapTrainMarker | null {
  const opp = snapshot.oncomingTrain;
  if (!opp.active) return null;
  return {
    kind: 'opposite',
    progress01: toProgress(opp.positionM),
    direction: 'reverse',
    modelId: opp.modelId,
    speedKmh: Math.round(opp.speedMs * 3.6),
    doorsOpen: opp.doorsOpen,
    mode: opp.mode,
    delayed: false,
  };
}
