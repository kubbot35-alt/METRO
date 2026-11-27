import { DRIVER_RANKS } from './driverProfile';
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

const STORAGE_KEY = 'warsaw_metro_selected_liveries_v1';

const RANK_ORDER: Record<DriverRankId, number> = {
  trainee: 0,
  junior: 1,
  driver: 2,
  senior: 3,
  instructor: 4,
  legend: 5,
};

export const TRAIN_LIVERIES: readonly ITrainLiverySpec[] = [
  {
    id: 'default',
    name: 'Domyślne (Warszawskie)',
    nameEn: 'Default (Warsaw ZTM)',
    subtitle: 'Oficjalne barwy Metra Warszawskiego',
    subtitleEn: 'Official Warsaw Metro service livery',
    swatchColors: ['#e2e8f0', '#dc2626', '#facc15'],
    requiredRankId: 'trainee',
    supportedTrains: ['seria81', 'inspiro', 'varsovia'],
    visualOverrides: {},
  },
  {
    id: 'retro_1995',
    name: 'Retro 1995',
    nameEn: 'Retro 1995',
    subtitle: 'Klasyczne niebiesko-żółto-czerwone malowanie z otwarcia M1',
    subtitleEn: 'Classic 1995 blue-yellow-red opening year livery',
    swatchColors: ['#1d4ed8', '#facc15', '#dc2626'],
    requiredRankId: 'junior',
    supportedTrains: ['seria81'],
    visualOverrides: {
      seria81: {
        bodyHex: 0x1e40af,
        roofHex: 0x172554,
        stripeHex: 0xdc2626,
        noseHex: 0xfacc15,
        cabAccentHex: 0x3b82f6,
      },
    },
  },
  {
    id: 'jubilee',
    name: 'Edycja Jubileuszowa',
    nameEn: 'Jubilee Edition',
    subtitle: 'Eleganckie biało-złoto-granatowe pasy jubileuszowe',
    subtitleEn: 'Elegant white, gold & navy ceremonial stripes',
    swatchColors: ['#f8fafc', '#d97706', '#1e3a8a'],
    requiredRankId: 'driver',
    supportedTrains: ['inspiro'],
    visualOverrides: {
      inspiro: {
        bodyHex: 0xf8fafc,
        roofHex: 0x1e3a8a,
        stripeHex: 0xd97706,
        noseHex: 0xfbbf24,
        cabAccentHex: 0xf59e0b,
      },
    },
  },
  {
    id: 'stealth_night',
    name: 'Stealth / Night Edition',
    nameEn: 'Stealth / Night Edition',
    subtitle: 'Matowy grafit z neonowymi czerwonymi akcentami LED',
    subtitleEn: 'Matte graphite shell with neon crimson LED accents',
    swatchColors: ['#1e293b', '#0f172a', '#ff1e42'],
    requiredRankId: 'senior',
    supportedTrains: ['varsovia'],
    visualOverrides: {
      varsovia: {
        bodyHex: 0x1e293b,
        roofHex: 0x0f172a,
        stripeHex: 0xff1e42,
        noseHex: 0xe11d48,
        cabAccentHex: 0xff2a55,
      },
    },
  },
  {
    id: 'golden_legend',
    name: 'Złoty Skład Legendy',
    nameEn: 'Golden Legend Consist',
    subtitle: 'Prestiżowe złoto-platynowe malowanie dla Legendy Metra',
    subtitleEn: 'Prestigious gold & platinum livery for Metro Legends',
    swatchColors: ['#f59e0b', '#fef08a', '#78350f'],
    requiredRankId: 'legend',
    supportedTrains: ['seria81', 'inspiro', 'varsovia'],
    visualOverrides: {
      seria81: {
        bodyHex: 0xd97706,
        roofHex: 0x78350f,
        stripeHex: 0xfef08a,
        noseHex: 0xfde047,
        cabAccentHex: 0xfbbf24,
      },
      inspiro: {
        bodyHex: 0xf59e0b,
        roofHex: 0x92400e,
        stripeHex: 0xfef08a,
        noseHex: 0xfde047,
        cabAccentHex: 0xfbbf24,
      },
      varsovia: {
        bodyHex: 0xfbbf24,
        roofHex: 0x92400e,
        stripeHex: 0xfffbeb,
        noseHex: 0xf59e0b,
        cabAccentHex: 0xfde047,
      },
    },
  },
] as const;

export function getLiveriesForTrain(trainModelId: TrainModelId): readonly ITrainLiverySpec[] {
  return TRAIN_LIVERIES.filter((l) => l.supportedTrains.includes(trainModelId));
}

export function getLiverySpec(liveryId: TrainLiveryId): ITrainLiverySpec {
  return TRAIN_LIVERIES.find((l) => l.id === liveryId) ?? TRAIN_LIVERIES[0];
}

export function isLiveryUnlockedByRank(
  liveryId: TrainLiveryId,
  currentRankId: DriverRankId,
): boolean {
  const spec = getLiverySpec(liveryId);
  return RANK_ORDER[currentRankId] >= RANK_ORDER[spec.requiredRankId];
}

export function isLiverySelectable(
  liveryId: TrainLiveryId,
  trainModelId: TrainModelId,
  currentRankId: DriverRankId,
  gameMode: GameModeId,
): boolean {
  const spec = getLiverySpec(liveryId);
  if (!spec.supportedTrains.includes(trainModelId)) {
    return false;
  }
  if (gameMode === 'sandbox') {
    return true;
  }
  return isLiveryUnlockedByRank(liveryId, currentRankId);
}

export function getRequiredRankTitle(requiredRankId: DriverRankId, lang: LanguageId): string {
  const rank = DRIVER_RANKS.find((r) => r.id === requiredRankId) ?? DRIVER_RANKS[0];
  if (lang === 'en') {
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
  return rank.title;
}

export function applyLiveryToVisualProfile(
  baseVisual: ITrainVisualProfile,
  trainModelId: TrainModelId,
  liveryId: TrainLiveryId,
): ITrainVisualProfile {
  const spec = getLiverySpec(liveryId);
  if (!spec.supportedTrains.includes(trainModelId)) {
    return {
      ...baseVisual,
      liveryId: 'default',
    };
  }
  const override = spec.visualOverrides[trainModelId];
  if (!override) {
    return {
      ...baseVisual,
      liveryId: spec.id,
    };
  }
  return {
    ...baseVisual,
    ...override,
    liveryId: spec.id,
  };
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

export type SelectedLiveryMap = Record<TrainModelId, TrainLiveryId>;

const DEFAULT_SELECTED_LIVERIES: SelectedLiveryMap = {
  seria81: 'default',
  inspiro: 'default',
  varsovia: 'default',
};

export interface IStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface ITrainLiveryStorageService {
  load(): SelectedLiveryMap;
  saveForTrain(trainModelId: TrainModelId, liveryId: TrainLiveryId): SelectedLiveryMap;
  loadSelectedLiveries(): SelectedLiveryMap;
  saveSelectedLivery(trainModelId: TrainModelId, liveryId: TrainLiveryId): SelectedLiveryMap;
}

export class TrainLiveryStorageService implements ITrainLiveryStorageService {
  private readonly storage?: IStorageLike;

  public constructor(storage?: IStorageLike) {
    this.storage =
      storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  }

  public load(): SelectedLiveryMap {
    return this.loadSelectedLiveries();
  }

  public saveForTrain(trainModelId: TrainModelId, liveryId: TrainLiveryId): SelectedLiveryMap {
    return this.saveSelectedLivery(trainModelId, liveryId);
  }

  public loadSelectedLiveries(): SelectedLiveryMap {
    try {
      const raw = this.storage?.getItem(STORAGE_KEY) ?? null;
      if (!raw) {
        return { ...DEFAULT_SELECTED_LIVERIES };
      }
      const parsed = JSON.parse(raw) as Partial<SelectedLiveryMap>;
      return {
        seria81: this.sanitizeForTrain('seria81', parsed.seria81),
        inspiro: this.sanitizeForTrain('inspiro', parsed.inspiro),
        varsovia: this.sanitizeForTrain('varsovia', parsed.varsovia),
      };
    } catch {
      return { ...DEFAULT_SELECTED_LIVERIES };
    }
  }

  public saveSelectedLivery(trainModelId: TrainModelId, liveryId: TrainLiveryId): SelectedLiveryMap {
    const current = this.loadSelectedLiveries();
    const next: SelectedLiveryMap = {
      ...current,
      [trainModelId]: this.sanitizeForTrain(trainModelId, liveryId),
    };
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore localStorage quota errors
    }
    return next;
  }

  private sanitizeForTrain(trainModelId: TrainModelId, candidate?: TrainLiveryId): TrainLiveryId {
    if (!candidate) {
      return 'default';
    }
    const spec = TRAIN_LIVERIES.find((l) => l.id === candidate);
    if (!spec || !spec.supportedTrains.includes(trainModelId)) {
      return 'default';
    }
    return spec.id;
  }
}
