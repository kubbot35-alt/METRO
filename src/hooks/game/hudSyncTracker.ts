import type { ISimulationSnapshot } from '../../domain/types';

interface ITrackedHudFields {
  readonly phase: string;
  readonly score: number;
  readonly doorState: string;
  readonly openDoorSide: string | null;
  readonly headlightMode: string;
  readonly cabLightOn: boolean;
  readonly dimPrompt: boolean;
  readonly nightPassed: number;
  readonly nightViolated: number;
  readonly nightApproachId: number;
  readonly wipersOn: boolean;
  readonly wheelSlip: boolean;
  readonly passengersCarried: number;
  readonly annId: number;
  readonly czuwakActive: boolean;
  readonly radioActive: boolean;
  readonly radioId: number;
  readonly doorFault: string;
  readonly cameraMode: string;
  readonly cameraNoticeId: number;
  readonly lineId: string;
  readonly trainModelId: string;
  readonly timeOfDayId: string;
  readonly academyStep: number;
  readonly academyHighlight: string | null;
  readonly splitsCount: number;
  readonly atoEnabled: boolean;
  readonly atoStatus: string;
  readonly comfortPct: number;
  readonly paMessageId: number;
  readonly turnaroundPhase: string;
}

function extractCabAndRouteFields(snap: ISimulationSnapshot) {
  return {
    phase: snap.phase,
    score: snap.score,
    doorState: snap.doorState,
    openDoorSide: snap.openDoorSide,
    headlightMode: snap.headlightMode,
    cabLightOn: snap.cabLightOn,
    dimPrompt: snap.lightingEffects.dimHighBeamPromptActive,
    wipersOn: snap.weather.wipersOn,
    wheelSlip: snap.weather.wheelSlipActive,
    passengersCarried: snap.passengersCarried,
    cameraMode: snap.cameraMode,
    cameraNoticeId: snap.cameraNotice?.id ?? -1,
    lineId: snap.line.id,
    trainModelId: snap.trainModel.id,
    timeOfDayId: snap.timeOfDay.id,
  };
}

function extractSafetyAndModeFields(snap: ISimulationSnapshot) {
  return {
    nightPassed: snap.nightInspection.passedCount,
    nightViolated: snap.nightInspection.violatedCount,
    nightApproachId: snap.nightInspection.activeApproachCrew?.id ?? -1,
    annId: snap.announcement?.id ?? -1,
    czuwakActive: snap.czuwak.active,
    radioActive: snap.radio.active,
    radioId: snap.radio.messageId,
    doorFault: snap.doorFault.phase,
    academyStep: snap.academy?.currentStep ?? 0,
    academyHighlight: snap.academy?.highlightTarget ?? null,
    splitsCount: snap.stationSplits.length,
    atoEnabled: snap.atoEnabled,
    atoStatus: snap.atoStatus,
    comfortPct: snap.comfort.currentPercent,
    paMessageId: snap.paIntercom.activeMessage?.id ?? -1,
    turnaroundPhase: snap.turnaround.phase,
  };
}

function extractTrackedFields(snap: ISimulationSnapshot): ITrackedHudFields {
  return {
    ...extractCabAndRouteFields(snap),
    ...extractSafetyAndModeFields(snap),
  };
}

function hasTrackedFieldChanged(prev: ITrackedHudFields, next: ITrackedHudFields): boolean {
  const keys = Object.keys(next) as (keyof ITrackedHudFields)[];
  for (const key of keys) {
    if (prev[key] !== next[key]) {
      return true;
    }
  }
  return false;
}

export class HudSyncTracker {
  private prev: ITrackedHudFields;
  private lastSyncMs = 0;

  public constructor(initialSnapshot: ISimulationSnapshot) {
    this.prev = extractTrackedFields(initialSnapshot);
  }

  public shouldSync(snap: ISimulationSnapshot, nowMs: number, intervalMs: number): boolean {
    const next = extractTrackedFields(snap);
    const discreteChanged = hasTrackedFieldChanged(this.prev, next);
    if (!discreteChanged && nowMs - this.lastSyncMs < intervalMs) {
      return false;
    }
    this.prev = next;
    this.lastSyncMs = nowMs;
    return true;
  }
}
