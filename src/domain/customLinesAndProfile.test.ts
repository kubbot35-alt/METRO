import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CustomLineStorageService,
  MAX_CUSTOM_STATIONS,
  MAX_STATION_SPACING_M,
  MIN_STATION_SPACING_M,
  compileCustomLineSpec,
  createDefaultCustomLineDraft,
  deriveLineBadgeCode,
  exportCustomLineJson,
  importCustomLineJson,
  sanitizeCustomLineDraft,
  type ICustomLineStorage,
} from './customLines';
import {
  DRIVER_RANKS,
  DriverProfileService,
  calculateCourseXp,
  getPunctualityPercent,
  getRankForXp,
  getRankProgress,
  type IDriverProfileStorage,
} from './driverProfile';
import { TrackAlignment } from './trackAlignment';
import { MetroSimulationEngine } from './metroSimulation';
import { MetroTrainPhysics } from './trainPhysics';
import { MetroScoringRules } from './scoringRules';
import type { ICustomLineDraft, ISimulationSnapshot } from './types';

function createMemoryStorage(): ICustomLineStorage & IDriverProfileStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

function createFakeSnapshot(overrides?: Partial<ISimulationSnapshot>): ISimulationSnapshot {
  const sim = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
  const base = sim.getSnapshot();
  return {
    ...base,
    gameMode: 'duty',
    score: 2400,
    driverGrade: 'A',
    passengersCarried: 88,
    elapsedTimeSec: 215,
    kinematics: {
      ...base.kinematics,
      positionM: 3600,
    },
    schedule: {
      ...base.schedule,
      punctualitySamples: 4,
      punctualArrivalsCount: 3,
    },
    ...overrides,
  };
}

test('CustomLineStorageService saves, updates, persists, and removes custom lines', () => {
  const storage = createMemoryStorage();
  const service = new CustomLineStorageService(storage);
  assert.equal(service.list().length, 0);

  const draft = createDefaultCustomLineDraft();
  const afterSave = service.save(draft);
  assert.equal(afterSave.length, 1);
  assert.equal(afterSave[0].name, 'M3 Gocław');

  // Re-instantiate with same storage to verify persistence
  const reloaded = new CustomLineStorageService(storage);
  assert.equal(reloaded.list().length, 1);
  assert.equal(reloaded.list()[0].id, draft.id);

  // Edit existing line in place
  const edited: ICustomLineDraft = { ...draft, name: 'M3 Praga Express' };
  const afterEdit = reloaded.save(edited);
  assert.equal(afterEdit.length, 1);
  assert.equal(afterEdit[0].name, 'M3 Praga Express');

  // Delete line
  const afterDelete = reloaded.remove(draft.id);
  assert.equal(afterDelete.length, 0);
});

test('compileCustomLineSpec clamps station spacing, enforces surface leg minimum, and maps platform sides', () => {
  const draft: ICustomLineDraft = {
    id: 'custom_m4',
    name: 'M4 Wilanów',
    destinationLed: 'M4 WILANÓW',
    cssColor: '#f59e0b',
    hasSurfaceStart: true,
    alignmentIntensity: 'curvy',
    stations: [
      { name: 'Stacja Start', wallHex: '#0284c7', platformLayout: 'side', spacingFromPrevM: 250 },
      { name: 'Stacja Środek', wallHex: '#059669', platformLayout: 'island', spacingFromPrevM: 1800 },
      { name: 'Wilanów', wallHex: '#d97706', platformLayout: 'side', spacingFromPrevM: 700 },
    ],
  };

  const spec = compileCustomLineSpec(draft);
  assert.equal(spec.badgeCode, 'M4');
  assert.equal(spec.isCustom, true);
  assert.equal(spec.hasSurfaceStart, true);
  assert.equal(spec.tunnelPortalDistanceM, 300);
  assert.equal(spec.stations.length, 3);
  // First station gets at least 560 m when surface start is active
  assert.equal(spec.stations[0].distanceM, 560);
  assert.equal(spec.stations[0].platformSide, 'right');
  // Second station spacing clamped to MAX_STATION_SPACING_M (1200)
  assert.equal(spec.stations[1].distanceM, 560 + MAX_STATION_SPACING_M);
  assert.equal(spec.stations[1].platformSide, 'left');
  assert.equal(spec.stations[2].distanceM, 560 + MAX_STATION_SPACING_M + 700);
  assert.ok(spec.speedZones.length >= 3);
});

test('sanitizeCustomLineDraft rejects under 3 stations and caps at 12 stations with spacing bounds', () => {
  assert.equal(
    sanitizeCustomLineDraft({
      name: 'Za krótka',
      stations: [{ name: 'A' }, { name: 'B' }],
    }),
    null,
  );

  const manyStations = Array.from({ length: 16 }, (_, idx) => ({
    name: `Stacja ${idx + 1}`,
    wallHex: '#059669',
    platformLayout: 'island',
    spacingFromPrevM: idx === 0 ? 100 : 9999,
  }));
  const sanitized = sanitizeCustomLineDraft({ name: 'Długa Linia M9', stations: manyStations });
  assert.ok(sanitized);
  assert.equal(sanitized.stations.length, MAX_CUSTOM_STATIONS);
  assert.equal(sanitized.stations[0].spacingFromPrevM, MIN_STATION_SPACING_M);
  assert.equal(sanitized.stations[1].spacingFromPrevM, MAX_STATION_SPACING_M);
  assert.equal(deriveLineBadgeCode('Długa Linia M9', 'WILANÓW'), 'M9');
});

test('exportCustomLineJson and importCustomLineJson round-trip cleanly and reject invalid JSON', () => {
  const draft = createDefaultCustomLineDraft();
  const json = exportCustomLineJson(draft);
  const imported = importCustomLineJson(json);
  assert.equal(imported.ok, true);
  if (imported.ok) {
    assert.equal(imported.draft.name, draft.name);
    assert.equal(imported.draft.stations.length, draft.stations.length);
    assert.equal(imported.draft.cssColor, draft.cssColor);
    assert.ok(imported.draft.id.startsWith('custom_'));
  }

  const invalidSyntax = importCustomLineJson('{not-json');
  assert.equal(invalidSyntax.ok, false);

  const invalidShape = importCustomLineJson(JSON.stringify({ name: 'X', stations: [] }));
  assert.equal(invalidShape.ok, false);
});

test('TrackAlignment honors flat vs curvy intensity and custom surface start', () => {
  const baseDraft = createDefaultCustomLineDraft();
  const flatSpec = compileCustomLineSpec({
    ...baseDraft,
    hasSurfaceStart: false,
    alignmentIntensity: 'flat',
  });
  const flatAlignment = new TrackAlignment(flatSpec.id, flatSpec.stations, {
    hasSurfaceStart: flatSpec.hasSurfaceStart,
    tunnelPortalDistanceM: flatSpec.tunnelPortalDistanceM,
    alignmentIntensity: 'flat',
  });
  assert.equal(flatAlignment.curveZones.length, 0);
  assert.equal(flatAlignment.sample(900).curvatureRadPerM, 0);
  assert.equal(flatAlignment.sample(900).gradeFraction, 0);
  assert.equal(flatAlignment.sample(50).outdoorBlend, 0);

  const curvySpec = compileCustomLineSpec({
    ...baseDraft,
    hasSurfaceStart: true,
    alignmentIntensity: 'curvy',
  });
  const curvyAlignment = new TrackAlignment(curvySpec.id, curvySpec.stations, {
    hasSurfaceStart: curvySpec.hasSurfaceStart,
    tunnelPortalDistanceM: curvySpec.tunnelPortalDistanceM,
    alignmentIntensity: 'curvy',
  });
  assert.ok(curvyAlignment.curveZones.length >= 3);
  assert.ok(curvyAlignment.curveZones.every((c) => c.speedLimitKmh === 45));
  assert.equal(curvyAlignment.sample(50).outdoorBlend, 1);
  assert.equal(curvyAlignment.sample(400).outdoorBlend, 0);
});

test('Driver rank ladder and progress cover all 6 ranks from Praktykant to Legenda Metra', () => {
  assert.equal(DRIVER_RANKS.length, 6);
  assert.equal(getRankForXp(0).title, 'Praktykant');
  assert.equal(getRankForXp(400).title, 'Młodszy Maszynista');
  assert.equal(getRankForXp(1200).title, 'Maszynista');
  assert.equal(getRankForXp(2600).title, 'Starszy Maszynista');
  assert.equal(getRankForXp(4800).title, 'Instruktor Ruchu');
  assert.equal(getRankForXp(8000).title, 'Legenda Metra');

  const midProgress = getRankProgress(800);
  assert.equal(midProgress.currentRank.id, 'junior');
  assert.equal(midProgress.nextRank?.id, 'driver');
  assert.equal(midProgress.progressRatio, 0.5);

  const maxProgress = getRankProgress(9500);
  assert.equal(maxProgress.currentRank.id, 'legend');
  assert.equal(maxProgress.nextRank, null);
  assert.equal(maxProgress.progressRatio, 1);
});

test('calculateCourseXp applies mode multipliers and detects rank-up transitions', () => {
  const dutySnap = createFakeSnapshot({ gameMode: 'duty', score: 2400 });
  const sandboxSnap = createFakeSnapshot({ gameMode: 'sandbox', score: 2400 });
  const challengeSnap = createFakeSnapshot({
    gameMode: 'challenge',
    score: 2400,
    challengeOutcome: {
      passed: true,
      reason: 'OK',
    },
  });

  const dutyReward = calculateCourseXp(dutySnap, 350);
  const sandboxReward = calculateCourseXp(sandboxSnap, 350);
  const challengeReward = calculateCourseXp(challengeSnap, 350);

  assert.ok(sandboxReward.gainedXp < dutyReward.gainedXp);
  assert.ok(challengeReward.gainedXp > dutyReward.gainedXp);
  assert.equal(dutyReward.previousRank.id, 'trainee');
  assert.equal(dutyReward.newRank.id, 'junior');
  assert.equal(dutyReward.rankedUp, true);
});

test('DriverProfileService accumulates career stats, preserves highest grade, and resets cleanly', () => {
  const storage = createMemoryStorage();
  const service = new DriverProfileService(storage);
  assert.equal(service.load().completedCourses, 0);
  assert.equal(getPunctualityPercent(service.load()), null);

  // Course 1: Duty run with grade B
  const first = service.recordCompletedCourse(
    createFakeSnapshot({
      gameMode: 'duty',
      driverGrade: 'B',
      passengersCarried: 60,
      elapsedTimeSec: 180,
      kinematics: { ...createFakeSnapshot().kinematics, positionM: 3000 },
      schedule: {
        ...createFakeSnapshot().schedule,
        punctualitySamples: 4,
        punctualArrivalsCount: 3,
      },
    }),
  );
  assert.equal(first.profile.completedCourses, 1);
  assert.equal(first.profile.totalDistanceKm, 3);
  assert.equal(first.profile.totalPassengers, 60);
  assert.equal(first.profile.highestGrade, 'B');
  assert.equal(getPunctualityPercent(first.profile), 75);

  // Course 2: Sandbox run should add km/XP/courses but NOT overwrite highestGrade with S
  const second = service.recordCompletedCourse(
    createFakeSnapshot({
      gameMode: 'sandbox',
      driverGrade: 'S',
      passengersCarried: 40,
      elapsedTimeSec: 120,
      kinematics: { ...createFakeSnapshot().kinematics, positionM: 2500 },
      schedule: {
        ...createFakeSnapshot().schedule,
        punctualitySamples: 2,
        punctualArrivalsCount: 2,
      },
    }),
  );
  assert.equal(second.profile.completedCourses, 2);
  assert.equal(second.profile.totalDistanceKm, 5.5);
  assert.equal(second.profile.totalPassengers, 100);
  assert.equal(second.profile.totalDriveTimeSec, 300);
  assert.equal(second.profile.highestGrade, 'B');
  assert.equal(getPunctualityPercent(second.profile), Math.round((5 / 6) * 100));

  // Course 3: Duty run with grade S upgrades highestGrade
  const third = service.recordCompletedCourse(
    createFakeSnapshot({ gameMode: 'duty', driverGrade: 'S' }),
  );
  assert.equal(third.profile.highestGrade, 'S');

  // Verify persistence across new service instance
  const reloaded = new DriverProfileService(storage);
  assert.equal(reloaded.load().completedCourses, 3);
  assert.equal(reloaded.load().highestGrade, 'S');

  // Reset clears profile
  const reset = reloaded.reset();
  assert.equal(reset.completedCourses, 0);
  assert.equal(reset.xp, 0);
  assert.equal(reset.highestGrade, null);
});

test('MetroSimulationEngine switches cleanly to a compiled custom line via setMetroLineSpec', () => {
  const sim = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
  const customSpec = compileCustomLineSpec({
    ...createDefaultCustomLineDraft(),
    hasSurfaceStart: true,
    alignmentIntensity: 'curvy',
  });
  sim.setMetroLineSpec(customSpec);
  const snap = sim.getSnapshot();
  assert.equal(snap.line.id, customSpec.id);
  assert.equal(snap.line.badgeCode, 'M3');
  assert.equal(snap.line.stations.length, 5);
  assert.equal(snap.trackProfile.outdoorBlend, 1);
  assert.equal(snap.currentStation.station.name, 'Stadion Narodowy');
});
