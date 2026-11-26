import test from 'node:test';
import assert from 'node:assert/strict';
import { AchievementService } from './achievements';
import { MetroSimulationEngine } from './metroSimulation';
import { DispatcherRadioSystem } from './radioSystem';
import { LINE_M1_STATIONS } from './routeData';
import { MetroScoringRules } from './scoringRules';
import {
  DEFAULT_GAME_SETTINGS,
  getGraphicsQualityPreset,
  sanitizeGameSettings,
  SettingsStorageService,
} from './settingsService';
import { MetroTrainPhysics } from './trainPhysics';
import { MetroWeatherSystem } from './weatherSystem';
import type { IControlInput } from './types';

function makeInput(overrides: Partial<IControlInput> = {}): IControlInput {
  return {
    throttleUp: false,
    throttleDown: false,
    serviceBrake: false,
    emergencyBrakePressed: false,
    toggleDoorsPressed: false,
    cycleCameraPressed: false,
    hornActive: false,
    ...overrides,
  };
}

class MemoryStorage {
  private readonly store = new Map<string, string>();
  public getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  public setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

test('DispatcherRadioSystem triggers messages, acknowledges within 6s for +40 pkt, and tracks ack count', () => {
  const radio = new DispatcherRadioSystem(LINE_M1_STATIONS, () => 0.1);
  let triggered = false;

  for (let i = 0; i < 400; i += 1) {
    const res = radio.step(0, 120 + i * 2, 45, false, 0.05);
    if (res.dispatchTriggered) {
      triggered = true;
      const ack = radio.step(0, 120 + i * 2, 45, true, 0.05);
      assert.equal(ack.acknowledgedNow, true);
      assert.equal(ack.bonusPoints, 40);
      assert.equal(radio.getState().acknowledgedCount, 1);
      break;
    }
  }
  assert.equal(triggered, true);
});

test('Challenge inverter_fault caps traction to 60% and technical_run starts empty', () => {
  const simNormal = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
  simNormal.start();

  const simInverter = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
  simInverter.setGameMode('challenge');
  simInverter.setChallenge('inverter_fault');
  simInverter.start();

  for (let i = 0; i < 60; i += 1) {
    simNormal.step(makeInput({ throttleUp: true }), 0.05);
    simInverter.step(makeInput({ throttleUp: true }), 0.05);
  }
  assert.ok(
    simInverter.getSnapshot().kinematics.speedKmh < simNormal.getSnapshot().kinematics.speedKmh - 5,
    'Inverter fault should meaningfully cap acceleration',
  );

  const simTech = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
  simTech.setGameMode('challenge');
  simTech.setChallenge('technical_run');
  simTech.start();
  assert.equal(simTech.getSnapshot().challenge?.id, 'technical_run');
  assert.equal(simTech.getSnapshot().passengersCarried, 0);
});

test('Challenge black_series forces rush hour and AchievementService unlocks challenge badges', () => {
  const sim = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
  sim.setTimeOfDay('evening');
  sim.setGameMode('challenge');
  sim.setChallenge('black_series');
  sim.start();
  assert.equal(sim.getSnapshot().timeOfDay.id, 'rush');

  const achievements = new AchievementService(new MemoryStorage());
  const snapshot = {
    ...sim.getSnapshot(),
    phase: 'gameover' as const,
    challengeOutcome: {
      challengeId: 'black_series' as const,
      passed: true,
      reason: 'Ukończono wyzwanie',
    },
  };
  const unlocked = achievements.evaluateAndUnlock(snapshot);
  assert.ok(unlocked.some((spec) => spec.id === 'challenge_black_series'));
});

test('MetroWeatherSystem applies rain intensity, wet rails grip (~20% longer braking), wheel slip, and wiper sweep', () => {
  const weather = new MetroWeatherSystem();
  weather.setMode('rain');

  const outdoorRes = weather.step(true, 120, 1.0, 55, 0.9, false, false, 0.05);
  assert.equal(outdoorRes.state.mode, 'rain');
  assert.equal(outdoorRes.state.rainIntensity, 1.0);
  assert.equal(outdoorRes.state.wetRailsActive, true);
  assert.equal(outdoorRes.state.wheelSlipActive, true);
  assert.ok(outdoorRes.brakeGripMultiplier < 0.86);
  assert.equal(outdoorRes.state.wipersOn, false);

  const toggled = weather.step(true, 120, 1.0, 40, 0, false, true, 0.05);
  assert.equal(toggled.state.wipersOn, true);
  assert.ok(toggled.state.wiperPhaseRad > 0);

  const deepTunnel = weather.step(true, 600, 0.0, 55, 0.9, false, false, 0.05);
  assert.equal(deepTunnel.state.wetRailsActive, false);
  assert.equal(deepTunnel.state.rainIntensity, 0);

  const simDry = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
  simDry.setWeatherMode('clear');
  simDry.start();
  const simWet = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
  simWet.setWeatherMode('rain');
  simWet.start();

  for (let i = 0; i < 60; i += 1) {
    simDry.step(makeInput({ throttleUp: true }), 0.05);
    simWet.step(makeInput({ throttleUp: true }), 0.05);
  }
  const dryStartPos = simDry.getSnapshot().kinematics.positionM;
  const wetStartPos = simWet.getSnapshot().kinematics.positionM;
  for (let i = 0; i < 200; i += 1) {
    simDry.step(makeInput({ serviceBrake: true }), 0.05);
    simWet.step(makeInput({ serviceBrake: true }), 0.05);
  }
  const dryStopDist = simDry.getSnapshot().kinematics.positionM - dryStartPos;
  const wetStopDist = simWet.getSnapshot().kinematics.positionM - wetStartPos;
  assert.ok(
    wetStopDist > dryStopDist * 1.12,
    `Expected wet stopping distance (${wetStopDist.toFixed(1)}m) > dry (${dryStopDist.toFixed(1)}m) by ~20%`,
  );
});

test('SettingsStorageService sanitizes, persists, and resets settings cleanly', () => {
  const sanitized = sanitizeGameSettings({
    masterVolume: 5,
    trainVolume: -1,
    voiceVolume: 0.45,
    cabFovDeg: 140,
    graphicsQuality: 'invalid' as never,
    showFps: true,
  });
  assert.equal(sanitized.masterVolume, 1);
  assert.equal(sanitized.trainVolume, 0);
  assert.equal(sanitized.voiceVolume, 0.45);
  assert.equal(sanitized.cabFovDeg, 95);
  assert.equal(sanitized.graphicsQuality, DEFAULT_GAME_SETTINGS.graphicsQuality);
  assert.equal(sanitized.showFps, true);

  const low = getGraphicsQualityPreset('low');
  const high = getGraphicsQualityPreset('high');
  assert.ok(high.drawDistanceM > low.drawDistanceM);
  assert.ok(high.rainDensity > low.rainDensity);

  const storage = new MemoryStorage();
  const service = new SettingsStorageService(storage);
  assert.deepEqual(service.load(), DEFAULT_GAME_SETTINGS);

  service.save({ ...DEFAULT_GAME_SETTINGS, cabFovDeg: 82, graphicsQuality: 'low', showFps: true });
  const reloaded = new SettingsStorageService(storage).load();
  assert.equal(reloaded.cabFovDeg, 82);
  assert.equal(reloaded.graphicsQuality, 'low');
  assert.equal(reloaded.showFps, true);

  const reset = service.reset();
  assert.deepEqual(reset, DEFAULT_GAME_SETTINGS);
});
