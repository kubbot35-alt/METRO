import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cycleCctvChannel,
  getMirrorPerformancePolicy,
  getMirrorUpdateInterval,
  resolveCctvChannel,
  resolveStationCameraMode,
  shouldUpdateMirrorsOnFrame,
} from './mirrorCctvSystem';
import { LINE_M1_STATIONS } from './routeData';
import {
  DEFAULT_GAME_SETTINGS,
  getDefaultLiveMirrorsForQuality,
  sanitizeGameSettings,
  SettingsStorageService,
} from './settingsService';

test('mirror frame-skip intervals match High (2), Medium (4), Low (0), and disabled toggle (0)', () => {
  assert.equal(getMirrorUpdateInterval('high', true), 2);
  assert.equal(getMirrorUpdateInterval('medium', true), 4);
  assert.equal(getMirrorUpdateInterval('low', true), 0);
  assert.equal(getMirrorUpdateInterval('high', false), 0);
  assert.equal(getMirrorUpdateInterval('medium', false), 0);

  assert.equal(getMirrorPerformancePolicy('high', true).approxFpsLabel, '~30 FPS');
  assert.equal(getMirrorPerformancePolicy('medium', true).approxFpsLabel, '~15 FPS');
  assert.equal(getMirrorPerformancePolicy('low', true).enabled, false);
  assert.equal(getMirrorPerformancePolicy('high', false).enabled, false);
});

test('shouldUpdateMirrorsOnFrame throttles updates accurately per frame index', () => {
  const highHits = [0, 1, 2, 3, 4, 5].map((f) => shouldUpdateMirrorsOnFrame(f, 'high', true));
  assert.deepEqual(highHits, [true, false, true, false, true, false]);

  const medHits = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((f) =>
    shouldUpdateMirrorsOnFrame(f, 'medium', true),
  );
  assert.deepEqual(medHits, [true, false, false, false, true, false, false, false, true]);

  assert.equal(shouldUpdateMirrorsOnFrame(0, 'low', true), false);
  assert.equal(shouldUpdateMirrorsOnFrame(0, 'high', false), false);
});

test('resolveCctvChannel maps auto to station platform side and cycles cleanly', () => {
  assert.equal(resolveCctvChannel('auto', 'left'), 'left');
  assert.equal(resolveCctvChannel('auto', 'right'), 'right');
  assert.equal(resolveCctvChannel('left', 'right'), 'left');
  assert.equal(resolveCctvChannel('right', 'left'), 'right');
  assert.equal(resolveCctvChannel('interior', 'left'), 'interior');

  assert.equal(cycleCctvChannel('auto'), 'left');
  assert.equal(cycleCctvChannel('left'), 'right');
  assert.equal(cycleCctvChannel('right'), 'interior');
  assert.equal(cycleCctvChannel('interior'), 'auto');
});

test('resolveStationCameraMode mounts ceiling camera near stations and falls back to tunnel roof camera far away', () => {
  const kabaty = LINE_M1_STATIONS[0];
  const nearStation = resolveStationCameraMode(LINE_M1_STATIONS, kabaty.distanceM - 25);
  assert.equal(nearStation.mode, 'station-ceiling');
  assert.equal(nearStation.station?.id, kabaty.id);

  const farFromStation = resolveStationCameraMode(LINE_M1_STATIONS, 0);
  assert.equal(farFromStation.mode, 'tunnel-roof');
  assert.equal(farFromStation.station, null);

  const midTunnel = resolveStationCameraMode(LINE_M1_STATIONS, kabaty.distanceM + 400);
  assert.equal(midTunnel.mode, 'tunnel-roof');
});

test('SettingsStorageService persists liveMirrorsEnabled toggle and defaults to true for Medium and High quality', () => {
  const store = new Map<string, string>();
  const service = new SettingsStorageService({
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => {
      store.set(k, v);
    },
  });

  assert.equal(getDefaultLiveMirrorsForQuality('high'), true);
  assert.equal(getDefaultLiveMirrorsForQuality('medium'), true);
  assert.equal(sanitizeGameSettings({ graphicsQuality: 'medium' }).liveMirrorsEnabled, true);
  assert.equal(sanitizeGameSettings({ graphicsQuality: 'high' }).liveMirrorsEnabled, true);
  assert.equal(service.load().liveMirrorsEnabled, true);
  service.save({ ...DEFAULT_GAME_SETTINGS, liveMirrorsEnabled: false, graphicsQuality: 'medium' });
  const loaded = service.load();
  assert.equal(loaded.liveMirrorsEnabled, false);
  assert.equal(loaded.graphicsQuality, 'medium');
});
