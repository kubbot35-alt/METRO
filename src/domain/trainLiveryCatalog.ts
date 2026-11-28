import { DRIVER_RANKS } from './driverProfile';
import {
  JsonStorageRepository,
  type IJsonRepository,
  type IKeyValueStorage,
} from './persistence/jsonStorageRepository';
import { TRAIN_LIVERIES } from './trainLiveryData';
import type {
  DriverRankId,
  GameModeId,
  ITrainLiverySpec,
  ITrainModelSpec,
  ITrainVisualProfile,
  LanguageId,
  TrainLiveryId,
  TrainModelId,
} from './types';

export type IStorageLike = IKeyValueStorage;
export type SelectedLiveryMap = Record<TrainModelId, TrainLiveryId>;

export interface ITrainLiveryStorageService {
  load(): SelectedLiveryMap;
  saveForTrain(trainModelId: TrainModelId, liveryId: TrainLiveryId): SelectedLiveryMap;
}

export { TRAIN_LIVERIES };

const STORAGE_KEY = 'warsaw_metro_selected_liveries_v1';
const RANK_ORDER: Record<DriverRankId, number> = {
  trainee: 0,
  junior: 1,
  driver: 2,
  senior: 3,
  instructor: 4,
  legend: 5,
};
const DEFAULT_SELECTED_LIVERIES: SelectedLiveryMap = {
  seria81: 'default',
  inspiro: 'default',
  varsovia: 'default',
};

export function getLiveriesForTrain(trainModelId: TrainModelId): readonly ITrainLiverySpec[] {
  return TRAIN_LIVERIES.filter((l) => l.supportedTrains.includes(trainModelId));
}

export function getLiverySpec(liveryId: TrainLiveryId): ITrainLiverySpec {
  return TRAIN_LIVERIES.find((l) => l.id === liveryId) ?? TRAIN_LIVERIES[0];
}

export function isLiveryUnlockedByRank(liveryId: TrainLiveryId, currentRankId: DriverRankId): boolean {
  return RANK_ORDER[currentRankId] >= RANK_ORDER[getLiverySpec(liveryId).requiredRankId];
}

export function isLiverySelectable(
  liveryId: TrainLiveryId,
  trainModelId: TrainModelId,
  currentRankId: DriverRankId,
  gameMode: GameModeId,
): boolean {
  if (!getLiverySpec(liveryId).supportedTrains.includes(trainModelId)) {
    return false;
  }
  return gameMode === 'sandbox' || isLiveryUnlockedByRank(liveryId, currentRankId);
}

export function getRequiredRankTitle(requiredRankId: DriverRankId, lang: LanguageId): string {
  const rank = DRIVER_RANKS.find((r) => r.id === requiredRankId) ?? DRIVER_RANKS[0];
  if (lang !== 'en') {
    return rank.title;
  }
  const enTitles: Record<DriverRankId, string> = {
    trainee: 'Trainee',
    junior: 'Junior Driver',
    driver: 'Driver',
    senior: 'Senior Driver',
    instructor: 'Instructor',
    legend: 'Metro Legend',
  };
  return enTitles[requiredRankId] ?? rank.title;
}

export function applyLiveryToVisualProfile(
  baseVisual: ITrainVisualProfile,
  trainModelId: TrainModelId,
  liveryId: TrainLiveryId,
): ITrainVisualProfile {
  const spec = getLiverySpec(liveryId);
  if (!spec.supportedTrains.includes(trainModelId)) {
    return { ...baseVisual, liveryId: 'default' };
  }
  const override = spec.visualOverrides[trainModelId];
  return override ? { ...baseVisual, ...override, liveryId: spec.id } : { ...baseVisual, liveryId: spec.id };
}

export function applyLiveryToTrainSpec(
  baseSpec: ITrainModelSpec,
  liveryId: TrainLiveryId,
): ITrainModelSpec {
  return {
    ...baseSpec,
    visual: applyLiveryToVisualProfile(baseSpec.visual, baseSpec.id, liveryId),
  };
}

function sanitizeForTrain(trainModelId: TrainModelId, candidate: unknown): TrainLiveryId {
  if (typeof candidate !== 'string') {
    return 'default';
  }
  const spec = TRAIN_LIVERIES.find((l) => l.id === candidate);
  return spec && spec.supportedTrains.includes(trainModelId) ? spec.id : 'default';
}

function sanitizeLiveryMap(raw: unknown): SelectedLiveryMap {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SELECTED_LIVERIES };
  }
  const parsed = raw as Record<string, unknown>;
  return {
    seria81: sanitizeForTrain('seria81', parsed.seria81),
    inspiro: sanitizeForTrain('inspiro', parsed.inspiro),
    varsovia: sanitizeForTrain('varsovia', parsed.varsovia),
  };
}

export class TrainLiveryStorageService implements ITrainLiveryStorageService {
  private readonly repo: IJsonRepository<SelectedLiveryMap>;

  public constructor(storage?: IStorageLike | null) {
    this.repo = new JsonStorageRepository<SelectedLiveryMap>(
      STORAGE_KEY,
      () => ({ ...DEFAULT_SELECTED_LIVERIES }),
      sanitizeLiveryMap,
      storage,
    );
  }

  public load(): SelectedLiveryMap {
    return this.repo.load();
  }

  public saveForTrain(trainModelId: TrainModelId, liveryId: TrainLiveryId): SelectedLiveryMap {
    const current = this.repo.load();
    return this.repo.save({
      ...current,
      [trainModelId]: sanitizeForTrain(trainModelId, liveryId),
    });
  }
}
