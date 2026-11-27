import { LINE_M1_STATIONS } from './routeData';
import type { IRadioDispatchState, IStationSpec, RadioDispatchCategory } from './types';

export interface IRadioStepResult {
  readonly dispatchTriggered: boolean;
  readonly acknowledgedNow: boolean;
  readonly expiredNow: boolean;
  readonly bonusPoints: number;
  readonly feedbackText: string | null;
}

export interface IRadioController {
  setStations(stations: readonly IStationSpec[]): void;
  setEnabled(enabled: boolean): void;
  setAutoTrigger?(enabled: boolean): void;
  forceTriggerDispatch?(customText?: string, windowSec?: number): boolean;
  reset(): void;
  step(
    stationIndex: number,
    positionM: number,
    speedKmh: number,
    ackPressed: boolean,
    dtSec: number,
  ): IRadioStepResult;
  getState(): IRadioDispatchState;
}

const RADIO_RESPONSE_WINDOW_SEC = 6.0;
const RADIO_ACK_BONUS_POINTS = 40;
const RADIO_TRIGGER_SPEED_KMH = 12;

interface ITemplateSpec {
  readonly category: RadioDispatchCategory;
  readonly buildText: (stationName: string) => string;
}

const DISPATCH_TEMPLATES: readonly ITemplateSpec[] = [
  {
    category: 'traffic',
    buildText: () =>
      'Dyspozytor: Skład przed tobą ma lekkie opóźnienie, zachowaj ostrożność przed kolejnym semaforem.',
  },
  {
    category: 'platform',
    buildText: (stationName) =>
      `Dyspozytor: Wzmożony ruch na stacji ${stationName}, pilnuj czasu wymiany pasażerów.`,
  },
  {
    category: 'slippery',
    buildText: () =>
      'Dyspozytor: Zgłoszono śliskie szyny na najbliższym spadku, hamuj wcześniej.',
  },
];

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

  public constructor(
    stations: readonly IStationSpec[] = LINE_M1_STATIONS,
    rng: () => number = Math.random,
  ) {
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

  public forceTriggerDispatch(customText?: string, windowSec: number = 15): boolean {
    if (this.active) {
      return false;
    }
    this.messageId += 1;
    this.category = 'traffic';
    this.text =
      customText ??
      'Dyspozytor Akademii: Próba łączności radiowej. Potwierdź odbiór przyciskiem [R].';
    this.spokenText = this.text.replace(/^Dyspozytor[^:]*:\s*/, 'Uwaga dyspozytor. ');
    this.stationName = '';
    this.active = true;
    this.remainingSec = Math.max(6, windowSec);
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
    // First dispatch fires between start and station 1 or 2, then every 1–2 stations
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

    if (!this.enabled) {
      return {
        dispatchTriggered: false,
        acknowledgedNow: false,
        expiredNow: false,
        bonusPoints: 0,
        feedbackText: null,
      };
    }

    if (this.active) {
      if (ackPressed) {
        this.active = false;
        this.remainingSec = 0;
        this.acknowledgedCount += 1;
        return {
          dispatchTriggered: false,
          acknowledgedNow: true,
          expiredNow: false,
          bonusPoints: RADIO_ACK_BONUS_POINTS,
          feedbackText: 'Radio potwierdzone — przyjęto komunikat dyspozytora',
        };
      }
      this.remainingSec = Math.max(0, this.remainingSec - dtSec);
      if (this.remainingSec <= 0) {
        this.active = false;
        return {
          dispatchTriggered: false,
          acknowledgedNow: false,
          expiredNow: true,
          bonusPoints: 0,
          feedbackText: 'Centrala: brak potwierdzenia komunikatu radiowego [R]',
        };
      }
      return {
        dispatchTriggered: false,
        acknowledgedNow: false,
        expiredNow: false,
        bonusPoints: 0,
        feedbackText: null,
      };
    }

    if (!this.autoTrigger) {
      return {
        dispatchTriggered: false,
        acknowledgedNow: false,
        expiredNow: false,
        bonusPoints: 0,
        feedbackText: null,
      };
    }

    // Trigger when approaching the scheduled target station (mid-tunnel between stations)
    const targetStation = this.stations[this.nextTriggerStationIndex];
    if (
      targetStation &&
      stationIndex >= this.nextTriggerStationIndex &&
      speedKmh >= RADIO_TRIGGER_SPEED_KMH &&
      positionM >= Math.max(115, targetStation.distanceM - 420) &&
      positionM <= targetStation.distanceM - 135
    ) {
      this.triggerDispatch(targetStation.name);
      const stride = this.rng() < 0.5 ? 1 : 2;
      this.nextTriggerStationIndex = stationIndex + stride;
      return {
        dispatchTriggered: true,
        acknowledgedNow: false,
        expiredNow: false,
        bonusPoints: 0,
        feedbackText: null,
      };
    }

    return {
      dispatchTriggered: false,
      acknowledgedNow: false,
      expiredNow: false,
      bonusPoints: 0,
      feedbackText: null,
    };
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
    if (template.category === 'slippery') {
      this.slipperyRailsTimerSec = 28;
    }
  }
}
