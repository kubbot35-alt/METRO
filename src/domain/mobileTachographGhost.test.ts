import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeGhostDelta,
  formatGhostScoreDelta,
  formatGhostTimeDelta,
  GhostRecordStorageService,
  type IGhostStorage,
} from './ghostDelta';
import { MetroSimulationEngine } from './metroSimulation';
import {
  computeThumbSliderAxis,
  detectTouchDevice,
  resolveTouchControlsActive,
  shouldShowPortraitHint,
} from './mobileTouch';
import { MetroScoringRules } from './scoringRules';
import { SettingsStorageService } from './settingsService';
import { TachographRecorder } from './tachographSystem';
import { MetroTrainPhysics } from './trainPhysics';
import type { IControlInput, ISimulationSnapshot } from './types';

function createMemoryStorage(): IGhostStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

const IDLE_INPUT: IControlInput = {
  throttleUp: false,
  throttleDown: false,
  serviceBrake: false,
  emergencyBrakePressed: false,
  toggleDoorsPressed: false,
  hornActive: false,
};

test('mobileTouch detects touch hardware, resolves Auto/On/Off, portrait hint, and slider detent', () => {
  assert.equal(
    detectTouchDevice({ maxTouchPoints: 0, hasCoarsePointer: false, hasTouchStartEvent: false }),
    false,
  );
  assert.equal(
    detectTouchDevice({ maxTouchPoints: 5, hasCoarsePointer: false, hasTouchStartEvent: false }),
    true,
  );
  assert.equal(resolveTouchControlsActive('auto', true), true);
  assert.equal(resolveTouchControlsActive('auto', false), false);
  assert.equal(resolveTouchControlsActive('on', false), true);
  assert.equal(resolveTouchControlsActive('off', true), false);

  assert.equal(shouldShowPortraitHint(390, 844, true, false), true);
  assert.equal(shouldShowPortraitHint(844, 390, true, false), false);
  assert.equal(shouldShowPortraitHint(390, 844, true, true), false);
  assert.equal(shouldShowPortraitHint(1280, 720, false, false), false);

  assert.equal(computeThumbSliderAxis(0), 1);
  assert.equal(computeThumbSliderAxis(0.5), 0);
  assert.equal(computeThumbSliderAxis(0.53), 0);
  assert.equal(computeThumbSliderAxis(1), -1);
});

test('SettingsStorageService persists and sanitizes touchControlsMode', () => {
  const storage = createMemoryStorage();
  const svc = new SettingsStorageService(storage);
  assert.equal(svc.load().touchControlsMode, 'auto');

  svc.save({ ...svc.load(), touchControlsMode: 'on' });
  assert.equal(svc.load().touchControlsMode, 'on');

  storage.setItem('warsaw_metro_settings_v1', JSON.stringify({ touchControlsMode: 'invalid' }));
  assert.equal(svc.load().touchControlsMode, 'auto');
});

test('TachographRecorder logs 1 Hz samples, station stops, violation dots, and final point', () => {
  const rec = new TachographRecorder();
  for (let i = 0; i <= 40; i += 1) {
    const t = i * 0.25;
    rec.recordStep(t, t * 12, Math.min(72, t * 8), 60);
  }
  rec.recordViolation(8.0, 96, 64, 'overspeed');
  rec.recordStationStop(10.0, 120, 'A1', 'Kabaty');
  rec.recordFinalSample(10.5, 120, 0, 60);

  const snap = rec.getSnapshot();
  assert.ok(snap.samples.length >= 11, `Expected >= 11 samples, got ${snap.samples.length}`);
  assert.equal(snap.stationMarks.length, 1);
  assert.equal(snap.stationMarks[0].stationCode, 'A1');
  assert.equal(snap.violationMarks.length, 1);
  assert.equal(snap.violationMarks[0].kind, 'overspeed');
  assert.ok(snap.maxSpeedKmh >= 60);
});

test('MetroSimulationEngine populates tachograph samples and violation markers during play', () => {
  const engine = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
  engine.setMetroLine('M1');
  engine.start();
  for (let i = 0; i < 200; i += 1) {
    engine.step({ ...IDLE_INPUT, manualLeverAxis: 0.7 }, 0.05);
  }
  const snap = engine.getSnapshot();
  assert.ok(snap.tachograph.samples.length >= 10, 'Expected 1 Hz tachograph samples during run');
  assert.ok(snap.tachograph.maxSpeedKmh > 15, 'Expected recorded speed > 15 km/h');
});

test('GhostRecordStorageService stores best run per line and computes live split deltas', () => {
  const storage = createMemoryStorage();
  const svc = new GhostRecordStorageService(storage);

  const makeSnap = (
    lineId: string,
    gameMode: 'duty' | 'sandbox' | 'academy',
    score: number,
    elapsedTimeSec: number,
    splits: ReadonlyArray<{
      readonly stationIndex: number;
      readonly stationCode: string;
      readonly elapsedTimeSec: number;
      readonly score: number;
    }>,
  ): ISimulationSnapshot =>
    ({
      line: { id: lineId },
      gameMode,
      score,
      elapsedTimeSec,
      stationSplits: splits,
    }) as unknown as ISimulationSnapshot;

  // Sandbox and academy runs must never overwrite ghost records
  const sb = svc.recordIfBest(
    makeSnap('M1', 'sandbox', 9999, 50, [
      { stationIndex: 0, stationCode: 'A1', elapsedTimeSec: 20, score: 500 },
    ]),
  );
  assert.equal(sb.updated, false);
  assert.equal(svc.getRecordForLine('M1'), null);

  // First duty run on M1 saves record
  const first = svc.recordIfBest(
    makeSnap('M1', 'duty', 820, 140, [
      { stationIndex: 0, stationCode: 'A1', elapsedTimeSec: 38, score: 250 },
      { stationIndex: 1, stationCode: 'A2', elapsedTimeSec: 84, score: 520 },
    ]),
  );
  assert.equal(first.updated, true);
  assert.equal(first.record?.finalScore, 820);

  // Worse run does not overwrite
  const worse = svc.recordIfBest(
    makeSnap('M1', 'duty', 700, 150, [
      { stationIndex: 0, stationCode: 'A1', elapsedTimeSec: 40, score: 200 },
    ]),
  );
  assert.equal(worse.updated, false);
  assert.equal(svc.getRecordForLine('M1')?.finalScore, 820);

  // Before first station split: target mode
  const ghost = svc.getRecordForLine('M1');
  const preSplit = computeGhostDelta([], ghost);
  assert.ok(preSplit);
  assert.equal(preSplit.hasSplitComparison, false);
  assert.equal(preSplit.ghostBestScore, 820);

  // Ahead on score (+120) and faster (-2s)
  const ahead = computeGhostDelta(
    [{ stationIndex: 0, stationCode: 'A1', elapsedTimeSec: 36, score: 370 }],
    ghost,
  );
  assert.ok(ahead);
  assert.equal(ahead.hasSplitComparison, true);
  assert.equal(formatGhostScoreDelta(ahead.scoreDelta), '+120 pkt');
  assert.equal(formatGhostTimeDelta(ahead.timeDeltaSec), '-2s');
  assert.equal(ahead.isScoreAhead, true);
  assert.equal(ahead.isTimeAhead, true);

  // Behind on score (-40) and slower (+5s)
  const behind = computeGhostDelta(
    [{ stationIndex: 1, stationCode: 'A2', elapsedTimeSec: 89, score: 480 }],
    ghost,
  );
  assert.ok(behind);
  assert.equal(formatGhostScoreDelta(behind.scoreDelta), '-40 pkt');
  assert.equal(formatGhostTimeDelta(behind.timeDeltaSec), '+5s');
  assert.equal(behind.isScoreAhead, false);
  assert.equal(behind.isTimeAhead, false);
});
