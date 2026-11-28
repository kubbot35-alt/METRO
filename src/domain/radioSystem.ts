import { LINE_M1_STATIONS } from './routeData';
import type { IRadioDispatchState, IStationSpec, RadioDispatchCategory } from './types';
import {
  DISPATCH_TEMPLATES,
  IDLE_RADIO_RESULT,
  RADIO_ACK_BONUS_POINTS,
  RADIO_RESPONSE_WINDOW_SEC,
  RADIO_TRIGGER_SPEED_KMH,
  type IRadioController,
  type IRadioStepResult,
} from './radioCatalog';

export type { IRadioController, IRadioStepResult };

export class DispatcherRadioSystem implements IRadioController {
  private stations: readonly IStationSpec[];
  private readonly rng: () => number;
  private enabled = true;
  private autoTrigger = true;
  private active = false;
  private messageId = 0;
  private text = '';
  private spokenText = '';
  private stationName = '';
  private category: RadioDispatchCategory = 'traffic';
  private remainingSec = 0;
  private acknowledgedCount = 0;
  private slipperyRailsTimerSec = 0;
  private nextTriggerStationIndex = 0;
  private templateCursor = 0;

  public constructor(stations: readonly IStationSpec[] = LINE_M1_STATIONS, rng: () => number = Math.random) {
    this.stations = stations;
    this.rng = rng;
    this.reset();
  }

  public setStations(stations: readonly IStationSpec[]): void {
    this.stations = stations;
    this.reset();
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.active = false;
      this.remainingSec = 0;
      this.slipperyRailsTimerSec = 0;
    }
  }

  public setAutoTrigger(enabled: boolean): void {
    this.autoTrigger = enabled;
  }

  public forceTriggerDispatch(
    customText?: string,
    windowSec: number = 15,
    category: RadioDispatchCategory = 'traffic',
  ): boolean {
    if (this.active && category !== 'inspection') return false;
    this.messageId += 1;
    this.category = category;
    this.text = customText ?? 'Dyspozytor Akademii: Próba łączności radiowej. Potwierdź odbiór przyciskiem [R].';
    this.spokenText = this.text.replace(/^Dyspozytor[^:]*:\s*/, 'Uwaga dyspozytor. ');
    this.stationName = '';
    this.active = true;
    this.remainingSec = Math.max(5.5, windowSec);
    return true;
  }

  public reset(): void {
    this.active = false;
    this.messageId = 0;
    this.text = '';
    this.spokenText = '';
    this.stationName = '';
    this.category = 'traffic';
    this.remainingSec = 0;
    this.acknowledgedCount = 0;
    this.slipperyRailsTimerSec = 0;
    this.nextTriggerStationIndex = 0;
    this.templateCursor = 0;
  }

  public step(
    stationIndex: number,
    positionM: number,
    speedKmh: number,
    ackPressed: boolean,
    dtSec: number,
  ): IRadioStepResult {
    if (this.slipperyRailsTimerSec > 0) {
      this.slipperyRailsTimerSec = Math.max(0, this.slipperyRailsTimerSec - dtSec);
    }
    if (!this.enabled) return IDLE_RADIO_RESULT;
    if (this.active) return this.stepActiveDispatch(ackPressed, dtSec);
    if (!this.autoTrigger) return IDLE_RADIO_RESULT;
    return this.tryAutoTrigger(stationIndex, positionM, speedKmh);
  }

  public getState(): IRadioDispatchState {
    return {
      active: this.active,
      messageId: this.messageId,
      text: this.text,
      spokenText: this.spokenText,
      stationName: this.stationName || undefined,
      category: this.category,
      remainingSec: this.remainingSec,
      maxWindowSec: RADIO_RESPONSE_WINDOW_SEC,
      acknowledgedCount: this.acknowledgedCount,
      slipperyRailsActive: this.slipperyRailsTimerSec > 0,
    };
  }

  private stepActiveDispatch(ackPressed: boolean, dtSec: number): IRadioStepResult {
    if (ackPressed) {
      this.active = false;
      this.remainingSec = 0;
      this.acknowledgedCount += 1;
      return {
        dispatchTriggered: false, acknowledgedNow: true, expiredNow: false,
        bonusPoints: RADIO_ACK_BONUS_POINTS, feedbackText: 'Radio potwierdzone — przyjęto komunikat dyspozytora',
      };
    }
    this.remainingSec = Math.max(0, this.remainingSec - dtSec);
    if (this.remainingSec <= 0) {
      this.active = false;
      return {
        dispatchTriggered: false, acknowledgedNow: false, expiredNow: true,
        bonusPoints: 0, feedbackText: 'Centrala: brak potwierdzenia komunikatu radiowego [R]',
      };
    }
    return IDLE_RADIO_RESULT;
  }

  private tryAutoTrigger(stationIndex: number, positionM: number, speedKmh: number): IRadioStepResult {
    const targetStation = this.stations[this.nextTriggerStationIndex];
    if (
      targetStation &&
      stationIndex >= this.nextTriggerStationIndex &&
      speedKmh >= RADIO_TRIGGER_SPEED_KMH &&
      positionM >= Math.max(115, targetStation.distanceM - 420) &&
      positionM <= targetStation.distanceM - 135
    ) {
      this.triggerDispatch(targetStation.name);
      this.nextTriggerStationIndex = stationIndex + (this.rng() < 0.5 ? 1 : 2);
      return { ...IDLE_RADIO_RESULT, dispatchTriggered: true };
    }
    return IDLE_RADIO_RESULT;
  }

  private triggerDispatch(stationName: string): void {
    const template = DISPATCH_TEMPLATES[this.templateCursor % DISPATCH_TEMPLATES.length];
    this.templateCursor += 1;
    this.messageId += 1;
    this.category = template.category;
    this.stationName = stationName;
    this.text = template.buildText(stationName);
    this.spokenText = this.text.replace(/^Dyspozytor:\s*/, 'Uwaga dyspozytor. ');
    this.active = true;
    this.remainingSec = RADIO_RESPONSE_WINDOW_SEC;
    if (template.category === 'slippery') this.slipperyRailsTimerSec = 28;
  }
}
