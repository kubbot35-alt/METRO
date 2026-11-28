import type {
  DoorState,
  FeedbackTone,
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
  if (id === 'stand_clear_doors') return ctx.doorState === 'open';
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
