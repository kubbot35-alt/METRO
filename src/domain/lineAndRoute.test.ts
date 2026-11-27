import test from 'node:test';
import assert from 'node:assert/strict';
import { MetroSimulationEngine } from './metroSimulation';
import {
  LINE_M1_STATIONS,
  LINE_M2_STATIONS,
  METRO_LINE_M1,
  METRO_LINE_M2,
} from './routeData';
import { MetroScoringRules } from './scoringRules';
import { MetroTrainPhysics } from './trainPhysics';
import type { IControlInput } from './types';

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

test('Full Line M1 (21 st.) and Line M2 (18 st.) define authentic Warsaw routes and thematic wall colors', () => {
  assert.equal(METRO_LINE_M1.id, 'M1');
  assert.equal(METRO_LINE_M1.destinationLed, 'MŁOCINY');
  assert.equal(METRO_LINE_M1.oppositeDestinationLed, 'KABATY');
  assert.equal(METRO_LINE_M1.cssColor, '#2563eb');
  assert.equal(LINE_M1_STATIONS.length, 21);

  assert.equal(METRO_LINE_M2.id, 'M2');
  assert.equal(METRO_LINE_M2.destinationLed, 'BEMOWO');
  assert.equal(METRO_LINE_M2.oppositeDestinationLed, 'BRÓDNO');
  assert.equal(METRO_LINE_M2.cssColor, '#dc2626');
  assert.equal(LINE_M2_STATIONS.length, 18);
  assert.equal(LINE_M2_STATIONS[0].name, 'Bródno');
  assert.equal(LINE_M2_STATIONS[LINE_M2_STATIONS.length - 1].name, 'Bemowo');
  LINE_M2_STATIONS.forEach((station) => {
    assert.ok(station.wallBaseHex !== undefined);
  });
});

test('setMetroLine switches stations, semaphores, announcements, and trackwork to full Line M2 cleanly', () => {
  const sim = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
  sim.setMetroLine('M2');
  sim.start();

  const initial = sim.getSnapshot();
  assert.equal(initial.line.id, 'M2');
  assert.equal(initial.totalStations, 18);
  assert.equal(initial.stations.length, 18);
  assert.equal(initial.currentStation.station.name, 'Bródno');
  assert.equal(initial.signals.length, 36);
  initial.trackworkZones.forEach((zone) => {
    assert.ok(zone.endM <= LINE_M2_STATIONS[LINE_M2_STATIONS.length - 1].distanceM);
  });

  for (let i = 0; i < 60; i += 1) {
    sim.step(makeInput({ throttleUp: true }), 0.05);
  }
  const moving = sim.getSnapshot();
  assert.ok(moving.announcement?.text.includes('Bródno'));
});
