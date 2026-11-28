import type {
  AcademyHighlightTarget,
  AcademyStepNumber,
  DoorSide,
  DoorState,
  IAcademySubTask,
  IMetroLineSpec,
  SignalAspect,
} from './types';

export interface IScriptedSemaphoreSpec {
  readonly distanceM: number;
  readonly aspect: SignalAspect;
  readonly waitSec: number;
}

export interface IAcademyStepInput {
  readonly positionM: number;
  readonly speedKmh: number;
  readonly headlightsOn: boolean;
  readonly hornActive: boolean;
  readonly redSignalClearedNow: boolean;
  readonly czuwakActive: boolean;
  readonly czuwakAcknowledgedNow: boolean;
  readonly radioActive: boolean;
  readonly radioAcknowledgedNow: boolean;
  readonly inStopZone: boolean;
  readonly expectedPlatformSide: DoorSide;
  readonly doorState: DoorState;
  readonly boardingCompleted: boolean;
  readonly stationServedNow: boolean;
  readonly dtSec: number;
}

export interface IAcademyStepResult {
  readonly stepCompletedNow: boolean;
  readonly completedStepNumber: AcademyStepNumber | null;
  readonly academyFinishedNow: boolean;
  readonly requestTriggerCzuwak: boolean;
  readonly requestTriggerRadio: boolean;
}

export const ACADEMY_SPEED_LIMIT_KMH = 60;

export const ACADEMY_SEMAPHORE_SPECS: readonly IScriptedSemaphoreSpec[] = [
  { distanceM: 220, aspect: 'yellow', waitSec: 3.0 },
  { distanceM: 430, aspect: 'red', waitSec: 3.2 },
  { distanceM: 960, aspect: 'green', waitSec: 3.0 },
];

export const ACADEMY_LINE_SPEC: IMetroLineSpec = {
  id: 'ACADEMY', badgeCode: 'AK', name: 'Akademia Maszynisty',
  routeLabel: 'Tor Szkoleniowy — Stacja Egzaminacyjna',
  destinationLed: 'AKADEMIA', oppositeDestinationLed: 'BAZA STP',
  colorHex: 0x06b6d4, cssColor: '#06b6d4', hasSurfaceStart: false,
  tunnelPortalDistanceM: null, alignmentIntensity: 'flat',
  stations: [
    {
      id: 1, name: 'Centrum Szkoleniowe', code: 'A1', distanceM: 680,
      stopZoneHalfWidthM: 15, platformLengthM: 120, platformLayout: 'island',
      platformSide: 'left', accentHex: 0x06b6d4, wallBaseHex: 0x1e293b, waitingPassengers: 16,
    },
    {
      id: 2, name: 'Stacja Egzaminacyjna', code: 'A2', distanceM: 1220,
      stopZoneHalfWidthM: 15, platformLengthM: 120, platformLayout: 'side',
      platformSide: 'right', accentHex: 0x10b981, wallBaseHex: 0x1e293b, waitingPassengers: 20,
    },
  ],
  speedZones: [{ startM: 0, endM: 1450, limitKmh: ACADEMY_SPEED_LIMIT_KMH }],
};

export interface IAcademyStepMeta {
  readonly title: string;
  readonly instruction: string;
  readonly gamepadHint: string;
  readonly subTasks: readonly IAcademySubTask[];
  readonly highlightTarget: AcademyHighlightTarget;
}

export interface IAcademyProgressFlags {
  readonly lightsDone: boolean;
  readonly hornDone: boolean;
  readonly smoothCruiseSec: number;
  readonly passedYellow: boolean;
  readonly redCleared: boolean;
  readonly czuwakDone: boolean;
  readonly radioDone: boolean;
  readonly stoppedInZone: boolean;
  readonly openedDoors: boolean;
  readonly completed: boolean;
}

export function describeAcademyStep(
  step: AcademyStepNumber,
  flags: IAcademyProgressFlags,
  inStopZone: boolean,
  expectedSide: DoorSide,
  doorState: DoorState,
): IAcademyStepMeta {
  if (step === 1) return describeStepOne(flags);
  if (step === 2) return describeStepTwo(flags);
  if (step === 3) return describeStepThree(flags);
  if (step === 4) return describeStepFour(flags);
  return describeStepFive(flags, inStopZone, expectedSide, doorState);
}

function describeStepOne(f: IAcademyProgressFlags): IAcademyStepMeta {
  return {
    title: 'Przygotowanie kabiny',
    instruction: 'Włącz reflektory czołowe [L] i podaj sygnał dźwiękowy klaksonem [H].',
    gamepadHint: 'Pad: D-Pad Góra (Światła) · D-Pad Lewo/Prawo (Klakson)',
    subTasks: [{ label: 'Włącz reflektory [L]', done: f.lightsDone }, { label: 'Użyj klaksonu [H]', done: f.hornDone }],
    highlightTarget: !f.lightsDone ? 'headlights' : 'horn',
  };
}

function describeStepTwo(f: IAcademyProgressFlags): IAcademyStepMeta {
  return {
    title: 'Płynny rozruch',
    instruction: 'Rusz ze stacji [W] i utrzymuj bezpieczną prędkość (20–60 km/h).',
    gamepadHint: 'Pad: Prawy spust RT/R2 lub Lewy drążek w górę',
    subTasks: [{ label: 'Rozpędź skład powyżej 20 km/h i nie przekraczaj 60 km/h', done: f.smoothCruiseSec >= 1.4 }],
    highlightTarget: 'throttle',
  };
}

function describeStepThree(f: IAcademyProgressFlags): IAcademyStepMeta {
  return {
    title: 'Sygnalizacja tunelowa',
    instruction: 'Zwolnij przy żółtym semaforze (≤ 30 km/h), zatrzymaj się przed czerwonym i poczekaj na zielone.',
    gamepadHint: 'Pad: Lewy spust LT/L2 (Hamulec roboczy)',
    subTasks: [
      { label: 'Zareaguj na żółty semafor (220 m)', done: f.passedYellow },
      { label: 'Zatrzymaj się przed czerwonym (430 m) i odczekaj na zielone', done: f.redCleared },
    ],
    highlightTarget: 'signal',
  };
}

function describeStepFour(f: IAcademyProgressFlags): IAcademyStepMeta {
  return {
    title: 'Czuwak i Radio Dyspozytora',
    instruction: 'Potwierdź alarm czuwaka [C], a następnie odbierz komunikat z radia [R].',
    gamepadHint: 'Pad: A / Cross (Czuwak) · X / Square (Radio)',
    subTasks: [{ label: 'Potwierdź czuwak [C]', done: f.czuwakDone }, { label: 'Potwierdź komunikat z radia [R]', done: f.radioDone }],
    highlightTarget: !f.czuwakDone ? 'czuwak' : 'radio',
  };
}

function describeStepFive(
  f: IAcademyProgressFlags,
  inStopZone: boolean,
  expectedSide: DoorSide,
  doorState: DoorState,
): IAcademyStepMeta {
  const doorKey = expectedSide === 'left' ? 'Q' : 'E';
  const doorLabel = expectedSide === 'left' ? 'lewe [Q]' : 'prawe [E]';
  const doorHighlight: AcademyHighlightTarget =
    inStopZone || doorState === 'open' ? (expectedSide === 'left' ? 'doors-left' : 'doors-right') : 'throttle';
  return {
    title: 'Zatrzymanie i obsługa stacji',
    instruction: `Wyhamuj w strefie STOP, otwórz drzwi ${doorLabel}, poczekaj na pasażerów i zamknij [${doorKey}].`,
    gamepadHint: expectedSide === 'left' ? 'Pad: LB / L1 (Drzwi Lewe)' : 'Pad: RB / R1 (Drzwi Prawe)',
    subTasks: [
      { label: 'Zatrzymaj się w strefie STOP', done: f.stoppedInZone },
      { label: `Otwórz drzwi po stronie peronu (${doorKey})`, done: f.openedDoors },
      { label: `Zakończ wymianę pasażerów i zamknij drzwi (${doorKey})`, done: f.completed },
    ],
    highlightTarget: doorHighlight,
  };
}
