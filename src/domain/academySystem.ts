import type {
  AcademyHighlightTarget,
  AcademyStepNumber,
  DoorSide,
  DoorState,
  IAcademySnapshot,
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

export interface IAcademyController {
  reset(): void;
  step(input: IAcademyStepInput): IAcademyStepResult;
  getSnapshot(inStopZone: boolean, expectedPlatformSide: DoorSide, doorState: DoorState): IAcademySnapshot;
}

export const ACADEMY_SPEED_LIMIT_KMH = 60;

export const ACADEMY_SEMAPHORE_SPECS: readonly IScriptedSemaphoreSpec[] = [
  { distanceM: 220, aspect: 'yellow', waitSec: 3.0 },
  { distanceM: 430, aspect: 'red', waitSec: 3.2 },
  { distanceM: 960, aspect: 'green', waitSec: 3.0 },
];

export const ACADEMY_LINE_SPEC: IMetroLineSpec = {
  id: 'ACADEMY',
  badgeCode: 'AK',
  name: 'Akademia Maszynisty',
  routeLabel: 'Tor Szkoleniowy — Stacja Egzaminacyjna',
  destinationLed: 'AKADEMIA',
  oppositeDestinationLed: 'BAZA STP',
  colorHex: 0x06b6d4,
  cssColor: '#06b6d4',
  hasSurfaceStart: false,
  tunnelPortalDistanceM: null,
  alignmentIntensity: 'flat',
  stations: [
    {
      id: 1,
      name: 'Centrum Szkoleniowe',
      code: 'A1',
      distanceM: 680,
      stopZoneHalfWidthM: 15,
      platformLengthM: 120,
      platformLayout: 'island',
      platformSide: 'left',
      accentHex: 0x06b6d4,
      wallBaseHex: 0x1e293b,
      waitingPassengers: 16,
    },
    {
      id: 2,
      name: 'Stacja Egzaminacyjna',
      code: 'A2',
      distanceM: 1220,
      stopZoneHalfWidthM: 15,
      platformLengthM: 120,
      platformLayout: 'side',
      platformSide: 'right',
      accentHex: 0x10b981,
      wallBaseHex: 0x1e293b,
      waitingPassengers: 20,
    },
  ],
  speedZones: [{ startM: 0, endM: 1450, limitKmh: ACADEMY_SPEED_LIMIT_KMH }],
};

export class AcademyController implements IAcademyController {
  private currentStep: AcademyStepNumber = 1;
  private completed = false;
  private stepFlashSec = 0;

  private lightsDone = false;
  private hornDone = false;
  private smoothCruiseSec = 0;
  private passedYellow = false;
  private redCleared = false;
  private czuwakDone = false;
  private radioDone = false;
  private step4RetryCooldownSec = 0;
  private stoppedInZone = false;
  private openedDoors = false;

  public reset(): void {
    this.currentStep = 1;
    this.completed = false;
    this.stepFlashSec = 0;
    this.lightsDone = false;
    this.hornDone = false;
    this.smoothCruiseSec = 0;
    this.passedYellow = false;
    this.redCleared = false;
    this.czuwakDone = false;
    this.radioDone = false;
    this.step4RetryCooldownSec = 0;
    this.stoppedInZone = false;
    this.openedDoors = false;
  }

  public step(input: IAcademyStepInput): IAcademyStepResult {
    this.stepFlashSec = Math.max(0, this.stepFlashSec - input.dtSec);
    if (this.completed) {
      return this.idleResult();
    }
    if (this.currentStep === 1) {
      return this.stepOne(input);
    }
    if (this.currentStep === 2) {
      return this.stepTwo(input);
    }
    if (this.currentStep === 3) {
      return this.stepThree(input);
    }
    if (this.currentStep === 4) {
      return this.stepFour(input);
    }
    return this.stepFive(input);
  }

  public getSnapshot(
    inStopZone: boolean,
    expectedPlatformSide: DoorSide,
    doorState: DoorState,
  ): IAcademySnapshot {
    const meta = this.describeStep(inStopZone, expectedPlatformSide, doorState);
    return {
      currentStep: this.currentStep,
      totalSteps: 5,
      title: meta.title,
      instruction: meta.instruction,
      gamepadHint: meta.gamepadHint,
      subTasks: meta.subTasks,
      highlightTarget: meta.highlightTarget,
      completed: this.completed,
      stepFlashSec: this.stepFlashSec,
    };
  }

  private stepOne(input: IAcademyStepInput): IAcademyStepResult {
    if (input.headlightsOn) {
      this.lightsDone = true;
    }
    if (input.hornActive) {
      this.hornDone = true;
    }
    if (this.lightsDone && this.hornDone) {
      return this.advanceTo(2);
    }
    return this.idleResult();
  }

  private stepTwo(input: IAcademyStepInput): IAcademyStepResult {
    if (input.speedKmh >= 20 && input.speedKmh <= ACADEMY_SPEED_LIMIT_KMH) {
      this.smoothCruiseSec += input.dtSec;
    } else if (input.speedKmh > ACADEMY_SPEED_LIMIT_KMH + 1) {
      this.smoothCruiseSec = Math.max(0, this.smoothCruiseSec - input.dtSec);
    }
    if (this.smoothCruiseSec >= 1.4 || input.positionM >= 195) {
      return this.advanceTo(3);
    }
    return this.idleResult();
  }

  private stepThree(input: IAcademyStepInput): IAcademyStepResult {
    if (input.positionM >= 220) {
      this.passedYellow = true;
    }
    if (input.redSignalClearedNow) {
      this.redCleared = true;
      this.passedYellow = true;
      this.step4RetryCooldownSec = 0;
      return this.advanceTo(4);
    }
    return this.idleResult();
  }

  private stepFour(input: IAcademyStepInput): IAcademyStepResult {
    if (input.czuwakAcknowledgedNow) {
      this.czuwakDone = true;
    }
    if (input.radioAcknowledgedNow) {
      this.radioDone = true;
    }
    if (this.czuwakDone && this.radioDone) {
      return this.advanceTo(5);
    }
    this.step4RetryCooldownSec = Math.max(0, this.step4RetryCooldownSec - input.dtSec);
    let requestTriggerCzuwak = false;
    let requestTriggerRadio = false;
    if (this.step4RetryCooldownSec <= 0) {
      if (!this.czuwakDone && !input.czuwakActive) {
        requestTriggerCzuwak = true;
        this.step4RetryCooldownSec = 1.5;
      } else if (this.czuwakDone && !this.radioDone && !input.radioActive) {
        requestTriggerRadio = true;
        this.step4RetryCooldownSec = 1.5;
      }
    }
    return {
      stepCompletedNow: false,
      completedStepNumber: null,
      academyFinishedNow: false,
      requestTriggerCzuwak,
      requestTriggerRadio,
    };
  }

  private stepFive(input: IAcademyStepInput): IAcademyStepResult {
    if (input.inStopZone && input.speedKmh <= 0.35) {
      this.stoppedInZone = true;
    }
    if (input.doorState === 'open') {
      this.stoppedInZone = true;
      this.openedDoors = true;
    }
    if (input.stationServedNow) {
      this.completed = true;
      this.stepFlashSec = 2.5;
      return {
        stepCompletedNow: true,
        completedStepNumber: 5,
        academyFinishedNow: true,
        requestTriggerCzuwak: false,
        requestTriggerRadio: false,
      };
    }
    return this.idleResult();
  }

  private advanceTo(nextStep: AcademyStepNumber): IAcademyStepResult {
    const doneStep = this.currentStep;
    this.currentStep = nextStep;
    this.stepFlashSec = 2.0;
    return {
      stepCompletedNow: true,
      completedStepNumber: doneStep,
      academyFinishedNow: false,
      requestTriggerCzuwak: false,
      requestTriggerRadio: false,
    };
  }

  private describeStep(
    inStopZone: boolean,
    expectedSide: DoorSide,
    doorState: DoorState,
  ): {
    readonly title: string;
    readonly instruction: string;
    readonly gamepadHint: string;
    readonly subTasks: readonly IAcademySubTask[];
    readonly highlightTarget: AcademyHighlightTarget;
  } {
    if (this.currentStep === 1) {
      return {
        title: 'Przygotowanie kabiny',
        instruction: 'Włącz reflektory czołowe [L] i podaj sygnał dźwiękowy klaksonem [H].',
        gamepadHint: 'Pad: D-Pad Góra (Światła) · D-Pad Lewo/Prawo (Klakson)',
        subTasks: [
          { label: 'Włącz reflektory [L]', done: this.lightsDone },
          { label: 'Użyj klaksonu [H]', done: this.hornDone },
        ],
        highlightTarget: !this.lightsDone ? 'headlights' : 'horn',
      };
    }
    if (this.currentStep === 2) {
      return {
        title: 'Płynny rozruch',
        instruction: 'Rusz ze stacji [W] i utrzymuj bezpieczną prędkość (20–60 km/h).',
        gamepadHint: 'Pad: Prawy spust RT/R2 lub Lewy drążek w górę',
        subTasks: [
          { label: 'Rozpędź skład powyżej 20 km/h i nie przekraczaj 60 km/h', done: this.smoothCruiseSec >= 1.4 },
        ],
        highlightTarget: 'throttle',
      };
    }
    if (this.currentStep === 3) {
      return {
        title: 'Sygnalizacja tunelowa',
        instruction: 'Zwolnij przy żółtym semaforze (≤ 30 km/h), zatrzymaj się przed czerwonym i poczekaj na zielone.',
        gamepadHint: 'Pad: Lewy spust LT/L2 (Hamulec roboczy)',
        subTasks: [
          { label: 'Zareaguj na żółty semafor (220 m)', done: this.passedYellow },
          { label: 'Zatrzymaj się przed czerwonym (430 m) i odczekaj na zielone', done: this.redCleared },
        ],
        highlightTarget: 'signal',
      };
    }
    if (this.currentStep === 4) {
      return {
        title: 'Czuwak i Radio Dyspozytora',
        instruction: 'Potwierdź alarm czuwaka [C], a następnie odbierz komunikat z radia [R].',
        gamepadHint: 'Pad: A / Cross (Czuwak) · X / Square (Radio)',
        subTasks: [
          { label: 'Potwierdź czuwak [C]', done: this.czuwakDone },
          { label: 'Potwierdź komunikat z radia [R]', done: this.radioDone },
        ],
        highlightTarget: !this.czuwakDone ? 'czuwak' : 'radio',
      };
    }
    const doorKey = expectedSide === 'left' ? 'Q' : 'E';
    const doorLabel = expectedSide === 'left' ? 'lewe [Q]' : 'prawe [E]';
    const doorHighlight: AcademyHighlightTarget =
      inStopZone || doorState === 'open'
        ? expectedSide === 'left'
          ? 'doors-left'
          : 'doors-right'
        : 'throttle';
    return {
      title: 'Zatrzymanie i obsługa stacji',
      instruction: `Wyhamuj w strefie STOP, otwórz drzwi ${doorLabel}, poczekaj na pasażerów i zamknij [${doorKey}].`,
      gamepadHint: expectedSide === 'left' ? 'Pad: LB / L1 (Drzwi Lewe)' : 'Pad: RB / R1 (Drzwi Prawe)',
      subTasks: [
        { label: 'Zatrzymaj się w strefie STOP', done: this.stoppedInZone },
        { label: `Otwórz drzwi po stronie peronu (${doorKey})`, done: this.openedDoors },
        { label: `Zakończ wymianę pasażerów i zamknij drzwi (${doorKey})`, done: this.completed },
      ],
      highlightTarget: doorHighlight,
    };
  }

  private idleResult(): IAcademyStepResult {
    return {
      stepCompletedNow: false,
      completedStepNumber: null,
      academyFinishedNow: false,
      requestTriggerCzuwak: false,
      requestTriggerRadio: false,
    };
  }
}
