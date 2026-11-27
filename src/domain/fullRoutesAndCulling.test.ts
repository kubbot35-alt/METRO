import test from 'node:test';
import assert from 'node:assert/strict';
import { MetroSimulationEngine } from './metroSimulation';
import {
  LINE_M1_STATIONS,
  LINE_M2_STATIONS,
  METRO_LINE_M1,
  METRO_LINE_M2,
} from './routeData';
import {
  compileRouteVariant,
  computeSlidingRouteWindow,
  DEFAULT_SCENE_CULL_RANGE_M,
  getRouteStartOptions,
  isSpanWithinCullingRange,
  isWithinCullingRange,
} from './routeVariant';
import { MetroScoringRules } from './scoringRules';
import { MetroTrainPhysics } from './trainPhysics';

const EXPECTED_M1_NAMES = [
  'Kabaty',
  'Natolin',
  'Imielin',
  'Stokłosy',
  'Ursynów',
  'Służew',
  'Wilanowska',
  'Wierzbno',
  'Racławicka',
  'Pole Mokotowskie',
  'Politechnika',
  'Centrum',
  'Świętokrzyska',
  'Ratusz Arsenał',
  'Dworzec Gdański',
  'Plac Wilsona',
  'Marymont',
  'Słodowiec',
  'Stare Bielany',
  'Wawrzyszew',
  'Młociny',
];

const EXPECTED_M2_NAMES = [
  'Bródno',
  'Kondratowicza',
  'Zacisze',
  'Trocka',
  'Targówek Mieszkaniowy',
  'Szwedzka',
  'Dworzec Wileński',
  'Stadion Narodowy',
  'Centrum Nauki Kopernik',
  'Nowy Świat-Uniwersytet',
  'Świętokrzyska',
  'Rondo ONZ',
  'Rondo Daszyńskiego',
  'Płocka',
  'Młynów',
  'Księcia Janusza',
  'Ulrychów',
  'Bemowo',
];

test('Full Line M1 defines all 21 Warsaw stations in exact order with real platform layouts and thematic accents', () => {
  assert.deepEqual(
    LINE_M1_STATIONS.map((s) => s.name),
    EXPECTED_M1_NAMES,
  );
  assert.equal(METRO_LINE_M1.hasSurfaceStart, true);
  assert.equal(METRO_LINE_M1.destinationLed, 'MŁOCINY');
  assert.equal(METRO_LINE_M1.oppositeDestinationLed, 'KABATY');

  const sideSet = new Set(['Centrum', 'Słodowiec', 'Stare Bielany', 'Wawrzyszew', 'Młociny']);
  for (const st of LINE_M1_STATIONS) {
    if (sideSet.has(st.name)) {
      assert.equal(st.platformLayout, 'side', `${st.name} should be side platform`);
      assert.equal(st.platformSide, 'right', `${st.name} should open right [E]`);
    } else {
      assert.equal(st.platformLayout, 'island', `${st.name} should be island platform`);
      assert.equal(st.platformSide, 'left', `${st.name} should open left [Q]`);
    }
  }

  // Distinct Warsaw station accents exist
  const poleMokotowskie = LINE_M1_STATIONS.find((s) => s.name === 'Pole Mokotowskie');
  const placWilsona = LINE_M1_STATIONS.find((s) => s.name === 'Plac Wilsona');
  const stareBielany = LINE_M1_STATIONS.find((s) => s.name === 'Stare Bielany');
  assert.ok(poleMokotowskie?.wallBaseHex !== undefined);
  assert.ok(placWilsona?.wallBaseHex !== undefined);
  assert.ok(stareBielany?.wallBaseHex !== undefined);
});

test('Full Line M2 defines all 18 Warsaw stations from Bródno to Bemowo with island platforms', () => {
  assert.deepEqual(
    LINE_M2_STATIONS.map((s) => s.name),
    EXPECTED_M2_NAMES,
  );
  assert.equal(METRO_LINE_M2.hasSurfaceStart, false);
  assert.equal(METRO_LINE_M2.destinationLed, 'BEMOWO');
  assert.equal(METRO_LINE_M2.oppositeDestinationLed, 'BRÓDNO');
  for (const st of LINE_M2_STATIONS) {
    assert.equal(st.platformLayout, 'island', `${st.name} should be island [Q]`);
    assert.equal(st.platformSide, 'left');
    assert.ok(st.wallBaseHex !== undefined);
  }
});

test('compileRouteVariant handles reverse direction and intermediate start stations cleanly', () => {
  // Reverse M1: Młociny -> Kabaty, no surface start
  const m1Rev = compileRouteVariant(METRO_LINE_M1, 'reverse', 0);
  assert.equal(m1Rev.stations.length, 21);
  assert.equal(m1Rev.stations[0].name, 'Młociny');
  assert.equal(m1Rev.stations[20].name, 'Kabaty');
  assert.equal(m1Rev.destinationLed, 'KABATY');
  assert.equal(m1Rev.oppositeDestinationLed, 'MŁOCINY');
  assert.equal(m1Rev.hasSurfaceStart, false);
  assert.equal(m1Rev.routeLabel, 'Młociny — Kabaty');
  assert.equal(m1Rev.stations[0].distanceM, 600);

  // Reverse M2: Bemowo -> Bródno
  const m2Rev = compileRouteVariant(METRO_LINE_M2, 'reverse', 0);
  assert.equal(m2Rev.stations.length, 18);
  assert.equal(m2Rev.stations[0].name, 'Bemowo');
  assert.equal(m2Rev.stations[17].name, 'Bródno');
  assert.equal(m2Rev.destinationLed, 'BRÓDNO');
  assert.equal(m2Rev.routeLabel, 'Bemowo — Bródno');

  // Intermediate start on M1 at Centrum (index 11) -> 10 remaining stations
  const m1Centrum = compileRouteVariant(METRO_LINE_M1, 'normal', 11);
  assert.equal(m1Centrum.stations.length, 10);
  assert.equal(m1Centrum.stations[0].name, 'Centrum');
  assert.equal(m1Centrum.stations[9].name, 'Młociny');
  assert.equal(m1Centrum.hasSurfaceStart, false);
  assert.equal(m1Centrum.routeLabel, 'Centrum — Młociny');
  assert.equal(m1Centrum.startStationIndex, 11);

  // Simulation engine accepts compiled variant and aligns semaphores/stations cleanly
  const sim = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
  sim.setMetroLineSpec(m1Centrum);
  sim.start();
  const snap = sim.getSnapshot();
  assert.equal(snap.totalStations, 10);
  assert.equal(snap.currentStation.station.name, 'Centrum');
  assert.equal(snap.signals.length, 20);
});

test('getRouteStartOptions lists selectable start stations up to penultimate station in PL and EN', () => {
  const m1Opts = getRouteStartOptions(METRO_LINE_M1, 'normal');
  assert.equal(m1Opts.length, 20); // 0..19 (cannot start on final terminus Młociny)
  assert.ok(m1Opts[0].labelPl.includes('STP Kabaty'));
  assert.ok(m1Opts[0].labelEn.includes('21 st.'));
  assert.equal(m1Opts[11].remainingStations, 10);
  assert.ok(m1Opts[11].labelPl.includes('Centrum'));

  const m2RevOpts = getRouteStartOptions(METRO_LINE_M2, 'reverse');
  assert.equal(m2RevOpts.length, 17);
  assert.ok(m2RevOpts[0].labelPl.includes('Bemowo'));
});

test('computeSlidingRouteWindow shows 6 stations cleanly and shifts smoothly along long 21-station routes', () => {
  // At start (index 0)
  const w0 = computeSlidingRouteWindow(LINE_M1_STATIONS, 0, 150, 6);
  assert.equal(w0.beads.length, 6);
  assert.equal(w0.startIndex, 0);
  assert.equal(w0.endIndex, 5);
  assert.equal(w0.hasMoreBefore, false);
  assert.equal(w0.hasMoreAfter, true);
  assert.equal(w0.beads[0].station.name, 'Kabaty');
  assert.equal(w0.beads[0].state, 'current');

  // Mid-line (index 11 = Centrum) -> shows previous (Politechnika), current (Centrum), and 4 upcoming
  const wMid = computeSlidingRouteWindow(LINE_M1_STATIONS, 11, 7000, 6);
  assert.equal(wMid.beads.length, 6);
  assert.equal(wMid.startIndex, 10);
  assert.equal(wMid.endIndex, 15);
  assert.equal(wMid.hasMoreBefore, true);
  assert.equal(wMid.hasMoreAfter, true);
  assert.equal(wMid.beads[0].station.name, 'Politechnika');
  assert.equal(wMid.beads[0].state, 'passed');
  assert.equal(wMid.beads[1].station.name, 'Centrum');
  assert.equal(wMid.beads[1].state, 'current');
  assert.ok(wMid.overallProgressRatio > 0.5 && wMid.overallProgressRatio < 0.65);

  // Near terminus (index 20 = Młociny) -> clamps cleanly to last 6 stations
  const wEnd = computeSlidingRouteWindow(LINE_M1_STATIONS, 20, 12500, 6);
  assert.equal(wEnd.beads.length, 6);
  assert.equal(wEnd.startIndex, 15);
  assert.equal(wEnd.endIndex, 20);
  assert.equal(wEnd.hasMoreBefore, true);
  assert.equal(wEnd.hasMoreAfter, false);
  assert.equal(wEnd.beads[5].station.name, 'Młociny');
  assert.equal(wEnd.beads[5].state, 'current');
});

test('3D distance culling helpers accurately cull stations and tunnel spans outside ~1200 m range', () => {
  assert.equal(DEFAULT_SCENE_CULL_RANGE_M, 1200);
  assert.equal(isWithinCullingRange(600, 100, 1200), true);
  assert.equal(isWithinCullingRange(1300, 100, 1200), true);
  assert.equal(isWithinCullingRange(1800, 100, 1200), false);
  assert.equal(isWithinCullingRange(12000, 600, 1200), false);

  // Span overlapping player window [pos - 750, pos + 1200]
  assert.equal(isSpanWithinCullingRange(600, 1200, 100, 1200, 750), true);
  assert.equal(isSpanWithinCullingRange(1400, 2000, 100, 1200, 750), false);
  assert.equal(isSpanWithinCullingRange(0, 600, 2000, 1200, 750), false);
  assert.equal(isSpanWithinCullingRange(1200, 1800, 2000, 1200, 750), true);
});
