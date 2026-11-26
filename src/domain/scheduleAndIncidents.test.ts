import test from 'node:test';
import assert from 'node:assert/strict';
import { MetroIncidentSystem } from './incidentSystem';
import { MetroSimulationEngine } from './metroSimulation';
import { BOARDING_DURATION_SEC, LINE_M1_STATIONS } from './routeData';
import { MetroScheduleController, classifyPunctuality, formatClockTime, formatDeviationTime } from './scheduleSystem';
import { MetroScoringRules } from './scoringRules';
import { MetroTrainPhysics } from './trainPhysics';
import type { IControlInput, IStationSpec } from './types';

function makeInput(overrides: Partial<IControlInput> = {}): IControlInput {
  return {
    throttleUp: false,
    throttleDown: false,
    serviceBrake: false,
    emergencyBrakePressed: false,
    toggleDoorsPressed: false,
    acknowledgeCzuwakPressed: false,
    hornActive: false,
    ...overrides,
  };
}

test('schedule classifies punctuality bands and formats clock & deviation cleanly', () => {
  assert.equal(classifyPunctuality(-5), 'on-time');
  assert.equal(classifyPunctuality(0), 'on-time');
  assert.equal(classifyPunctuality(15), 'slight-delay');
  assert.equal(classifyPunctuality(35), 'heavy-delay');
  assert.equal(formatClockTime(8 * 3600 + 48), '08:00:48');
  assert.equal(formatDeviationTime(0), '00:00');
  assert.equal(formatDeviationTime(-5), '-00:05');
  assert.equal(formatDeviationTime(15), '+00:15');
  assert.equal(formatDeviationTime(35), '+00:35');
});

test('punctual arrival grants +150 bonus and heavy delay deducts -100 penalty', () => {
  const rules = new MetroScoringRules();
  assert.equal(rules.evaluatePunctuality(4).points, 150);
  assert.equal(rules.evaluatePunctuality(-9).points, 150);
  assert.equal(rules.evaluatePunctuality(35).points, -100);

  const schedule = new MetroScheduleController(LINE_M1_STATIONS);
  const dev = schedule.recordStationArrival(0, 50);
  assert.equal(dev, 2);
  assert.equal(schedule.getSnapshot(0, 600, 50).averageDeviationSec, 2);
});

test('door fault requires second O press and 3s reset before doors close', () => {
  const route: readonly IStationSpec[] = [
    { id: 1, name: 'Kabaty', code: 'M1-01', distanceM: 0, stopZoneHalfWidthM: 14, platformLengthM: 100, accentHex: 0xffffff, waitingPassengers: 12 },
    { id: 2, name: 'Natolin', code: 'M1-02', distanceM: 600, stopZoneHalfWidthM: 14, platformLengthM: 100, accentHex: 0xffffff, waitingPassengers: 12 },
  ];
  const faultyIncidents = new MetroIncidentSystem(route, () => 0.05);
  const sim = new MetroSimulationEngine(
    new MetroTrainPhysics(),
    new MetroScoringRules(),
    route,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    faultyIncidents,
  );
  sim.start();
  sim.step(makeInput({ toggleDoorsPressed: true }), 0.05);
  for (let i = 0; i < Math.ceil(BOARDING_DURATION_SEC / 0.05) + 1; i += 1) {
    sim.step(makeInput(), 0.05);
  }
  const firstClose = sim.step(makeInput({ toggleDoorsPressed: true }), 0.05);
  assert.equal(firstClose.doorFaultBeep, true);
  assert.equal(firstClose.doorToggledTo, null);
  assert.equal(sim.getSnapshot().doorFault.phase, 'awaiting-retry');

  const retryClose = sim.step(makeInput({ toggleDoorsPressed: true }), 0.05);
  assert.equal(retryClose.doorToggledTo, null);
  assert.equal(sim.getSnapshot().doorFault.phase, 'resetting');

  let closedAfterReset = false;
  for (let i = 0; i < 65; i += 1) {
    const ev = sim.step(makeInput(), 0.05);
    if (ev.doorToggledTo === 'closed') {
      closedAfterReset = true;
      break;
    }
  }
  assert.equal(closedAfterReset, true);
  assert.equal(sim.getSnapshot().stationsServed, 1);
});

test('trackwork zones enforce 25 km/h over 200m and czuwak triggers emergency brake on 4s timeout or clears on C', () => {
  const incidents = new MetroIncidentSystem(LINE_M1_STATIONS, () => 0.0);
  const zones = incidents.getTrackworkZones();
  assert.ok(zones.length >= 1);
  assert.equal(zones[0].endM - zones[0].startM, 200);
  assert.equal(zones[0].limitKmh, 25);
  assert.equal(incidents.getActiveTrackworkZone(zones[0].startM + 50)?.limitKmh, 25);

  let alerted = false;
  for (let i = 0; i < 820; i += 1) {
    const res = incidents.step(100, 40, false, false, 0.05);
    if (res.czuwakAlertTriggered) {
      alerted = true;
      break;
    }
  }
  assert.equal(alerted, true);
  assert.equal(incidents.getCzuwakState().active, true);

  const ack = incidents.step(100, 40, false, true, 0.05);
  assert.equal(ack.czuwakAckChime, true);
  assert.equal(incidents.getCzuwakState().active, false);

  for (let i = 0; i < 820; i += 1) {
    if (incidents.step(100, 40, false, false, 0.05).czuwakAlertTriggered) {
      break;
    }
  }
  let timedOut = false;
  for (let i = 0; i < 85; i += 1) {
    if (incidents.step(100, 40, false, false, 0.05).czuwakTimedOut) {
      timedOut = true;
      break;
    }
  }
  assert.equal(timedOut, true);
});

test('driver grade evaluates S/A/B/C/D accurately', () => {
  const rules = new MetroScoringRules();
  assert.equal(
    rules.evaluateGrade({ score: 4200, stationsServed: 12, totalStations: 12, overspeedViolations: 0, redSignalViolations: 0, czuwakViolations: 0 }),
    'S',
  );
  assert.equal(
    rules.evaluateGrade({ score: 2600, stationsServed: 11, totalStations: 12, overspeedViolations: 1, redSignalViolations: 0, czuwakViolations: 0 }),
    'A',
  );
  assert.equal(
    rules.evaluateGrade({ score: -500, stationsServed: 2, totalStations: 12, overspeedViolations: 5, redSignalViolations: 2, czuwakViolations: 1 }),
    'D',
  );
});
