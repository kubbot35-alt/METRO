import {
  JsonStorageRepository,
  type IJsonRepository,
  type IKeyValueStorage,
} from './persistence/jsonStorageRepository';
import {
  DEFAULT_GAME_SETTINGS,
  GRAPHICS_QUALITY_PRESETS,
  SETTINGS_STORAGE_KEY,
  getDefaultLiveMirrorsForQuality,
  getGraphicsQualityPreset,
} from './settingsPresets';
import type { GraphicsQualityId, IGameSettings, LanguageId, TouchControlsMode } from './types';

export type ISettingsStorage = IKeyValueStorage;

export interface ISettingsService {
  load(): IGameSettings;
  save(settings: IGameSettings): IGameSettings;
  reset(): IGameSettings;
}

export {
  DEFAULT_GAME_SETTINGS,
  GRAPHICS_QUALITY_PRESETS,
  SETTINGS_STORAGE_KEY,
  getDefaultLiveMirrorsForQuality,
  getGraphicsQualityPreset,
};

function clampNum(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, value));
}

function roundVol(value: unknown, fallback: number): number {
  return Math.round(clampNum(value, 0, 1, fallback) * 100) / 100;
}

function parseGraphicsQuality(value: unknown): GraphicsQualityId {
  return value === 'low' || value === 'medium' || value === 'high'
    ? value
    : DEFAULT_GAME_SETTINGS.graphicsQuality;
}

function parseTouchControlsMode(value: unknown): TouchControlsMode {
  return value === 'auto' || value === 'on' || value === 'off'
    ? value
    : DEFAULT_GAME_SETTINGS.touchControlsMode;
}

function parseLanguage(value: unknown): LanguageId {
  return value === 'pl' || value === 'en' ? value : DEFAULT_GAME_SETTINGS.language;
}

function parseBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function sanitizeGameSettings(raw: unknown): IGameSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_GAME_SETTINGS };
  }
  const obj = raw as Record<string, unknown>;
  const graphicsQuality = parseGraphicsQuality(obj.graphicsQuality);
  return {
    masterVolume: roundVol(obj.masterVolume, DEFAULT_GAME_SETTINGS.masterVolume),
    trainVolume: roundVol(obj.trainVolume, DEFAULT_GAME_SETTINGS.trainVolume),
    voiceVolume: roundVol(obj.voiceVolume, DEFAULT_GAME_SETTINGS.voiceVolume),
    alertsVolume: roundVol(obj.alertsVolume, DEFAULT_GAME_SETTINGS.alertsVolume),
    graphicsQuality,
    cabFovDeg: Math.round(clampNum(obj.cabFovDeg, 60, 95, DEFAULT_GAME_SETTINGS.cabFovDeg)),
    showFps: parseBool(obj.showFps, DEFAULT_GAME_SETTINGS.showFps),
    gamepadVibration: parseBool(obj.gamepadVibration, DEFAULT_GAME_SETTINGS.gamepadVibration),
    touchControlsMode: parseTouchControlsMode(obj.touchControlsMode),
    liveMirrorsEnabled: parseBool(obj.liveMirrorsEnabled, getDefaultLiveMirrorsForQuality(graphicsQuality)),
    sop2InterventionEnabled: parseBool(obj.sop2InterventionEnabled, DEFAULT_GAME_SETTINGS.sop2InterventionEnabled),
    language: parseLanguage(obj.language),
  };
}

export class SettingsStorageService implements ISettingsService {
  private readonly repo: IJsonRepository<IGameSettings>;

  public constructor(storage?: ISettingsStorage | null) {
    this.repo = new JsonStorageRepository<IGameSettings>(
      SETTINGS_STORAGE_KEY,
      () => ({ ...DEFAULT_GAME_SETTINGS }),
      sanitizeGameSettings,
      storage,
    );
  }

  public load(): IGameSettings {
    return this.repo.load();
  }

  public save(settings: IGameSettings): IGameSettings {
    return this.repo.save(settings);
  }

  public reset(): IGameSettings {
    return this.repo.save({ ...DEFAULT_GAME_SETTINGS });
  }
}
