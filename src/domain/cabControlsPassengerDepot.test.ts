import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CAB_CONTROLS_CATALOG,
  computeCabLampStates,
  formatCabControlLabel,
} from './cabControlsCatalog';
import {
  DEPOT_HALL_BAY_LATERAL_X_M,
  DEPOT_HALL_SPEED_LIMIT_KMH,
  DEPOT_HALL_START_M,
  DEPOT_TURNOUT_END_M,
  DEPOT_TURNOUT_START_M,
  DEPOT_WASH_END_M,
  DEPOT_WASH_START_M,
  computeDepotZoneState,
  evaluateDepotHallLateralX,
  evaluateDepotHallYawRad,
} from './depotHallSystem';
import { MetroSimulationEngine } from './metroSimulation';
import {
  PASSENGER_CAR_COUNT,
  PASSENGER_CAR_PITCH_M,
  clampPassengerCarIndex,
  resolvePassengerCameraAnchor,
} from './passengerViewModel';
import { METRO_LINE_M1, METRO_LINE_M2 } from './routeData';
import { MetroScoringRules } from './scoringRules';
import { TrackAlignment } from './trackAlignment';
import { MetroTrainPhysics } from './trainPhysics';
import {
  TRAINSPOTTING_WALK_MAX_M,
  TRAINSPOTTING_WALK_MIN_M,
  buildTrainspottingSpots,
  clampTrainspottingWalkOffset,
  pickDefaultTrainspottingSpotIndex,
} from './trainspottingSystem';
import type { IControlInput } from './types';

function createIdleInput(): IControlInput {
  return {
    throttleUp: false, throttleDown: false, serviceBrake: false, emergencyBrakePressed: false,
    toggleDoorsPressed: false, toggleDoorsLeftPressed: false, toggleDoorsRightPressed: false,
    toggleHeadlightsPressed: false, toggleCabLightPressed: false, toggleWipersPressed: false,
    toggleAtoPressed: false, acknowledgeCzuwakPressed: false, acknowledgeRadioPressed: false,
    cycleCameraPressed: false, hornActive: false,
  };
}

describe('Interactive 3D Cab Controls & Lamp State Engine', () => {
  it('exposes all 8 desk controls with localized PL and EN labels', () => {
    assert.equal(CAB_CONTROLS_CATALOG.length, 8);
    assert.equal(formatCabControlLabel('doors_left', 'pl'), 'Drzwi lewe [Q]');
    assert.equal(formatCabControlLabel('doors_left', 'en'), 'Left doors [Q]');
    assert.equal(formatCabControlLabel('intercom', 'en'), 'Passenger Intercom (PA) [I]');
  });

  it('lights and blinks 3D lamps according to doors, lights, wipers, horn, and emergency/SOP-2 state', () => {
    const sim = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
    sim.start();
    const base = sim.getSnapshot();
    const normalLamps = computeCabLampStates(base, 0.2);
    assert.equal(normalLamps.lights.active, true);
    assert.equal(normalLamps.emergency.active, false);

    const alarmSnap = {
      ...base,
      doorState: 'open' as const,
      openDoorSide: 'left' as const,
      hornActive: true,
      sop2: { ...base.sop2, status: 'intervention' as const, interventionActive: true },
    };
    const alarmLamps = computeCabLampStates(alarmSnap, 0.15);
    assert.equal(alarmLamps.doors_left.active, true);
    assert.equal(alarmLamps.doors_right.active, false);
    assert.equal(alarmLamps.emergency.active, true);
    assert.equal(alarmLamps.horn.active, true);
  });
});

describe('Passenger 6-Car Saloon & Trainspotting Observer Modes', () => {
  it('resolves distinct camera anchors for L/R windows, Cars 1..6, and behind-cab glass view', () => {
    assert.equal(PASSENGER_CAR_COUNT, 6);
    assert.equal(clampPassengerCarIndex(-3), 0);
    assert.equal(clampPassengerCarIndex(99), 5);
    const car1Left = resolvePassengerCameraAnchor({ seatId: 'window_left', carIndex: 0 });
    const car6Right = resolvePassengerCameraAnchor({ seatId: 'window_right', carIndex: 5 });
    const behindCab = resolvePassengerCameraAnchor({ seatId: 'behind_cab', carIndex: 3 });

    assert.ok(car1Left.eyeLateralM < 0);
    assert.ok(car6Right.eyeLateralM > 0);
    assert.equal(car6Right.carShiftBackM, 5 * PASSENGER_CAR_PITCH_M);
    assert.equal(behindCab.carShiftBackM, 0);
    assert.equal(behindCab.eyeLateralM, 0);
    assert.ok(behindCab.eyeBackFromLeadM < 3);
  });

  it('builds trainspotting spots for M1 (with STP Kabaty) and M2, and keeps dual-track AI running', () => {
    const m1Spots = buildTrainspottingSpots(METRO_LINE_M1, METRO_LINE_M1.stations);
    const m2Spots = buildTrainspottingSpots(METRO_LINE_M2, METRO_LINE_M2.stations);
    assert.equal(m1Spots[0].isDepot, true);
    assert.equal(m2Spots[0].isDepot, false);
    const defaultIdx = pickDefaultTrainspottingSpotIndex(m1Spots);
    assert.equal(m1Spots[defaultIdx].namePl, 'Centrum');
    assert.equal(clampTrainspottingWalkOffset(-200), TRAINSPOTTING_WALK_MIN_M);
    assert.equal(clampTrainspottingWalkOffset(200), TRAINSPOTTING_WALK_MAX_M);

    const sim = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
    sim.setGameMode('trainspotting');
    sim.start();
    for (let i = 0; i < 10; i += 1) sim.step(createIdleInput(), 0.05);
    const snap = sim.getSnapshot();
    assert.equal(snap.gameMode, 'trainspotting');
    assert.equal(snap.trainspotting.active, true);
    assert.equal(snap.leadingTrain.active, true);
    assert.equal(snap.oncomingTrain.active, true);
  });
});

describe('Expanded STP Kabaty Stabling Hall, Turnout & Automatic Train Wash', () => {
  it('computes smooth S-curve turnout lateral offset and yaw from Hall Bay 1 onto main track', () => {
    assert.equal(evaluateDepotHallLateralX(DEPOT_HALL_START_M, false), 0);
    assert.equal(evaluateDepotHallLateralX(DEPOT_HALL_START_M, true), DEPOT_HALL_BAY_LATERAL_X_M);
    assert.equal(evaluateDepotHallLateralX(DEPOT_TURNOUT_END_M + 2, true), 0);
    const midDist = (DEPOT_TURNOUT_START_M + DEPOT_TURNOUT_END_M) * 0.5;
    assert.ok(Math.abs(evaluateDepotHallLateralX(midDist, true) - DEPOT_HALL_BAY_LATERAL_X_M * 0.5) < 0.01);
    assert.ok(Math.abs(evaluateDepotHallYawRad(midDist, true)) > 0.01);

    const alignment = new TrackAlignment('M1', METRO_LINE_M1.stations, { hasSurfaceStart: true, depotHallStart: true });
    const hallSample = alignment.sample(DEPOT_HALL_START_M);
    const mainSample = alignment.sample(0);
    assert.ok(Math.abs(hallSample.x - DEPOT_HALL_BAY_LATERAL_X_M) < 0.05);
    assert.ok(Math.abs(mainSample.x) < 0.01);
  });

  it('enforces 20 km/h hall/turnout speed limit and activates train wash mist at <= 10 km/h', () => {
    const washMid = (DEPOT_WASH_START_M + DEPOT_WASH_END_M) * 0.5;
    const slowWash = computeDepotZoneState(washMid, 8, true, true);
    const fastWash = computeDepotZoneState(washMid, 16, true, true);
    assert.equal(slowWash.inWashZone, true);
    assert.equal(slowWash.washSprayActive, true);
    assert.equal(fastWash.washSprayActive, false);
    assert.equal(slowWash.depotSpeedLimitKmh, DEPOT_HALL_SPEED_LIMIT_KMH);

    const sim = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
    sim.setDepotHallStart(true);
    sim.start();
    const snap = sim.getSnapshot();
    assert.equal(snap.kinematics.positionM, DEPOT_HALL_START_M);
    assert.equal(snap.depotZone.inHall, true);
    assert.equal(snap.speedLimitKmh, DEPOT_HALL_SPEED_LIMIT_KMH);
    assert.equal(snap.sop2.currentLimitKmh, DEPOT_HALL_SPEED_LIMIT_KMH);
  });
});
