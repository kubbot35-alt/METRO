import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateComfortEndBonus,
  PassengerComfortSystem,
} from './comfortSystem';
import { MetroSimulationEngine } from './metroSimulation';
import {
  isPaBonusConditionMet,
  PA_ANNOUNCEMENT_SPECS,
  PaIntercomSystem,
} from './paIntercomSystem';
import { METRO_LINE_M1, METRO_LINE_M2 } from './routeData';
import { MetroScoringRules } from './scoringRules';
import { MetroTrainPhysics } from './trainPhysics';
import {
  buildReturnLegLineSpec,
  CAB_SWITCH_DURATION_SEC,
  RETURN_LEG_FIRST_STATION_M,
  TerminusTurnaroundSystem,
  TURNAROUND_BUFFER_OFFSET_M,
  TURNAROUND_SPEED_LIMIT_KMH,
  TURNAROUND_STOP_MIN_OFFSET_M,
} from './turnaroundSystem';
import type { IControlInput, IMetroLineSpec } from './types';

const IDLE_INPUT: IControlInput = {
  throttleUp: false,
  throttleDown: false,
  serviceBrake: false,
  emergencyBrakePressed: false,
  toggleDoorsPressed: false,
  hornActive: false,
};

describe('PassengerComfortSystem', () => {
  it('reduces comfort on emergency brake, harsh braking, lever jerk, and fast curves', () => {
    const comfort = new PassengerComfortSystem();
    const eb = comfort.step({
      dtSec: 0.05,
      speedKmh: 55,
      netAccelerationMs2: -2.2,
      leverTarget: -1,
      emergencyBrake: true,
      curvatureRadPerM: 0,
      curveLimitKmh: null,
      distanceToStationM: 300,
      doorsOpen: false,
    });
    assert.equal(eb.event?.kind, 'emergency_brake');
    assert.equal(eb.state.currentPercent, 86);
    assert.ok(eb.state.longitudinalG < 0);

    // Wait out cooldown and test fast curve
    for (let i = 0; i < 65; i += 1) {
      comfort.step({
        dtSec: 0.05,
        speedKmh: 62,
        netAccelerationMs2: 0,
        leverTarget: 0,
        emergencyBrake: false,
        curvatureRadPerM: 0,
        curveLimitKmh: null,
        distanceToStationM: 300,
        doorsOpen: false,
      });
    }
    const curve = comfort.step({
      dtSec: 0.05,
      speedKmh: 70,
      netAccelerationMs2: 0,
      leverTarget: 0.2,
      emergencyBrake: false,
      curvatureRadPerM: 0.004,
      curveLimitKmh: 55,
      distanceToStationM: 300,
      doorsOpen: false,
    });
    assert.equal(curve.event?.kind, 'fast_curve');
    assert.ok(curve.state.harshEventsCount >= 2);
  });

  it('regenerates comfort during smooth acceleration and calculates tiered end bonus', () => {
    const comfort = new PassengerComfortSystem();
    comfort.applyBoost(-25);
    assert.equal(comfort.getState().currentPercent, 75);

    for (let i = 0; i < 80; i += 1) {
      comfort.step({
        dtSec: 0.05,
        speedKmh: 38,
        netAccelerationMs2: 0.55,
        leverTarget: 0.45,
        emergencyBrake: false,
        curvatureRadPerM: 0,
        curveLimitKmh: null,
        distanceToStationM: 400,
        doorsOpen: false,
      });
    }
    const after = comfort.getState();
    assert.equal(after.smoothDrivingActive, true);
    assert.ok(after.currentPercent > 78);

    assert.equal(calculateComfortEndBonus(97, false), 150);
    assert.equal(calculateComfortEndBonus(90, false), 100);
    assert.equal(calculateComfortEndBonus(80, false), 50);
    assert.equal(calculateComfortEndBonus(65, false), 0);
    assert.equal(calculateComfortEndBonus(100, true), 0);
  });
});

describe('PaIntercomSystem', () => {
  it('provides 3 announcements and applies contextual bonuses with cooldowns', () => {
    assert.equal(PA_ANNOUNCEMENT_SPECS.length, 3);
    const pa = new PaIntercomSystem();

    const rushDoorRes = pa.trigger('stand_clear_doors', {
      doorState: 'open',
      boardingCompleted: false,
      timeOfDayId: 'rush',
      speedKmh: 0,
      nextSignal: null,
      weatherMode: 'clear',
      stationIndex: 2,
    });
    assert.equal(rushDoorRes.accepted, true);
    assert.equal(rushDoorRes.boardingSpeedupSec, 1.5);
    assert.equal(rushDoorRes.doorFaultProtectionApplied, true);
    assert.equal(pa.isDoorFaultProtected(2), true);

    // Blocked while cooldown is active
    const rejected = pa.trigger('wet_rails_caution', {
      doorState: 'closed',
      boardingCompleted: true,
      timeOfDayId: 'rush',
      speedKmh: 20,
      nextSignal: null,
      weatherMode: 'rain',
      stationIndex: 2,
    });
    assert.equal(rejected.accepted, false);

    pa.step(7);

    // Red semaphore apology grants +5% once per signal
    const redCtx = {
      doorState: 'closed' as const,
      boardingCompleted: true,
      timeOfDayId: 'rush' as const,
      speedKmh: 0,
      nextSignal: {
        signal: { id: 9, distanceM: 1200, aspect: 'red' as const, violated: false, waitRemainingSec: 6 },
        distanceAheadM: 32,
      },
      weatherMode: 'clear' as const,
      stationIndex: 3,
    };
    assert.equal(isPaBonusConditionMet('tunnel_stop_apology', redCtx), true);
    const apology = pa.trigger('tunnel_stop_apology', redCtx);
    assert.equal(apology.accepted, true);
    assert.equal(apology.comfortBonus, 5);

    pa.step(7);
    const secondApology = pa.trigger('tunnel_stop_apology', redCtx);
    assert.equal(secondApology.comfortBonus, 0);

    pa.step(7);
    const rainRes = pa.trigger('wet_rails_caution', {
      ...redCtx,
      weatherMode: 'rain',
    });
    assert.equal(rainRes.accepted, true);
    assert.equal(rainRes.comfortBonus, 4);
  });
});

describe('TerminusTurnaroundSystem & MetroSimulation turnaround flow', () => {
  it('reverses route direction and offsets first station 190m ahead for return leg', () => {
    const revM1 = buildReturnLegLineSpec(METRO_LINE_M1, 'normal');
    assert.equal(revM1.nextDirection, 'reverse');
    assert.equal(revM1.spec.direction, 'reverse');
    assert.equal(revM1.spec.hasSurfaceStart, false);
    assert.equal(revM1.spec.stations[0].distanceM, RETURN_LEG_FIRST_STATION_M);
    assert.equal(revM1.spec.stations[0].name, METRO_LINE_M1.stations[METRO_LINE_M1.stations.length - 1].name);

    const revM2 = buildReturnLegLineSpec(METRO_LINE_M2, 'reverse');
    assert.equal(revM2.nextDirection, 'normal');
    assert.equal(revM2.spec.stations[0].distanceM, RETURN_LEG_FIRST_STATION_M);
  });

  it('tracks siding entry, ready-to-switch zone, buffer clamping, and cab switch fade', () => {
    const ta = new TerminusTurnaroundSystem();
    const stations = METRO_LINE_M1.stations.slice(0, 2);
    const lastDist = stations[1].distanceM;
    ta.setStations(stations);
    assert.equal(ta.enterSiding(), false);

    ta.setCanEnterSiding(true);
    assert.equal(ta.enterSiding(), true);
    assert.equal(ta.getState(lastDist).phase, 'entering_siding');
    assert.equal(ta.getState(lastDist).maxSidingSpeedKmh, TURNAROUND_SPEED_LIMIT_KMH);

    // Stop inside stop zone
    const zonePos = lastDist + TURNAROUND_STOP_MIN_OFFSET_M + 20;
    const stepReady = ta.step(zonePos, 0, 0.05);
    assert.equal(stepReady.bufferCollision, false);
    assert.equal(ta.getState(zonePos).phase, 'ready_to_switch');

    // Overshoot into buffer stop clamps position and reports collision
    const hitRes = ta.step(lastDist + TURNAROUND_BUFFER_OFFSET_M + 5, 12, 0.05);
    assert.equal(hitRes.bufferCollision, true);
    assert.ok(hitRes.clampedPositionM !== null);

    // Back to stopped in stop zone then switch cab
    ta.step(zonePos, 0, 0.05);
    assert.equal(ta.beginCabSwitch(), true);
    const mid = ta.step(zonePos, 0, CAB_SWITCH_DURATION_SEC * 0.55);
    assert.equal(mid.cabSwitchMidpointReached, true);
    const done = ta.step(zonePos, 0, CAB_SWITCH_DURATION_SEC * 0.6);
    assert.equal(done.cabSwitchFinished, true);
    assert.equal(ta.getState(0).phase, 'inactive');
  });

  it('completes a continuous return trip preserving score, passengers, and recalculating schedule', () => {
    const shortLine: IMetroLineSpec = {
      ...METRO_LINE_M2,
      id: 'M2',
      stations: [
        { ...METRO_LINE_M2.stations[0], distanceM: 120 },
        { ...METRO_LINE_M2.stations[1], distanceM: 320 },
      ],
      speedZones: [{ startM: 0, endM: 1200, limitKmh: 60 }],
    };
    const sim = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
    sim.setMetroLineSpec(shortLine);
    sim.setTimeOfDay('evening');
    sim.start();

    // Verify PA intercom triggers cleanly through simulation engine
    sim.setWeatherMode('rain');
    const paRes = sim.triggerPaAnnouncement('wet_rails_caution');
    assert.equal(paRes.accepted, true);
    const afterPa = sim.getSnapshot();
    assert.equal(afterPa.paIntercom.announcementsUsedCount, 1);
    assert.ok(afterPa.paIntercom.activeMessage !== null);

    // Drive to terminus using ATO in sandbox-like manual steps: simply test completeCabSwitch continuity
    sim.setGameMode('sandbox');
    sim.toggleAto();
    let safety = 0;
    while (sim.getSnapshot().phase !== 'gameover' && safety < 3000) {
      sim.step(IDLE_INPUT, 0.05);
      safety += 1;
    }
    const endSnap = sim.getSnapshot();
    assert.equal(endSnap.phase, 'gameover');
    assert.equal(endSnap.turnaround.canEnterSiding, true);

    const prevPassengers = endSnap.passengersCarried;
    const prevClock = endSnap.schedule.currentClockSec;
    assert.equal(sim.enterTurnaroundSiding(), true);
    assert.equal(sim.getSnapshot().phase, 'playing');
    assert.equal(sim.getSnapshot().turnaround.phase, 'entering_siding');
    assert.equal(sim.getSnapshot().speedLimitKmh, TURNAROUND_SPEED_LIMIT_KMH);

    // Drive slowly into the turnaround zone and stop
    for (let i = 0; i < 1000; i += 1) {
      const s = sim.getSnapshot();
      if (s.turnaround.inStopZone && s.turnaround.distanceToBufferM < 65) {
        break;
      }
      sim.step(
        {
          ...IDLE_INPUT,
          manualLeverAxis: s.kinematics.speedKmh < 16 ? 0.5 : 0,
        },
        0.05,
      );
    }
    for (let i = 0; i < 140; i += 1) {
      sim.step({ ...IDLE_INPUT, serviceBrake: true }, 0.05);
      if (sim.getSnapshot().turnaround.phase === 'ready_to_switch') {
        break;
      }
    }
    assert.equal(sim.getSnapshot().turnaround.phase, 'ready_to_switch');

    assert.equal(sim.beginCabSwitch(), true);
    const rev = buildReturnLegLineSpec(shortLine, 'normal');
    assert.equal(sim.completeCabSwitch(rev.spec), true);

    const returnSnap = sim.getSnapshot();
    assert.equal(returnSnap.turnaround.legsCompleted, 1);
    assert.equal(returnSnap.line.direction, 'reverse');
    assert.equal(returnSnap.passengersCarried, prevPassengers);
    assert.equal(returnSnap.stations[0].distanceM, RETURN_LEG_FIRST_STATION_M);
    assert.ok(returnSnap.schedule.currentClockSec >= prevClock);
    assert.ok(returnSnap.schedule.nextArrivalClockSec > returnSnap.schedule.currentClockSec);
  });
});
