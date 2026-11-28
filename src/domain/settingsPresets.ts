import type { GraphicsQualityId, IGameSettings, IGraphicsQualityPreset } from './types';

export const SETTINGS_STORAGE_KEY = 'warsaw_metro_settings_v1';

export const DEFAULT_GAME_SETTINGS: IGameSettings = {
  masterVolume: 0.85,
  trainVolume: 0.9,
  voiceVolume: 0.95,
  alertsVolume: 0.9,
  graphicsQuality: 'high',
  cabFovDeg: 64,
  showFps: false,
  gamepadVibration: true,
  touchControlsMode: 'auto',
  liveMirrorsEnabled: true,
  sop2InterventionEnabled: true,
  language: 'pl',
};

export const GRAPHICS_QUALITY_PRESETS: readonly IGraphicsQualityPreset[] = [
  {
    id: 'low',
    label: 'Niska',
    description: 'Krótki zasięg tunelu, mniej pasażerów, wyłączone lusterka na żywo i cienie (maks. FPS).',
    drawDistanceM: 185,
    passengerDensity: 0.4,
    rainDensity: 0.28,
    pixelRatioCap: 1.0,
    enableShadows: false,
    mirrorUpdateInterval: 0,
  },
  {
    id: 'medium',
    label: 'Średnia',
    description: 'Zbalansowany zasięg tunelu, 75% pasażerów, lusterka/CCTV ~15 FPS.',
    drawDistanceM: 285,
    passengerDensity: 0.75,
    rainDensity: 0.62,
    pixelRatioCap: 1.5,
    enableShadows: false,
    mirrorUpdateInterval: 4,
  },
  {
    id: 'high',
    label: 'Wysoka',
    description: 'Pełny zasięg, komplet pasażerów, lusterka/CCTV ~30 FPS, cienie i AA.',
    drawDistanceM: 420,
    passengerDensity: 1.0,
    rainDensity: 1.0,
    pixelRatioCap: 2.0,
    enableShadows: true,
    mirrorUpdateInterval: 2,
  },
];

export function getGraphicsQualityPreset(id: GraphicsQualityId): IGraphicsQualityPreset {
  return GRAPHICS_QUALITY_PRESETS.find((p) => p.id === id) ?? GRAPHICS_QUALITY_PRESETS[2];
}

export function getDefaultLiveMirrorsForQuality(quality: GraphicsQualityId): boolean {
  return quality === 'medium' || quality === 'high';
}
