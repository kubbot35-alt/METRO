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
  forceTriggerDispatch?(
    customText?: string,
    windowSec?: number,
    category?: RadioDispatchCategory,
  ): boolean;
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

export const RADIO_RESPONSE_WINDOW_SEC = 6.0;
export const RADIO_ACK_BONUS_POINTS = 40;
export const RADIO_TRIGGER_SPEED_KMH = 12;

export interface IRadioTemplateSpec {
  readonly category: RadioDispatchCategory;
  readonly buildText: (stationName: string) => string;
}

export const DISPATCH_TEMPLATES: readonly IRadioTemplateSpec[] = [
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

export const IDLE_RADIO_RESULT: IRadioStepResult = {
  dispatchTriggered: false,
  acknowledgedNow: false,
  expiredNow: false,
  bonusPoints: 0,
  feedbackText: null,
};
