import type { IPaActiveMessage, IPaAnnouncementSpec, IPaIntercomState, PaAnnouncementId } from './types';
import {
  PA_ANNOUNCEMENT_SPECS,
  getPaAnnouncementSpec,
  isPaBonusConditionMet,
  type IPaIntercomController,
  type IPaTriggerContext,
  type IPaTriggerResult,
} from './paIntercomCatalog';

export {
  PA_ANNOUNCEMENT_SPECS,
  getPaAnnouncementSpec,
  isPaBonusConditionMet,
  type IPaIntercomController,
  type IPaTriggerContext,
  type IPaTriggerResult,
};

type PaEffectDelta = Omit<IPaTriggerResult, 'accepted' | 'announcementId' | 'spec'>;

const NEUTRAL_PA_EFFECT: PaEffectDelta = {
  comfortBonus: 0,
  boardingSpeedupSec: 0,
  doorFaultProtectionApplied: false,
  effectFeedbackPl: 'Interkom PA: nadano komunikat w wagonach',
  effectTone: 'neutral',
};

function rejectedResult(spec: IPaAnnouncementSpec): IPaTriggerResult {
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
    if (this.cooldownRemainingSec > 0) return rejectedResult(spec);
    const announcementId = this.nextMessageId;
    this.nextMessageId += 1;
    this.announcementsUsedCount += 1;
    this.cooldownRemainingSec = spec.cooldownSec;
    this.activeMessage = {
      id: announcementId, specId: spec.id, textPl: spec.textPl, textEn: spec.textEn, remainingSec: 4.5,
    };
    return { accepted: true, announcementId, spec, ...this.evaluateEffect(id, ctx) };
  }

  public getState(): IPaIntercomState {
    return {
      activeMessage: this.activeMessage,
      cooldownRemainingSec: Number(this.cooldownRemainingSec.toFixed(1)),
      announcementsUsedCount: this.announcementsUsedCount,
      doorFaultProtectionActive: this.doorProtectedStations.size > 0,
    };
  }

  private evaluateEffect(id: PaAnnouncementId, ctx: IPaTriggerContext): PaEffectDelta {
    if (id === 'stand_clear_doors' && ctx.doorState === 'open') return this.applyStandClearEffect(ctx);
    if (id === 'tunnel_stop_apology' && isPaBonusConditionMet(id, ctx) && ctx.nextSignal) {
      return this.applyTunnelApologyEffect(ctx.nextSignal.signal.id);
    }
    if (id === 'wet_rails_caution' && ctx.weatherMode === 'rain' && this.rainBonusCooldownSec <= 0) {
      this.rainBonusCooldownSec = 35;
      return {
        comfortBonus: 4, boardingSpeedupSec: 0, doorFaultProtectionApplied: false,
        effectFeedbackPl: 'Interkom PA: ostrzeżenie na deszczu (+4% komfortu)', effectTone: 'success',
      };
    }
    return NEUTRAL_PA_EFFECT;
  }

  private applyStandClearEffect(ctx: IPaTriggerContext): PaEffectDelta {
    const alreadyApplied = this.doorSpeedupStations.has(ctx.stationIndex);
    this.doorProtectedStations.add(ctx.stationIndex);
    if (!alreadyApplied && ctx.timeOfDayId === 'rush' && !ctx.boardingCompleted) {
      this.doorSpeedupStations.add(ctx.stationIndex);
      return {
        comfortBonus: 0, boardingSpeedupSec: 1.5, doorFaultProtectionApplied: true,
        effectFeedbackPl: 'Interkom PA: szybsza wymiana pasażerów (-1,5 s) i ochrona drzwi', effectTone: 'success',
      };
    }
    return {
      comfortBonus: 0, boardingSpeedupSec: 0, doorFaultProtectionApplied: true,
      effectFeedbackPl: 'Interkom PA: komunikat drzwiowy — mniejsze ryzyko awarii drzwi', effectTone: 'success',
    };
  }

  private applyTunnelApologyEffect(signalId: number): PaEffectDelta {
    if (this.tunnelApologySignalIds.has(signalId)) return NEUTRAL_PA_EFFECT;
    this.tunnelApologySignalIds.add(signalId);
    return {
      comfortBonus: 5, boardingSpeedupSec: 0, doorFaultProtectionApplied: false,
      effectFeedbackPl: 'Interkom PA: pasażerowie uspokojeni (+5% komfortu)', effectTone: 'success',
    };
  }
}
