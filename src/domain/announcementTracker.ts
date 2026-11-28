import type { DoorSide, IAnnouncementState } from './types';

export interface IAnnouncementTracker {
  reset(): void;
  update(
    stationIndex: number,
    stationName: string,
    distanceToTargetM: number,
    speedKmh: number,
    dtSec: number,
    platformSide?: DoorSide,
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
    platformSide?: DoorSide,
  ): void {
    this.tickActive(dtSec);
    if (stationIndex !== this.announcedArrivalIndex && distanceToTargetM <= ARRIVAL_TRIGGER_DIST_M && distanceToTargetM > -15) {
      this.triggerArrivalAnnouncement(stationIndex, stationName, platformSide);
      return;
    }
    if (stationIndex !== this.announcedNextIndex && speedKmh >= DEPARTURE_SPEED_KMH && distanceToTargetM > ARRIVAL_TRIGGER_DIST_M) {
      this.announcedNextIndex = stationIndex;
      const text = `Następna stacja: ${stationName}`;
      this.push(text, 'next', text, stationName, platformSide);
    }
  }

  private triggerArrivalAnnouncement(stationIndex: number, stationName: string, platformSide?: DoorSide): void {
    this.announcedArrivalIndex = stationIndex;
    this.announcedNextIndex = stationIndex;
    const sideLabel = platformSide === 'right' ? 'Peron po PRAWEJ [E]' : 'Peron po LEWEJ [Q]';
    const sideSpoken = platformSide === 'right' ? 'Peron po prawej stronie.' : 'Peron po lewej stronie.';
    const displayText = platformSide ? `Stacja: ${stationName} · ${sideLabel}` : `Stacja: ${stationName}`;
    const spokenText = platformSide ? `Stacja: ${stationName}. ${sideSpoken}` : `Stacja: ${stationName}`;
    this.push(displayText, 'arrival', spokenText, stationName, platformSide);
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

  private push(
    text: string,
    kind: 'next' | 'arrival',
    spokenText: string,
    stationName?: string,
    platformSide?: DoorSide,
  ): void {
    this.current = {
      id: this.nextId,
      text,
      spokenText,
      stationName,
      platformSide,
      kind,
      remainingSec: ANNOUNCEMENT_DURATION_SEC,
    };
    this.nextId += 1;
  }
}
