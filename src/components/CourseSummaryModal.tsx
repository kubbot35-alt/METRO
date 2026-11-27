import { getRankProgress } from '../domain/driverProfile';
import {
  getLocalizedChallenge,
  getLocalizedGradeTitle,
  getLocalizedRank,
  getLocalizedTimeOfDay,
} from '../domain/i18nCatalog';
import { formatDeviationTime } from '../domain/scheduleSystem';
import type {
  DriverGrade,
  ICourseXpReward,
  IDriverProfileStats,
  ISimulationSnapshot,
} from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';
import { TachographChart } from './TachographChart';

interface ICourseSummaryModalProps {
  readonly snapshot: ISimulationSnapshot;
  readonly isNewRecord: boolean;
  readonly xpReward?: ICourseXpReward | null;
  readonly driverProfile?: IDriverProfileStats;
  readonly onRestart: () => void;
  readonly onTitle: () => void;
}

const GRADE_STYLES: Record<DriverGrade, { readonly badge: string; readonly title: string }> = {
  S: { badge: 'bg-amber-400 text-slate-950 border-amber-200', title: 'Mistrz Metra' },
  A: { badge: 'bg-emerald-500 text-slate-950 border-emerald-300', title: 'Wzorowy Maszynista' },
  B: { badge: 'bg-sky-500 text-slate-950 border-sky-300', title: 'Solidny Kurs' },
  C: { badge: 'bg-amber-600 text-slate-50 border-amber-400', title: 'Wymaga Poprawy' },
  D: { badge: 'bg-red-600 text-white border-red-400', title: 'Zagrożenie Bezpieczeństwa' },
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function CourseSummaryModal({
  snapshot,
  isNewRecord,
  xpReward,
  driverProfile,
  onRestart,
  onTitle,
}: ICourseSummaryModalProps) {
  const { lang, tr } = useI18n();
  const gradeStyle = GRADE_STYLES[snapshot.driverGrade];
  const gradeTitle = getLocalizedGradeTitle(lang, snapshot.driverGrade, gradeStyle.title);
  const localizedTime = getLocalizedTimeOfDay(lang, snapshot.timeOfDay.id, {
    name: snapshot.timeOfDay.name,
    description: snapshot.timeOfDay.description,
  });
  const localizedChallenge = snapshot.challenge
    ? getLocalizedChallenge(lang, snapshot.challenge.id, {
        title: snapshot.challenge.title,
        shortLabel: snapshot.challenge.shortLabel,
        badge: snapshot.challenge.badge,
        description: snapshot.challenge.description,
        objectiveSummary: snapshot.challenge.objectiveSummary,
      })
    : null;
  const totalViolations =
    snapshot.overspeedViolations + snapshot.redSignalViolations + snapshot.czuwakViolations;
  const punctualityText = formatDeviationTime(snapshot.schedule.averageDeviationSec);
  const rankProgress = xpReward
    ? getRankProgress(xpReward.totalXpAfter)
    : driverProfile
      ? getRankProgress(driverProfile.xp)
      : null;

  const isPassengerAto = snapshot.gameMode === 'passenger';

  return (
    <div className="fixed inset-0 z-30 bg-[#07090e]/85 flex items-center justify-center p-3 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-summary-title"
        data-testid="course-summary-modal"
        className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-[#111620] border border-slate-700 rounded-lg p-4 sm:p-6 shadow-2xl"
      >
        {isPassengerAto && (
          <div className="mb-4 px-3.5 py-2 rounded-md border border-cyan-400/70 bg-cyan-500/15 text-cyan-200 text-center text-xs font-mono-tabular">
            {tr(
              'Przejazd pasażerski ATO zakończony — kursy z autopilotem nie zapisują rekordów ani osiągnięć.',
              'Passenger ATO ride completed — autopilot runs do not record leaderboard scores or achievements.',
            )}
          </div>
        )}

        {snapshot.gameMode === 'academy' && snapshot.academy?.completed && (
          <div
            data-testid="academy-complete-banner"
            className="mb-4 px-3.5 py-2.5 rounded-md border-2 border-cyan-400 bg-cyan-500/20 text-cyan-100 text-center"
          >
            <p className="font-display font-bold text-sm uppercase tracking-wide text-cyan-200">
              {tr('LICENCJA MASZYNISTY PRZYZNANA!', 'TRAIN DRIVER LICENSE AWARDED!')}
            </p>
            <p className="text-xs mt-0.5 text-slate-100">
              {tr(
                'Ukończono wszystkie 5 etapów Akademii · Odblokowano odznakę i bonus +250 XP',
                'Completed all 5 Academy steps · Badge unlocked & +250 XP bonus',
              )}
            </p>
          </div>
        )}

        {snapshot.challenge && snapshot.challengeOutcome && localizedChallenge && (
          <div
            data-testid="challenge-outcome-banner"
            className={`mb-4 px-3.5 py-2.5 rounded-md border text-center ${
              snapshot.challengeOutcome.passed
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                : 'bg-red-500/20 border-red-400 text-red-200'
            }`}
          >
            <p className="font-display font-bold text-sm uppercase tracking-wide">
              {snapshot.challengeOutcome.passed
                ? tr(
                    `WYZWANIE ZALICZONE: ${localizedChallenge.title} — Odblokowano odznakę!`,
                    `CHALLENGE PASSED: ${localizedChallenge.title} — Badge unlocked!`,
                  )
                : tr(
                    `WYZWANIE NIEZALICZONE: ${localizedChallenge.title}`,
                    `CHALLENGE FAILED: ${localizedChallenge.title}`,
                  )}
            </p>
            <p className="text-xs mt-0.5 text-slate-200">{snapshot.challengeOutcome.reason}</p>
          </div>
        )}

        {isNewRecord && (
          <div
            data-testid="new-record-badge"
            className="mb-4 px-3.5 py-2 rounded-md bg-amber-500/20 border border-amber-400 text-amber-300 font-display font-bold text-sm tracking-wide text-center uppercase"
          >
            {tr(
              'NOWY REKORD! Najlepszy wynik zapisany w tabeli',
              'NEW RECORD! Best score saved to leaderboard',
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-mono-tabular uppercase tracking-widest text-amber-400">
              {snapshot.line.name} · {snapshot.stations[snapshot.stations.length - 1]?.name ?? tr('Koniec', 'Terminus')} · {snapshot.trainModel.name} · {localizedTime.name}
            </p>
            <h2
              id="course-summary-title"
              className="font-display text-2xl font-bold text-slate-50 mt-1"
            >
              {tr('Podsumowanie kursu', 'Run Summary')}
            </h2>
            <p className="text-sm text-slate-300 mt-0.5">{gradeTitle}</p>
          </div>

          <div className="flex flex-col items-center shrink-0">
            <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400 mb-1">
              {tr('Ocena', 'Grade')}
            </span>
            <div
              data-testid="driver-grade-badge"
              className={`w-16 h-16 rounded-lg border-2 flex items-center justify-center font-display text-4xl font-bold shadow-lg ${gradeStyle.badge}`}
            >
              {snapshot.driverGrade}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-6">
          <SummaryTile
            label={tr('Łączny wynik', 'Total Score')}
            value={`${Math.round(snapshot.score)} ${tr('pkt', 'pts')}`}
          />
          <SummaryTile label={tr('Pasażerowie', 'Passengers')} value={String(snapshot.passengersCarried)} />
          <SummaryTile label={tr('Śr. punktualność', 'Avg. Punctuality')} value={punctualityText} />
          <SummaryTile
            label={tr('Obsłużone stacje', 'Stations Served')}
            value={`${snapshot.stationsServed} / ${snapshot.totalStations}`}
          />
          <SummaryTile
            label={tr('Wykroczenia', 'Violations')}
            value={String(totalViolations)}
            sub={`V:${snapshot.overspeedViolations} · S:${snapshot.redSignalViolations} · C:${snapshot.czuwakViolations}`}
          />
          <SummaryTile label={tr('Czas kursu', 'Run Time')} value={formatDuration(snapshot.elapsedTimeSec)} />
        </div>

        <TachographChart tachograph={snapshot.tachograph} />

        {xpReward && rankProgress && (
          <div
            data-testid="summary-xp-panel"
            className="mb-5 rounded-md border border-slate-700/90 bg-[#0a0f18] p-3.5 space-y-2"
          >
            {xpReward.rankedUp && (
              <div
                data-testid="rank-up-banner"
                className="px-3 py-2 rounded border-2 border-amber-300 bg-amber-500/20 text-amber-200 text-center animate-pulse"
              >
                <p className="font-display font-bold text-sm uppercase tracking-wider">
                  {tr('AWANS! Nowa ranga:', 'PROMOTION! New rank:')}{' '}
                  {getLocalizedRank(lang, xpReward.newRank.id, xpReward.newRank).title}
                </p>
                <p className="text-[11px] text-amber-100/90">
                  {getLocalizedRank(lang, xpReward.previousRank.id, xpReward.previousRank).title} →{' '}
                  {getLocalizedRank(lang, xpReward.newRank.id, xpReward.newRank).title}
                </p>
              </div>
            )}
            <div className="flex items-center justify-between gap-2 text-xs font-mono-tabular">
              <div>
                <span className="text-slate-400">{tr('Ranga: ', 'Rank: ')}</span>
                <span className="font-bold text-slate-100">
                  {getLocalizedRank(lang, rankProgress.currentRank.id, rankProgress.currentRank).title}
                </span>
              </div>
              <span className="font-bold text-emerald-300">+{xpReward.gainedXp} XP</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded overflow-hidden">
              <div
                className="h-full transition-all duration-700"
                style={{
                  width: `${Math.round(rankProgress.progressRatio * 100)}%`,
                  backgroundColor: rankProgress.currentRank.badgeColor,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono-tabular text-slate-400">
              <span>{tr(`Łącznie: ${xpReward.totalXpAfter} XP`, `Total: ${xpReward.totalXpAfter} XP`)}</span>
              <span>
                {rankProgress.nextRank
                  ? tr(
                      `Do ${getLocalizedRank(lang, rankProgress.nextRank.id, rankProgress.nextRank).title}: ${Math.max(0, rankProgress.nextRank.minXp - xpReward.totalXpAfter)} XP`,
                      `To ${getLocalizedRank(lang, rankProgress.nextRank.id, rankProgress.nextRank).title}: ${Math.max(0, rankProgress.nextRank.minXp - xpReward.totalXpAfter)} XP`,
                    )
                  : tr('Maksymalny poziom', 'Max rank')}
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onRestart}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold rounded-md cursor-pointer"
          >
            {tr('Jedź ponownie', 'Drive Again')}
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="sm:w-44 py-2.5 bg-transparent hover:bg-slate-800/70 border border-slate-700 text-slate-300 font-medium rounded-md cursor-pointer"
          >
            {tr('Ekran startowy', 'Main Menu')}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  sub,
}: {
  readonly label: string;
  readonly value: string;
  readonly sub?: string;
}) {
  return (
    <div className="bg-[#0a0d13] border border-slate-800 rounded-md px-3 py-2.5">
      <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="font-mono-tabular text-lg font-bold text-slate-100 mt-0.5">{value}</div>
      {sub && <div className="text-[10px] font-mono-tabular text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}
