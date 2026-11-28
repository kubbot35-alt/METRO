import {
  CUSTOM_LINES_STORAGE_KEY,
  LINE_COLOR_PALETTE,
  MAX_CUSTOM_STATIONS,
  MAX_STATION_SPACING_M,
  MIN_CUSTOM_STATIONS,
  MIN_STATION_SPACING_M,
  STATION_WALL_PALETTE,
  compileCustomLineSpec,
  createDefaultCustomLineDraft,
  cssHexToNumber,
  deriveLineBadgeCode,
  sanitizeCustomLineDraft,
} from './customLineCompiler';
import {
  JsonStorageRepository,
  type IJsonRepository,
  type IKeyValueStorage,
} from './persistence/jsonStorageRepository';
import type { ICustomLineDraft } from './types';

export type ICustomLineStorage = IKeyValueStorage;

export interface ICustomLineService {
  list(): readonly ICustomLineDraft[];
  save(draft: ICustomLineDraft): readonly ICustomLineDraft[];
  remove(id: string): readonly ICustomLineDraft[];
}

export {
  CUSTOM_LINES_STORAGE_KEY,
  LINE_COLOR_PALETTE,
  MAX_CUSTOM_STATIONS,
  MAX_STATION_SPACING_M,
  MIN_CUSTOM_STATIONS,
  MIN_STATION_SPACING_M,
  STATION_WALL_PALETTE,
  compileCustomLineSpec,
  createDefaultCustomLineDraft,
  cssHexToNumber,
  deriveLineBadgeCode,
  sanitizeCustomLineDraft,
};

export function exportCustomLineJson(draft: ICustomLineDraft): string {
  return JSON.stringify({
    name: draft.name,
    destinationLed: draft.destinationLed,
    cssColor: draft.cssColor,
    hasSurfaceStart: draft.hasSurfaceStart,
    alignmentIntensity: draft.alignmentIntensity,
    stations: draft.stations,
  });
}

export function importCustomLineJson(
  jsonText: string,
): { readonly ok: true; readonly draft: ICustomLineDraft } | { readonly ok: false; readonly error: string } {
  try {
    const parsed: unknown = JSON.parse(jsonText.trim());
    const sanitized = sanitizeCustomLineDraft(parsed);
    if (!sanitized) {
      return { ok: false, error: 'Nieprawidłowa struktura trasy (wymagana nazwa i 3–12 stacji).' };
    }
    return { ok: true, draft: { ...sanitized, id: `custom_${Date.now().toString(36)}` } };
  } catch {
    return { ok: false, error: 'Niepoprawny kod JSON — sprawdź składnię.' };
  }
}

function sanitizeCustomLineList(raw: unknown): readonly ICustomLineDraft[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item) => sanitizeCustomLineDraft(item))
    .filter((item): item is ICustomLineDraft => item !== null);
}

export class CustomLineStorageService implements ICustomLineService {
  private readonly repo: IJsonRepository<readonly ICustomLineDraft[]>;

  public constructor(storage?: ICustomLineStorage | null) {
    this.repo = new JsonStorageRepository<readonly ICustomLineDraft[]>(
      CUSTOM_LINES_STORAGE_KEY,
      () => [],
      sanitizeCustomLineList,
      storage,
    );
  }

  public list(): readonly ICustomLineDraft[] {
    return this.repo.load();
  }

  public save(draft: ICustomLineDraft): readonly ICustomLineDraft[] {
    const sanitized = sanitizeCustomLineDraft(draft);
    const existing = this.list();
    if (!sanitized) {
      return existing;
    }
    const idx = existing.findIndex((item) => item.id === sanitized.id);
    const next =
      idx >= 0 ? existing.map((item, i) => (i === idx ? sanitized : item)) : [...existing, sanitized];
    return this.repo.save(next);
  }

  public remove(id: string): readonly ICustomLineDraft[] {
    return this.repo.save(this.list().filter((item) => item.id !== id));
  }
}
