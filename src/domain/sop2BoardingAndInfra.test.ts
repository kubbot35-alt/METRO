import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSop2Target, type ISop2TargetQuery } from './sop2TargetResolver';
import { Sop2System } from './sop2System';
import { MetroSimulationEngine } from './metroSimulation';
import { MetroTrainPhysics } from './trainPhysics';
import { MetroScoringRules } from './scoringRules';
import { getMetroLineSpec } from './routeData';
import { computeDynamicBoardingDurationSec } from './simulation/simulationHelpers';
import { localizeFeedbackText } from './i18nDynamic';
import { SettingsStorageService } from './settingsService';
import type { IControlInput, IStationProgress } from './types';

function makeInput(overrides: Partial<IControlInput> = {}): IControlInput {
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

function makeStationProgress(distanceToTargetM: number): IStationProgress {
  return {
    station: {
      id: 10,
      name: 'Centrum',
      code: 'A13',
      distanceM: 1200,
      stopZoneHalfWidthM: 14,
      platformLengthM: 112,
      platformSide: 'left',
      accentHex: 0x2563eb,
      waitingPassengers: 28,
    },
    stationIndex: 1,
    distanceToTargetM,
    inStopZone: Math.abs(distanceToTargetM) <= 14,
    boarded: false,
  };
}

function makeBaseQuery(overrides: Partial<ISop2TargetQuery> = {}): ISop2TargetQuery {
  return {
    positionM: 400,
    currentLimitKmh: 80,
    speedZones: [{ startM: 0, endM: 2000, limitKmh: 80 }],
    upcomingCurve: null,
    upcomingTrackworkDistanceM: null,
    nextSignal: null,
    currentStation: makeStationProgress(500),
    skipStations: false,
    stationPassLimitKmh: null,
    ...overrides,
  };
}

describe('SOP-2 target lookahead & controller', () => {
  it('picks the most restrictive target among curves, signals, trackwork, zones, and stations', () => {
    const curveRes = resolveSop2Target(
      makeBaseQuery({ upcomingCurve: { limitKmh: 45, distanceAheadM: 180 } }),
    );
    assert.equal(curveRes.targetLimitKmh, 45);
    assert.equal(curveRes.targetReason, 'curve');

    const redSignalRes = resolveSop2Target(
      makeBaseQuery({
        upcomingCurve: { limitKmh: 45, distanceAheadM: 140 },
        nextSignal: {
          signal: {
            id: 1,
            distanceM: 640,
            aspect: 'red',
            violated: false,
            waitRemainingSec: 6,
          },
          distanceAheadM: 240,
        },
      }),
    );
    assert.equal(redSignalRes.targetLimitKmh, 0);
    assert.equal(redSignalRes.targetReason, 'signal');

    const stationRes = resolveSop2Target(makeBaseQuery({ currentStation: makeStationProgress(190) }));
    assert.equal(stationRes.targetLimitKmh, 0);
    assert.equal(stationRes.targetReason, 'station');
  });

  it('emits orange warning + periodic beep above +3 km/h and triggers intervention above +7 km/h after 2.5s without braking', () => {
    const sop2 = new Sop2System();
    const q = makeBaseQuery({ currentLimitKmh: 60 });

    const warn1 = sop2.step({ ...q, speedKmh: 64, isBraking: false, dtSec: 0.2 });
    assert.equal(warn1.state.status, 'warning');
    assert.equal(warn1.warningBeep, true);
    assert.equal(warn1.interventionTriggeredNow, false);

    const warn2 = sop2.step({ ...q, speedKmh: 64, isBraking: false, dtSec: 0.2 });
    assert.equal(warn2.warningBeep, false);

    sop2.step({ ...q, speedKmh: 70, isBraking: false, dtSec: 2.0 });
    const braked = sop2.step({ ...q, speedKmh: 70, isBraking: true, dtSec: 0.1 });
    assert.equal(braked.state.overspeedHoldSec, 0);
    assert.equal(braked.state.interventionActive, false);

    let triggered = false;
    for (let i = 0; i < 26; i += 1) {
      const step = sop2.step({ ...q, speedKmh: 72, isBraking: false, dtSec: 0.1 });
      if (step.interventionTriggeredNow) triggered = true;
    }
    assert.equal(triggered, true);
    assert.equal(sop2.getState().interventionActive, true);
    assert.equal(sop2.getState().status, 'intervention');

    const released = sop2.step({ ...q, speedKmh: 58, isBraking: true, dtSec: 0.1 });
    assert.equal(released.interventionReleasedNow, true);
    assert.equal(released.state.interventionActive, false);
  });

  it('disables automatic intervention when interventionEnabled is false', () => {
    const sop2 = new Sop2System();
    sop2.setInterventionEnabled(false);
    const q = makeBaseQuery({ currentLimitKmh: 40 });
    for (let i = 0; i < 40; i += 1) {
      const res = sop2.step({ ...q, speedKmh: 60, isBraking: false, dtSec: 0.1 });
      assert.equal(res.interventionTriggeredNow, false);
      assert.equal(res.state.interventionActive, false);
    }
    assert.equal(sop2.getState().status, 'warning');
  });
});

describe('MetroSimulationEngine SOP-2 integration, crowds, boarding & settings', () => {
  it('defaults SOP-2 intervention ON in duty and OFF in sandbox, and triggers emergency braking when overspeeding', () => {
    const stations = [
      {
        id: 1, name: 'Kabaty', code: 'M1-01', distanceM: 1200,
        stopZoneHalfWidthM: 14, platformLengthM: 110, platformSide: 'left' as const,
        accentHex: 0x2563eb, waitingPassengers: 9,
      },
    ];
    const zones = [{ startM: 0, endM: 1600, limitKmh: 40 }];
    const engine = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules(), stations, zones);
    engine.setGameMode('sandbox');
    engine.start();
    assert.equal(engine.getSnapshot().sop2.interventionEnabled, false);

    engine.setGameMode('duty');
    engine.reset();
    engine.start();
    assert.equal(engine.getSnapshot().sop2.interventionEnabled, true);

    let interventionSeen = false;
    let beepSeen = false;
    for (let i = 0; i < 450; i += 1) {
      const ev = engine.step(makeInput({ manualLeverAxis: 1.0, acknowledgeCzuwakPressed: i % 10 === 0 }), 0.05);
      const snap = engine.getSnapshot();
      if (ev.sop2WarningBeep) beepSeen = true;
      if (snap.sop2.interventionActive) {
        interventionSeen = true;
        assert.equal(snap.kinematics.emergencyBrake, true);
        break;
      }
    }
    assert.equal(beepSeen, true);
    assert.equal(interventionSeen, true);
    assert.ok(engine.getSnapshot().sop2.interventionsCount >= 1);
  });

  it('differentiates station crowds across hubs vs terminals and scales boarding duration 4–9s', () => {
    const m1 = getMetroLineSpec('M1');
    const m2 = getMetroLineSpec('M2');
    const pax = (stations: typeof m1.stations, name: string) =>
      stations.find((s) => s.name === name)?.waitingPassengers ?? 0;

    assert.ok(pax(m1.stations, 'Centrum') > pax(m1.stations, 'Kabaty'));
    assert.ok(pax(m1.stations, 'Świętokrzyska') > pax(m1.stations, 'Młociny'));
    assert.ok(pax(m1.stations, 'Politechnika') > pax(m1.stations, 'Kabaty'));
    assert.ok(pax(m2.stations, 'Rondo Daszyńskiego') > pax(m2.stations, 'Bemowo'));
    assert.ok(pax(m2.stations, 'Dworzec Wileński') > pax(m2.stations, 'Bródno'));

    assert.equal(computeDynamicBoardingDurationSec(0), 4);
    assert.equal(computeDynamicBoardingDurationSec(4), 5);
    assert.equal(computeDynamicBoardingDurationSec(23), 7);
    assert.equal(computeDynamicBoardingDurationSec(45), 9);
  });

  it('penalizes passenger comfort and localizes feedback when doors close before boarding completes', () => {
    const shortRoute = [
      {
        id: 1, name: 'Centrum', code: 'A13', distanceM: 0,
        stopZoneHalfWidthM: 14, platformLengthM: 112, platformSide: 'left' as const,
        accentHex: 0x2563eb, waitingPassengers: 28,
      },
      {
        id: 2, name: 'Świętokrzyska', code: 'A14', distanceM: 700,
        stopZoneHalfWidthM: 14, platformLengthM: 112, platformSide: 'left' as const,
        accentHex: 0x2563eb, waitingPassengers: 28,
      },
    ];
    const engine = new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules(), shortRoute);
    engine.setTimeOfDay('rush');
    engine.start();
    const initial = engine.getSnapshot();
    assert.equal(initial.boardingDurationSec, 9);
    const comfortBefore = initial.comfort.currentPercent;

    engine.step(makeInput({ toggleDoorsLeftPressed: true }), 0.05);
    for (let i = 0; i < 15; i += 1) {
      engine.step(makeInput(), 0.05);
    }
    assert.equal(engine.getSnapshot().doorState, 'open');
    assert.equal(engine.getSnapshot().boardingCompletedForCurrent, false);

    engine.step(makeInput({ toggleDoorsLeftPressed: true }), 0.05);
    const after = engine.getSnapshot();
    assert.equal(after.doorState, 'closed');
    assert.ok(after.comfort.currentPercent < comfortBefore);
    const fb = after.feedback?.text ?? '';
    assert.match(fb, /wymiana pasażerów/i);
    const enText = localizeFeedbackText('en', fb);
    assert.match(enText, /passenger exchange/i);
  });

  it('persists sop2InterventionEnabled via SettingsStorageService', () => {
    const store = new Map<string, string>();
    const svc = new SettingsStorageService({
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => {
        store.set(k, v);
      },
    });
    assert.equal(svc.load().sop2InterventionEnabled, true);
    const saved = svc.save({ ...svc.load(), sop2InterventionEnabled: false });
    assert.equal(saved.sop2InterventionEnabled, false);
    assert.equal(svc.load().sop2InterventionEnabled, false);
  });
});
