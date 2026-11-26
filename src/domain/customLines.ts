import {
  PLATFORM_LENGTH_M,
  STOP_ZONE_HALF_WIDTH_M,
  buildSpeedZonesForStations,
} from './routeData';
import type {
  ICustomLineDraft,
  ICustomStationDraft,
  IMetroLineSpec,
  IStationSpec,
  PlatformLayout,
  TrackAlignmentIntensity,
} from './types';

export interface ICustomLineStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface ICustomLineService {
  list(): readonly ICustomLineDraft[];
  save(draft: ICustomLineDraft): readonly ICustomLineDraft[];
  remove(id: string): readonly ICustomLineDraft[];
}

export const CUSTOM_LINES_STORAGE_KEY = 'warsaw_metro_custom_lines_v1';
export const MIN_CUSTOM_STATIONS = 3;
export const MAX_CUSTOM_STATIONS = 12;
export const MIN_STATION_SPACING_M = 400;
export const MAX_STATION_SPACING_M = 1200;

export const LINE_COLOR_PALETTE: ReadonlyArray<{ readonly label: string; readonly hex: string }> = [
  { label: 'Szmaragd M3', hex: '#10b981' },
  { label: 'Błękit M1', hex: '#2563eb' },
  { label: 'Czerwień M2', hex: '#dc2626' },
  { label: 'Bursztyn M4', hex: '#f59e0b' },
  { label: 'Fiolet M5', hex: '#8b5cf6' },
  { label: 'Cyjan', hex: '#06b6d4' },
  { label: 'Karmazyn', hex: '#e11d48' },
  { label: 'Limonka', hex: '#65a30d' },
];

export const STATION_WALL_PALETTE: ReadonlyArray<{ readonly label: string; readonly hex: string }> = [
  { label: 'Bursztyn', hex: '#d97706' },
  { label: 'Błękit', hex: '#0284c7' },
  { label: 'Szmaragd', hex: '#059669' },
  { label: 'Fiolet', hex: '#7c3aed' },
  { label: 'Czerwień', hex: '#e11d48' },
  { label: 'Morski', hex: '#0891b2' },
  { label: 'Granat', hex: '#2563eb' },
  { label: 'Stal', hex: '#64748b' },
];

export function createDefaultCustomLineDraft(): ICustomLineDraft {
  return {
    id: `custom_${Date.now().toString(36)}`,
    name: 'M3 Gocław',
    destinationLed: 'M3 GOCŁAW',
    cssColor: '#10b981',
    hasSurfaceStart: false,
    alignmentIntensity: 'moderate',
    stations: [
      { name: 'Stadion Narodowy', wallHex: '#0284c7', platformLayout: 'side', spacingFromPrevM: 600 },
      { name: 'Dworzec Wschodni', wallHex: '#059669', platformLayout: 'island', spacingFromPrevM: 650 },
      { name: 'Mińska', wallHex: '#d97706', platformLayout: 'island', spacingFromPrevM: 550 },
      { name: 'Rondo Wiatraczna', wallHex: '#7c3aed', platformLayout: 'island', spacingFromPrevM: 700 },
      { name: 'Gocław', wallHex: '#e11d48', platformLayout: 'side', spacingFromPrevM: 650 },
    ],
  };
}

export function cssHexToNumber(cssHex: string, fallback = 0x10b981): number {
  const cleaned = cssHex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return fallback;
  }
  return parseInt(cleaned, 16);
}

export function deriveLineBadgeCode(name: string, destinationLed: string): string {
  const combined = `${name} ${destinationLed}`.trim().toUpperCase();
  const tokenMatch = combined.match(/\b([A-Z]{1,2}\d{1,2})\b/);
  if (tokenMatch) {
    return tokenMatch[1];
  }
  const letters = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 3);
  return letters.length > 0 ? letters : 'M3';
}

function sanitizeHexColor(value: unknown, fallback: string): string {
  if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim())) {
    return value.trim().toLowerCase();
  }
  return fallback;
}

function sanitizeIntensity(value: unknown): TrackAlignmentIntensity {
  if (value === 'flat' || value === 'moderate' || value === 'curvy') {
    return value;
  }
  return 'moderate';
}

function sanitizeLayout(value: unknown): PlatformLayout {
  return value === 'side' ? 'side' : 'island';
}

function sanitizeSpacing(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 600;
  }
  return Math.round(Math.max(MIN_STATION_SPACING_M, Math.min(MAX_STATION_SPACING_M, value)));
}

export function sanitizeCustomLineDraft(raw: unknown): ICustomLineDraft | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === 'string' ? obj.name.trim().slice(0, 36) : '';
  if (name.length < 2) {
    return null;
  }
  if (!Array.isArray(obj.stations) || obj.stations.length < MIN_CUSTOM_STATIONS) {
    return null;
  }
  const stations: ICustomStationDraft[] = obj.stations
    .slice(0, MAX_CUSTOM_STATIONS)
    .map((entry, idx) => {
      const rec = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
      const stName =
        typeof rec.name === 'string' && rec.name.trim().length > 0
          ? rec.name.trim().slice(0, 32)
          : `Stacja ${idx + 1}`;
      return {
        name: stName,
        wallHex: sanitizeHexColor(rec.wallHex, STATION_WALL_PALETTE[idx % STATION_WALL_PALETTE.length].hex),
        platformLayout: sanitizeLayout(rec.platformLayout),
        spacingFromPrevM: sanitizeSpacing(rec.spacingFromPrevM),
      };
    });

  const idRaw = typeof obj.id === 'string' && obj.id.trim().length > 0 ? obj.id.trim() : '';
  const id = idRaw.startsWith('custom_') ? idRaw : `custom_${Date.now().toString(36)}`;
  const destRaw = typeof obj.destinationLed === 'string' ? obj.destinationLed.trim() : '';
  const destinationLed = (destRaw || stations[stations.length - 1].name).toUpperCase().slice(0, 22);

  return {
    id,
    name,
    destinationLed,
    cssColor: sanitizeHexColor(obj.cssColor, '#10b981'),
    hasSurfaceStart: Boolean(obj.hasSurfaceStart),
    alignmentIntensity: sanitizeIntensity(obj.alignmentIntensity),
    stations,
  };
}

export function compileCustomLineSpec(draft: ICustomLineDraft): IMetroLineSpec {
  const badgeCode = deriveLineBadgeCode(draft.name, draft.destinationLed);
  let cumulativeDistM = 0;
  const stations: IStationSpec[] = draft.stations.map((st, idx) => {
    const rawSpacing = sanitizeSpacing(st.spacingFromPrevM);
    const legSpacing = idx === 0 && draft.hasSurfaceStart ? Math.max(560, rawSpacing) : rawSpacing;
    cumulativeDistM += legSpacing;
    const accentHex = cssHexToNumber(st.wallHex, 0x059669);
    return {
      id: idx + 1,
      name: st.name,
      code: `${badgeCode}-${String(idx + 1).padStart(2, '0')}`,
      distanceM: cumulativeDistM,
      stopZoneHalfWidthM: STOP_ZONE_HALF_WIDTH_M,
      platformLengthM: PLATFORM_LENGTH_M,
      platformLayout: st.platformLayout,
      platformSide: st.platformLayout === 'side' ? 'right' : 'left',
      accentHex,
      wallBaseHex: accentHex,
      waitingPassengers: 14 + (idx % 4),
    };
  });

  const first = stations[0]?.name ?? 'Start';
  const last = stations[stations.length - 1]?.name ?? 'Koniec';
  return {
    id: draft.id,
    badgeCode,
    isCustom: true,
    name: draft.name,
    routeLabel: `${first} — ${last}`,
    destinationLed: draft.destinationLed.toUpperCase(),
    oppositeDestinationLed: first.toUpperCase().slice(0, 18),
    colorHex: cssHexToNumber(draft.cssColor, 0x10b981),
    cssColor: draft.cssColor,
    hasSurfaceStart: draft.hasSurfaceStart,
    tunnelPortalDistanceM: draft.hasSurfaceStart ? 300 : null,
    alignmentIntensity: draft.alignmentIntensity,
    stations,
    speedZones: buildSpeedZonesForStations(stations),
  };
}

export function exportCustomLineJson(draft: ICustomLineDraft): string {
  const payload = {
    name: draft.name,
    destinationLed: draft.destinationLed,
    cssColor: draft.cssColor,
    hasSurfaceStart: draft.hasSurfaceStart,
    alignmentIntensity: draft.alignmentIntensity,
    stations: draft.stations,
  };
  return JSON.stringify(payload);
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

export class CustomLineStorageService implements ICustomLineService {
  private readonly storage: ICustomLineStorage | null;

  public constructor(storage?: ICustomLineStorage | null) {
    if (storage !== undefined) {
      this.storage = storage;
      return;
    }
    this.storage = typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  }

  public list(): readonly ICustomLineDraft[] {
    if (!this.storage) {
      return [];
    }
    try {
      const raw = this.storage.getItem(CUSTOM_LINES_STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .map((item) => sanitizeCustomLineDraft(item))
        .filter((item): item is ICustomLineDraft => item !== null);
    } catch {
      return [];
    }
  }

  public save(draft: ICustomLineDraft): readonly ICustomLineDraft[] {
    const sanitized = sanitizeCustomLineDraft(draft);
    if (!sanitized) {
      return this.list();
    }
    const existing = this.list();
    const idx = existing.findIndex((item) => item.id === sanitized.id);
    const next =
      idx >= 0
        ? existing.map((item, i) => (i === idx ? sanitized : item))
        : [...existing, sanitized];
    this.persist(next);
    return next;
  }

  public remove(id: string): readonly ICustomLineDraft[] {
    const next = this.list().filter((item) => item.id !== id);
    this.persist(next);
    return next;
  }

  private persist(lines: readonly ICustomLineDraft[]): void {
    if (!this.storage) {
      return;
    }
    try {
      this.storage.setItem(CUSTOM_LINES_STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Ignore storage quota errors
    }
  }
}
