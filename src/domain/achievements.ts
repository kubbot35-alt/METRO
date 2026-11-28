import {
  ACHIEVEMENT_CATALOG,
  evaluateUnlockedAchievementIds,
} from './achievementCatalog';
import {
  JsonStorageRepository,
  type IJsonRepository,
  type IKeyValueStorage,
} from './persistence/jsonStorageRepository';
import type {
  AchievementId,
  IAchievementRecord,
  IAchievementSpec,
  ISimulationSnapshot,
} from './types';

export type IAchievementStorage = IKeyValueStorage;

export interface IAchievementService {
  getCatalog(): readonly IAchievementSpec[];
  getUnlockedRecords(): readonly IAchievementRecord[];
  isUnlocked(id: AchievementId): boolean;
  evaluateAndUnlock(snapshot: ISimulationSnapshot): readonly IAchievementSpec[];
  clear(): void;
}

export { ACHIEVEMENT_CATALOG, evaluateUnlockedAchievementIds };

const STORAGE_KEY = 'metro_m1_achievements_v1';
const VALID_IDS = new Set<string>(ACHIEVEMENT_CATALOG.map((c) => c.id));

function isValidAchievementRecord(item: unknown): item is IAchievementRecord {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof (item as { id?: unknown }).id === 'string' &&
    VALID_IDS.has((item as { id: string }).id) &&
    typeof (item as { unlockedAtIso?: unknown }).unlockedAtIso === 'string'
  );
}

function sanitizeAchievementRecords(raw: unknown): readonly IAchievementRecord[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(isValidAchievementRecord);
}

export class AchievementService implements IAchievementService {
  private readonly repo: IJsonRepository<readonly IAchievementRecord[]>;
  private readonly nowProvider: () => Date;

  public constructor(
    storage?: IAchievementStorage | null,
    nowProvider: () => Date = () => new Date(),
  ) {
    this.repo = new JsonStorageRepository<readonly IAchievementRecord[]>(
      STORAGE_KEY,
      () => [],
      sanitizeAchievementRecords,
      storage,
    );
    this.nowProvider = nowProvider;
  }

  public getCatalog(): readonly IAchievementSpec[] {
    return ACHIEVEMENT_CATALOG;
  }

  public getUnlockedRecords(): readonly IAchievementRecord[] {
    return this.repo.load();
  }

  public isUnlocked(id: AchievementId): boolean {
    return this.repo.load().some((rec) => rec.id === id);
  }

  public evaluateAndUnlock(snapshot: ISimulationSnapshot): readonly IAchievementSpec[] {
    const records = this.repo.load();
    const unlockedSet = new Set<AchievementId>(records.map((r) => r.id));
    const newlyIds = evaluateUnlockedAchievementIds(snapshot, unlockedSet);
    if (newlyIds.length === 0) {
      return [];
    }
    const iso = this.nowProvider().toISOString();
    const updated: IAchievementRecord[] = [
      ...records,
      ...newlyIds.map((id) => ({ id, unlockedAtIso: iso })),
    ];
    this.repo.save(updated);
    return newlyIds
      .map((id) => ACHIEVEMENT_CATALOG.find((spec) => spec.id === id))
      .filter((spec): spec is IAchievementSpec => spec !== undefined);
  }

  public clear(): void {
    this.repo.save([]);
  }
}
