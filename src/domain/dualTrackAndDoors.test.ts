import test from 'node:test';
import assert from 'node:assert/strict';
import { MetroIncidentSystem } from './incidentSystem';
import { MetroSimulationEngine } from './metroSimulation';
import {
  BOARDING_DURATION_SEC,
  LINE_M1_STATIONS,
  LINE_M2_STATIONS,
  METRO_LINE_M1,
  METRO_LINE_M2,
} from './routeData';
import { MetroScoringRules } from './scoringRules';
import {
  ISLAND_OPPOSITE_TRACK_X,
  STANDARD_OPPOSITE_TRACK_X,
  getOppositeTrackX,
  getOppositeTrackYaw,
  getStationPlatformLayout,
  getStationPlatformSide,
} from './trackGeometry';
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
    toggleDoorsLeftPressed: false,
    toggleDoorsRightPressed: false,
    hornActive: false,
    ...overrides,
  };
}

test('M1 configures real side platforms (Centrum, Słodowiec, Stare Bielany, Wawrzyszew, Młociny) and M2 uses island platforms', () => {
  const m1SideNames = LINE_M1_STATIONS.filter((s) => getStationPlatformLayout(s) === 'side').map((s) => s.name);
  assert.deepEqual(m1SideNames, ['Centrum', 'Słodowiec', 'Stare Bielany', 'Wawrzyszew', 'Młociny']);
  const m2IslandCount = LINE_M2_STATIONS.filter((s) => getStationPlatformLayout(s) === 'island').length;
  assert.equal(m2IslandCount, LINE_M2_STATIONS.length);

  const politechnika = LINE_M1_STATIONS.find((s) => s.name === 'Politechnika');
  const centrum = LINE_M1_STATIONS.find((s) => s.name === 'Centrum');
  const kabaty = LINE_M1_STATIONS.find((s) => s.name === 'Kabaty');
  const stadion = LINE_M2_STATIONS.find((s) => s.name === 'Stadion Narodowy');
  assert.equal(politechnika?.platformLayout, 'island');
  assert.equal(politechnika?.platformSide, 'left');
  assert.equal(centrum?.platformLayout, 'side');
  assert.equal(centrum?.platformSide, 'right');
  assert.equal(kabaty?.platformLayout, 'island');
  assert.equal(kabaty?.platformSide, 'left');
  assert.equal(stadion?.platformLayout, 'island');
  assert.equal(stadion?.platformSide, 'left');
  assert.equal(METRO_LINE_M1.oppositeDestinationLed, 'KABATY');
  assert.equal(METRO_LINE_M2.oppositeDestinationLed, 'BRÓDNO');
});

test('opposite track smoothly curves out to island station X and stays adjacent at side stations', () => {
  // Straight standard tunnel before Kabaty (600m)
  assert.equal(getOppositeTrackX(100, LINE_M1_STATIONS), STANDARD_OPPOSITE_TRACK_X);
  assert.equal(getOppositeTrackYaw(100, LINE_M1_STATIONS), 0);

  // Inside Kabaty (island, 600m)
  assert.equal(getOppositeTrackX(570, LINE_M1_STATIONS), ISLAND_OPPOSITE_TRACK_X);
  assert.equal(getOppositeTrackYaw(570, LINE_M1_STATIONS), 0);

  // Mid-transition ramp approaching Kabaty (~466m)
  const midX = getOppositeTrackX(466, LINE_M1_STATIONS);
  assert.ok(midX < STANDARD_OPPOSITE_TRACK_X && midX > ISLAND_OPPOSITE_TRACK_X);
  assert.ok(Math.abs(getOppositeTrackYaw(466, LINE_M1_STATIONS)) > 0.01);

  // Inside Centrum (side, 7200m) — opposite track stays right next to player track
  assert.equal(getOppositeTrackX(7170, LINE_M1_STATIONS), STANDARD_OPPOSITE_TRACK_X);
  assert.equal(getStationPlatformSide(LINE_M1_STATIONS[11]), 'right');
});

test('wrong-side door attempt is blocked with safety penalty in Duty and zero penalty in Sandbox', () => {
  const twoTypeRoute: readonly IStationSpec[] = [
    {
      id: 1,
      name: 'Kabaty',
      code: 'M1-01',
      distanceM: 0,
      stopZoneHalfWidthM: 14,
      platformLengthM: 110,
      platformLayout: 'island',
      platformSide: 'left',
      accentHex: 0xd97706,
      waitingPassengers: 10,
    },
    {
      id: 2,
      name: 'Natolin',
      code: 'M1-02',
      distanceM: 0,
      stopZoneHalfWidthM: 14,
      platformLengthM: 110,
      platformLayout: 'side',
      platformSide: 'right',
      accentHex: 0x0284c7,
      waitingPassengers: 10,
    },
  ];
  const sim = new MetroSimulationEngine(
    new MetroTrainPhysics(),
    new MetroScoringRules(),
    twoTypeRoute,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    new MetroIncidentSystem(twoTypeRoute, () => 0.9),
  );
  sim.start();

  // Key O in Duty mode refuses to open and shows Q/E hint
  const oRes = sim.step(makeInput({ toggleDoorsPressed: true }), 0.05);
  assert.equal(oRes.doorToggledTo, null);
  assert.equal(sim.getSnapshot().doorState, 'closed');
  assert.match(sim.getSnapshot().feedback?.text ?? '', /\[Q\].*\[E\]/);

  // Wrong side (E on island/left station) is blocked with -25 penalty
  const wrongRes = sim.step(makeInput({ toggleDoorsRightPressed: true }), 0.05);
  assert.equal(wrongRes.doorToggledTo, null);
  assert.equal(wrongRes.doorFaultBeep, true);
  assert.equal(sim.getSnapshot().score, -25);
  assert.equal(sim.getSnapshot().doorState, 'closed');

  // Correct side (Q) opens left doors
  const leftOpen = sim.step(makeInput({ toggleDoorsLeftPressed: true }), 0.05);
  assert.equal(leftOpen.doorToggledTo, 'open');
  assert.equal(sim.getSnapshot().openDoorSide, 'left');

  for (let i = 0; i < Math.ceil(BOARDING_DURATION_SEC / 0.05) + 1; i += 1) {
    sim.step(makeInput(), 0.05);
  }
  const leftClose = sim.step(makeInput({ toggleDoorsLeftPressed: true }), 0.05);
  assert.equal(leftClose.doorToggledTo, 'closed');
  assert.equal(sim.getSnapshot().currentStation.station.name, 'Natolin');

  // Station 2 (Natolin, side/right): wrong side Q is blocked, right side E opens!
  const wrongLeft = sim.step(makeInput({ toggleDoorsLeftPressed: true }), 0.05);
  assert.equal(wrongLeft.doorToggledTo, null);
  assert.equal(wrongLeft.doorFaultBeep, true);

  const rightOpen = sim.step(makeInput({ toggleDoorsRightPressed: true }), 0.05);
  assert.equal(rightOpen.doorToggledTo, 'open');
  assert.equal(sim.getSnapshot().openDoorSide, 'right');

  // Sandbox mode: O auto-opens correct side, wrong side applies 0 penalty
  sim.setGameMode('sandbox');
  sim.reset();
  const sbWrong = sim.step(makeInput({ toggleDoorsRightPressed: true }), 0.05);
  assert.equal(sbWrong.doorToggledTo, null);
  assert.equal(sim.getSnapshot().score, 0);
  const sbAuto = sim.step(makeInput({ toggleDoorsPressed: true }), 0.05);
  assert.equal(sbAuto.doorToggledTo, 'open');
  assert.equal(sim.getSnapshot().openDoorSide, 'left');
});

test('AI train on opposite track stops at station, opens doors, closes doors, turns on headlights and departs', () => {
  // rng returning 0.1 triggers 35% station encounter (< 0.35) and arriving branch (< 0.5)
  const traffic = new OppositeTrackTrafficSystem(() => 0.1, LINE_M1_STATIONS);
  // Approach Kabaty (600m) from 420m (180m ahead -> inside trigger window)
  traffic.step(420, 0.05);
  const arriving = traffic.getState();
  assert.equal(arriving.active, true);
  assert.equal(arriving.mode, 'station-arriving');
  assert.equal(arriving.stationIndex, 0);
  assert.equal(arriving.doorsOpen, false);
  assert.equal(arriving.doorSide, 'left');

  // Step until AI train brakes to a stop and opens doors
  let reachedDwell = false;
  for (let i = 0; i < 400; i += 1) {
    traffic.step(580, 0.05);
    if (traffic.getState().mode === 'station-dwelling') {
      reachedDwell = true;
      break;
    }
  }
  assert.equal(reachedDwell, true);
  assert.equal(traffic.getState().doorsOpen, true);
  assert.equal(traffic.getState().speedMs, 0);
  assert.equal(traffic.getState().headlightsOn, false);

  // Step through dwell until AI train closes doors, lights up headlights, and departs
  let departed = false;
  for (let i = 0; i < 300; i += 1) {
    traffic.step(600, 0.05);
    const st = traffic.getState();
    if (st.mode === 'station-departing' && st.speedMs > 2) {
      departed = true;
      assert.equal(st.doorsOpen, false);
      assert.equal(st.headlightsOn, true);
      break;
    }
  }
  assert.equal(departed, true);
});
