import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MetroSimulationEngine } from './metroSimulation';
import {
  MAX_PHOTO_FOV_DEG,
  MAX_PHOTO_TILT_DEG,
  MIN_PHOTO_FOV_DEG,
  MIN_PHOTO_TILT_DEG,
  PHOTO_FILTERS,
  PhotoCameraController,
  getPhotoFilterSpec,
} from './photoMode';
import { MetroScoringRules } from './scoringRules';
import { getTrainModelSpec, SERIA_81_SPEC, SKODA_VARSOVIA_SPEC, TRAIN_CATALOG } from './trainCatalog';
import { MetroTrainPhysics } from './trainPhysics';

const IDLE_INPUT = {
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
} as const;

describe('Škoda Varsovia catalog and physics', () => {
  it('registers Škoda Varsovia as the third playable train with regenerative audio & physics', () => {
    assert.equal(TRAIN_CATALOG.length, 3);
    assert.deepEqual(
      TRAIN_CATALOG.map((m) => m.id),
      ['seria81', 'inspiro', 'varsovia'],
    );
    const spec = getTrainModelSpec('varsovia');
    assert.equal(spec.id, 'varsovia');
    assert.equal(spec.visual.theme, 'varsovia');
    assert.equal(spec.audio.waveMain, 'sine');
    assert.equal(spec.audio.regenerativeHum, true);
    assert.ok((spec.audio.brakeSquealScale ?? 1) < 0.25);
    assert.ok(spec.physics.maxServiceBrakeForceN > SERIA_81_SPEC.physics.maxServiceBrakeForceN);
  });

  it('accelerates smoothly and brakes cleanly in MetroSimulationEngine', () => {
    const sim = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
    sim.setTrainModel('varsovia');
    sim.start();
    assert.equal(sim.getSnapshot().trainModel.id, SKODA_VARSOVIA_SPEC.id);

    for (let i = 0; i < 60; i += 1) {
      sim.step({ ...IDLE_INPUT, throttleUp: true }, 0.05);
    }
    const peakSpeed = sim.getSnapshot().kinematics.speedKmh;
    assert.ok(peakSpeed > 12, `Expected Škoda Varsovia to accelerate cleanly, got ${peakSpeed}`);

    for (let i = 0; i < 80; i += 1) {
      sim.step({ ...IDLE_INPUT, serviceBrake: true }, 0.05);
    }
    const afterBrake = sim.getSnapshot().kinematics.speedKmh;
    assert.ok(afterBrake < peakSpeed * 0.4, `Expected strong smooth regenerative braking, got ${afterBrake}`);
  });
});

describe('PhotoCameraController', () => {
  it('initializes from pose, flies in 3D with WASD/QE/Shift, clamps bounds, and resets cleanly', () => {
    const ctrl = new PhotoCameraController();
    const init = ctrl.initializeFromPose(4.5, 3.0, -10.0, 0, 0, 58);
    assert.equal(init.fovDeg, 58);
    assert.equal(init.rollDeg, 0);

    // Move forward (-Z when yaw=0, pitch=0) and up (+Y)
    const moved = ctrl.stepMovement(
      { forward: true, backward: false, left: false, right: false, up: true, down: false, boost: true },
      0.1,
    );
    assert.ok(moved.z < init.z, 'Forward movement should advance along -Z at yaw=0');
    assert.ok(moved.y > init.y, 'E / up movement should raise camera altitude');

    // Look delta rotates yaw & clamps pitch
    const looked = ctrl.applyLookDelta(100, -10000);
    assert.ok(looked.yaw < 0);
    assert.ok(looked.pitch <= 1.4 && looked.pitch >= -1.4);

    // Reset restores exact initial pose
    const reset = ctrl.resetToInitial();
    assert.equal(reset.x, init.x);
    assert.equal(reset.y, init.y);
    assert.equal(reset.z, init.z);
    assert.equal(reset.yaw, init.yaw);
    assert.equal(reset.fovDeg, init.fovDeg);
  });

  it('clamps FOV, Tilt, wheel zoom, and switches across all 4 color filters', () => {
    const ctrl = new PhotoCameraController();
    assert.equal(ctrl.setFov(10).fovDeg, MIN_PHOTO_FOV_DEG);
    assert.equal(ctrl.setFov(180).fovDeg, MAX_PHOTO_FOV_DEG);
    assert.equal(ctrl.applyWheelZoom(-120).fovDeg, MAX_PHOTO_FOV_DEG - 3);

    assert.equal(ctrl.setTilt(-90).rollDeg, MIN_PHOTO_TILT_DEG);
    assert.equal(ctrl.setTilt(90).rollDeg, MAX_PHOTO_TILT_DEG);
    assert.equal(ctrl.setTilt(12).rollDeg, 12);

    assert.equal(PHOTO_FILTERS.length, 4);
    for (const preset of PHOTO_FILTERS) {
      const updated = ctrl.setFilter(preset.id);
      assert.equal(updated.filter, preset.id);
      assert.equal(getPhotoFilterSpec(preset.id).label, preset.label);
    }
  });
});
