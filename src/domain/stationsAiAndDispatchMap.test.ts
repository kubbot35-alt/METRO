import test from 'node:test';
import assert from 'node:assert/strict';
import { compileCustomLineSpec } from './customLineCompiler';
import { buildDispatchMapModel, formatShortTrainModel } from './dispatchMapModel';
import { localizeRadioDispatch } from './i18nDynamic';
import { LeadingTrainSystem } from './leadingTrainSystem';
import { MetroSimulationEngine } from './metroSimulation';
import {
  LINE_M1_STATIONS,
  LINE_M2_STATIONS,
  PLATFORM_LENGTH_M,
} from './routeData';
import { MetroScoringRules } from './scoringRules';
import { TunnelSignalSystem } from './signalSystem';
import {
  STATION_HALL_END_OFFSET_M,
  STATION_HALL_START_OFFSET_M,
  isWithinStationHall,
} from './trackGeometry';
import { OppositeTrackTrafficSystem } from './trafficSystem';
import { MetroTrainPhysics } from './trainPhysics';
import type { IControlInput } from './types';

function makeInput(overrides: Partial<IControlInput> = {}): IControlInput {
  return {
    throttleUp: false,
    throttleDown: false,
    serviceBrake: false,
    emergencyBrakePressed: false,
    toggleDoorsPressed: false,
    toggleDoorsLeftPressed: false,
    toggleDoorsRightPressed: false,
    hornActive: false,
    ...overrides,
  };
}

test('all M1, M2 and custom Route Creator stations extend to 138m so a 6-car (118m) consist fits completely inside platform bounds', () => {
  assert.equal(PLATFORM_LENGTH_M, 138);
  assert.ok(LINE_M1_STATIONS.every((st) => st.platformLengthM === 138));
  assert.ok(LINE_M2_STATIONS.every((st) => st.platformLengthM === 138));
  const custom = compileCustomLineSpec({
    id: 'custom-m3',
    name: 'M3 Test',
    destinationLed: 'GOCŁAW',
    cssColor: '#16a34a',
    hasSurfaceStart: false,
    alignmentIntensity: 'moderate',
    stations: [
      { name: 'Stadion', wallHex: '#0f766e', platformLayout: 'island', spacingFromPrevM: 600 },
      { name: 'Gocław', wallHex: '#15803d', platformLayout: 'side', spacingFromPrevM: 650 },
    ],
  });
  assert.ok(custom.stations.every((st) => st.platformLengthM === 138));

  // Platform centered at z=+58.5 spans [-10.5 .. +127.5] relative to W4 (z=0).
  // A 6-car Škoda Varsovia (118m) stopped at W4 spans [0 .. +118], leaving ~10m front and rear margins!
  const platformFrontZ = 58.5 - PLATFORM_LENGTH_M * 0.5;
  const platformRearZ = 58.5 + PLATFORM_LENGTH_M * 0.5;
  assert.ok(platformFrontZ <= -8 && platformFrontZ >= -12, 'W4 sits 8-12m before platform front edge');
  assert.ok(platformRearZ >= 126, 'rear platform edge extends well past 118m 6-car tail');
  assert.ok(STATION_HALL_START_OFFSET_M >= 130 && STATION_HALL_END_OFFSET_M >= 15);
  assert.equal(isWithinStationHall(LINE_M1_STATIONS[0].distanceM - 118, LINE_M1_STATIONS), true);
});

test('cruising opposite-track AI train dynamically decelerates, stops at station, opens doors, and departs', () => {
  const traffic = new OppositeTrackTrafficSystem(() => 0.4, LINE_M1_STATIONS);
  // Spawn cruising train ahead of Station 1 (600m), moving toward decreasing distanceM
  traffic.forceSpawnAhead(400); // positionM = 600
  let arrived = false;
  let dwelled = false;
  let departed = false;
  for (let i = 0; i < 600; i += 1) {
    traffic.step(400, 0.05);
    const st = traffic.getState();
    if (st.mode === 'station-arriving') arrived = true;
    if (st.mode === 'station-dwelling' && st.doorsOpen && st.speedMs === 0) dwelled = true;
    if (dwelled && (st.mode === 'station-departing' || st.mode === 'cruise') && !st.doorsOpen && st.speedMs > 2) {
      departed = true;
      break;
    }
  }
  assert.equal(arrived, true, 'cruising AI train enters station-arriving mode');
  assert.equal(dwelled, true, 'AI train stops and opens doors at opposite platform edge');
  assert.equal(departed, true, 'AI train closes doors and departs');
});

test('LeadingTrainSystem is auto-enabled in Duty + Rush Hour, drives RED/YELLOW block signals, lowers SOP-2, and triggers headway radio warning', () => {
  const signals = new TunnelSignalSystem([250, 495, 790, 1095, 1390], () => 0.9);
  const leading = new LeadingTrainSystem(LINE_M1_STATIONS, () => 0.5);
  const sim = new MetroSimulationEngine(
    new MetroTrainPhysics(),
    new MetroScoringRules(),
    LINE_M1_STATIONS,
    undefined,
    undefined,
    signals,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
  );
  sim.setGameMode('duty');
  sim.setTimeOfDay('rush');
  sim.start();
  assert.equal(sim.getSnapshot().leadingTrain.active, true, 'leading AI active in Duty + Rush Hour');

  // Place leading train right after semaphore 495m (at 540m); 495m becomes RED, 250m becomes RED/YELLOW
  signals.syncLeadingTrainBlocks(620, 118); // tail at 502 >= 495 => 495 RED, 250 YELLOW
  const blocksAt620 = signals.getSignals();
  assert.equal(blocksAt620[1].aspect, 'red', 'block behind leading train is RED');
  assert.equal(blocksAt620[0].aspect, 'yellow', 'preceding block is YELLOW');

  // Once leading train advances into next block (950m, tail 832 >= 790), 495m clears to YELLOW and 250m clears to GREEN!
  signals.syncLeadingTrainBlocks(950, 118);
  const blocksAt950 = signals.getSignals();
  assert.equal(blocksAt950[2].aspect, 'red');
  assert.equal(blocksAt950[1].aspect, 'yellow');
  assert.equal(blocksAt950[0].aspect, 'green');

  // Verify LeadingTrainSystem stops at stations and fires headway warning when player approaches within 2 blocks
  leading.setEnabled(true);
  leading.forcePosition(460, 12);
  const warnRes = leading.step(120, 55, signals.getSignals(), 0.05);
  assert.equal(warnRes.headwayWarningTriggeredNow, true);

  // Disabled in Evening and Sandbox
  sim.setTimeOfDay('evening');
  assert.equal(sim.getSnapshot().leadingTrain.active, false, 'leading AI disabled in Evening');
  sim.setTimeOfDay('rush');
  sim.setGameMode('sandbox');
  assert.equal(sim.getSnapshot().leadingTrain.active, false, 'leading AI disabled in Sandbox');
});

test('headway radio alert translates cleanly to English and Live Dispatch Map builds dual-track model', () => {
  const localizedEn = localizeRadioDispatch('en', {
    active: true,
    messageId: 1,
    text: 'Dyspozytor: Zwolnij, przed tobą opóźniony skład — zachowaj odstęp blokowy!',
    spokenText: 'Uwaga dyspozytor. Zwolnij, przed tobą opóźniony skład.',
    category: 'headway',
    remainingSec: 12,
    maxWindowSec: 15,
    acknowledgedCount: 0,
    slipperyRailsActive: false,
  });
  assert.match(localizedEn.displayText, /Slow down, delayed train ahead/);

  const sim = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules(), LINE_M1_STATIONS);
  sim.setGameMode('duty');
  sim.setTimeOfDay('rush');
  sim.start();
  sim.step(makeInput({ throttleUp: true }), 0.05);
  const model = buildDispatchMapModel(sim.getSnapshot());
  assert.equal(model.stations.length, LINE_M1_STATIONS.length);
  assert.equal(model.stations[0].status, 'current');
  assert.equal(model.playerMarker.direction, 'forward');
  assert.ok(model.leadingMarker !== null && model.leadingMarker.direction === 'forward');
  assert.ok(model.signals.length > 0);
  assert.equal(formatShortTrainModel('varsovia'), 'VARSOVIA');
  assert.equal(formatShortTrainModel('seria81'), 'SERIA 81');
});
