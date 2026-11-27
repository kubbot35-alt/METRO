import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluateUnlockedAchievementIds } from './achievements';
import { canEnableAtoForMode, MetroAtoController } from './atoSystem';
import { DriverProfileService } from './driverProfile';
import { GhostRecordStorageService } from './ghostDelta';
import {
  getLocalizedAchievement,
  getLocalizedChallenge,
  getLocalizedGradeTitle,
  getLocalizedRank,
  getLocalizedTrain,
} from './i18nCatalog';
import {
  localizeAnnouncement,
  localizeAtoStatus,
  localizeFeedbackText,
  localizeRadioDispatch,
} from './i18nDynamic';
import { MetroSimulationEngine } from './metroSimulation';
import { MetroScoringRules } from './scoringRules';
import { SettingsStorageService } from './settingsService';
import { MetroTrainPhysics } from './trainPhysics';
import type { IControlInput, ISimulationSnapshot } from './types';

interface IMemoryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function createMemoryStorage(): IMemoryStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

const IDLE_INPUT: IControlInput = {
  throttleUp: false,
  throttleDown: false,
  serviceBrake: false,
  emergencyBrakePressed: false,
  toggleDoorsPressed: false,
  hornActive: false,
};

function createSim(): MetroSimulationEngine {
  return new MetroSimulationEngine(new MetroTrainPhysics(), new MetroScoringRules());
}

describe('ATO Autopilot (Automatic Train Operation)', () => {
  it('allows ATO only in sandbox and passenger modes', () => {
    assert.equal(canEnableAtoForMode('sandbox'), true);
    assert.equal(canEnableAtoForMode('passenger'), true);
    assert.equal(canEnableAtoForMode('duty'), false);
    assert.equal(canEnableAtoForMode('challenge'), false);
    assert.equal(canEnableAtoForMode('academy'), false);
  });

  it('launches passenger mode directly in Camera 4 interior with ATO enabled', () => {
    const sim = createSim();
    sim.setMetroLine('M1');
    sim.setTrainModel('inspiro');
    sim.setTimeOfDay('rush');
    sim.setGameMode('passenger');
    sim.start();

    const snap = sim.getSnapshot();
    assert.equal(snap.phase, 'playing');
    assert.equal(snap.gameMode, 'passenger');
    assert.equal(snap.cameraMode, 'interior');
    assert.equal(snap.atoEnabled, true);
  });

  it('blocks ATO toggle in duty mode with clear feedback', () => {
    const sim = createSim();
    sim.setGameMode('duty');
    sim.start();
    sim.toggleAto();

    const snap = sim.getSnapshot();
    assert.equal(snap.atoEnabled, false);
    assert.equal(snap.feedback?.text, 'ATO dostępne tylko w Sandbox / trybie Pasażera');
  });

  it('toggles ATO on and off in sandbox mode via toggleAto and A key input', () => {
    const sim = createSim();
    sim.setTrainModel('varsovia');
    sim.setGameMode('sandbox');
    sim.start();

    assert.equal(sim.getSnapshot().atoEnabled, false);
    sim.toggleAto();
    assert.equal(sim.getSnapshot().atoEnabled, true);
    sim.step({ ...IDLE_INPUT, toggleAtoPressed: true }, 0.05);
    assert.equal(sim.getSnapshot().atoEnabled, false);
  });

  it('autonomously accelerates, obeys speed limit, stops at station, handles doors and departs', () => {
    const sim = createSim();
    sim.setMetroLine('M2');
    sim.setTrainModel('varsovia');
    sim.setTimeOfDay('evening');
    sim.setGameMode('passenger');
    sim.start();

    let reachedCruise = false;
    let openedDoors = false;
    let servedFirstStation = false;

    const dt = 0.1;
    for (let i = 0; i < 1600; i += 1) {
      sim.step(IDLE_INPUT, dt);
      const snap = sim.getSnapshot();
      if (snap.kinematics.speedKmh > 35) {
        reachedCruise = true;
      }
      if (snap.doorState === 'open') {
        openedDoors = true;
      }
      if (snap.stationsServed >= 1 && snap.currentStation.stationIndex >= 1 && snap.kinematics.speedKmh > 10) {
        servedFirstStation = true;
        break;
      }
    }

    const finalSnap = sim.getSnapshot();
    assert.equal(reachedCruise, true, 'ATO should smoothly accelerate to cruising speed');
    assert.equal(openedDoors, true, 'ATO should automatically open platform doors at the station');
    assert.equal(servedFirstStation, true, 'ATO should complete boarding, close doors, and depart');
    assert.equal(finalSnap.overspeedViolations, 0, 'ATO should respect speed limits');
    assert.equal(finalSnap.redSignalViolations, 0, 'ATO should never pass a red signal');
  });

  it('enables wipers in rain, handles czuwak/radio/headlights, and holds for red semaphores', () => {
    const ato = new MetroAtoController();
    const cmd = ato.computeControl({
      speedKmh: 45,
      speedLimitKmh: 75,
      gradePercent: 0,
      nextSignal: {
        signal: {
          id: 1,
          distanceM: 120,
          aspect: 'red',
          violated: false,
          waitRemainingSec: null,
        },
        distanceAheadM: 32,
      },
      upcomingCurveLimitKmh: null,
      upcomingCurveDistanceM: null,
      upcomingTrackworkDistanceM: null,
      activeTrackworkZone: null,
      currentStation: {
        station: {
          id: 1,
          name: 'Centrum',
          code: 'M1-02',
          distanceM: 600,
          stopZoneHalfWidthM: 14,
          platformLengthM: 120,
          accentHex: 0x3b82f6,
          platformLayout: 'island',
          waitingPassengers: 18,
        },
        stationIndex: 1,
        distanceToTargetM: 512,
        inStopZone: false,
        boarded: false,
      },
      expectedPlatformSide: 'left',
      doorState: 'closed',
      openDoorSide: null,
      canToggleDoors: false,
      boardingCompletedForCurrent: false,
      doorFaultPhase: 'none',
      czuwakActive: true,
      radioActive: true,
      headlightsOn: false,
      rainIntensity: 0.85,
      wipersOn: false,
      skipStations: false,
      isEveningOrTunnel: true,
    });

    assert.equal(cmd.status, 'signal-hold');
    assert.ok(cmd.leverAxis < 0, 'ATO must brake before a red semaphore');
    assert.equal(cmd.acknowledgeCzuwak, true);
    assert.equal(cmd.acknowledgeRadio, true);
    assert.equal(cmd.toggleHeadlights, true);
    assert.equal(cmd.toggleWipers, true);
  });

  it('prevents passenger/ATO runs from earning achievements, career XP, or Ghost Delta records', () => {
    const sim = createSim();
    sim.setGameMode('passenger');
    sim.start();
    const passengerSnap: ISimulationSnapshot = {
      ...sim.getSnapshot(),
      phase: 'gameover',
      stationsServed: 6,
      passengersCarried: 240,
      score: 4200,
      driverGrade: 'S',
    };

    assert.deepEqual(evaluateUnlockedAchievementIds(passengerSnap, new Set()), []);

    const profileService = new DriverProfileService(createMemoryStorage());
    const profileRes = profileService.recordCompletedCourse(passengerSnap);
    assert.equal(profileRes.reward.gainedXp, 0);
    assert.equal(profileRes.profile.completedCourses, 0);

    const ghostService = new GhostRecordStorageService(createMemoryStorage());
    const ghostRes = ghostService.recordIfBest(passengerSnap);
    assert.equal(ghostRes.updated, false);
    assert.equal(ghostService.getRecordForLine('M1'), null);
  });
});

describe('PL / EN Internationalization & Language Persistence', () => {
  it('formats EN station announcements while preserving Polish station names', () => {
    const nextEn = localizeAnnouncement('en', {
      id: 1,
      kind: 'next',
      text: 'Następna stacja: Świętokrzyska',
      stationName: 'Świętokrzyska',
      remainingSec: 5,
    });
    assert.equal(nextEn?.displayText, 'Next station: Świętokrzyska');
    assert.equal(nextEn?.spokenText, 'Next station: Świętokrzyska');

    const arrivalEn = localizeAnnouncement('en', {
      id: 2,
      kind: 'arrival',
      text: 'Stacja: Centrum · Peron po LEWEJ [Q]',
      stationName: 'Centrum',
      platformSide: 'left',
      remainingSec: 5,
    });
    assert.equal(arrivalEn?.displayText, 'Station: Centrum · Platform on LEFT [Q]');
    assert.equal(arrivalEn?.spokenText, 'Station: Centrum. Platform on the left.');
  });

  it('translates dynamic radio, ATO statuses, feedback, and catalog entries to English', () => {
    const radioEn = localizeRadioDispatch('en', {
      active: true,
      messageId: 1,
      category: 'platform',
      text: 'Centrala: zwiększony ruch pasażerski na stacji Politechnika',
      spokenText: 'Uwaga',
      stationName: 'Politechnika',
      remainingSec: 10,
      acknowledgedCount: 0,
      maxWindowSec: 12,
      slipperyRailsActive: false,
    });
    assert.ok(radioEn.displayText.includes('Politechnika'));
    assert.ok(radioEn.displayText.startsWith('Dispatcher:'));

    assert.equal(localizeAtoStatus('en', 'boarding'), 'ATO BOARDING');
    assert.equal(localizeAtoStatus('pl', 'boarding'), 'ATO WYMIANA');
    assert.equal(
      localizeFeedbackText('en', 'ATO dostępne tylko w Sandbox / trybie Pasażera'),
      'ATO is only available in Sandbox / Passenger mode',
    );
    assert.equal(
      getLocalizedTrain('en', 'varsovia', {
        subtitle: '',
        description: '',
        accelLabel: '',
        brakeLabel: '',
      }).subtitle,
      'Flagship · 2022',
    );
    assert.equal(
      getLocalizedChallenge('en', 'inverter_fault', {
        title: '',
        shortLabel: '',
        badge: '',
        description: '',
        objectiveSummary: '',
      }).title,
      'Inverter Failure',
    );
    assert.equal(
      getLocalizedAchievement('en', 'academy_license', { title: '', description: '' }).title,
      'Train Driver License',
    );
    assert.equal(
      getLocalizedRank('en', 'legend', { title: '', description: '' }).title,
      'Warsaw Metro Legend',
    );
    assert.equal(getLocalizedGradeTitle('en', 'S', 'Mistrz Metra'), 'Metro Master');
  });

  it('persists selected interface language (pl/en) in SettingsStorageService', () => {
    const storage = createMemoryStorage();
    const service = new SettingsStorageService(storage);
    const defaults = service.load();
    assert.equal(defaults.language, 'pl');

    service.save({ ...defaults, language: 'en' });
    const reloaded = service.load();
    assert.equal(reloaded.language, 'en');
  });
});
