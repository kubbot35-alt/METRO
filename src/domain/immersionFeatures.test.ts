import test from 'node:test';
import assert from 'node:assert/strict';
import { StationAnnouncementTracker } from './announcementTracker';
import { MetroSimulationEngine } from './metroSimulation';
import { LINE_M1_STATIONS } from './routeData';
import { MetroScoringRules } from './scoringRules';
import { SEMAPHORE_DISTANCES_M } from './signalSystem';
import { MetroTrainPhysics } from './trainPhysics';
import type { IControlInput } from './types';

function makeInput(overrides: Partial<IControlInput> = {}): IControlInput {
  return {
    throttleUp: false,
    throttleDown: false,
    serviceBrake: false,
    emergencyBrakePressed: false,
    toggleDoorsPressed: false,
    toggleHeadlightsPressed: false,
    hornActive: false,
    ...overrides,
  };
}

test('Warsaw Metro M1 route has 21 real stations from Kabaty to Młociny and 42 semaphores', () => {
  assert.equal(LINE_M1_STATIONS.length, 21);
  assert.equal(LINE_M1_STATIONS[0].name, 'Kabaty');
  assert.equal(LINE_M1_STATIONS[1].name, 'Natolin');
  assert.equal(LINE_M1_STATIONS[11].name, 'Centrum');
  assert.equal(LINE_M1_STATIONS[20].name, 'Młociny');
  assert.equal(LINE_M1_STATIONS[20].distanceM, 12600);
  assert.equal(SEMAPHORE_DISTANCES_M.length, 42);
  for (const station of LINE_M1_STATIONS) {
    assert.ok(station.waitingPassengers >= 8 && station.waitingPassengers <= 30);
  }
  const kabaty = LINE_M1_STATIONS[0];
  const centrum = LINE_M1_STATIONS[11];
  const swietokrzyska = LINE_M1_STATIONS[12];
  assert.ok(centrum.waitingPassengers > kabaty.waitingPassengers);
  assert.ok(swietokrzyska.waitingPassengers > kabaty.waitingPassengers);
});

test('headlights default to LOW and cycle low -> high -> off -> low via L input', () => {
  const sim = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
  sim.start();
  assert.equal(sim.getSnapshot().headlightsOn, true);
  assert.equal(sim.getSnapshot().headlightMode, 'low');
  sim.step(makeInput({ toggleHeadlightsPressed: true }), 0.05);
  assert.equal(sim.getSnapshot().headlightMode, 'high');
  assert.equal(sim.getSnapshot().headlightsOn, true);
  sim.step(makeInput({ toggleHeadlightsPressed: true }), 0.05);
  assert.equal(sim.getSnapshot().headlightMode, 'off');
  assert.equal(sim.getSnapshot().headlightsOn, false);
  sim.step(makeInput({ toggleHeadlightsPressed: true }), 0.05);
  assert.equal(sim.getSnapshot().headlightMode, 'low');
  assert.equal(sim.getSnapshot().headlightsOn, true);
});

test('leverTarget moves positive under throttle and negative under braking', () => {
  const sim = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
  sim.start();
  for (let i = 0; i < 15; i += 1) {
    sim.step(makeInput({ throttleUp: true }), 0.05);
  }
  assert.ok(sim.getSnapshot().leverTarget > 0.4);
  for (let i = 0; i < 15; i += 1) {
    sim.step(makeInput({ serviceBrake: true }), 0.05);
  }
  assert.ok(sim.getSnapshot().leverTarget < -0.4);
});

test('announcement tracker emits Polish next-station and arrival messages once per station', () => {
  const tracker = new StationAnnouncementTracker();
  tracker.update(0, 'Kabaty', 590, 5, 0.05);
  assert.equal(tracker.getCurrent()?.text, 'Następna stacja: Kabaty');
  const firstId = tracker.getCurrent()?.id;
  tracker.update(0, 'Kabaty', 500, 40, 0.05);
  assert.equal(tracker.getCurrent()?.id, firstId);

  tracker.update(0, 'Kabaty', 110, 35, 0.05);
  assert.equal(tracker.getCurrent()?.text, 'Stacja: Kabaty');
  assert.notEqual(tracker.getCurrent()?.id, firstId);
});
