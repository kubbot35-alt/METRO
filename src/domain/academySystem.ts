import type { AcademyStepNumber, DoorSide, DoorState, IAcademySnapshot } from './types';
import {
  ACADEMY_LINE_SPEC,
  ACADEMY_SEMAPHORE_SPECS,
  ACADEMY_SPEED_LIMIT_KMH,
  describeAcademyStep,
  type IAcademyStepInput,
  type IAcademyStepResult,
  type IScriptedSemaphoreSpec,
} from './academyCatalog';

export {
  ACADEMY_LINE_SPEC,
  ACADEMY_SEMAPHORE_SPECS,
  ACADEMY_SPEED_LIMIT_KMH,
  type IAcademyStepInput,
  type IAcademyStepResult,
  type IScriptedSemaphoreSpec,
};

export interface IAcademyController {
  reset(): void;
  step(input: IAcademyStepInput): IAcademyStepResult;
  getSnapshot(inStopZone: boolean, expectedPlatformSide: DoorSide, doorState: DoorState): IAcademySnapshot;
}

const IDLE_ACADEMY_RESULT: IAcademyStepResult = {
  stepCompletedNow: false, completedStepNumber: null, academyFinishedNow: false,
  requestTriggerCzuwak: false, requestTriggerRadio: false,
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
    if (this.completed) return IDLE_ACADEMY_RESULT;
    if (this.currentStep === 1) return this.stepOne(input);
    if (this.currentStep === 2) return this.stepTwo(input);
    if (this.currentStep === 3) return this.stepThree(input);
    if (this.currentStep === 4) return this.stepFour(input);
    return this.stepFive(input);
  }

  public getSnapshot(inStopZone: boolean, expectedPlatformSide: DoorSide, doorState: DoorState): IAcademySnapshot {
    const flags = {
      lightsDone: this.lightsDone, hornDone: this.hornDone, smoothCruiseSec: this.smoothCruiseSec,
      passedYellow: this.passedYellow, redCleared: this.redCleared, czuwakDone: this.czuwakDone,
      radioDone: this.radioDone, stoppedInZone: this.stoppedInZone, openedDoors: this.openedDoors,
      completed: this.completed,
    };
    const meta = describeAcademyStep(this.currentStep, flags, inStopZone, expectedPlatformSide, doorState);
    return {
      currentStep: this.currentStep, totalSteps: 5, ...meta,
      completed: this.completed, stepFlashSec: this.stepFlashSec,
    };
  }

  private stepOne(input: IAcademyStepInput): IAcademyStepResult {
    if (input.headlightsOn) this.lightsDone = true;
    if (input.hornActive) this.hornDone = true;
    return this.lightsDone && this.hornDone ? this.advanceTo(2) : IDLE_ACADEMY_RESULT;
  }

  private stepTwo(input: IAcademyStepInput): IAcademyStepResult {
    if (input.speedKmh >= 20 && input.speedKmh <= ACADEMY_SPEED_LIMIT_KMH) this.smoothCruiseSec += input.dtSec;
    else if (input.speedKmh > ACADEMY_SPEED_LIMIT_KMH + 1) this.smoothCruiseSec = Math.max(0, this.smoothCruiseSec - input.dtSec);
    return this.smoothCruiseSec >= 1.4 || input.positionM >= 195 ? this.advanceTo(3) : IDLE_ACADEMY_RESULT;
  }

  private stepThree(input: IAcademyStepInput): IAcademyStepResult {
    if (input.positionM >= 220) this.passedYellow = true;
    if (!input.redSignalClearedNow) return IDLE_ACADEMY_RESULT;
    this.redCleared = true;
    this.passedYellow = true;
    this.step4RetryCooldownSec = 0;
    return this.advanceTo(4);
  }

  private stepFour(input: IAcademyStepInput): IAcademyStepResult {
    if (input.czuwakAcknowledgedNow) this.czuwakDone = true;
    if (input.radioAcknowledgedNow) this.radioDone = true;
    if (this.czuwakDone && this.radioDone) return this.advanceTo(5);
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
    return { ...IDLE_ACADEMY_RESULT, requestTriggerCzuwak, requestTriggerRadio };
  }

  private stepFive(input: IAcademyStepInput): IAcademyStepResult {
    if (input.inStopZone && input.speedKmh <= 0.35) this.stoppedInZone = true;
    if (input.doorState === 'open') { this.stoppedInZone = true; this.openedDoors = true; }
    if (!input.stationServedNow) return IDLE_ACADEMY_RESULT;
    this.completed = true;
    this.stepFlashSec = 2.5;
    return { ...IDLE_ACADEMY_RESULT, stepCompletedNow: true, completedStepNumber: 5, academyFinishedNow: true };
  }

  private advanceTo(nextStep: AcademyStepNumber): IAcademyStepResult {
    const doneStep = this.currentStep;
    this.currentStep = nextStep;
    this.stepFlashSec = 2.0;
    return { ...IDLE_ACADEMY_RESULT, stepCompletedNow: true, completedStepNumber: doneStep };
  }
}
