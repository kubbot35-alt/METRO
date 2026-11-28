export type PassengerSeatId = 'window_left' | 'window_right' | 'behind_cab';

export const PASSENGER_CAR_COUNT = 6;
export const PASSENGER_CAR_PITCH_M = 19.4;

export interface IPassengerViewState {
  readonly seatId: PassengerSeatId;
  readonly carIndex: number;
}

export interface IPassengerCameraAnchor {
  readonly carShiftBackM: number;
  readonly eyeBackFromLeadM: number;
  readonly eyeLateralM: number;
  readonly eyeHeightM: number;
  readonly baseYawRad: number;
  readonly basePitchRad: number;
  readonly fovDeg: number;
}

export interface IPassengerSeatSpec {
  readonly id: PassengerSeatId;
  readonly labelPl: string;
  readonly labelEn: string;
}

export const PASSENGER_SEAT_CATALOG: readonly IPassengerSeatSpec[] = [
  { id: 'window_left', labelPl: 'Okno lewe', labelEn: 'Left window' },
  { id: 'window_right', labelPl: 'Okno prawe', labelEn: 'Right window' },
  { id: 'behind_cab', labelPl: 'Za szybą kabiny', labelEn: 'Behind cab glass' },
];

export const DEFAULT_PASSENGER_VIEW: IPassengerViewState = {
  seatId: 'window_left',
  carIndex: 0,
};

export function clampPassengerCarIndex(carIndex: number): number {
  return Math.max(0, Math.min(PASSENGER_CAR_COUNT - 1, Math.round(carIndex)));
}

export function resolvePassengerCameraAnchor(view: IPassengerViewState): IPassengerCameraAnchor {
  const carIdx = clampPassengerCarIndex(view.carIndex);
  const carShiftBackM = carIdx * PASSENGER_CAR_PITCH_M;
  if (view.seatId === 'behind_cab') {
    return {
      carShiftBackM: 0,
      eyeBackFromLeadM: 2.35,
      eyeLateralM: 0.0,
      eyeHeightM: 2.26,
      baseYawRad: 0,
      basePitchRad: -0.04,
      fovDeg: 66,
    };
  }
  const isLeftWindow = view.seatId === 'window_left';
  return {
    carShiftBackM,
    eyeBackFromLeadM: carShiftBackM + 10.2,
    eyeLateralM: isLeftWindow ? -0.78 : 0.78,
    eyeHeightM: 2.18,
    baseYawRad: isLeftWindow ? 0.58 : -0.58,
    basePitchRad: -0.02,
    fovDeg: 70,
  };
}
