import test from 'node:test';
import assert from 'node:assert/strict';
import { MetroSimulationEngine } from './metroSimulation';
import { MetroScoringRules } from './scoringRules';
import { MetroTrainPhysics } from './trainPhysics';
import { BOARDING_DURATION_SEC, LINE_M1_STATIONS } from './routeData';
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

test('stations are spaced every 600 meters', () => {
  assert.equal(LINE_M1_STATIONS[0].distanceM, 600);
  assert.equal(LINE_M1_STATIONS[1].distanceM, 1200);
  assert.equal(LINE_M1_STATIONS[2].distanceM, 1800);
});

test('doors cannot open outside station or while moving', () => {
  const sim = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
  sim.start();
  const events = sim.step(makeInput({ toggleDoorsPressed: true }), 0.05);
  assert.equal(events.doorToggledTo, null);
  assert.equal(sim.getSnapshot().doorState, 'closed');
});

test('precision stop, 5s boarding, and door close advances station and awards points', () => {
  const shortRoute: readonly IStationSpec[] = [
    { id: 1, name: 'Test A', code: 'T1', distanceM: 0, stopZoneHalfWidthM: 14, platformLengthM: 100, accentHex: 0xffffff },
    { id: 2, name: 'Test B', code: 'T2', distanceM: 600, stopZoneHalfWidthM: 14, platformLengthM: 100, accentHex: 0xffffff },
  ];
  const sim = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules(), shortRoute);
  sim.start();

  const openEvt = sim.step(makeInput({ toggleDoorsPressed: true }), 0.05);
  assert.equal(openEvt.doorToggledTo, 'open');
  assert.equal(sim.getSnapshot().score, 300);

  let chimeHeard = false;
  for (let i = 0; i < Math.ceil(BOARDING_DURATION_SEC / 0.05) + 1; i += 1) {
    const evt = sim.step(makeInput(), 0.05);
    if (evt.boardingCompleteChime) {
      chimeHeard = true;
    }
  }
  assert.equal(chimeHeard, true);
  assert.equal(sim.getSnapshot().boardingCompletedForCurrent, true);

  const closeEvt = sim.step(makeInput({ toggleDoorsPressed: true }), 0.05);
  assert.equal(closeEvt.doorToggledTo, 'closed');
  assert.equal(sim.getSnapshot().stationsServed, 1);
  assert.equal(sim.getSnapshot().currentStation.station.id, 2);
});

test('overshooting a station applies missed station penalty and advances route', () => {
  const shortRoute: readonly IStationSpec[] = [
    { id: 1, name: 'Near', code: 'T1', distanceM: 2, stopZoneHalfWidthM: 3, platformLengthM: 80, accentHex: 0xffffff },
    { id: 2, name: 'Next', code: 'T2', distanceM: 600, stopZoneHalfWidthM: 14, platformLengthM: 80, accentHex: 0xffffff },
  ];
  const sim = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules(), shortRoute);
  sim.start();
  for (let i = 0; i < 120; i += 1) {
    sim.step(makeInput({ throttleUp: true }), 0.05);
  }
  const snap = sim.getSnapshot();
  assert.equal(snap.stationsMissed, 1);
  assert.ok(snap.score <= -250);
  assert.equal(snap.currentStation.station.id, 2);
});

test('passing a red semaphore activates ATP emergency brake and deducts 200 points', () => {
  const redSignals = {
    reset: () => {},
    step: (_p: number, nextPos: number) => ({
      redSignalViolated: nextPos > 2,
      clearedToGreen: false,
      activeCautionLimitKmh: null,
      waitingAtRedRemainingSec: null,
    }),
    getSignals: () => [{ id: 1, distanceM: 2, aspect: 'red' as const, violated: false, waitRemainingSec: null }],
    getNextSignal: () => ({ id: 1, distanceM: 2, aspect: 'red' as const, violated: false, waitRemainingSec: null }),
  };
  const sim = new MetroSimulationEngine(
    new MetroTrainPhysics(),
    new MetroScoringRules(),
    LINE_M1_STATIONS,
    undefined,
    undefined,
    redSignals,
  );
  sim.start();
  let atpFired = false;
  for (let i = 0; i < 80; i += 1) {
    const ev = sim.step(makeInput({ throttleUp: true }), 0.05);
    if (ev.atpTriggered) {
      atpFired = true;
      break;
    }
  }
  assert.equal(atpFired, true);
  assert.equal(sim.getSnapshot().atpActive, true);
  assert.equal(sim.getSnapshot().kinematics.emergencyBrake, true);
  assert.equal(sim.getSnapshot().score, -200);
});

