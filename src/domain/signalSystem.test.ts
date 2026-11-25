import test from 'node:test';
import assert from 'node:assert/strict';
import { SEMAPHORE_DISTANCES_M, TunnelSignalSystem } from './signalSystem';

test('semaphores are placed every ~250-300m and before station entrances', () => {
  assert.ok(SEMAPHORE_DISTANCES_M.length >= 10);
  for (let i = 1; i < SEMAPHORE_DISTANCES_M.length; i += 1) {
    const gap = SEMAPHORE_DISTANCES_M[i] - SEMAPHORE_DISTANCES_M[i - 1];
    assert.ok(gap >= 230 && gap <= 320, `gap ${gap}m should stay near 250-300m`);
  }
  assert.ok(SEMAPHORE_DISTANCES_M.includes(495), 'has home signal before Station 1');
});

test('red semaphore sets preceding semaphore to yellow caution', () => {
  const rolls = [0.5, 0.5, 0.5, 0.9, 0.1, 0.9];
  let idx = 0;
  const rng = (): number => rolls[idx++ % rolls.length];
  const system = new TunnelSignalSystem([250, 500, 750], rng);
  const signals = system.getSignals();
  assert.equal(signals[0].aspect, 'yellow');
  assert.equal(signals[1].aspect, 'red');
  assert.equal(signals[2].aspect, 'green');
});

test('yellow semaphore enforces 30 km/h caution limit', () => {
  const rolls = [0.0, 0.0, 0.9, 0.1];
  let idx = 0;
  const system = new TunnelSignalSystem([250, 500], () => rolls[idx++ % rolls.length]);
  const approach = system.step(140, 150, 50, 0.05);
  assert.equal(approach.activeCautionLimitKmh, 30);
  const passed = system.step(248, 255, 25, 0.05);
  assert.equal(passed.activeCautionLimitKmh, 30);
});

test('stopping before red semaphore clears to green after 5-8 seconds', () => {
  const rolls = [0.0, 0.1];
  let idx = 0;
  const system = new TunnelSignalSystem([250], () => rolls[idx++ % rolls.length]);
  assert.equal(system.getNextSignal(200)?.aspect, 'red');

  let cleared = false;
  for (let i = 0; i < 110; i += 1) {
    const res = system.step(220, 220, 0, 0.05);
    if (res.clearedToGreen) {
      cleared = true;
      break;
    }
  }
  assert.equal(cleared, true);
  assert.equal(system.getNextSignal(220)?.aspect, 'green');
});

test('passing a red semaphore triggers SPAD violation', () => {
  const rolls = [0.0, 0.1];
  let idx = 0;
  const system = new TunnelSignalSystem([250], () => rolls[idx++ % rolls.length]);
  const res = system.step(248, 253, 40, 0.05);
  assert.equal(res.redSignalViolated, true);
});
