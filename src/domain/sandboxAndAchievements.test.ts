import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ACHIEVEMENT_CATALOG,
  AchievementService,
  type IAchievementStorage,
} from './achievements';
import { MetroSimulationEngine } from './metroSimulation';
import { MetroScoringRules } from './scoringRules';
import { MetroTrainPhysics } from './trainPhysics';
import type { IControlInput, ISimulationSnapshot } from './types';

function createMemoryStorage(): IAchievementStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

const IDLE_INPUT: IControlInput = {
  throttleUp: false,
  throttleDown: false,
  serviceBrake: false,
  emergencyBrakePressed: false,
  toggleDoorsPressed: false,
  hornActive: false,
};

test('Sandbox mode disables penalties, czuwak, trackwork and supports manual oncoming train and semaphore cycle', () => {
  const sim = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
  sim.setGameMode('sandbox');
  sim.start();

  const initial = sim.getSnapshot();
  assert.equal(initial.gameMode, 'sandbox');
  assert.equal(initial.trackworkZones.length, 0);

  // Trigger manual oncoming train
  sim.triggerSandboxOncomingTrain();
  assert.equal(sim.getSnapshot().oncomingTrain.active, true);

  // Cycle nearest semaphore aspect green -> yellow -> red -> green
  const firstAspect = sim.getSnapshot().nextSignal?.signal.aspect;
  sim.cycleSandboxNextSignal();
  const secondAspect = sim.getSnapshot().nextSignal?.signal.aspect;
  assert.notEqual(secondAspect, firstAspect);

  // Accelerate hard & trigger emergency brake — zero penalties and no czuwak in sandbox
  for (let i = 0; i < 600; i += 1) {
    sim.step({ ...IDLE_INPUT, throttleUp: true }, 0.05);
  }
  sim.step({ ...IDLE_INPUT, emergencyBrakePressed: true }, 0.05);
  const after = sim.getSnapshot();
  assert.equal(after.penaltiesCount, 0);
  assert.equal(after.overspeedViolations, 0);
  assert.equal(after.czuwak.active, false);
  assert.equal(after.score, 0);
});

test('AchievementService unlocks badges accurately, deduplicates, and persists to storage', () => {
  const storage = createMemoryStorage();
  const service = new AchievementService(storage, () => new Date('2026-11-26T12:00:00Z'));
  assert.equal(service.getCatalog().length, ACHIEVEMENT_CATALOG.length);
  assert.ok(service.getCatalog().length >= 8);

  const sim = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
  sim.setMetroLine('M2');
  sim.setTrainModel('seria81');
  sim.setTimeOfDay('evening');
  const baseSnap = sim.getSnapshot();

  const completedSnap: ISimulationSnapshot = {
    ...baseSnap,
    phase: 'gameover',
    gameMode: 'duty',
    stationsServed: 7,
    passengersCarried: 112,
    bestStopErrorM: 1.1,
    czuwakAcksCount: 3,
    doorFaultsResolvedCount: 1,
    driverGrade: 'S',
    overspeedViolations: 0,
    redSignalViolations: 0,
    czuwakViolations: 0,
    schedule: {
      ...baseSnap.schedule,
      averageDeviationSec: 2.4,
      punctualitySamples: 7,
    },
  };

  const unlocked = service.evaluateAndUnlock(completedSnap);
  assert.equal(unlocked.length, 9);

  // Second evaluation should unlock 0 duplicates
  const secondPass = service.evaluateAndUnlock(completedSnap);
  assert.equal(secondPass.length, 0);

  // New instance reading same storage preserves all 9 unlocked badges
  const reloaded = new AchievementService(storage);
  assert.equal(reloaded.getUnlockedRecords().length, 9);
  assert.equal(reloaded.isUnlocked('punctual_clockwork'), true);
  assert.equal(reloaded.isUnlocked('flawless_duty'), true);
  assert.equal(reloaded.isUnlocked('classic_driver'), true);
  assert.equal(reloaded.isUnlocked('m2_master'), true);
  assert.equal(reloaded.isUnlocked('night_owl'), true);
  assert.equal(reloaded.isUnlocked('nerves_of_steel'), true);
});
