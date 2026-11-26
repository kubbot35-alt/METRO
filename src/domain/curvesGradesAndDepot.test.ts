import assert from 'node:assert/strict';
import test from 'node:test';
import { LINE_M1_STATIONS, LINE_M2_STATIONS } from './routeData';
import {
  getLineTrackAlignment,
  M1_SURFACE_ELEVATION_M,
  M1_TUNNEL_PORTAL_M,
} from './trackAlignment';
import { createInitialKinematics, MetroTrainPhysics } from './trainPhysics';
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

test('stations remain strictly straight and level while inter-station tunnels curve and change elevation', () => {
  const m1 = getLineTrackAlignment('M1', LINE_M1_STATIONS);
  const m2 = getLineTrackAlignment('M2', LINE_M2_STATIONS);

  for (const [alignment, stations] of [
    [m1, LINE_M1_STATIONS],
    [m2, LINE_M2_STATIONS],
  ] as const) {
    for (const s of stations) {
      const startSample = alignment.sample(s.distanceM - 98);
      const midSample = alignment.sample(s.distanceM);
      const endSample = alignment.sample(s.distanceM + 28);
      assert.equal(Math.abs(startSample.curvatureRadPerM) < 1e-6, true);
      assert.equal(Math.abs(midSample.curvatureRadPerM) < 1e-6, true);
      assert.equal(Math.abs(endSample.curvatureRadPerM) < 1e-6, true);
      assert.equal(Math.abs(startSample.gradePercent) < 1e-4, true);
      assert.equal(Math.abs(midSample.gradePercent) < 1e-4, true);
      assert.equal(Math.abs(endSample.gradePercent) < 1e-4, true);
      assert.ok(Math.abs(startSample.yaw - endSample.yaw) < 1e-5);
      assert.ok(Math.abs(startSample.y - endSample.y) < 1e-4);
    }
  }

  // Verify curves and grades exist between stations
  const curveMid = m1.curveZones[0];
  assert.ok(curveMid, 'M1 should have inter-station curve zones');
  const midCurveSample = m1.sample((curveMid.startM + curveMid.endM) * 0.5);
  assert.ok(Math.abs(midCurveSample.curvatureRadPerM) > 0.002);
  assert.ok(Math.abs(midCurveSample.cantRollRad) > 0.015);
  assert.equal(m1.getCurveSpeedLimitAt((curveMid.startM + curveMid.endM) * 0.5), 45);
});

test('gravity physics slows uphill acceleration/coasting and accelerates downhill coasting', () => {
  const physics = new MetroTrainPhysics();
  let flatState = { ...createInitialKinematics(), speedMs: 12, speedKmh: 12 * 3.6 };
  let uphillState = { ...flatState };
  let downhillState = { ...flatState };

  // Coast for 4 seconds on flat, +3.0% uphill, and -3.0% downhill
  for (let i = 0; i < 80; i += 1) {
    flatState = physics.step(flatState, neutralInput(), false, 0.05, 0);
    uphillState = physics.step(uphillState, neutralInput(), false, 0.05, 0.03);
    downhillState = physics.step(downhillState, neutralInput(), false, 0.05, -0.03);
  }

  assert.ok(uphillState.speedKmh < flatState.speedKmh - 2.5, 'uphill should lose speed significantly faster');
  assert.ok(downhillState.speedKmh > flatState.speedKmh + 2.5, 'downhill should gain speed automatically');
  assert.ok(downhillState.speedKmh > 12 * 3.6 + 1.5, 'downhill coast should accelerate past initial speed');

  // Full throttle acceleration uphill vs flat
  let accelFlat = createInitialKinematics();
  let accelUphill = createInitialKinematics();
  for (let i = 0; i < 100; i += 1) {
    accelFlat = physics.step(accelFlat, neutralInput({ throttleUp: true }), false, 0.05, 0);
    accelUphill = physics.step(accelUphill, neutralInput({ throttleUp: true }), false, 0.05, 0.03);
  }
  assert.ok(accelUphill.speedKmh < accelFlat.speedKmh - 2.0, 'uphill should accelerate slower than flat');
});

test('M1 starts outdoors at STP Kabaty and descends through tunnel portal at 300 m while M2 starts underground', () => {
  const m1 = getLineTrackAlignment('M1', LINE_M1_STATIONS);
  const m2 = getLineTrackAlignment('M2', LINE_M2_STATIONS);

  const m1Start = m1.sample(0);
  const m1Ramp = m1.sample(M1_TUNNEL_PORTAL_M);
  const m1Tunnel = m1.sample(420);
  const m1Kabaty = m1.sample(600);

  assert.equal(m1.hasSurfaceStart, true);
  assert.equal(m1.tunnelPortalDistanceM, M1_TUNNEL_PORTAL_M);
  assert.equal(m1Start.outdoorBlend, 1);
  assert.ok(Math.abs(m1Start.y - M1_SURFACE_ELEVATION_M) < 0.05);
  assert.ok(m1Ramp.gradePercent < -1.0, 'train should be descending through the tunnel portal at 300 m');
  assert.equal(m1Tunnel.outdoorBlend, 0, 'train should be fully in tunnel lighting after portal');
  assert.ok(Math.abs(m1Kabaty.y) < 0.15, 'Kabaty station should sit near underground baseline Y=0');

  const m2Start = m2.sample(0);
  assert.equal(m2.hasSurfaceStart, false);
  assert.equal(m2Start.outdoorBlend, 0);
});
