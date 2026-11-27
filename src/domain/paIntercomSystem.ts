import type {
  DoorState,
  FeedbackTone,
  IPaActiveMessage,
  IPaAnnouncementSpec,
  IPaIntercomState,
  ISemaphoreProgress,
  PaAnnouncementId,
  TimeOfDayId,
  WeatherModeId,
} from './types';

export interface IPaTriggerContext {
  readonly doorState: DoorState;
  readonly boardingCompleted: boolean;
  readonly timeOfDayId: TimeOfDayId;
  readonly speedKmh: number;
  readonly nextSignal: ISemaphoreProgress | null;
  readonly weatherMode: WeatherModeId;
  readonly stationIndex: number;
}

export interface IPaTriggerResult {
  readonly accepted: boolean;
  readonly announcementId: number;
  readonly spec: IPaAnnouncementSpec;
  readonly comfortBonus: number;
  readonly boardingSpeedupSec: number;
  readonly doorFaultProtectionApplied: boolean;
  readonly effectFeedbackPl: string | null;
  readonly effectTone: FeedbackTone;
}

export interface IPaIntercomController {
  reset(): void;
  step(dtSec: number): void;
  trigger(id: PaAnnouncementId, ctx: IPaTriggerContext): IPaTriggerResult;
  isDoorFaultProtected(stationIndex: number): boolean;
  getState(): IPaIntercomState;
}

export const PA_ANNOUNCEMENT_SPECS: readonly IPaAnnouncementSpec[] = [
  {
    id: 'stand_clear_doors',
    shortTitlePl: 'Odjazd — odsunąć się od drzwi',
    shortTitleEn: 'Departure — stand clear of doors',
    textPl: 'Proszę odsunąć się od drzwi, pociąg odjeżdża.',
    textEn: 'Please stand clear of the doors, the train is departing.',
    effectHintPl: 'Szczyt: -1,5 s wymiany pasażerów i mniejsza szansa awarii drzwi',
    effectHintEn: 'Rush hour: -1.5 s boarding time & lower door fault risk',
    cooldownSec: 5.0,
  },
  {
    id: 'tunnel_stop_apology',
    shortTitlePl: 'Postój w tunelu (czerwony semafor)',
    shortTitleEn: 'Tunnel stop apology (red signal)',
    textPl: 'Przepraszamy za chwilowy postój w tunelu.',
    textEn: 'We apologize for the brief stop in the tunnel.',
    effectHintPl: 'Postój przed czerwonym semaforem: +5% komfortu pasażerów',
    effectHintEn: 'Stopped at red semaphore: +5% passenger comfort',
    cooldownSec: 6.0,
  },
  {
    id: 'wet_rails_caution',
    shortTitlePl: 'Ostrożność — trudne warunki',
    shortTitleEn: 'Caution — slippery rail conditions',
    textPl: 'Proszę zachować ostrożność, trudne warunki na torach.',
    textEn: 'Please hold on carefully, difficult rail conditions ahead.',
    effectHintPl: 'Tryb Deszcz: +4% bonusu komfortu pasażerów',
    effectHintEn: 'Rain mode: +4% passenger comfort bonus',
    cooldownSec: 6.0,
  },
];

export function getPaAnnouncementSpec(id: PaAnnouncementId): IPaAnnouncementSpec {
  return PA_ANNOUNCEMENT_SPECS.find((item) => item.id === id) ?? PA_ANNOUNCEMENT_SPECS[0];
}

export function isPaBonusConditionMet(id: PaAnnouncementId, ctx: IPaTriggerContext): boolean {
  if (id === 'stand_clear_doors') {
    return ctx.doorState === 'open';
  }
  if (id === 'tunnel_stop_apology') {
    return (
      ctx.speedKmh <= 2.5 &&
      ctx.nextSignal !== null &&
      ctx.nextSignal.signal.aspect === 'red' &&
      ctx.nextSignal.distanceAheadM >= -5 &&
      ctx.nextSignal.distanceAheadM <= 190
    );
  }
  return ctx.weatherMode === 'rain';
}

export class PaIntercomSystem implements IPaIntercomController {
  private activeMessage: IPaActiveMessage | null = null;
  private nextMessageId = 1;
  private cooldownRemainingSec = 0;
  private announcementsUsedCount = 0;
  private doorSpeedupStations = new Set<number>();
  private doorProtectedStations = new Set<number>();
  private tunnelApologySignalIds = new Set<number>();
  private rainBonusCooldownSec = 0;

  public reset(): void {
    this.activeMessage = null;
    this.cooldownRemainingSec = 0;
    this.announcementsUsedCount = 0;
    this.doorSpeedupStations.clear();
    this.doorProtectedStations.clear();
    this.tunnelApologySignalIds.clear();
    this.rainBonusCooldownSec = 0;
  }

  public step(dtSec: number): void {
    const dt = Math.max(0, dtSec);
    this.cooldownRemainingSec = Math.max(0, this.cooldownRemainingSec - dt);
    this.rainBonusCooldownSec = Math.max(0, this.rainBonusCooldownSec - dt);
    if (this.activeMessage) {
      const rem = this.activeMessage.remainingSec - dt;
      this.activeMessage = rem <= 0 ? null : { ...this.activeMessage, remainingSec: rem };
    }
  }

  public isDoorFaultProtected(stationIndex: number): boolean {
    return this.doorProtectedStations.has(stationIndex);
  }

  public trigger(id: PaAnnouncementId, ctx: IPaTriggerContext): IPaTriggerResult {
    const spec = getPaAnnouncementSpec(id);
    if (this.cooldownRemainingSec > 0) {
      return {
        accepted: false,
        announcementId: 0,
        spec,
        comfortBonus: 0,
        boardingSpeedupSec: 0,
        doorFaultProtectionApplied: false,
        effectFeedbackPl: null,
        effectTone: 'neutral',
      };
    }

    const announcementId = this.nextMessageId;
    this.nextMessageId += 1;
    this.announcementsUsedCount += 1;
    this.cooldownRemainingSec = spec.cooldownSec;
    this.activeMessage = {
      id: announcementId,
      specId: spec.id,
      textPl: spec.textPl,
      textEn: spec.textEn,
      remainingSec: 4.5,
    };

    const effect = this.evaluateEffect(id, ctx);
    return {
      accepted: true,
      announcementId,
      spec,
      ...effect,
    };
  }

  public getState(): IPaIntercomState {
    return {
      activeMessage: this.activeMessage,
      cooldownRemainingSec: Number(this.cooldownRemainingSec.toFixed(1)),
      announcementsUsedCount: this.announcementsUsedCount,
      doorFaultProtectionActive: this.doorProtectedStations.size > 0,
    };
  }

  private evaluateEffect(
    id: PaAnnouncementId,
    ctx: IPaTriggerContext,
  ): Omit<IPaTriggerResult, 'accepted' | 'announcementId' | 'spec'> {
    if (id === 'stand_clear_doors' && ctx.doorState === 'open') {
      const alreadyApplied = this.doorSpeedupStations.has(ctx.stationIndex);
      this.doorProtectedStations.add(ctx.stationIndex);
      if (!alreadyApplied && ctx.timeOfDayId === 'rush' && !ctx.boardingCompleted) {
        this.doorSpeedupStations.add(ctx.stationIndex);
        return {
          comfortBonus: 0,
          boardingSpeedupSec: 1.5,
          doorFaultProtectionApplied: true,
          effectFeedbackPl: 'Interkom PA: szybsza wymiana pasażerów (-1,5 s) i ochrona drzwi',
          effectTone: 'success',
        };
      }
      return {
        comfortBonus: 0,
        boardingSpeedupSec: 0,
        doorFaultProtectionApplied: true,
        effectFeedbackPl: 'Interkom PA: komunikat drzwiowy — mniejsze ryzyko awarii drzwi',
        effectTone: 'success',
      };
    }

    if (id === 'tunnel_stop_apology' && isPaBonusConditionMet(id, ctx) && ctx.nextSignal) {
      const signalId = ctx.nextSignal.signal.id;
      if (!this.tunnelApologySignalIds.has(signalId)) {
        this.tunnelApologySignalIds.add(signalId);
        return {
          comfortBonus: 5,
          boardingSpeedupSec: 0,
          doorFaultProtectionApplied: false,
          effectFeedbackPl: 'Interkom PA: pasażerowie uspokojeni (+5% komfortu)',
          effectTone: 'success',
        };
      }
    }

    if (id === 'wet_rails_caution' && ctx.weatherMode === 'rain' && this.rainBonusCooldownSec <= 0) {
      this.rainBonusCooldownSec = 35;
      return {
        comfortBonus: 4,
        boardingSpeedupSec: 0,
        doorFaultProtectionApplied: false,
        effectFeedbackPl: 'Interkom PA: ostrzeżenie na deszczu (+4% komfortu)',
        effectTone: 'success',
      };
    }

    return {
      comfortBonus: 0,
      boardingSpeedupSec: 0,
      doorFaultProtectionApplied: false,
      effectFeedbackPl: 'Interkom PA: nadano komunikat w wagonach',
      effectTone: 'neutral',
    };
  }
}
