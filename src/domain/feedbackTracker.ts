import type { FeedbackTone, IFeedbackMessage } from './types';

export interface IFeedbackTracker {
  push(text: string, pointsDelta: number, tone: FeedbackTone, durationSec?: number): void;
  tick(dtSec: number): void;
  getCurrent(): IFeedbackMessage | null;
  reset(): void;
}

export class FeedbackTracker implements IFeedbackTracker {
  private current: IFeedbackMessage | null = null;
  private counter = 0;

  public push(
    text: string,
    pointsDelta: number,
    tone: FeedbackTone,
    durationSec = 3.4,
  ): void {
    this.counter += 1;
    this.current = {
      id: this.counter,
      text,
      pointsDelta,
      tone,
      remainingSec: durationSec,
    };
  }

  public tick(dtSec: number): void {
    if (!this.current) {
      return;
    }
    const nextRemaining = this.current.remainingSec - dtSec;
    this.current = nextRemaining > 0 ? { ...this.current, remainingSec: nextRemaining } : null;
  }

  public getCurrent(): IFeedbackMessage | null {
    return this.current;
  }

  public reset(): void {
    this.current = null;
  }
}
