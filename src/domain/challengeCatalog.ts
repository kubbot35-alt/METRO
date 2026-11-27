import type { ChallengeId, IChallengeOutcome, IChallengeSpec } from './types';

export const CHALLENGE_CATALOG: readonly IChallengeSpec[] = [
  {
    id: 'inverter_fault',
    title: 'Awaria falownika',
    shortLabel: 'Moc 60% · Opóźn. < 20s',
    badge: 'MOC 60%',
    description:
      'Moc silników trakcyjnych ograniczona do 60%. Wolniejsze przyspieszenie i trudniejsze podjazdy — ukończ kurs ze średnim opóźnieniem poniżej 20 sekund.',
    objectiveSummary: 'Moc 60% · Cel: opóźnienie < 20 s · Wszystkie stacje',
    tractionMultiplier: 0.6,
    skipStations: false,
    stationPassLimitKmh: null,
    maxAllowedDelaySec: 20,
    forceTimeOfDay: null,
    redSignalProbability: null,
    doorFaultProbability: null,
    czuwakMinSec: null,
    czuwakMaxSec: null,
    rewardAchievementId: 'challenge_inverter_fault',
  },
  {
    id: 'technical_run',
    title: 'Przejazd techniczny',
    shortLabel: 'Bez postojów · Stacje 40 km/h',
    badge: 'BEZ PASAŻERÓW',
    description:
      'Pusty skład służbowy bez zatrzymań na stacjach. Mijaj perony z ograniczeniem do 40 km/h, pilnując semaforów, zakrętów oraz czuwaka.',
    objectiveSummary: 'Bez postojów · Limit 40 km/h na stacjach · Bez wykroczeń ATP',
    tractionMultiplier: 1.0,
    skipStations: true,
    stationPassLimitKmh: 40,
    maxAllowedDelaySec: null,
    forceTimeOfDay: null,
    redSignalProbability: null,
    doorFaultProbability: 0,
    czuwakMinSec: null,
    czuwakMaxSec: null,
    rewardAchievementId: 'challenge_technical_run',
  },
  {
    id: 'black_series',
    title: 'Czarna seria',
    shortLabel: 'Szczyt · Czuwak 30s · Awarie',
    badge: 'EKSTREMALNY',
    description:
      'Godziny szczytu, bardzo częste czerwone semafory, częstsze awarie drzwi i czuwak co 30 sekund. Sprawdzian dla najlepszych maszynistów.',
    objectiveSummary: 'Szczyt 08:00 · Czuwak co 30 s · Częste semafory i awarie drzwi',
    tractionMultiplier: 1.0,
    skipStations: false,
    stationPassLimitKmh: null,
    maxAllowedDelaySec: null,
    forceTimeOfDay: 'rush',
    redSignalProbability: 0.52,
    doorFaultProbability: 0.65,
    czuwakMinSec: 28,
    czuwakMaxSec: 32,
    rewardAchievementId: 'challenge_black_series',
  },
  {
    id: 'night_service',
    title: 'Nocny Serwis (Inspekcja)',
    shortLabel: '02:30 · Ekipy ≤20 km/h + Klakson',
    badge: '02:30 SERWIS',
    description:
      'Nocna przerwa techniczna bez pasażerów, przygaszone stacje z lampami awaryjnymi i losowe ekipy torowe. Mijaj każdą ekipę ≤ 20 km/h po nadaniu klaksonu [H].',
    objectiveSummary: '02:30 · Brak pasażerów · Ekipy torowe: ≤ 20 km/h + Klakson [H]',
    tractionMultiplier: 1.0,
    skipStations: true,
    stationPassLimitKmh: null,
    maxAllowedDelaySec: null,
    forceTimeOfDay: 'night_service',
    redSignalProbability: 0.14,
    doorFaultProbability: 0,
    czuwakMinSec: null,
    czuwakMaxSec: null,
    rewardAchievementId: 'night_inspector',
  },
];

export function getChallengeSpec(id: ChallengeId): IChallengeSpec {
  return CHALLENGE_CATALOG.find((item) => item.id === id) ?? CHALLENGE_CATALOG[0];
}

export interface IChallengeEvalInput {
  readonly challenge: IChallengeSpec;
  readonly stationsServed: number;
  readonly stationsMissed: number;
  readonly totalStations: number;
  readonly averageDeviationSec: number;
  readonly finalDeviationSec: number;
  readonly redSignalViolations: number;
  readonly overspeedViolations: number;
  readonly czuwakViolations: number;
  readonly nightCrewTotal?: number;
  readonly nightCrewPassed?: number;
  readonly nightCrewViolated?: number;
}

export function evaluateChallengeOutcome(input: IChallengeEvalInput): IChallengeOutcome {
  const { challenge } = input;
  if (challenge.id === 'inverter_fault') {
    const worstDelay = Math.max(input.averageDeviationSec, input.finalDeviationSec);
    if (input.stationsMissed > 0) {
      return {
        passed: false,
        reason: `Pominięto stacje (${input.stationsMissed}) — wymagana obsługa całej trasy.`,
      };
    }
    if (worstDelay >= (challenge.maxAllowedDelaySec ?? 20)) {
      return {
        passed: false,
        reason: `Opóźnienie ${Math.round(worstDelay)} s przekroczyło limit ${challenge.maxAllowedDelaySec ?? 20} s.`,
      };
    }
    return {
      passed: true,
      reason: `Ukończono z mocą 60% i opóźnieniem ${Math.max(0, Math.round(worstDelay))} s (< 20 s).`,
    };
  }

  if (challenge.id === 'technical_run') {
    if (input.redSignalViolations > 0) {
      return {
        passed: false,
        reason: `Przejechano czerwony semafor (${input.redSignalViolations}x).`,
      };
    }
    if (input.czuwakViolations > 0) {
      return {
        passed: false,
        reason: `Brak potwierdzenia czuwaka (${input.czuwakViolations}x).`,
      };
    }
    if (input.overspeedViolations > 2) {
      return {
        passed: false,
        reason: `Zbyt wiele przekroczeń prędkości (${input.overspeedViolations}x, maks. 2).`,
      };
    }
    return {
      passed: true,
      reason: 'Bezpieczny przejazd techniczny przez całą trasę zgodnie z limitami.',
    };
  }

  if (challenge.id === 'night_service') {
    const total = input.nightCrewTotal ?? 0;
    const passed = input.nightCrewPassed ?? 0;
    const violated = input.nightCrewViolated ?? 0;
    if (violated > 0) {
      return {
        passed: false,
        reason: `Naruszenie zasad BHP przy ekipach torowych (${violated} z ${total}) — wymagane ≤ 20 km/h i klakson [H].`,
      };
    }
    if (input.redSignalViolations > 0 || input.czuwakViolations > 0) {
      return {
        passed: false,
        reason: 'Naruszenie sygnalizacji ATP lub czuwaka podczas nocnej inspekcji tunelu.',
      };
    }
    return {
      passed: true,
      reason: `Bezbłędna inspekcja nocna! Wszystkie punkty kontrolne (${passed}/${total}) zaliczone bezpiecznie.`,
    };
  }

  // black_series
  if (input.stationsMissed > 0) {
    return {
      passed: false,
      reason: `Pominięto stacje (${input.stationsMissed}) podczas Czarnej serii.`,
    };
  }
  if (input.redSignalViolations > 1 || input.czuwakViolations > 1) {
    return {
      passed: false,
      reason: 'Zbyt wiele poważnych naruszeń ATP lub czuwaka w trybie Czarna seria.',
    };
  }
  return {
    passed: true,
    reason: 'Przetrwałeś Czarną serię i doprowadziłeś skład bezpiecznie do końca trasy!',
  };
}
