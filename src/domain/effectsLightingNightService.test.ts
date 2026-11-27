import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateUnlockedAchievementIds } from './achievements';
import { evaluateChallengeOutcome, getChallengeSpec } from './challengeCatalog';
import {
  getLocalizedAchievement,
  getLocalizedChallenge,
  getLocalizedTimeOfDay,
} from './i18nCatalog';
import { localizeFeedbackText, localizeRadioDispatch } from './i18nDynamic';
import {
  HIGH_BEAM_COURTESY_BONUS_PTS,
  LightingAndSparksSystem,
  getNextHeadlightMode,
} from './lightingAndSparksSystem';
import { MetroSimulationEngine } from './metroSimulation';
import {
  NIGHT_CREW_MAX_SPEED_KMH,
  NIGHT_CREW_SAFE_BONUS_PTS,
  NIGHT_CREW_VIOLATION_PENALTY_PTS,
  NightInspectionSystem,
} from './nightInspectionSystem';
import { LINE_M1_STATIONS } from './routeData';
import { MetroScoringRules } from './scoringRules';
import { computeEffectivePassengers, getTimeOfDaySpec } from './timeOfDayCatalog';
import { MetroTrainPhysics } from './trainPhysics';
import type { IControlInput, IOncomingTrainState } from './types';

function makeIdleInput(overrides: Partial<IControlInput> = {}): IControlInput {
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

function makeOncoming(active: boolean, positionM: number): IOncomingTrainState {
  return {
    active,
    positionM,
    speedMs: 14,
    modelId: 'seria81',
    headlightsOn: true,
    mode: 'cruise',
    doorsOpen: false,
    doorSide: 'left',
    stationIndex: null,
  };
}

test('headlight cycle advances off -> low -> high -> off and toggles cab light', () => {
  assert.equal(getNextHeadlightMode('off'), 'low');
  assert.equal(getNextHeadlightMode('low'), 'high');
  assert.equal(getNextHeadlightMode('high'), 'off');

  const sys = new LightingAndSparksSystem(() => 0.3);
  assert.equal(sys.getState().headlightMode, 'low');
  assert.equal(sys.getState().cabLightOn, false);

  sys.cycleHeadlightMode();
  assert.equal(sys.getState().headlightMode, 'high');
  sys.cycleHeadlightMode();
  assert.equal(sys.getState().headlightMode, 'off');
  sys.cycleHeadlightMode();
  assert.equal(sys.getState().headlightMode, 'low');

  assert.equal(sys.toggleCabLight(), true);
  assert.equal(sys.getState().cabLightOn, true);
  assert.equal(sys.toggleCabLight(), false);
});

test('high beams trigger dim prompt near oncoming train and award courtesy bonus once when dimmed', () => {
  const sys = new LightingAndSparksSystem(() => 0.4);
  sys.setHeadlightMode('high');
  const oncoming = makeOncoming(true, 260);

  const approaching = sys.step({
    playerPositionM: 160,
    speedKmh: 45,
    throttle: 0.4,
    serviceBrake: 0,
    emergencyBrake: false,
    netAccelerationMs2: 0,
    turnoutSwayFactor: 0,
    oncomingTrain: oncoming,
    toggleHeadlightsPressed: false,
    toggleCabLightPressed: false,
    dtSec: 0.05,
  });
  assert.equal(approaching.dimCourtesyBonusAwarded, false);
  assert.equal(sys.getState().dimHighBeamPromptActive, true);

  const dimmed = sys.step({
    playerPositionM: 170,
    speedKmh: 45,
    throttle: 0.4,
    serviceBrake: 0,
    emergencyBrake: false,
    netAccelerationMs2: 0,
    turnoutSwayFactor: 0,
    oncomingTrain: oncoming,
    toggleHeadlightsPressed: true,
    toggleCabLightPressed: false,
    dtSec: 0.05,
  });
  assert.equal(dimmed.dimCourtesyBonusAwarded, true);
  assert.equal(dimmed.courtesyBonusPoints, HIGH_BEAM_COURTESY_BONUS_PTS);
  assert.equal(sys.getState().dimHighBeamPromptActive, false);
  assert.equal(sys.getState().highBeamCourtesyCount, 1);

  // Re-enabling high beams on the same encounter does not double-award
  sys.setHeadlightMode('high');
  const secondDim = sys.step({
    playerPositionM: 185,
    speedKmh: 45,
    throttle: 0.4,
    serviceBrake: 0,
    emergencyBrake: false,
    netAccelerationMs2: 0,
    turnoutSwayFactor: 0,
    oncomingTrain: oncoming,
    toggleHeadlightsPressed: true,
    toggleCabLightPressed: false,
    dtSec: 0.05,
  });
  assert.equal(secondDim.dimCourtesyBonusAwarded, false);
  assert.equal(sys.getState().highBeamCourtesyCount, 1);
});

test('third-rail sparks fire on strong acceleration, hard braking, and turnouts', () => {
  const sys = new LightingAndSparksSystem(() => 0.2);

  const accelRes = sys.step({
    playerPositionM: 300,
    speedKmh: 28,
    throttle: 0.9,
    serviceBrake: 0,
    emergencyBrake: false,
    netAccelerationMs2: 0.85,
    turnoutSwayFactor: 0,
    oncomingTrain: makeOncoming(false, 0),
    toggleHeadlightsPressed: false,
    toggleCabLightPressed: false,
    dtSec: 0.05,
  });
  assert.equal(accelRes.sparkTriggeredNow, true);
  assert.ok(sys.getState().sparkIntensity > 0.5);
  assert.equal(sys.getState().sparkEventId, 1);

  for (let i = 0; i < 32; i += 1) {
    sys.step({
      playerPositionM: 320 + i,
      speedKmh: 25,
      throttle: 0.2,
      serviceBrake: 0,
      emergencyBrake: false,
      netAccelerationMs2: 0,
      turnoutSwayFactor: 0,
      oncomingTrain: makeOncoming(false, 0),
      toggleHeadlightsPressed: false,
      toggleCabLightPressed: false,
      dtSec: 0.05,
    });
  }
  const turnoutRes = sys.step({
    playerPositionM: 400,
    speedKmh: 30,
    throttle: 0.2,
    serviceBrake: 0,
    emergencyBrake: false,
    netAccelerationMs2: 0,
    turnoutSwayFactor: 0.35,
    oncomingTrain: makeOncoming(false, 0),
    toggleHeadlightsPressed: false,
    toggleCabLightPressed: false,
    dtSec: 0.05,
  });
  assert.equal(turnoutRes.sparkTriggeredNow, true);
  assert.equal(sys.getState().sparkEventId, 2);
});

test('NightInspectionSystem awards bonus for safe slow pass with horn and penalizes fast/silent pass', () => {
  const sys = new NightInspectionSystem(LINE_M1_STATIONS, () => 0.5);
  sys.setActive(true);
  const initialState = sys.getState();
  assert.equal(initialState.active, true);
  assert.ok(initialState.totalCount >= 3);

  const firstCrew = initialState.checkpoints[0];
  const approach = sys.step(firstCrew.distanceM - 45, 16, true);
  assert.equal(approach.clearedCheckpoint, null);
  assert.equal(sys.getState().activeApproachCrew?.id, firstCrew.id);
  assert.equal(sys.getState().activeApproachCrew?.hornSounded, true);

  const cleared = sys.step(firstCrew.distanceM + 12, NIGHT_CREW_MAX_SPEED_KMH - 2, false);
  assert.equal(cleared.clearedCheckpoint?.id, firstCrew.id);
  assert.equal(cleared.pointsDelta, NIGHT_CREW_SAFE_BONUS_PTS);
  assert.equal(sys.getState().passedCount, 1);

  const secondCrew = initialState.checkpoints[1];
  const violated = sys.step(secondCrew.distanceM + 12, 45, false);
  assert.equal(violated.violatedCheckpoint?.id, secondCrew.id);
  assert.equal(violated.pointsDelta, NIGHT_CREW_VIOLATION_PENALTY_PTS);
  assert.equal(sys.getState().violatedCount, 1);
});

test('Night Service mode has zero passengers, passes challenge & unlocks night_inspector when flawless', () => {
  const tod = getTimeOfDaySpec('night_service');
  assert.equal(tod.clockLabel, '02:30');
  assert.equal(computeEffectivePassengers(35, tod.passengerMultiplier), 0);

  const sim = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
  sim.setGameMode('challenge');
  sim.setChallenge('night_service');
  sim.start();
  const snap = sim.getSnapshot();
  assert.equal(snap.timeOfDay.id, 'night_service');
  assert.equal(snap.nightInspection.active, true);
  assert.equal(snap.passengersCarried, 0);

  sim.step(makeIdleInput({ toggleHeadlightsPressed: true, toggleCabLightPressed: true }), 0.05);
  assert.equal(sim.getSnapshot().headlightMode, 'high');
  assert.equal(sim.getSnapshot().cabLightOn, true);

  const challengeSpec = getChallengeSpec('night_service');
  const outcome = evaluateChallengeOutcome({
    challenge: challengeSpec,
    stationsServed: 6,
    stationsMissed: 0,
    totalStations: 6,
    averageDeviationSec: 0,
    finalDeviationSec: 0,
    overspeedViolations: 0,
    redSignalViolations: 0,
    czuwakViolations: 0,
    nightCrewTotal: 5,
    nightCrewPassed: 5,
    nightCrewViolated: 0,
  });
  assert.equal(outcome.passed, true);

  const mockCompleteSnap = {
    ...sim.getSnapshot(),
    phase: 'gameover' as const,
    stationsServed: 6,
    totalStations: 6,
    redSignalViolations: 0,
    czuwakViolations: 0,
    nightInspection: {
      ...sim.getSnapshot().nightInspection,
      active: true,
      totalCount: 5,
      passedCount: 5,
      violatedCount: 0,
    },
  };
  const unlocked = evaluateUnlockedAchievementIds(mockCompleteSnap, new Set());
  assert.ok(unlocked.includes('night_inspector'));
});

test('PL and EN localization covers Night Service, Night Inspector, high-beam courtesy, and radio inspection confirmations', () => {
  const todEn = getLocalizedTimeOfDay('en', 'night_service', getTimeOfDaySpec('night_service'));
  assert.match(todEn.name, /Night Service/i);

  const chEn = getLocalizedChallenge('en', 'night_service', getChallengeSpec('night_service'));
  assert.match(chEn.title, /Night Service/i);

  const achEn = getLocalizedAchievement('en', 'night_inspector', {
    title: 'Nocny Inspektor',
    description: 'PL',
  });
  assert.equal(achEn.title, 'Night Inspector');

  assert.match(
    localizeFeedbackText('en', 'Przygaszono długie przed pociągiem z naprzeciwka'),
    /dimmed high beams/i,
  );
  assert.match(
    localizeFeedbackText('en', 'Punkt kontrolny #1 zaliczony — ekipa bezpiecznie ominięta'),
    /Checkpoint #1 cleared/i,
  );

  const radioEn = localizeRadioDispatch('en', {
    active: true,
    category: 'inspection',
    text: 'Dyspozytor: Punkt kontrolny #2 (Tunel przed Natolin) zaliczony — ekipa torowa bezpieczna.',
    spokenText: 'Dyspozytor: Punkt kontrolny #2 (Tunel przed Natolin) zaliczony — ekipa torowa bezpieczna.',
    remainingSec: 4,
    maxWindowSec: 8,
    messageId: 7,
    acknowledgedCount: 0,
    slipperyRailsActive: false,
  });
  assert.match(radioEn.displayText, /Dispatcher: Checkpoint #2/i);
});
