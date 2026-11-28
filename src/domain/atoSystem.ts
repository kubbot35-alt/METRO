import type { AtoStatus } from './types';
import {
  canEnableAtoForMode,
  computeKinematicTargetKmh,
  type IAtoCommand,
  type IAtoContext,
  type IAtoController,
} from './atoContracts';

export { canEnableAtoForMode, type IAtoCommand, type IAtoContext, type IAtoController };

const SPEED_MARGIN_KMH = 2.4;
const RED_SIGNAL_STOP_BUFFER_M = 18;
const COMFORT_BRAKE_MS2 = 0.68;
const SIGNAL_BRAKE_MS2 = 0.72;
const YELLOW_TARGET_KMH = 26.5;
const TRACKWORK_TARGET_KMH = 22.5;
const STATION_FINAL_STOP_M = 2.6;
const STATION_CREEP_KMH = 6.5;

type DoorAutomationSlice = Pick<IAtoCommand, 'leverAxis' | 'toggleDoorsLeft' | 'toggleDoorsRight' | 'status'>;

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export class MetroAtoController implements IAtoController {
  private doorActionCooldownSteps = 0;

  public reset(): void {
    this.doorActionCooldownSteps = 0;
  }

  public computeControl(ctx: IAtoContext): IAtoCommand {
    if (this.doorActionCooldownSteps > 0) this.doorActionCooldownSteps -= 1;
    const acknowledgeCzuwak = ctx.czuwakActive;
    const acknowledgeRadio = ctx.radioActive;
    const toggleWipers = (ctx.rainIntensity > 0.15 && !ctx.wipersOn) || (ctx.rainIntensity <= 0.04 && ctx.wipersOn);
    const toggleHeadlights = !ctx.headlightsOn && ctx.isEveningOrTunnel;
    const doorCmd = this.evaluateDoorAutomation(ctx);
    if (doorCmd) {
      return { ...doorCmd, acknowledgeCzuwak, acknowledgeRadio, toggleWipers, toggleHeadlights };
    }
    const { targetKmh, status } = this.computeTargetSpeed(ctx);
    return {
      leverAxis: this.computeLeverAxis(ctx.speedKmh, targetKmh, ctx.gradePercent),
      toggleDoorsLeft: false, toggleDoorsRight: false,
      acknowledgeCzuwak, acknowledgeRadio, toggleWipers, toggleHeadlights, status,
    };
  }

  private evaluateDoorAutomation(ctx: IAtoContext): DoorAutomationSlice | null {
    if (ctx.doorState === 'open') return this.evaluateOpenDoors(ctx);
    if (!ctx.skipStations && !ctx.currentStation.boarded && ctx.canToggleDoors && ctx.speedKmh <= 0.35) {
      const shouldPress = this.consumeDoorCooldown();
      return {
        leverAxis: -0.45,
        toggleDoorsLeft: shouldPress && ctx.expectedPlatformSide === 'left',
        toggleDoorsRight: shouldPress && ctx.expectedPlatformSide === 'right',
        status: 'boarding',
      };
    }
    return null;
  }

  private evaluateOpenDoors(ctx: IAtoContext): DoorAutomationSlice {
    const side = ctx.openDoorSide ?? ctx.expectedPlatformSide;
    const readyToClose = ctx.boardingCompletedForCurrent && ctx.doorFaultPhase === 'none';
    const needRetry = ctx.doorFaultPhase === 'awaiting-retry';
    const shouldPress = (needRetry || readyToClose) ? this.consumeDoorCooldown() : false;
    return {
      leverAxis: -0.45,
      toggleDoorsLeft: shouldPress && side === 'left',
      toggleDoorsRight: shouldPress && side === 'right',
      status: readyToClose ? 'departing' : 'boarding',
    };
  }

  private consumeDoorCooldown(): boolean {
    if (this.doorActionCooldownSteps !== 0) return false;
    this.doorActionCooldownSteps = 10;
    return true;
  }

  private computeTargetSpeed(ctx: IAtoContext): { readonly targetKmh: number; readonly status: AtoStatus } {
    let targetKmh = Math.max(8, ctx.speedLimitKmh - SPEED_MARGIN_KMH);
    let status: AtoStatus = 'cruising';
    targetKmh = Math.min(targetKmh, this.computeTrackworkCap(ctx), this.computeCurveCap(ctx));
    const sig = this.applySignalCap(ctx, targetKmh, status);
    if (sig.holdImmediate) return { targetKmh: 0, status: 'signal-hold' };
    targetKmh = sig.targetKmh;
    status = sig.status;
    return this.applyStationCap(ctx, targetKmh, status);
  }

  private computeTrackworkCap(ctx: IAtoContext): number {
    if (ctx.activeTrackworkZone) return TRACKWORK_TARGET_KMH;
    if (ctx.upcomingTrackworkDistanceM !== null && ctx.upcomingTrackworkDistanceM < 190) {
      return computeKinematicTargetKmh(TRACKWORK_TARGET_KMH, Math.max(0, ctx.upcomingTrackworkDistanceM - 10), COMFORT_BRAKE_MS2);
    }
    return Infinity;
  }

  private computeCurveCap(ctx: IAtoContext): number {
    if (ctx.upcomingCurveLimitKmh === null || ctx.upcomingCurveDistanceM === null || ctx.upcomingCurveDistanceM >= 180) {
      return Infinity;
    }
    return computeKinematicTargetKmh(
      Math.max(15, ctx.upcomingCurveLimitKmh - 2.5), Math.max(0, ctx.upcomingCurveDistanceM - 8), COMFORT_BRAKE_MS2,
    );
  }

  private applySignalCap(
    ctx: IAtoContext,
    targetKmh: number,
    status: AtoStatus,
  ): { targetKmh: number; status: AtoStatus; holdImmediate: boolean } {
    if (!ctx.nextSignal) return { targetKmh, status, holdImmediate: false };
    const { aspect } = ctx.nextSignal.signal;
    const aheadM = ctx.nextSignal.distanceAheadM;
    if (aspect === 'yellow' && aheadM < 190) {
      const yellowCap = computeKinematicTargetKmh(YELLOW_TARGET_KMH, Math.max(0, aheadM - 12), SIGNAL_BRAKE_MS2);
      return { targetKmh: Math.min(targetKmh, yellowCap), status, holdImmediate: false };
    }
    if (aspect === 'red') {
      const stopDist = aheadM - RED_SIGNAL_STOP_BUFFER_M;
      if (stopDist <= 2.5) return { targetKmh: 0, status: 'signal-hold', holdImmediate: true };
      const redCap = computeKinematicTargetKmh(0, stopDist, SIGNAL_BRAKE_MS2);
      if (redCap < targetKmh) return { targetKmh: redCap, status: 'signal-hold', holdImmediate: false };
    }
    return { targetKmh, status, holdImmediate: false };
  }

  private applyStationCap(
    ctx: IAtoContext,
    targetKmh: number,
    status: AtoStatus,
  ): { readonly targetKmh: number; readonly status: AtoStatus } {
    if (ctx.skipStations || ctx.currentStation.boarded) return { targetKmh: Math.max(0, targetKmh), status };
    const dist = ctx.currentStation.distanceToTargetM;
    if (ctx.currentStation.inStopZone && dist <= STATION_FINAL_STOP_M) return { targetKmh: 0, status: 'approaching' };
    if (dist > 0 && dist < 270) {
      const stationCap = computeKinematicTargetKmh(0, Math.max(0, dist - 1.2), COMFORT_BRAKE_MS2);
      const guidedCap = dist > STATION_FINAL_STOP_M + 1.2 ? Math.max(STATION_CREEP_KMH, stationCap) : stationCap;
      if (guidedCap < targetKmh) return { targetKmh: guidedCap, status: 'approaching' };
    }
    return { targetKmh: Math.max(0, targetKmh), status };
  }

  private computeLeverAxis(speedKmh: number, targetKmh: number, gradePercent: number): number {
    if (targetKmh <= 0.15) return speedKmh > 2.5 ? -0.68 : -0.48;
    const errorKmh = targetKmh - speedKmh;
    const gradeBias = clamp(gradePercent * 0.065, -0.25, 0.28);
    if (errorKmh > 0.7) return clamp(errorKmh / 14 + gradeBias, 0.1, 0.88);
    if (errorKmh < -0.9) return clamp(errorKmh / 11 + gradeBias, -0.92, -0.08);
    return clamp(gradeBias, -0.25, 0.25);
  }
}
