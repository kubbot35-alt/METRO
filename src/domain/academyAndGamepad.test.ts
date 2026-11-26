import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AchievementService, type IAchievementStorage } from './achievements';
import { DriverProfileService, type IDriverProfileStorage } from './driverProfile';
import {
  applyDeadzone,
  classifyGamepadBrand,
  GAMEPAD_BUTTON_MAPPINGS,
  sampleGamepadState,
  type IRawGamepadButton,
  type IRawGamepadLike,
} from './gamepadMapping';
import { MetroSimulationEngine } from './metroSimulation';
import { MetroScoringRules } from './scoringRules';
import { SettingsStorageService, type ISettingsStorage } from './settingsService';
import { MetroTrainPhysics } from './trainPhysics';
import type { IControlInput } from './types';

function makeMemoryStorage(): IAchievementStorage & IDriverProfileStorage & ISettingsStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

function makeInput(overrides: Partial<IControlInput> = {}): IControlInput {
  return {
    throttleUp: false,
    throttleDown: false,
    serviceBrake: false,
    emergencyBrakePressed: false,
    toggleDoorsPressed: false,
    toggleDoorsLeftPressed: false,
    toggleDoorsRightPressed: false,
    toggleHeadlightsPressed: false,
    toggleWipersPressed: false,
    acknowledgeCzuwakPressed: false,
    acknowledgeRadioPressed: false,
    cycleCameraPressed: false,
    manualLeverAxis: null,
    hornActive: false,
    ...overrides,
  };
}

function makeGamepad(
  overrides: {
    id?: string;
    axes?: number[];
    buttonValues?: Record<number, { pressed: boolean; value: number }>;
  } = {},
): IRawGamepadLike {
  const buttons: IRawGamepadButton[] = Array.from({ length: 16 }, (_, idx) => {
    const custom = overrides.buttonValues?.[idx];
    return custom ?? { pressed: false, value: 0 };
  });
  return {
    id: overrides.id ?? 'Xbox Wireless Controller (STANDARD GAMEPAD)',
    connected: true,
    axes: overrides.axes ?? [0, 0, 0, 0],
    buttons,
  };
}

describe('Akademia Maszynisty (5-step interactive tutorial)', () => {
  it('completes all 5 steps end-to-end, unlocks Licencja Maszynisty, and awards +250 XP', () => {
    const sim = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
    sim.setGameMode('academy');
    sim.start();

    let snap = sim.getSnapshot();
    assert.equal(snap.gameMode, 'academy');
    assert.equal(snap.line.id, 'ACADEMY');
    assert.equal(snap.stations.length, 2);
    assert.equal(snap.headlightsOn, false);
    assert.equal(snap.academy?.currentStep, 1);
    assert.equal(snap.academy?.highlightTarget, 'headlights');

    // Step 1a: turn on headlights
    sim.step(makeInput({ toggleHeadlightsPressed: true }), 0.05);
    snap = sim.getSnapshot();
    assert.equal(snap.headlightsOn, true);
    assert.equal(snap.academy?.currentStep, 1);
    assert.equal(snap.academy?.highlightTarget, 'horn');

    // Step 1b: sound horn -> advances to Step 2
    const step1DoneAudio = sim.step(makeInput({ hornActive: true }), 0.05);
    assert.equal(step1DoneAudio.academyStepCompleted, true);
    snap = sim.getSnapshot();
    assert.equal(snap.academy?.currentStep, 2);
    assert.equal(snap.academy?.highlightTarget, 'throttle');

    // Step 2: accelerate smoothly below 60 km/h
    for (let i = 0; i < 240 && sim.getSnapshot().academy?.currentStep === 2; i += 1) {
      const speed = sim.getSnapshot().kinematics.speedKmh;
      sim.step(makeInput({ throttleUp: speed < 36 }), 0.05);
    }
    snap = sim.getSnapshot();
    assert.equal(snap.academy?.currentStep, 3);
    assert.equal(snap.academy?.highlightTarget, 'signal');

    // Step 3: pass yellow (220 m), stop cleanly before red (430 m), wait for green
    for (let i = 0; i < 650 && sim.getSnapshot().academy?.currentStep === 3; i += 1) {
      const s = sim.getSnapshot();
      const pos = s.kinematics.positionM;
      const spd = s.kinematics.speedKmh;
      if (pos < 350) {
        sim.step(makeInput({ throttleUp: spd < 26, serviceBrake: spd > 28 }), 0.05);
      } else {
        sim.step(makeInput({ serviceBrake: spd > 0.1 }), 0.05);
      }
    }
    snap = sim.getSnapshot();
    assert.equal(snap.academy?.currentStep, 4);

    // Step 4a: Academy triggers Czuwak automatically; acknowledge with [C]
    for (let i = 0; i < 20 && !sim.getSnapshot().czuwak.active; i += 1) {
      sim.step(makeInput(), 0.05);
    }
    assert.equal(sim.getSnapshot().czuwak.active, true);
    sim.step(makeInput({ acknowledgeCzuwakPressed: true }), 0.05);
    assert.equal(sim.getSnapshot().czuwak.active, false);

    // Step 4b: Academy triggers Radio automatically; acknowledge with [R]
    for (let i = 0; i < 50 && !sim.getSnapshot().radio.active; i += 1) {
      sim.step(makeInput(), 0.05);
    }
    assert.equal(sim.getSnapshot().radio.active, true);
    sim.step(makeInput({ acknowledgeRadioPressed: true }), 0.05);
    snap = sim.getSnapshot();
    assert.equal(snap.academy?.currentStep, 5);

    // Step 5: approach Station 1 (680 m, Island [Q]), stop in stop zone
    for (let i = 0; i < 900; i += 1) {
      const s = sim.getSnapshot();
      const dist = s.currentStation.distanceToTargetM;
      const spd = s.kinematics.speedKmh;
      if (s.currentStation.inStopZone && spd <= 0.15) {
        break;
      }
      if (dist > 60) {
        sim.step(makeInput({ throttleUp: spd < 38 }), 0.05);
      } else if (dist > 14) {
        sim.step(makeInput({ throttleUp: spd < 12, serviceBrake: spd > 16 }), 0.05);
      } else {
        sim.step(makeInput({ serviceBrake: spd > 0.05 }), 0.05);
      }
    }
    snap = sim.getSnapshot();
    assert.equal(snap.currentStation.inStopZone, true);
    assert.equal(snap.canToggleDoors, true);
    assert.equal(snap.academy?.highlightTarget, 'doors-left');

    // Open left doors [Q], wait for boarding completion, close doors [Q]
    sim.step(makeInput({ toggleDoorsLeftPressed: true }), 0.05);
    assert.equal(sim.getSnapshot().doorState, 'open');
    for (let i = 0; i < 80 && !sim.getSnapshot().boardingCompletedForCurrent; i += 1) {
      sim.step(makeInput(), 0.05);
    }
    assert.equal(sim.getSnapshot().boardingCompletedForCurrent, true);

    const finishAudio = sim.step(makeInput({ toggleDoorsLeftPressed: true }), 0.05);
    assert.equal(finishAudio.academyStepCompleted, true);
    snap = sim.getSnapshot();
    assert.equal(snap.academy?.completed, true);
    assert.equal(snap.phase, 'gameover');

    // Verify achievement & XP bonus
    const storage = makeMemoryStorage();
    const achievements = new AchievementService(storage);
    const unlocked = achievements.evaluateAndUnlock(snap);
    assert.ok(unlocked.some((a) => a.id === 'academy_license'));

    const profileService = new DriverProfileService(storage);
    const career = profileService.recordCompletedCourse(snap);
    assert.equal(career.reward.gainedXp, 250);
    assert.equal(career.profile.xp, 250);
  });
});

describe('Gamepad API mapping, deadzone & vibration setting', () => {
  it('applies 0.1 deadzone and normalizes analog input smoothly', () => {
    assert.equal(applyDeadzone(0.05), 0);
    assert.equal(applyDeadzone(-0.09), 0);
    assert.equal(applyDeadzone(1.0), 1);
    assert.equal(applyDeadzone(-1.0), -1);
    const mid = applyDeadzone(0.55);
    assert.ok(mid > 0.45 && mid < 0.55);
  });

  it('classifies Xbox, PlayStation, and generic controllers', () => {
    assert.equal(classifyGamepadBrand('Xbox Series X Controller'), 'xbox');
    assert.equal(classifyGamepadBrand('DualSense Wireless Controller (Sony 054c)'), 'playstation');
    assert.equal(classifyGamepadBrand('Generic USB Gamepad'), 'generic');
  });

  it('maps triggers, left stick, and edge-triggered buttons accurately', () => {
    // RT throttle & LB left doors + A czuwak + X radio + D-pad horn
    const pad1 = makeGamepad({
      buttonValues: {
        7: { pressed: true, value: 0.75 },
        4: { pressed: true, value: 1 },
        0: { pressed: true, value: 1 },
        2: { pressed: true, value: 1 },
        14: { pressed: true, value: 1 },
      },
    });
    const res1 = sampleGamepadState(pad1, [], false);
    assert.ok(res1.analogLeverAxis !== null && res1.analogLeverAxis > 0.65);
    assert.equal(res1.analogActive, true);
    assert.equal(res1.toggleDoorsLeftPressed, true);
    assert.equal(res1.acknowledgeCzuwakPressed, true);
    assert.equal(res1.acknowledgeRadioPressed, true);
    assert.equal(res1.hornActive, true);

    // Holding the same buttons on next frame must NOT re-trigger edge events
    const res2 = sampleGamepadState(pad1, res1.nextButtons, res1.analogActive);
    assert.equal(res2.toggleDoorsLeftPressed, false);
    assert.equal(res2.acknowledgeCzuwakPressed, false);
    assert.equal(res2.acknowledgeRadioPressed, false);
    assert.equal(res2.hornActive, true);

    // Releasing analog triggers resets lever to 0 once, then yields null
    const padNeutral = makeGamepad();
    const res3 = sampleGamepadState(padNeutral, res2.nextButtons, res2.analogActive);
    assert.equal(res3.analogLeverAxis, 0);
    assert.equal(res3.analogActive, false);
    const res4 = sampleGamepadState(padNeutral, res3.nextButtons, res3.analogActive);
    assert.equal(res4.analogLeverAxis, null);

    // Left stick Y pushed up (-0.8) -> positive throttle, LT brake overrides negative
    const padStick = makeGamepad({ axes: [0, -0.8, 0, 0] });
    const resStick = sampleGamepadState(padStick, [], false);
    assert.ok(resStick.analogLeverAxis !== null && resStick.analogLeverAxis > 0.7);

    // Full mapping catalog exists
    assert.ok(GAMEPAD_BUTTON_MAPPINGS.length >= 12);
  });

  it('persists gamepadVibration in SettingsStorageService', () => {
    const storage = makeMemoryStorage();
    const service = new SettingsStorageService(storage);
    assert.equal(service.load().gamepadVibration, true);
    const saved = service.save({ ...service.load(), gamepadVibration: false });
    assert.equal(saved.gamepadVibration, false);
    assert.equal(service.load().gamepadVibration, false);
  });
});
