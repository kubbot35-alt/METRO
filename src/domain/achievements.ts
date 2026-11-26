import type {
  AchievementId,
  IAchievementRecord,
  IAchievementSpec,
  ISimulationSnapshot,
} from './types';

export interface IAchievementStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface IAchievementService {
  getCatalog(): readonly IAchievementSpec[];
  getUnlockedRecords(): readonly IAchievementRecord[];
  isUnlocked(id: AchievementId): boolean;
  evaluateAndUnlock(snapshot: ISimulationSnapshot): readonly IAchievementSpec[];
  clear(): void;
}

const STORAGE_KEY = 'metro_m1_achievements_v1';

export const ACHIEVEMENT_CATALOG: readonly IAchievementSpec[] = [
  {
    id: 'first_station_stop',
    title: 'Pierwszy przystanek',
    description: 'Obsłuż pierwszą stację i zakończ wymianę pasażerów.',
    category: 'milestone',
  },
  {
    id: 'precision_stop',
    title: 'Co do centymetra',
    description: 'Zatrzymaj skład w strefie STOP z błędem poniżej 2 metrów.',
    category: 'skill',
  },
  {
    id: 'passenger_carrier',
    title: 'Setka na pokładzie',
    description: 'Przewieź co najmniej 100 pasażerów podczas jednego kursu.',
    category: 'milestone',
  },
  {
    id: 'punctual_clockwork',
    title: 'Punktualny jak zegarek',
    description: 'Ukończ kurs służbowy ze średnią odchyłką poniżej 5 sekund.',
    category: 'course',
  },
  {
    id: 'flawless_duty',
    title: 'Bezbłędna służba',
    description: 'Ukończ kurs służbowy z oceną S i zerową liczbą wykroczeń.',
    category: 'course',
  },
  {
    id: 'classic_driver',
    title: 'Kierowca klasyka',
    description: 'Ukończ pełny kurs klasycznym składem Seria 81.',
    category: 'course',
  },
  {
    id: 'm2_master',
    title: 'Mistrz M2',
    description: 'Ukończ pełny kurs na linii M2 (Rondo Daszyńskiego – Dw. Wileński).',
    category: 'course',
  },
  {
    id: 'night_owl',
    title: 'Nocny marek',
    description: 'Ukończ pełny kurs w trybie Późny wieczór.',
    category: 'course',
  },
  {
    id: 'nerves_of_steel',
    title: 'Stalowe nerwy',
    description: 'Zalicz 3 razy czuwak i opanuj awarię drzwi w jednym kursie.',
    category: 'skill',
  },
  {
    id: 'challenge_inverter_fault',
    title: 'Mistrz Falownika',
    description: 'Ukończ wyzwanie „Awaria falownika” z mocą 60% i opóźnieniem poniżej 20 s.',
    category: 'challenge',
  },
  {
    id: 'challenge_technical_run',
    title: 'Przejazd Techniczny',
    description: 'Ukończ wyzwanie „Przejazd techniczny” bez postojów i bez naruszeń ATP/czuwaka.',
    category: 'challenge',
  },
  {
    id: 'challenge_black_series',
    title: 'Przetrwać Czarną Serię',
    description: 'Ukończ wyzwanie „Czarna seria” z czuwakiem co 30 s i awariami drzwi.',
    category: 'challenge',
  },
  {
    id: 'academy_license',
    title: 'Licencja Maszynisty',
    description: 'Ukończ wszystkie 5 etapów szkolenia w Akademii Maszynisty.',
    category: 'milestone',
  },
];

export function evaluateUnlockedAchievementIds(
  snapshot: ISimulationSnapshot,
  alreadyUnlocked: ReadonlySet<AchievementId>,
): readonly AchievementId[] {
  const newlyUnlocked: AchievementId[] = [];
  const check = (id: AchievementId, condition: boolean): void => {
    if (condition && !alreadyUnlocked.has(id)) {
      newlyUnlocked.push(id);
    }
  };

  const isDuty = snapshot.gameMode === 'duty';
  const isFinished = snapshot.phase === 'gameover';
  const isChallengePassed =
    isFinished &&
    snapshot.gameMode === 'challenge' &&
    snapshot.challenge !== null &&
    snapshot.challengeOutcome?.passed === true;
  const totalViolations =
    snapshot.overspeedViolations + snapshot.redSignalViolations + snapshot.czuwakViolations;

  check('first_station_stop', snapshot.stationsServed >= 1);
  check('precision_stop', snapshot.bestStopErrorM !== null && snapshot.bestStopErrorM < 2.0);
  check('passenger_carrier', snapshot.passengersCarried >= 100);
  check(
    'nerves_of_steel',
    (isDuty || snapshot.gameMode === 'challenge') &&
      snapshot.czuwakAcksCount >= 3 &&
      snapshot.doorFaultsResolvedCount >= 1,
  );
  check(
    'punctual_clockwork',
    isFinished &&
      isDuty &&
      snapshot.schedule.punctualitySamples > 0 &&
      Math.abs(snapshot.schedule.averageDeviationSec) < 5,
  );
  check(
    'flawless_duty',
    isFinished && isDuty && snapshot.driverGrade === 'S' && totalViolations === 0,
  );
  check('classic_driver', isFinished && snapshot.trainModel.id === 'seria81');
  check('m2_master', isFinished && snapshot.line.id === 'M2');
  check('night_owl', isFinished && snapshot.timeOfDay.id === 'evening');
  check('challenge_inverter_fault', isChallengePassed && snapshot.challenge?.id === 'inverter_fault');
  check('challenge_technical_run', isChallengePassed && snapshot.challenge?.id === 'technical_run');
  check('challenge_black_series', isChallengePassed && snapshot.challenge?.id === 'black_series');
  check(
    'academy_license',
    snapshot.gameMode === 'academy' && snapshot.academy?.completed === true,
  );

  return newlyUnlocked;
}

function getDefaultStorage(): IAchievementStorage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

export class AchievementService implements IAchievementService {
  private readonly storage: IAchievementStorage | null;
  private readonly nowProvider: () => Date;

  public constructor(
    storage: IAchievementStorage | null = getDefaultStorage(),
    nowProvider: () => Date = () => new Date(),
  ) {
    this.storage = storage;
    this.nowProvider = nowProvider;
  }

  public getCatalog(): readonly IAchievementSpec[] {
    return ACHIEVEMENT_CATALOG;
  }

  public getUnlockedRecords(): readonly IAchievementRecord[] {
    return this.loadRecords();
  }

  public isUnlocked(id: AchievementId): boolean {
    return this.loadRecords().some((rec) => rec.id === id);
  }

  public evaluateAndUnlock(snapshot: ISimulationSnapshot): readonly IAchievementSpec[] {
    const records = this.loadRecords();
    const unlockedSet = new Set<AchievementId>(records.map((r) => r.id));
    const newlyIds = evaluateUnlockedAchievementIds(snapshot, unlockedSet);
    if (newlyIds.length === 0) {
      return [];
    }
    const iso = this.nowProvider().toISOString();
    const updated: IAchievementRecord[] = [
      ...records,
      ...newlyIds.map((id) => ({ id, unlockedAtIso: iso })),
    ];
    this.saveRecords(updated);
    return newlyIds
      .map((id) => ACHIEVEMENT_CATALOG.find((spec) => spec.id === id))
      .filter((spec): spec is IAchievementSpec => spec !== undefined);
  }

  public clear(): void {
    this.saveRecords([]);
  }

  private loadRecords(): IAchievementRecord[] {
    if (!this.storage) {
      return [];
    }
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      const validIds = new Set<string>(ACHIEVEMENT_CATALOG.map((c) => c.id));
      return parsed.filter(
        (item): item is IAchievementRecord =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as { id?: unknown }).id === 'string' &&
          validIds.has((item as { id: string }).id) &&
          typeof (item as { unlockedAtIso?: unknown }).unlockedAtIso === 'string',
      );
    } catch {
      return [];
    }
  }

  private saveRecords(records: readonly IAchievementRecord[]): void {
    if (!this.storage) {
      return;
    }
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      // Ignore storage quota / private mode errors
    }
  }
}
