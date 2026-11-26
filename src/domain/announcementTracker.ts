import type { IAnnouncementState } from './types';

export interface IAnnouncementTracker {
  reset(): void;
  update(
    stationIndex: number,
    stationName: string,
    distanceToTargetM: number,
    speedKmh: number,
    dtSec: number,
  ): void;
  getCurrent(): IAnnouncementState | null;
}

const ANNOUNCEMENT_DURATION_SEC = 6.5;
const DEPARTURE_SPEED_KMH = 2.5;
const ARRIVAL_TRIGGER_DIST_M = 125;

export class StationAnnouncementTracker implements IAnnouncementTracker {
  private current: IAnnouncementState | null = null;
  private nextId = 1;
  private announcedNextIndex = -1;
  private announcedArrivalIndex = -1;

  public reset(): void {
    this.current = null;
    this.announcedNextIndex = -1;
    this.announcedArrivalIndex = -1;
  }

  public update(
    stationIndex: number,
    stationName: string,
    distanceToTargetM: number,
    speedKmh: number,
    dtSec: number,
  ): void {
    this.tickActive(dtSec);
    if (
      stationIndex !== this.announcedArrivalIndex &&
      distanceToTargetM <= ARRIVAL_TRIGGER_DIST_M &&
      distanceToTargetM > -15
    ) {
      this.announcedArrivalIndex = stationIndex;
      this.announcedNextIndex = stationIndex;
      this.push(`Stacja: ${stationName}`, 'arrival');
      return;
    }
    if (
      stationIndex !== this.announcedNextIndex &&
      speedKmh >= DEPARTURE_SPEED_KMH &&
      distanceToTargetM > ARRIVAL_TRIGGER_DIST_M
    ) {
      this.announcedNextIndex = stationIndex;
      this.push(`Następna stacja: ${stationName}`, 'next');
    }
  }

  public getCurrent(): IAnnouncementState | null {
    return this.current;
  }

  private tickActive(dtSec: number): void {
    if (!this.current) {
      return;
    }
    const remainingSec = this.current.remainingSec - dtSec;
    this.current = remainingSec <= 0 ? null : { ...this.current, remainingSec };
  }

  private push(text: string, kind: 'next' | 'arrival'): void {
    this.current = {
      id: this.nextId,
      text,
      kind,
      remainingSec: ANNOUNCEMENT_DURATION_SEC,
    };
    this.nextId += 1;
  }
}
