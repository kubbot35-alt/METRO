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

test('Warsaw Metro M1 route has 12 real stations from Kabaty to Centrum and 24 semaphores', () => {
  assert.equal(LINE_M1_STATIONS.length, 12);
  assert.equal(LINE_M1_STATIONS[0].name, 'Kabaty');
  assert.equal(LINE_M1_STATIONS[1].name, 'Natolin');
  assert.equal(LINE_M1_STATIONS[11].name, 'Centrum');
  assert.equal(LINE_M1_STATIONS[11].distanceM, 7200);
  assert.equal(SEMAPHORE_DISTANCES_M.length, 24);
  for (const station of LINE_M1_STATIONS) {
    assert.ok(station.waitingPassengers >= 12 && station.waitingPassengers <= 16);
  }
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
