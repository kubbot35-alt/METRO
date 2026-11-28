import type { AchievementId, IAchievementSpec, ISimulationSnapshot } from './types';

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
  {
    id: 'night_inspector',
    title: 'Nocny Inspektor',
    description: 'Ukończ bezbłędnie kurs Nocny Serwis (02:30), mijając każdą ekipę torową ≤ 20 km/h z klaksonem.',
    category: 'challenge',
  },
];

function isNightInspectorPerfect(s: ISimulationSnapshot, totalViolations: number): boolean {
  const ni = s.nightInspection;
  return s.phase === 'gameover' && ni.active && ni.totalCount > 0 && ni.violatedCount === 0 && ni.passedCount >= ni.totalCount && totalViolations === 0;
}

function evaluateCourseBadges(snapshot: ISimulationSnapshot, check: (id: AchievementId, condition: boolean) => void): void {
  const isFinished = snapshot.phase === 'gameover';
  const isDuty = snapshot.gameMode === 'duty';
  const totalViolations = snapshot.overspeedViolations + snapshot.redSignalViolations + snapshot.czuwakViolations;
  const challengeOk = isFinished && snapshot.gameMode === 'challenge' && snapshot.challengeOutcome?.passed === true;
  check('punctual_clockwork', isFinished && isDuty && snapshot.schedule.punctualitySamples > 0 && Math.abs(snapshot.schedule.averageDeviationSec) < 5);
  check('flawless_duty', isFinished && isDuty && snapshot.driverGrade === 'S' && totalViolations === 0);
  check('classic_driver', isFinished && snapshot.trainModel.id === 'seria81');
  check('m2_master', isFinished && snapshot.line.id === 'M2');
  check('night_owl', isFinished && snapshot.timeOfDay.id === 'evening');
  check('challenge_inverter_fault', challengeOk && snapshot.challenge?.id === 'inverter_fault');
  check('challenge_technical_run', challengeOk && snapshot.challenge?.id === 'technical_run');
  check('challenge_black_series', challengeOk && snapshot.challenge?.id === 'black_series');
  check('night_inspector', isNightInspectorPerfect(snapshot, totalViolations));
}

export function evaluateUnlockedAchievementIds(
  snapshot: ISimulationSnapshot,
  alreadyUnlocked: ReadonlySet<AchievementId>,
): readonly AchievementId[] {
  if (snapshot.gameMode === 'passenger' || snapshot.atoEnabled) return [];
  const newlyUnlocked: AchievementId[] = [];
  const check = (id: AchievementId, cond: boolean): void => { if (cond && !alreadyUnlocked.has(id)) newlyUnlocked.push(id); };
  check('first_station_stop', snapshot.stationsServed >= 1);
  check('precision_stop', snapshot.bestStopErrorM !== null && snapshot.bestStopErrorM < 2.0);
  check('passenger_carrier', snapshot.passengersCarried >= 100);
  check('nerves_of_steel', (snapshot.gameMode === 'duty' || snapshot.gameMode === 'challenge') && snapshot.czuwakAcksCount >= 3 && snapshot.doorFaultsResolvedCount >= 1);
  check('academy_license', snapshot.gameMode === 'academy' && snapshot.academy?.completed === true);
  evaluateCourseBadges(snapshot, check);
  return newlyUnlocked;
}
