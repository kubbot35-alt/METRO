import test from 'node:test';
import assert from 'node:assert/strict';
import { MetroTrainPhysics, createInitialKinematics } from './trainPhysics';
import type { IControlInput } from './types';

function neutralInput(overrides: Partial<IControlInput> = {}): IControlInput {
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

test('train accelerates smoothly with inertia when throttle is applied', () => {
  const physics = new MetroTrainPhysics();
  let state = createInitialKinematics();
  for (let i = 0; i < 60; i += 1) {
    state = physics.step(state, neutralInput({ throttleUp: true }), false, 0.05);
  }
  assert.ok(state.throttle > 0.9, 'throttle should ramp up');
  assert.ok(state.speedKmh > 10 && state.speedKmh < 30, 'heavy metro accelerates gradually');
  assert.ok(state.positionM > 3.5, 'train moves forward');
});

test('train coasts slowly due to inertia when throttle is released', () => {
  const physics = new MetroTrainPhysics();
  let state = { ...createInitialKinematics(), speedMs: 15, speedKmh: 54 };
  state = physics.step(state, neutralInput(), false, 0.05);
  assert.ok(state.speedMs < 15 && state.speedMs > 14.9, 'coasting loses speed gradually');
});

test('service brake and emergency brake decelerate faster than coasting', () => {
  const physics = new MetroTrainPhysics();
  const base = { ...createInitialKinematics(), speedMs: 16, speedKmh: 57.6 };
  let service = base;
  let emergency = physics.step(base, neutralInput({ emergencyBrakePressed: true }), false, 0.05);
  for (let i = 0; i < 20; i += 1) {
    service = physics.step(service, neutralInput({ serviceBrake: true }), false, 0.05);
    emergency = physics.step(emergency, neutralInput(), false, 0.05);
  }
  assert.ok(service.speedMs < base.speedMs - 1.0, 'service brake slows train');
  assert.ok(emergency.speedMs < service.speedMs, 'emergency brake decelerates faster');
});

test('open doors interlock prevents throttle acceleration', () => {
  const physics = new MetroTrainPhysics();
  let state = createInitialKinematics();
  for (let i = 0; i < 20; i += 1) {
    state = physics.step(state, neutralInput({ throttleUp: true }), true, 0.05);
  }
  assert.equal(state.throttle, 0);
  assert.equal(state.speedKmh, 0);
});
