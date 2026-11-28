import type { ISimulationSnapshot, LanguageId } from './types';

export type CabControlId =
  | 'doors_left'
  | 'doors_right'
  | 'lights'
  | 'wipers'
  | 'horn'
  | 'intercom'
  | 'czuwak'
  | 'emergency';

export interface ICabControlSpec {
  readonly id: CabControlId;
  readonly labelPl: string;
  readonly labelEn: string;
  readonly keyHint: string;
  readonly baseHex: number;
  readonly activeHex: number;
}

export interface ICabLampState {
  readonly emissiveHex: number;
  readonly intensity: number;
  readonly active: boolean;
}

export interface ICabHoverTooltip {
  readonly controlId: CabControlId;
  readonly screenX: number;
  readonly screenY: number;
}

export const CAB_CONTROLS_CATALOG: readonly ICabControlSpec[] = [
  { id: 'doors_left', labelPl: 'Drzwi lewe', labelEn: 'Left doors', keyHint: 'Q', baseHex: 0x064e3b, activeHex: 0x22c55e },
  { id: 'doors_right', labelPl: 'Drzwi prawe', labelEn: 'Right doors', keyHint: 'E', baseHex: 0x064e3b, activeHex: 0x22c55e },
  { id: 'czuwak', labelPl: 'Czuwak SHP', labelEn: 'Vigilance (Czuwak)', keyHint: 'C', baseHex: 0x78350f, activeHex: 0xf59e0b },
  { id: 'emergency', labelPl: 'Hamulec bezpieczeństwa / SOP-2', labelEn: 'Emergency brake / SOP-2', keyHint: 'B', baseHex: 0x7f1d1d, activeHex: 0xef4444 },
  { id: 'lights', labelPl: 'Światła czołowe', labelEn: 'Headlights', keyHint: 'L', baseHex: 0x1e3a5f, activeHex: 0x38bdf8 },
  { id: 'wipers', labelPl: 'Wycieraczki', labelEn: 'Wipers', keyHint: 'X', baseHex: 0x164e63, activeHex: 0x06b6d4 },
  { id: 'horn', labelPl: 'Sygnał dźwiękowy (Klakson)', labelEn: 'Horn', keyHint: 'H', baseHex: 0x713f12, activeHex: 0xfacc15 },
  { id: 'intercom', labelPl: 'Interkom pasażerski (PA)', labelEn: 'Passenger Intercom (PA)', keyHint: 'I', baseHex: 0x134e4a, activeHex: 0x2dd4bf },
];

export function getCabControlSpec(id: CabControlId): ICabControlSpec {
  return CAB_CONTROLS_CATALOG.find((item) => item.id === id) ?? CAB_CONTROLS_CATALOG[0];
}

export function formatCabControlLabel(id: CabControlId, language: LanguageId): string {
  const spec = getCabControlSpec(id);
  const name = language === 'en' ? spec.labelEn : spec.labelPl;
  return `${name} [${spec.keyHint}]`;
}

function computeDoorLampState(
  snapshot: ISimulationSnapshot,
  side: 'left' | 'right',
  blinkFast: boolean,
  blinkSlow: boolean,
): ICabLampState {
  const isOpen = snapshot.doorState === 'open' && snapshot.openDoorSide === side;
  const fault = snapshot.doorFault.phase !== 'none';
  if (fault && isOpen) {
    return { emissiveHex: 0xf59e0b, intensity: blinkFast ? 2.1 : 0.35, active: true };
  }
  if (isOpen) {
    return { emissiveHex: 0x22c55e, intensity: blinkSlow ? 2.1 : 0.55, active: true };
  }
  const stationSide = snapshot.currentStation.station.platformSide ?? 'left';
  if (snapshot.canToggleDoors && stationSide === side) {
    return { emissiveHex: 0x10b981, intensity: 0.95, active: true };
  }
  return { emissiveHex: 0x064e3b, intensity: 0.16, active: false };
}

function computeEmergencyLampState(snapshot: ISimulationSnapshot, blinkFast: boolean): ICabLampState {
  const alarm = snapshot.kinematics.emergencyBrake || snapshot.atpActive || snapshot.sop2.status === 'intervention';
  if (alarm) {
    return { emissiveHex: 0xef4444, intensity: blinkFast ? 2.4 : 0.45, active: true };
  }
  if (snapshot.sop2.status === 'warning' || snapshot.isOverspeeding) {
    return { emissiveHex: 0xf97316, intensity: blinkFast ? 1.9 : 0.4, active: true };
  }
  return { emissiveHex: 0x7f1d1d, intensity: 0.28, active: false };
}

function computeLightsLampState(snapshot: ISimulationSnapshot): ICabLampState {
  if (snapshot.headlightMode === 'high') {
    return { emissiveHex: 0x38bdf8, intensity: 2.1, active: true };
  }
  if (snapshot.headlightMode === 'low') {
    return { emissiveHex: 0xfbbf24, intensity: 1.35, active: true };
  }
  return { emissiveHex: 0x1e3a5f, intensity: 0.14, active: false };
}

function computeIntercomLampState(snapshot: ISimulationSnapshot, blinkSlow: boolean): ICabLampState {
  if (snapshot.paIntercom.activeMessage !== null) {
    return { emissiveHex: 0x2dd4bf, intensity: blinkSlow ? 2.0 : 0.8, active: true };
  }
  if (snapshot.paIntercom.cooldownRemainingSec > 0.1) {
    return { emissiveHex: 0xd97706, intensity: 0.55, active: false };
  }
  return { emissiveHex: 0x134e4a, intensity: 0.24, active: false };
}

export function computeCabLampStates(
  snapshot: ISimulationSnapshot,
  elapsedSec: number,
): Record<CabControlId, ICabLampState> {
  const blinkFast = Math.sin(elapsedSec * 12) > 0;
  const blinkSlow = Math.sin(elapsedSec * 5.2) > 0;
  return {
    doors_left: computeDoorLampState(snapshot, 'left', blinkFast, blinkSlow),
    doors_right: computeDoorLampState(snapshot, 'right', blinkFast, blinkSlow),
    czuwak: snapshot.czuwak.active
      ? { emissiveHex: 0xf59e0b, intensity: blinkFast ? 2.3 : 0.35, active: true }
      : { emissiveHex: 0x78350f, intensity: 0.16, active: false },
    emergency: computeEmergencyLampState(snapshot, blinkFast),
    lights: computeLightsLampState(snapshot),
    wipers: snapshot.weather.wipersOn
      ? { emissiveHex: 0x06b6d4, intensity: 1.65, active: true }
      : { emissiveHex: 0x164e63, intensity: 0.14, active: false },
    horn: snapshot.hornActive
      ? { emissiveHex: 0xfacc15, intensity: 2.1, active: true }
      : { emissiveHex: 0x713f12, intensity: 0.18, active: false },
    intercom: computeIntercomLampState(snapshot, blinkSlow),
  };
}
