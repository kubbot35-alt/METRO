import { BOARDING_DURATION_SEC, LINE_M1_STATIONS } from './routeData';
import type { IScheduleSnapshot, IStationSpec, PunctualityStatus } from './types';

export interface IScheduleController {
  configure?(startClockSec: number, boardingDurationSec: number): void;
  reset(): void;
  recordStationArrival(stationIndex: number, elapsedSec: number): number;
  getSnapshot(stationIndex: number, positionM: number, elapsedSec: number): IScheduleSnapshot;
}

const BASE_START_CLOCK_SEC = 8 * 3600;
const FIRST_LEG_TRAVEL_SEC = 48;
const SUBSEQUENT_LEG_TOTAL_SEC = 54;
const DWELL_ALLOWANCE_SEC = BOARDING_DURATION_SEC + 3;

export function classifyPunctuality(deviationSec: number): PunctualityStatus {
  if (deviationSec > 30) {
    return 'heavy-delay';
  }
  if (deviationSec > 10) {
    return 'slight-delay';
  }
  return 'on-time';
}

export function formatClockTime(totalSec: number): string {
  const wrapped = ((Math.floor(totalSec) % 86400) + 86400) % 86400;
  const hrs = Math.floor(wrapped / 3600);
  const mins = Math.floor((wrapped % 3600) / 60);
  const secs = wrapped % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatDeviationTime(deviationSec: number): string {
  const rounded = Math.round(deviationSec);
  const sign = rounded > 0 ? '+' : rounded < 0 ? '-' : '';
  const abs = Math.abs(rounded);
  const mins = Math.floor(abs / 60);
  const secs = abs % 60;
  return `${sign}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export class MetroScheduleController implements IScheduleController {
  private readonly stations: readonly IStationSpec[];
  private startClockSec = BASE_START_CLOCK_SEC;
  private dwellAllowanceSec = DWELL_ALLOWANCE_SEC;
  private arrivalTargetsSec: readonly number[] = [];
  private arrivalDeviations: number[] = [];

  public constructor(stations: readonly IStationSpec[] = LINE_M1_STATIONS) {
    this.stations = stations;
    this.rebuildTargets(BOARDING_DURATION_SEC);
  }

  public configure(startClockSec: number, boardingDurationSec: number): void {
    this.startClockSec = startClockSec;
    this.dwellAllowanceSec = boardingDurationSec + 3;
    this.rebuildTargets(boardingDurationSec);
  }

  public reset(): void {
    this.arrivalDeviations = [];
  }

  private rebuildTargets(boardingDurationSec: number): void {
    const extraDwell = Math.max(0, boardingDurationSec - BOARDING_DURATION_SEC);
    const legTotal = SUBSEQUENT_LEG_TOTAL_SEC + extraDwell;
    this.arrivalTargetsSec = this.stations.map((_, idx) =>
      idx === 0 ? FIRST_LEG_TRAVEL_SEC : FIRST_LEG_TRAVEL_SEC + idx * legTotal,
    );
  }

  public recordStationArrival(stationIndex: number, elapsedSec: number): number {
    const target = this.getTargetArrivalSec(stationIndex);
    const deviation = elapsedSec - target;
    this.arrivalDeviations.push(deviation);
    return deviation;
  }

  public getSnapshot(
    stationIndex: number,
    positionM: number,
    elapsedSec: number,
  ): IScheduleSnapshot {
    const targetArrival = this.getTargetArrivalSec(stationIndex);
    const expectedElapsed = this.computeExpectedElapsed(stationIndex, positionM);
    const deviationSec = elapsedSec - expectedElapsed;
    const avg =
      this.arrivalDeviations.length > 0
        ? this.arrivalDeviations.reduce((sum, v) => sum + v, 0) / this.arrivalDeviations.length
        : deviationSec;

    return {
      currentClockSec: this.startClockSec + elapsedSec,
      nextArrivalClockSec: this.startClockSec + targetArrival,
      deviationSec,
      status: classifyPunctuality(deviationSec),
      averageDeviationSec: avg,
      punctualitySamples: this.arrivalDeviations.length,
    };
  }

  private getTargetArrivalSec(stationIndex: number): number {
    const clamped = Math.max(0, Math.min(stationIndex, this.arrivalTargetsSec.length - 1));
    return this.arrivalTargetsSec[clamped] ?? FIRST_LEG_TRAVEL_SEC;
  }

  private computeExpectedElapsed(stationIndex: number, positionM: number): number {
    const clamped = Math.max(0, Math.min(stationIndex, this.stations.length - 1));
    const currentStation = this.stations[clamped];
    if (!currentStation) {
      return 0;
    }
    const prevDistM = clamped > 0 ? this.stations[clamped - 1].distanceM : 0;
    const prevDepSec =
      clamped > 0 ? this.getTargetArrivalSec(clamped - 1) + this.dwellAllowanceSec : 0;
    const nextArrSec = this.getTargetArrivalSec(clamped);
    const spanM = Math.max(1, currentStation.distanceM - prevDistM);
    const progress = Math.max(0, Math.min(1, (positionM - prevDistM) / spanM));
    return prevDepSec + progress * (nextArrSec - prevDepSec);
  }
}
