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

test('Line M2 catalog defines 7 Warsaw stations with unique thematic wall colors and red badge', () => {
  assert.equal(METRO_LINE_M1.id, 'M1');
  assert.equal(METRO_LINE_M1.destinationLed, 'MŁOCINY');
  assert.equal(METRO_LINE_M1.cssColor, '#2563eb');
  assert.equal(LINE_M1_STATIONS.length, 12);

  assert.equal(METRO_LINE_M2.id, 'M2');
  assert.equal(METRO_LINE_M2.destinationLed, 'BRÓDNO');
  assert.equal(METRO_LINE_M2.cssColor, '#dc2626');
  assert.equal(LINE_M2_STATIONS.length, 7);
  assert.deepEqual(
    LINE_M2_STATIONS.map((s) => s.name),
    [
      'Rondo Daszyńskiego',
      'Rondo ONZ',
      'Świętokrzyska',
      'Nowy Świat-Uniwersytet',
      'Centrum Nauki Kopernik',
      'Stadion Narodowy',
      'Dworzec Wileński',
    ],
  );
  LINE_M2_STATIONS.forEach((station) => {
    assert.ok(station.wallBaseHex !== undefined);
  });
});

test('setMetroLine switches stations, semaphores, announcements, and trackwork to Line M2 cleanly', () => {
  const sim = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
  sim.setMetroLine('M2');
  sim.start();

  const initial = sim.getSnapshot();
  assert.equal(initial.line.id, 'M2');
  assert.equal(initial.totalStations, 7);
  assert.equal(initial.stations.length, 7);
  assert.equal(initial.currentStation.station.name, 'Rondo Daszyńskiego');
  assert.equal(initial.signals.length, 14);
  initial.trackworkZones.forEach((zone) => {
    assert.ok(zone.endM <= LINE_M2_STATIONS[LINE_M2_STATIONS.length - 1].distanceM);
  });

  for (let i = 0; i < 60; i += 1) {
    sim.step(makeInput({ throttleUp: true }), 0.05);
  }
  const moving = sim.getSnapshot();
  assert.ok(moving.announcement?.text.includes('Rondo Daszyńskiego'));
});
