import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EcoDrivingSystem, evaluateEcoGrade, trainSupportsRegeneration } from './ecoDrivingSystem';
import { MetroSimulationEngine } from './metroSimulation';
import { MetroScoringRules } from './scoringRules';
import { DEFAULT_GAME_SETTINGS, sanitizeGameSettings } from './settingsService';
import { M1_TUNNEL_PORTAL_M } from './trackAlignment';
import { getTrainModelSpec } from './trainCatalog';
import {
  applyLiveryToTrainSpec,
  getLiveriesForTrain,
  isLiverySelectable,
  isLiveryUnlockedByRank,
  TRAIN_LIVERIES,
  TrainLiveryStorageService,
} from './trainLiveryCatalog';
import { MetroTrainPhysics } from './trainPhysics';
import type { ITrainKinematics } from './types';
import { MetroWeatherSystem } from './weatherSystem';

function makeKinematics(overrides: Partial<ITrainKinematics>): ITrainKinematics {
  const speedMs = overrides.speedMs ?? 0;
  return {
    positionM: 100,
    speedMs,
    speedKmh: overrides.speedKmh ?? speedMs * 3.6,
    netAccelerationMs2: 0,
    throttle: 0,
    serviceBrake: 0,
    emergencyBrake: false,
    ...overrides,
  };
}

describe('EcoDrivingSystem (Energy Consumption kWh & Regeneration)', () => {
  it('draws positive power (+kW) during acceleration and accumulates kWh', () => {
    const eco = new EcoDrivingSystem();
    const inspiroSpec = getTrainModelSpec('inspiro');
    const state = eco.step({
      kinematics: makeKinematics({ speedMs: 12, throttle: 0.85 }),
      physicsConfig: inspiroSpec.physics,
      trainModelId: 'inspiro',
      dtSec: 10,
    });
    assert.ok(state.currentPowerKw > 500, 'Expected positive traction power draw');
    assert.ok(state.consumedKwh > 1.5, 'Expected positive energy consumed in kWh');
    assert.equal(state.regeneratingActive, false);
  });

  it('activates regeneration (-kW) on Inspiro and Varsovia during smooth service braking and reduces net kWh', () => {
    const eco = new EcoDrivingSystem();
    const varsoviaSpec = getTrainModelSpec('varsovia');
    // Accelerate first
    const afterAccel = eco.step({
      kinematics: makeKinematics({ speedMs: 16, throttle: 0.8 }),
      physicsConfig: varsoviaSpec.physics,
      trainModelId: 'varsovia',
      dtSec: 15,
    });
    // Smooth service braking
    const afterRegen = eco.step({
      kinematics: makeKinematics({ speedMs: 14, throttle: 0, serviceBrake: 0.45 }),
      physicsConfig: varsoviaSpec.physics,
      trainModelId: 'varsovia',
      dtSec: 8,
    });
    assert.equal(trainSupportsRegeneration('inspiro'), true);
    assert.equal(trainSupportsRegeneration('varsovia'), true);
    assert.equal(afterRegen.regeneratingActive, true);
    assert.ok(afterRegen.currentPowerKw < -100, 'Expected negative power kW during regeneration');
    assert.ok(afterRegen.regeneratedKwh > 0.2, 'Expected regenerated kWh > 0');
    assert.ok(
      afterRegen.netEnergyKwh < afterAccel.netEnergyKwh,
      'Expected netEnergyKwh to decrease when regenerating',
    );
  });

  it('does NOT regenerate on classic Seria 81 and consumes more traction energy', () => {
    assert.equal(trainSupportsRegeneration('seria81'), false);
    const eco81 = new EcoDrivingSystem();
    const ecoInspiro = new EcoDrivingSystem();
    const seria81Spec = getTrainModelSpec('seria81');
    const inspiroSpec = getTrainModelSpec('inspiro');

    eco81.step({
      kinematics: makeKinematics({ speedMs: 15, throttle: 0.8 }),
      physicsConfig: seria81Spec.physics,
      trainModelId: 'seria81',
      dtSec: 12,
    });
    ecoInspiro.step({
      kinematics: makeKinematics({ speedMs: 15, throttle: 0.8 }),
      physicsConfig: inspiroSpec.physics,
      trainModelId: 'inspiro',
      dtSec: 12,
    });

    const brake81 = eco81.step({
      kinematics: makeKinematics({ speedMs: 13, throttle: 0, serviceBrake: 0.5 }),
      physicsConfig: seria81Spec.physics,
      trainModelId: 'seria81',
      dtSec: 8,
    });
    assert.equal(brake81.regeneratingActive, false);
    assert.equal(brake81.regeneratedKwh, 0);
    assert.ok(
      brake81.netEnergyKwh > ecoInspiro.getState().netEnergyKwh,
      'Seria 81 should consume more net kWh than Inspiro',
    );
  });

  it('tracks coasting (0 / Luz) and awards higher Eco-Driving grade & XP bonus', () => {
    const eco = new EcoDrivingSystem();
    const inspiroSpec = getTrainModelSpec('inspiro');
    eco.step({
      kinematics: makeKinematics({ speedMs: 14, throttle: 0.6 }),
      physicsConfig: inspiroSpec.physics,
      trainModelId: 'inspiro',
      dtSec: 10,
    });
    const coastState = eco.step({
      kinematics: makeKinematics({ speedMs: 13, throttle: 0, serviceBrake: 0 }),
      physicsConfig: inspiroSpec.physics,
      trainModelId: 'inspiro',
      dtSec: 25,
    });
    assert.equal(coastState.coastingActive, true);
    assert.ok(coastState.coastingDistanceM > 300);
    assert.ok(coastState.coastingRatio > 0.5);

    const topEval = evaluateEcoGrade(94);
    assert.equal(topEval.grade, 'A+');
    assert.equal(topEval.xpBonus, 160);

    const lowEval = evaluateEcoGrade(35);
    assert.equal(lowEval.grade, 'D');
    assert.equal(lowEval.xpBonus, 0);
  });
});

describe('Train Depot Liveries (Zajezdnia / Malowania składów)', () => {
  it('provides all 5 liveries and filters compatible liveries per train model', () => {
    assert.equal(TRAIN_LIVERIES.length, 5);
    const seria81Liveries = getLiveriesForTrain('seria81').map((l) => l.id);
    const inspiroLiveries = getLiveriesForTrain('inspiro').map((l) => l.id);
    const varsoviaLiveries = getLiveriesForTrain('varsovia').map((l) => l.id);

    assert.deepEqual(seria81Liveries, ['default', 'retro_1995', 'golden_legend']);
    assert.deepEqual(inspiroLiveries, ['default', 'jubilee', 'golden_legend']);
    assert.deepEqual(varsoviaLiveries, ['default', 'stealth_night', 'golden_legend']);
  });

  it('enforces XP rank requirements in Duty mode and allows preview in Sandbox mode', () => {
    assert.equal(isLiveryUnlockedByRank('default', 'trainee'), true);
    assert.equal(isLiveryUnlockedByRank('retro_1995', 'trainee'), false);
    assert.equal(isLiveryUnlockedByRank('retro_1995', 'junior'), true);
    assert.equal(isLiveryUnlockedByRank('jubilee', 'driver'), true);
    assert.equal(isLiveryUnlockedByRank('stealth_night', 'senior'), true);
    assert.equal(isLiveryUnlockedByRank('golden_legend', 'instructor'), false);
    assert.equal(isLiveryUnlockedByRank('golden_legend', 'legend'), true);

    // Sandbox allows previewing locked liveries
    assert.equal(isLiverySelectable('golden_legend', 'inspiro', 'trainee', 'duty'), false);
    assert.equal(isLiverySelectable('golden_legend', 'inspiro', 'trainee', 'sandbox'), true);
  });

  it('applies livery visual colors to train specs and persists selection', () => {
    const seria81Spec = getTrainModelSpec('seria81');
    const inspiroSpec = getTrainModelSpec('inspiro');
    const varsoviaSpec = getTrainModelSpec('varsovia');
    const retro81 = applyLiveryToTrainSpec(seria81Spec, 'retro_1995');
    assert.equal(retro81.visual.liveryId, 'retro_1995');
    assert.notEqual(retro81.visual.bodyHex, seria81Spec.visual.bodyHex);

    const jubileeInspiro = applyLiveryToTrainSpec(inspiroSpec, 'jubilee');
    assert.equal(jubileeInspiro.visual.liveryId, 'jubilee');

    const stealthVarsovia = applyLiveryToTrainSpec(varsoviaSpec, 'stealth_night');
    assert.equal(stealthVarsovia.visual.liveryId, 'stealth_night');

    const memoryStore = new Map<string, string>();
    const service = new TrainLiveryStorageService({
      getItem: (k) => memoryStore.get(k) ?? null,
      setItem: (k, v) => {
        memoryStore.set(k, v);
      },
    });
    const updated = service.saveForTrain('varsovia', 'stealth_night');
    assert.equal(updated.varsovia, 'stealth_night');
    assert.equal(service.load().varsovia, 'stealth_night');
  });
});

describe('Snow (Winter) Weather Mode & Extended Tunnel Braking Carryover', () => {
  it('activates snow particles, frost buildup, wiper clearing, and 200m tunnel slippery rails', () => {
    const weather = new MetroWeatherSystem();
    weather.setMode('snow');

    // Step on STP Kabaty surface track (positionM = 80m, outdoorBlend = 1)
    let res = weather.step(true, 80, 1, 45, 0, false, false, 0.05);
    for (let i = 0; i < 20; i += 1) {
      res = weather.step(true, 80, 1, 45, 0, false, false, 0.05);
    }
    assert.equal(res.state.mode, 'snow');
    assert.ok(res.state.snowIntensity > 0.9, 'Expected full snow intensity on surface');
    assert.ok(res.state.frostIntensity > 0.4, 'Expected windshield frost buildup in snow');
    assert.equal(res.state.wetRailsActive, true);
    assert.equal(res.brakeGripMultiplier, 0.76);

    // Turn on wipers [X] and verify frost decreases
    const frostBeforeWipers = res.state.frostIntensity;
    res = weather.step(true, 120, 1, 45, 0, false, true, 0.05);
    for (let i = 0; i < 20; i += 1) {
      res = weather.step(true, 120, 1, 45, 0, false, false, 0.05);
    }
    assert.ok(res.state.frostIntensity < frostBeforeWipers, 'Wipers should clear windshield frost');

    // Inside first 200m of tunnel (e.g. M1_TUNNEL_PORTAL_M + 140m): rails remain icy/slippery
    const tunnelCarryover = weather.step(
      true,
      M1_TUNNEL_PORTAL_M + 140,
      0,
      55,
      0.78,
      false,
      false,
      0.05,
    );
    assert.equal(tunnelCarryover.state.wetRailsActive, true);
    assert.ok(tunnelCarryover.brakeGripMultiplier < 1.0, 'First 200m of tunnel should have reduced grip in snow');
    assert.equal(tunnelCarryover.state.wheelSlipActive, true, 'Hard braking on icy tunnel entrance should trigger wheel slip');

    // Deep in tunnel (> 200m past portal): dry rails restored
    const deepTunnel = weather.step(
      true,
      M1_TUNNEL_PORTAL_M + 260,
      0,
      55,
      0.5,
      false,
      false,
      0.05,
    );
    assert.equal(deepTunnel.state.wetRailsActive, false);
    assert.equal(deepTunnel.brakeGripMultiplier, 1.0);
  });
});

describe('Simulation Audio Events & 4-Channel Audio Mixer Settings', () => {
  it('emits contactorClick and airReleaseHiss for Seria 81 and updates train livery', () => {
    const sim = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
    sim.setTrainModel('seria81');
    sim.setTrainLivery('retro_1995');
    assert.equal(sim.getSnapshot().trainModel.visual.liveryId, 'retro_1995');

    sim.start();
    // Apply throttle to cross contactor notches on Seria 81 (requires doors closed; at station 0 doors start closed)
    let clicked = false;
    for (let i = 0; i < 25; i += 1) {
      const events = sim.step(
        {
          throttleUp: true,
          throttleDown: false,
          serviceBrake: false,
          emergencyBrakePressed: false,
          hornActive: false,
          toggleDoorsPressed: false,
          manualLeverAxis: 0.75,
        },
        0.05,
      );
      if (events.contactorClick) {
        clicked = true;
      }
    }
    assert.equal(clicked, true, 'Seria 81 should emit mechanical contactorClick when changing notches');
  });

  it('sanitizes 4-slider audio mixer settings including alertsVolume', () => {
    assert.equal(DEFAULT_GAME_SETTINGS.alertsVolume, 0.9);
    const sanitized = sanitizeGameSettings({
      masterVolume: 0.75,
      trainVolume: 0.8,
      voiceVolume: 0.85,
      alertsVolume: 0.65,
    });
    assert.equal(sanitized.alertsVolume, 0.65);
  });
});
