import test from 'node:test';
import assert from 'node:assert/strict';
import { MetroIncidentSystem } from './incidentSystem';
import { LeaderboardService, type ILeaderboardStorage } from './leaderboard';
import { MetroSimulationEngine } from './metroSimulation';
import { formatClockTime } from './scheduleSystem';
import { MetroScoringRules } from './scoringRules';
import { TunnelSignalSystem } from './signalSystem';
import { OppositeTrackTrafficSystem } from './trafficSystem';
import { MetroTrainPhysics } from './trainPhysics';
import type { IControlInput, IStationSpec } from './types';

function makeInput(overrides: Partial<IControlInput> = {}): IControlInput {
  return {
    throttleUp: false,
    throttleDown: false,
    serviceBrake: false,
    emergencyBrakePressed: false,
    toggleDoorsPressed: false,
    hornActive: false,
    ...overrides,
  };
}

class MemoryStorage implements ILeaderboardStorage {
  private readonly map = new Map<string, string>();
  public getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  public setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

test('rush hour sets 08:00 clock, 7s boarding, crowded passengers, frequent traffic & higher red signals', () => {
  const shortRoute: readonly IStationSpec[] = [
    { id: 1, name: 'Kabaty', code: 'M1-01', distanceM: 0, stopZoneHalfWidthM: 14, platformLengthM: 100, accentHex: 0xffffff, waitingPassengers: 14 },
    { id: 2, name: 'Natolin', code: 'M1-02', distanceM: 600, stopZoneHalfWidthM: 14, platformLengthM: 100, accentHex: 0xffffff, waitingPassengers: 12 },
  ];
  const sim = new MetroSimulationEngine(
    new MetroTrainPhysics(),
    new MetroScoringRules(),
    shortRoute,
    undefined,
    undefined,
    new TunnelSignalSystem([250, 500, 850, 1100], () => 0.25),
    undefined,
    undefined,
    new MetroIncidentSystem(shortRoute, () => 0.9),
    new OppositeTrackTrafficSystem(() => 0.0),
  );
  sim.setTimeOfDay('rush');
  sim.start();

  const initial = sim.getSnapshot();
  assert.equal(formatClockTime(initial.schedule.currentClockSec), '08:00:00');
  assert.equal(initial.boardingDurationSec, 7);
  assert.ok(initial.effectiveWaitingPassengers >= 20);
  assert.ok(initial.signals.some((s) => s.aspect === 'red'));

  sim.step(makeInput({ toggleDoorsLeftPressed: true }), 0.05);
  for (let i = 0; i < 105; i += 1) {
    sim.step(makeInput(), 0.05);
  }
  assert.equal(sim.getSnapshot().boardingCompletedForCurrent, false);
  for (let i = 0; i < 40; i += 1) {
    sim.step(makeInput(), 0.05);
  }
  assert.equal(sim.getSnapshot().boardingCompletedForCurrent, true);
  assert.equal(sim.getSnapshot().passengersCarried, initial.effectiveWaitingPassengers);
});

test('late evening sets 23:30 clock, 5s boarding, sparse passengers, low red signals & calm traffic', () => {
  const shortRoute: readonly IStationSpec[] = [
    { id: 1, name: 'Kabaty', code: 'M1-01', distanceM: 0, stopZoneHalfWidthM: 14, platformLengthM: 100, accentHex: 0xffffff, waitingPassengers: 14 },
  ];
  const sim = new MetroSimulationEngine(
    new MetroTrainPhysics(),
    new MetroScoringRules(),
    shortRoute,
    undefined,
    undefined,
    new TunnelSignalSystem([250, 500, 850], () => 0.25),
    undefined,
    undefined,
    new MetroIncidentSystem(shortRoute, () => 0.9),
    new OppositeTrackTrafficSystem(() => 0.0),
  );
  sim.setTimeOfDay('evening');
  sim.start();

  const snap = sim.getSnapshot();
  assert.equal(formatClockTime(snap.schedule.currentClockSec), '23:30:00');
  assert.equal(snap.boardingDurationSec, 5);
  assert.ok(snap.effectiveWaitingPassengers <= 5);
  assert.equal(snap.signals.some((s) => s.aspect === 'red'), false);
});

test('manualLeverAxis accelerates smoothly when positive and brakes cleanly when negative', () => {
  const physics = new MetroTrainPhysics();
  let state = {
    positionM: 0,
    speedMs: 0,
    speedKmh: 0,
    throttle: 0,
    serviceBrake: 0,
    emergencyBrake: false,
    netAccelerationMs2: 0,
  };
  for (let i = 0; i < 80; i += 1) {
    state = physics.step(state, makeInput({ manualLeverAxis: 0.8 }), false, 0.05);
  }
  assert.ok(state.speedKmh > 12);
  assert.ok(state.throttle > 0.7);

  const peakKmh = state.speedKmh;
  for (let i = 0; i < 60; i += 1) {
    state = physics.step(state, makeInput({ manualLeverAxis: -0.9 }), false, 0.05);
  }
  assert.ok(state.speedKmh < peakKmh - 5);
  assert.ok(state.serviceBrake > 0.7);
});

test('LeaderboardService stores top 5 runs sorted descending and detects new records', () => {
  const service = new LeaderboardService(new MemoryStorage());
  assert.equal(service.getTopEntries().length, 0);

  const r1 = service.recordRun({
    score: 2100,
    grade: 'B',
    trainModelId: 'inspiro',
    trainName: 'Siemens Inspiro',
    timeOfDayId: 'rush',
    timeOfDayLabel: 'Godziny szczytu',
    dateIso: '2026-11-25T10:00:00.000Z',
  });
  assert.equal(r1.isNewRecord, true);

  const r2 = service.recordRun({
    score: 1800,
    grade: 'B',
    trainModelId: 'seria81',
    trainName: 'Seria 81',
    timeOfDayId: 'evening',
    timeOfDayLabel: 'Późny wieczór',
    dateIso: '2026-11-25T11:00:00.000Z',
  });
  assert.equal(r2.isNewRecord, false);

  const scores = [3200, 2900, 1500, 2600, 4100];
  let lastRecord = false;
  scores.forEach((score, i) => {
    const res = service.recordRun({
      score,
      grade: score >= 3500 ? 'S' : 'A',
      trainModelId: 'inspiro',
      trainName: 'Siemens Inspiro',
      timeOfDayId: 'rush',
      timeOfDayLabel: 'Godziny szczytu',
      dateIso: `2026-11-25T1${i}:00:00.000Z`,
    });
    lastRecord = res.isNewRecord;
  });
  assert.equal(lastRecord, true);
  const top = service.getTopEntries();
  assert.equal(top.length, 5);
  assert.deepEqual(
    top.map((e) => e.score),
    [4100, 3200, 2900, 2600, 2100],
  );
});
