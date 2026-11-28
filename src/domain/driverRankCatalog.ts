import type {
  DriverGrade,
  ICourseXpReward,
  IDriverProfileStats,
  IDriverRankSpec,
  ISimulationSnapshot,
} from './types';

export interface IRankProgressInfo {
  readonly currentRank: IDriverRankSpec;
  readonly nextRank: IDriverRankSpec | null;
  readonly progressRatio: number;
  readonly xpIntoRank: number;
  readonly xpRequiredForNext: number;
}

export const DRIVER_RANKS: readonly IDriverRankSpec[] = [
  {
    id: 'trainee',
    title: 'Praktykant',
    minXp: 0,
    badgeColor: '#94a3b8',
    description: 'Początkujący kandydat na maszynistę metra warszawskiego.',
  },
  {
    id: 'junior',
    title: 'Młodszy Maszynista',
    minXp: 400,
    badgeColor: '#38bdf8',
    description: 'Samodzielne prowadzenie składów w normalnym ruchu pasażerskim.',
  },
  {
    id: 'driver',
    title: 'Maszynista',
    minXp: 1200,
    badgeColor: '#34d399',
    description: 'Pewne hamowanie w strefie STOP, punktualny rozkład i obsługa usterek.',
  },
  {
    id: 'senior',
    title: 'Starszy Maszynista',
    minXp: 2600,
    badgeColor: '#f59e0b',
    description: 'Doświadczony prowadzący w godzinach szczytu, deszczu i wyzwaniach.',
  },
  {
    id: 'instructor',
    title: 'Instruktor Ruchu',
    minXp: 4800,
    badgeColor: '#a78bfa',
    description: 'Autorytet techniczny szkolący nowe pokolenia maszynistów M1 i M2.',
  },
  {
    id: 'legend',
    title: 'Legenda Metra',
    minXp: 8000,
    badgeColor: '#facc15',
    description: 'Mistrz wszystkich linii i scenariuszy o nieskazitelnej punktualności.',
  },
];

const GRADE_ORDER: Record<DriverGrade, number> = { D: 1, C: 2, B: 3, A: 4, S: 5 };

export function pickBetterGrade(a: DriverGrade | null, b: DriverGrade): DriverGrade {
  if (!a) {
    return b;
  }
  return GRADE_ORDER[b] > GRADE_ORDER[a] ? b : a;
}

export function getRankForXp(xp: number): IDriverRankSpec {
  const safeXp = Math.max(0, Number.isFinite(xp) ? xp : 0);
  let active = DRIVER_RANKS[0];
  for (let i = 0; i < DRIVER_RANKS.length; i += 1) {
    if (safeXp >= DRIVER_RANKS[i].minXp) {
      active = DRIVER_RANKS[i];
    }
  }
  return active;
}

export function getRankProgress(xp: number): IRankProgressInfo {
  const safeXp = Math.max(0, Number.isFinite(xp) ? xp : 0);
  const currentRank = getRankForXp(safeXp);
  const currentIdx = DRIVER_RANKS.findIndex((r) => r.id === currentRank.id);
  const nextRank =
    currentIdx >= 0 && currentIdx + 1 < DRIVER_RANKS.length ? DRIVER_RANKS[currentIdx + 1] : null;
  if (!nextRank) {
    return {
      currentRank,
      nextRank: null,
      progressRatio: 1,
      xpIntoRank: safeXp - currentRank.minXp,
      xpRequiredForNext: 0,
    };
  }
  const span = Math.max(1, nextRank.minXp - currentRank.minXp);
  const xpIntoRank = Math.max(0, safeXp - currentRank.minXp);
  return {
    currentRank,
    nextRank,
    progressRatio: Math.max(0, Math.min(1, xpIntoRank / span)),
    xpIntoRank,
    xpRequiredForNext: span,
  };
}

export function getPunctualityPercent(profile: IDriverProfileStats): number | null {
  if (profile.totalArrivals <= 0) {
    return null;
  }
  return Math.round((profile.punctualArrivals / profile.totalArrivals) * 100);
}

function resolveModeXpMultiplier(snapshot: ISimulationSnapshot, isAcademyCompleted: boolean): number {
  if (snapshot.gameMode === 'passenger' || snapshot.atoEnabled) {
    return 0;
  }
  if (isAcademyCompleted) {
    return 1.0;
  }
  if (snapshot.gameMode === 'sandbox') {
    return 0.55;
  }
  if (snapshot.gameMode === 'challenge') {
    return snapshot.challengeOutcome?.passed ? 1.5 : 1.15;
  }
  return 1.0;
}

export function calculateCourseXp(snapshot: ISimulationSnapshot, currentXp: number): ICourseXpReward {
  const totalDistM = (snapshot.turnaround?.cumulativeDistanceM ?? 0) + snapshot.kinematics.positionM;
  const routeKm = Math.max(0.4, totalDistM / 1000);
  const isAcademy = snapshot.gameMode === 'academy' && snapshot.academy?.completed === true;
  const baseXp = isAcademy ? 250 : 80;
  const distanceXp = isAcademy ? 0 : Math.round(routeKm * 45);
  const scoreXp = isAcademy ? 0 : Math.max(0, Math.round(snapshot.score / 12));
  const ecoXp = isAcademy ? 0 : Math.max(0, snapshot.ecoDriving?.xpBonus ?? 0);
  const modeMultiplier = resolveModeXpMultiplier(snapshot, isAcademy);
  const rawTotal = baseXp + distanceXp + scoreXp + ecoXp;
  const gainedXp = modeMultiplier === 0 ? 0 : isAcademy ? 250 : Math.max(40, Math.round(rawTotal * modeMultiplier));
  const previousRank = getRankForXp(currentXp);
  const totalXpAfter = currentXp + gainedXp;
  const newRank = getRankForXp(totalXpAfter);
  return {
    gainedXp, baseXp, distanceXp, scoreXp, ecoXp, modeMultiplier,
    previousRank, newRank, rankedUp: newRank.id !== previousRank.id, totalXpAfter,
  };
}
