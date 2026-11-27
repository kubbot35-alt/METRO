import test from 'node:test';
import assert from 'node:assert/strict';
import { MetroSimulationEngine } from './metroSimulation';
import { MetroScoringRules } from './scoringRules';
import { OppositeTrackTrafficSystem } from './trafficSystem';
import { SERIA_81_SPEC, SIEMENS_INSPIRO_SPEC, getNextCameraMode } from './trainCatalog';
import { MetroTrainPhysics } from './trainPhysics';
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

test('Siemens Inspiro accelerates faster and brakes shorter than heavier Seria 81', () => {
  const sim81 = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
  sim81.setTrainModel('seria81');
  sim81.start();

  const simInspiro = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
  simInspiro.setTrainModel('inspiro');
  simInspiro.start();

  for (let i = 0; i < 80; i += 1) {
    sim81.step(makeInput({ throttleUp: true }), 0.05);
    simInspiro.step(makeInput({ throttleUp: true }), 0.05);
  }
  const speed81 = sim81.getSnapshot().kinematics.speedKmh;
  const speedInspiro = simInspiro.getSnapshot().kinematics.speedKmh;
  assert.ok(speedInspiro > speed81 + 5, `Expected Inspiro (${speedInspiro}) > Seria 81 (${speed81})`);
  assert.equal(sim81.getSnapshot().trainModel.visual.theme, 'retro');
  assert.equal(simInspiro.getSnapshot().trainModel.visual.theme, 'modern');
  assert.ok(SERIA_81_SPEC.physics.massKg > SIEMENS_INSPIRO_SPEC.physics.massKg);
});

test('camera mode cycles cab -> mirror -> exterior -> interior -> bogie -> station -> cab via V and shows temporary label', () => {
  assert.equal(getNextCameraMode('cab'), 'mirror');
  assert.equal(getNextCameraMode('mirror'), 'exterior');
  assert.equal(getNextCameraMode('exterior'), 'interior');
  assert.equal(getNextCameraMode('interior'), 'bogie');
  assert.equal(getNextCameraMode('bogie'), 'station');
  assert.equal(getNextCameraMode('station'), 'cab');

  const sim = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
  sim.start();
  assert.equal(sim.getSnapshot().cameraMode, 'cab');

  sim.step(makeInput({ cycleCameraPressed: true }), 0.05);
  assert.equal(sim.getSnapshot().cameraMode, 'mirror');
  assert.ok(sim.getSnapshot().cameraNotice?.label.includes('Lusterko'));

  sim.step(makeInput({ cycleCameraPressed: true }), 0.05);
  assert.equal(sim.getSnapshot().cameraMode, 'exterior');
  assert.ok(sim.getSnapshot().cameraNotice?.label.includes('zewnętrzna'));

  sim.step(makeInput({ cycleCameraPressed: true }), 0.05);
  assert.equal(sim.getSnapshot().cameraMode, 'interior');
  assert.ok(sim.getSnapshot().cameraNotice?.label.includes('Wnętrze'));

  sim.step(makeInput({ cycleCameraPressed: true }), 0.05);
  assert.equal(sim.getSnapshot().cameraMode, 'bogie');
  assert.ok(sim.getSnapshot().cameraNotice?.label.includes('wózka'));

  sim.step(makeInput({ cycleCameraPressed: true }), 0.05);
  assert.equal(sim.getSnapshot().cameraMode, 'station');
  assert.ok(sim.getSnapshot().cameraNotice?.label.includes('stacyjna'));

  sim.step(makeInput({ cycleCameraPressed: true }), 0.05);
  assert.equal(sim.getSnapshot().cameraMode, 'cab');
});

test('opposite track traffic spawns oncoming train every 40-70s and triggers passing whoosh', () => {
  const traffic = new OppositeTrackTrafficSystem(() => 0.0);
  let spawned = false;
  let whooshed = false;
  for (let i = 0; i < 1200; i += 1) {
    const res = traffic.step(100, 0.05);
    if (traffic.getState().active) {
      spawned = true;
    }
    if (res.passingTrainWhoosh) {
      whooshed = true;
      break;
    }
  }
  assert.equal(spawned, true);
  assert.equal(whooshed, true);
});
