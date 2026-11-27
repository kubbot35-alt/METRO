import type { ITimeOfDaySpec, TimeOfDayId } from './types';

export const RUSH_HOUR_SPEC: ITimeOfDaySpec = {
  id: 'rush',
  name: 'Godziny szczytu',
  clockLabel: '08:00',
  description:
    'Tłoczne perony, częstsze pociągi z naprzeciwka, większe ryzyko czerwonych semaforów i wydłużona wymiana pasażerów (7 s).',
  startClockSec: 8 * 3600,
  boardingDurationSec: 7.0,
  passengerMultiplier: 1.65,
  redSignalProbability: 0.34,
  trafficSpawnMinSec: 22,
  trafficSpawnMaxSec: 40,
  stationLightIntensityA: 72,
  stationLightIntensityB: 50,
  ambientLightIntensity: 0.85,
  stationLightColorHex: 0xe0f2fe,
  fogDensity: 0.0095,
};

export const LATE_EVENING_SPEC: ITimeOfDaySpec = {
  id: 'evening',
  name: 'Późny wieczór',
  clockLabel: '23:30',
  description:
    'Przyciemnione, ciepłe oświetlenie stacji, pojedynczy pasażerowie na peronach, rzadsze mijanki i spokojniejszy ruch w tunelu.',
  startClockSec: 23 * 3600 + 30 * 60,
  boardingDurationSec: 5.0,
  passengerMultiplier: 0.25,
  redSignalProbability: 0.08,
  trafficSpawnMinSec: 70,
  trafficSpawnMaxSec: 115,
  stationLightIntensityA: 24,
  stationLightIntensityB: 16,
  ambientLightIntensity: 0.36,
  stationLightColorHex: 0xfde68a,
  fogDensity: 0.0128,
};

export const NIGHT_SERVICE_SPEC: ITimeOfDaySpec = {
  id: 'night_service',
  name: 'Nocny Serwis',
  clockLabel: '02:30',
  description:
    'Nocna przerwa techniczna: brak pasażerów, przygaszone stacje z kogutami i inspekcja ekip torowych (≤ 20 km/h + klakson).',
  startClockSec: 2 * 3600 + 30 * 60,
  boardingDurationSec: 4.0,
  passengerMultiplier: 0,
  redSignalProbability: 0.14,
  trafficSpawnMinSec: 120,
  trafficSpawnMaxSec: 185,
  stationLightIntensityA: 11,
  stationLightIntensityB: 8,
  ambientLightIntensity: 0.22,
  stationLightColorHex: 0xf59e0b,
  fogDensity: 0.0138,
};

export const TIME_OF_DAY_CATALOG: readonly ITimeOfDaySpec[] = [
  RUSH_HOUR_SPEC,
  LATE_EVENING_SPEC,
  NIGHT_SERVICE_SPEC,
];

export function getTimeOfDaySpec(id: TimeOfDayId): ITimeOfDaySpec {
  if (id === 'evening') {
    return LATE_EVENING_SPEC;
  }
  if (id === 'night_service') {
    return NIGHT_SERVICE_SPEC;
  }
  return RUSH_HOUR_SPEC;
}

export function computeEffectivePassengers(baseWaiting: number, multiplier: number): number {
  if (multiplier <= 0 || baseWaiting <= 0) {
    return 0;
  }
  return Math.max(2, Math.round(baseWaiting * multiplier));
}
