export const DEPOT_HALL_START_M = -132;
export const DEPOT_HALL_EXIT_GATE_M = -66;
export const DEPOT_WASH_START_M = -56;
export const DEPOT_WASH_END_M = -36;
export const DEPOT_TURNOUT_START_M = -34;
export const DEPOT_TURNOUT_END_M = -6;
export const DEPOT_HALL_BAY_LATERAL_X_M = -5.2;
export const DEPOT_HALL_SPEED_LIMIT_KMH = 20;
export const DEPOT_WASH_MAX_SPEED_KMH = 10;

export interface IDepotZoneState {
  readonly depotHallStartEnabled: boolean;
  readonly inHall: boolean;
  readonly inTurnout: boolean;
  readonly inWashZone: boolean;
  readonly washSprayActive: boolean;
  readonly depotSpeedLimitKmh: number | null;
}

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function smoothstepDeriv(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return 6 * c * (1 - c);
}

export function evaluateDepotHallLateralX(distanceM: number, depotHallStart: boolean): number {
  if (!depotHallStart || distanceM >= DEPOT_TURNOUT_END_M) {
    return 0;
  }
  if (distanceM <= DEPOT_TURNOUT_START_M) {
    return DEPOT_HALL_BAY_LATERAL_X_M;
  }
  const u = (distanceM - DEPOT_TURNOUT_START_M) / (DEPOT_TURNOUT_END_M - DEPOT_TURNOUT_START_M);
  return DEPOT_HALL_BAY_LATERAL_X_M * (1 - smoothstep(u));
}

export function evaluateDepotHallYawRad(distanceM: number, depotHallStart: boolean): number {
  if (!depotHallStart || distanceM <= DEPOT_TURNOUT_START_M || distanceM >= DEPOT_TURNOUT_END_M) {
    return 0;
  }
  const span = DEPOT_TURNOUT_END_M - DEPOT_TURNOUT_START_M;
  const u = (distanceM - DEPOT_TURNOUT_START_M) / span;
  const dxDs = (-DEPOT_HALL_BAY_LATERAL_X_M * smoothstepDeriv(u)) / span;
  return Math.atan(-dxDs);
}

export function evaluateDepotHallTurnoutSway(distanceM: number, depotHallStart: boolean): number {
  if (!depotHallStart || distanceM < DEPOT_TURNOUT_START_M || distanceM > DEPOT_TURNOUT_END_M) {
    return 0;
  }
  const u = (distanceM - DEPOT_TURNOUT_START_M) / (DEPOT_TURNOUT_END_M - DEPOT_TURNOUT_START_M);
  return Math.sin(u * Math.PI * 2.5) * Math.sin(u * Math.PI);
}

export function computeDepotZoneState(
  positionM: number,
  speedKmh: number,
  hasSurfaceStart: boolean,
  depotHallStart: boolean,
): IDepotZoneState {
  if (!hasSurfaceStart) {
    return {
      depotHallStartEnabled: false,
      inHall: false,
      inTurnout: false,
      inWashZone: false,
      washSprayActive: false,
      depotSpeedLimitKmh: null,
    };
  }
  const inHall = depotHallStart && positionM < DEPOT_HALL_EXIT_GATE_M;
  const inTurnout = depotHallStart && positionM >= DEPOT_TURNOUT_START_M && positionM <= DEPOT_TURNOUT_END_M;
  const inWashZone = positionM >= DEPOT_WASH_START_M && positionM <= DEPOT_WASH_END_M;
  const washSprayActive = inWashZone && speedKmh >= 0.4 && speedKmh <= DEPOT_WASH_MAX_SPEED_KMH + 0.5;
  const depotSpeedLimitKmh = depotHallStart && positionM < -4 ? DEPOT_HALL_SPEED_LIMIT_KMH : null;
  return {
    depotHallStartEnabled: depotHallStart,
    inHall,
    inTurnout,
    inWashZone,
    washSprayActive,
    depotSpeedLimitKmh,
  };
}
