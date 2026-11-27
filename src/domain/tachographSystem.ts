import type {
  ITachographSample,
  ITachographSnapshot,
  ITachographStationMark,
  ITachographViolationMark,
  TachographViolationKind,
} from './types';

export interface ITachographRecorder {
  reset(): void;
  recordStep(
    elapsedTimeSec: number,
    distanceM: number,
    speedKmh: number,
    speedLimitKmh: number,
  ): void;
  recordStationStop(
    elapsedTimeSec: number,
    distanceM: number,
    stationCode: string,
    stationName: string,
  ): void;
  recordViolation(
    elapsedTimeSec: number,
    distanceM: number,
    speedKmh: number,
    kind: TachographViolationKind,
  ): void;
  recordFinalSample(
    elapsedTimeSec: number,
    distanceM: number,
    speedKmh: number,
    speedLimitKmh: number,
  ): void;
  getSnapshot(): ITachographSnapshot;
}

const SAMPLE_INTERVAL_SEC = 1.0;

export class TachographRecorder implements ITachographRecorder {
  private samples: ITachographSample[] = [];
  private stationMarks: ITachographStationMark[] = [];
  private violationMarks: ITachographViolationMark[] = [];
  private nextSampleTimeSec = 0;
  private maxSpeedKmh = 0;
  private lastDurationSec = 0;
  private lastDistanceM = 0;

  public reset(): void {
    this.samples = [];
    this.stationMarks = [];
    this.violationMarks = [];
    this.nextSampleTimeSec = 0;
    this.maxSpeedKmh = 0;
    this.lastDurationSec = 0;
    this.lastDistanceM = 0;
  }

  public recordStep(
    elapsedTimeSec: number,
    distanceM: number,
    speedKmh: number,
    speedLimitKmh: number,
  ): void {
    this.lastDurationSec = Math.max(this.lastDurationSec, elapsedTimeSec);
    this.lastDistanceM = Math.max(this.lastDistanceM, distanceM);
    if (speedKmh > this.maxSpeedKmh) {
      this.maxSpeedKmh = speedKmh;
    }
    if (this.samples.length === 0 || elapsedTimeSec >= this.nextSampleTimeSec) {
      this.samples.push({
        timeSec: Number(elapsedTimeSec.toFixed(1)),
        distanceM: Math.round(distanceM),
        speedKmh: Number(speedKmh.toFixed(1)),
        speedLimitKmh: Math.round(speedLimitKmh),
      });
      this.nextSampleTimeSec = Math.floor(elapsedTimeSec / SAMPLE_INTERVAL_SEC + 1) * SAMPLE_INTERVAL_SEC;
    }
  }

  public recordStationStop(
    elapsedTimeSec: number,
    distanceM: number,
    stationCode: string,
    stationName: string,
  ): void {
    this.stationMarks.push({
      timeSec: Number(elapsedTimeSec.toFixed(1)),
      distanceM: Math.round(distanceM),
      stationCode,
      stationName,
    });
  }

  public recordViolation(
    elapsedTimeSec: number,
    distanceM: number,
    speedKmh: number,
    kind: TachographViolationKind,
  ): void {
    this.violationMarks.push({
      timeSec: Number(elapsedTimeSec.toFixed(1)),
      distanceM: Math.round(distanceM),
      speedKmh: Number(speedKmh.toFixed(1)),
      kind,
    });
  }

  public recordFinalSample(
    elapsedTimeSec: number,
    distanceM: number,
    speedKmh: number,
    speedLimitKmh: number,
  ): void {
    this.lastDurationSec = Math.max(this.lastDurationSec, elapsedTimeSec);
    this.lastDistanceM = Math.max(this.lastDistanceM, distanceM);
    const last = this.samples[this.samples.length - 1];
    if (!last || elapsedTimeSec - last.timeSec >= 0.2) {
      this.samples.push({
        timeSec: Number(elapsedTimeSec.toFixed(1)),
        distanceM: Math.round(distanceM),
        speedKmh: Number(speedKmh.toFixed(1)),
        speedLimitKmh: Math.round(speedLimitKmh),
      });
    }
  }

  public getSnapshot(): ITachographSnapshot {
    return {
      samples: this.samples.slice(),
      stationMarks: this.stationMarks.slice(),
      violationMarks: this.violationMarks.slice(),
      maxSpeedKmh: Number(this.maxSpeedKmh.toFixed(1)),
      totalDurationSec: Number(this.lastDurationSec.toFixed(1)),
      totalDistanceM: Math.round(this.lastDistanceM),
    };
  }
}
