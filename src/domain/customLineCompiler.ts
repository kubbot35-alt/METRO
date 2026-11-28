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
  return /^[0-9a-fA-F]{6}$/.test(cleaned) ? parseInt(cleaned, 16) : fallback;
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

export function sanitizeSpacing(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 600;
  }
  return Math.round(Math.max(MIN_STATION_SPACING_M, Math.min(MAX_STATION_SPACING_M, value)));
}

function sanitizeHexColor(value: unknown, fallback: string): string {
  if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim())) {
    return value.trim().toLowerCase();
  }
  return fallback;
}

function sanitizeIntensity(value: unknown): TrackAlignmentIntensity {
  return value === 'flat' || value === 'moderate' || value === 'curvy' ? value : 'moderate';
}

function sanitizeLayout(value: unknown): PlatformLayout {
  return value === 'side' ? 'side' : 'island';
}

function sanitizeStationEntry(entry: unknown, idx: number): ICustomStationDraft {
  const rec = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
  const name =
    typeof rec.name === 'string' && rec.name.trim().length > 0
      ? rec.name.trim().slice(0, 32)
      : `Stacja ${idx + 1}`;
  return {
    name,
    wallHex: sanitizeHexColor(rec.wallHex, STATION_WALL_PALETTE[idx % STATION_WALL_PALETTE.length].hex),
    platformLayout: sanitizeLayout(rec.platformLayout),
    spacingFromPrevM: sanitizeSpacing(rec.spacingFromPrevM),
  };
}

export function sanitizeCustomLineDraft(raw: unknown): ICustomLineDraft | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === 'string' ? obj.name.trim().slice(0, 36) : '';
  if (name.length < 2 || !Array.isArray(obj.stations) || obj.stations.length < MIN_CUSTOM_STATIONS) {
    return null;
  }
  const stations = obj.stations.slice(0, MAX_CUSTOM_STATIONS).map(sanitizeStationEntry);
  const idRaw = typeof obj.id === 'string' ? obj.id.trim() : '';
  const id = idRaw.startsWith('custom_') ? idRaw : `custom_${Date.now().toString(36)}`;
  const destRaw = typeof obj.destinationLed === 'string' ? obj.destinationLed.trim() : '';
  return {
    id,
    name,
    destinationLed: (destRaw || stations[stations.length - 1].name).toUpperCase().slice(0, 22),
    cssColor: sanitizeHexColor(obj.cssColor, '#10b981'),
    hasSurfaceStart: Boolean(obj.hasSurfaceStart),
    alignmentIntensity: sanitizeIntensity(obj.alignmentIntensity),
    stations,
  };
}

function compileCustomStations(draft: ICustomLineDraft, badgeCode: string): IStationSpec[] {
  let cumulativeDistM = 0;
  return draft.stations.map((st, idx) => {
    const rawSpacing = sanitizeSpacing(st.spacingFromPrevM);
    cumulativeDistM += idx === 0 && draft.hasSurfaceStart ? Math.max(560, rawSpacing) : rawSpacing;
    const accentHex = cssHexToNumber(st.wallHex, 0x059669);
    return {
      id: idx + 1, name: st.name, code: `${badgeCode}-${String(idx + 1).padStart(2, '0')}`,
      distanceM: cumulativeDistM, stopZoneHalfWidthM: STOP_ZONE_HALF_WIDTH_M, platformLengthM: PLATFORM_LENGTH_M,
      platformLayout: st.platformLayout, platformSide: st.platformLayout === 'side' ? 'right' : 'left',
      accentHex, wallBaseHex: accentHex, waitingPassengers: 14 + (idx % 4),
    };
  });
}

export function compileCustomLineSpec(draft: ICustomLineDraft): IMetroLineSpec {
  const badgeCode = deriveLineBadgeCode(draft.name, draft.destinationLed);
  const stations = compileCustomStations(draft, badgeCode);
  const first = stations[0]?.name ?? 'Start';
  const last = stations[stations.length - 1]?.name ?? 'Koniec';
  return {
    id: draft.id, badgeCode, isCustom: true, name: draft.name, routeLabel: `${first} — ${last}`,
    destinationLed: draft.destinationLed.toUpperCase(), oppositeDestinationLed: first.toUpperCase().slice(0, 18),
    colorHex: cssHexToNumber(draft.cssColor, 0x10b981), cssColor: draft.cssColor,
    hasSurfaceStart: draft.hasSurfaceStart, tunnelPortalDistanceM: draft.hasSurfaceStart ? 300 : null,
    alignmentIntensity: draft.alignmentIntensity, stations, speedZones: buildSpeedZonesForStations(stations),
  };
}
