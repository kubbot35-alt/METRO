import type {
  GraphicsQualityId,
  IGameSettings,
  IGraphicsQualityPreset,
  TouchControlsMode,
} from './types';

export interface ISettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface ISettingsService {
  load(): IGameSettings;
  save(settings: IGameSettings): IGameSettings;
  reset(): IGameSettings;
}

export const SETTINGS_STORAGE_KEY = 'warsaw_metro_settings_v1';

export const DEFAULT_GAME_SETTINGS: IGameSettings = {
  masterVolume: 0.85,
  trainVolume: 0.9,
  voiceVolume: 0.95,
  graphicsQuality: 'high',
  cabFovDeg: 64,
  showFps: false,
  gamepadVibration: true,
  touchControlsMode: 'auto',
};

export const GRAPHICS_QUALITY_PRESETS: readonly IGraphicsQualityPreset[] = [
  {
    id: 'low',
    label: 'Niska',
    description: 'Krótki zasięg tunelu, mniej pasażerów i deszczu, bez cieni (maks. FPS).',
    drawDistanceM: 185,
    passengerDensity: 0.4,
    rainDensity: 0.28,
    pixelRatioCap: 1.0,
    enableShadows: false,
  },
  {
    id: 'medium',
    label: 'Średnia',
    description: 'Zbalansowany zasięg tunelu, 75% pasażerów, umiarkowany deszcz.',
    drawDistanceM: 285,
    passengerDensity: 0.75,
    rainDensity: 0.62,
    pixelRatioCap: 1.5,
    enableShadows: false,
  },
  {
    id: 'high',
    label: 'Wysoka',
    description: 'Pełny zasięg widzenia, komplet pasażerów, gęsty deszcz, cienie i AA.',
    drawDistanceM: 420,
    passengerDensity: 1.0,
    rainDensity: 1.0,
    pixelRatioCap: 2.0,
    enableShadows: true,
  },
];

export function getGraphicsQualityPreset(id: GraphicsQualityId): IGraphicsQualityPreset {
  return GRAPHICS_QUALITY_PRESETS.find((p) => p.id === id) ?? GRAPHICS_QUALITY_PRESETS[2];
}

function clampNum(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, value));
}

function parseGraphicsQuality(value: unknown): GraphicsQualityId {
  if (value === 'low' || value === 'medium' || value === 'high') {
    return value;
  }
  return DEFAULT_GAME_SETTINGS.graphicsQuality;
}

function parseTouchControlsMode(value: unknown): TouchControlsMode {
  if (value === 'auto' || value === 'on' || value === 'off') {
    return value;
  }
  return DEFAULT_GAME_SETTINGS.touchControlsMode;
}

export function sanitizeGameSettings(raw: unknown): IGameSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_GAME_SETTINGS };
  }
  const obj = raw as Record<string, unknown>;
  return {
    masterVolume: Math.round(clampNum(obj.masterVolume, 0, 1, DEFAULT_GAME_SETTINGS.masterVolume) * 100) / 100,
    trainVolume: Math.round(clampNum(obj.trainVolume, 0, 1, DEFAULT_GAME_SETTINGS.trainVolume) * 100) / 100,
    voiceVolume: Math.round(clampNum(obj.voiceVolume, 0, 1, DEFAULT_GAME_SETTINGS.voiceVolume) * 100) / 100,
    graphicsQuality: parseGraphicsQuality(obj.graphicsQuality),
    cabFovDeg: Math.round(clampNum(obj.cabFovDeg, 60, 95, DEFAULT_GAME_SETTINGS.cabFovDeg)),
    showFps: typeof obj.showFps === 'boolean' ? obj.showFps : DEFAULT_GAME_SETTINGS.showFps,
    gamepadVibration:
      typeof obj.gamepadVibration === 'boolean'
        ? obj.gamepadVibration
        : DEFAULT_GAME_SETTINGS.gamepadVibration,
    touchControlsMode: parseTouchControlsMode(obj.touchControlsMode),
  };
}

export class SettingsStorageService implements ISettingsService {
  private readonly storage: ISettingsStorage | null;

  public constructor(storage?: ISettingsStorage | null) {
    if (storage !== undefined) {
      this.storage = storage;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
    } else {
      this.storage = null;
    }
  }

  public load(): IGameSettings {
    if (!this.storage) {
      return { ...DEFAULT_GAME_SETTINGS };
    }
    try {
      const raw = this.storage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) {
        return { ...DEFAULT_GAME_SETTINGS };
      }
      return sanitizeGameSettings(JSON.parse(raw));
    } catch {
      return { ...DEFAULT_GAME_SETTINGS };
    }
  }

  public save(settings: IGameSettings): IGameSettings {
    const clean = sanitizeGameSettings(settings);
    if (this.storage) {
      try {
        this.storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(clean));
      } catch {
        // Ignore storage quota / private mode failures
      }
    }
    return clean;
  }

  public reset(): IGameSettings {
    return this.save(DEFAULT_GAME_SETTINGS);
  }
}
