import { getRankProgress } from '../../domain/driverProfile';
import { getLocalizedChallenge, getLocalizedRank } from '../../domain/i18nCatalog';
import type { ICourseXpReward, IDriverProfileStats, ISimulationSnapshot } from '../../domain/types';
import { useI18n } from '../../i18n/LanguageContext';

function ChallengeOutcomeBanner({ snapshot }: { readonly snapshot: ISimulationSnapshot }) {
  const { lang, tr } = useI18n();
  if (!snapshot.challenge || !snapshot.challengeOutcome) return null;
  const loc = getLocalizedChallenge(lang, snapshot.challenge.id, {
    title: snapshot.challenge.title, shortLabel: snapshot.challenge.shortLabel, badge: snapshot.challenge.badge,
    description: snapshot.challenge.description, objectiveSummary: snapshot.challenge.objectiveSummary,
  });
  const passed = snapshot.challengeOutcome.passed;
  return (
    <div data-testid="challenge-outcome-banner" className={`mb-4 px-3.5 py-2.5 rounded-md border text-center ${passed ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200' : 'bg-red-500/20 border-red-400 text-red-200'}`}>
      <p className="font-display font-bold text-sm uppercase tracking-wide">
        {passed ? tr(`WYZWANIE ZALICZONE: ${loc.title} — Odblokowano odznakę!`, `CHALLENGE PASSED: ${loc.title} — Badge unlocked!`) : tr(`WYZWANIE NIEZALICZONE: ${loc.title}`, `CHALLENGE FAILED: ${loc.title}`)}
      </p>
      <p className="text-xs mt-0.5 text-slate-200">{snapshot.challengeOutcome.reason}</p>
    </div>
  );
}

export function SummaryBanners({ snapshot, isNewRecord }: { readonly snapshot: ISimulationSnapshot; readonly isNewRecord: boolean }) {
  const { tr } = useI18n();
  return (
    <>
      {snapshot.gameMode === 'passenger' && (
        <div className="mb-4 px-3.5 py-2 rounded-md border border-cyan-400/70 bg-cyan-500/15 text-cyan-200 text-center text-xs font-mono-tabular">
          {tr('Przejazd pasażerski ATO zakończony — kursy z autopilotem nie zapisują rekordów ani osiągnięć.', 'Passenger ATO ride completed — autopilot runs do not record leaderboard scores or achievements.')}
        </div>
      )}
      {snapshot.gameMode === 'academy' && snapshot.academy?.completed && (
        <div data-testid="academy-complete-banner" className="mb-4 px-3.5 py-2.5 rounded-md border-2 border-cyan-400 bg-cyan-500/20 text-cyan-100 text-center">
          <p className="font-display font-bold text-sm uppercase tracking-wide text-cyan-200">{tr('LICENCJA MASZYNISTY PRZYZNANA!', 'TRAIN DRIVER LICENSE AWARDED!')}</p>
          <p className="text-xs mt-0.5 text-slate-100">{tr('Ukończono wszystkie 5 etapów Akademii · Odblokowano odznakę i bonus +250 XP', 'Completed all 5 Academy steps · Badge unlocked & +250 XP bonus')}</p>
        </div>
      )}
      <ChallengeOutcomeBanner snapshot={snapshot} />
      {isNewRecord && (
        <div data-testid="new-record-badge" className="mb-4 px-3.5 py-2 rounded-md bg-amber-500/20 border border-amber-400 text-amber-300 font-display font-bold text-sm tracking-wide text-center uppercase">
          {tr('NOWY REKORD! Najlepszy wynik zapisany w tabeli', 'NEW RECORD! Best score saved to leaderboard')}
        </div>
      )}
    </>
  );
}

interface ISummaryXpCardProps {
  readonly snapshot: ISimulationSnapshot;
  readonly xpReward?: ICourseXpReward | null;
  readonly driverProfile?: IDriverProfileStats;
}

function RankUpBanner({ xpReward }: { readonly xpReward: ICourseXpReward }) {
  const { lang, tr } = useI18n();
  if (!xpReward.rankedUp) return null;
  const newTitle = getLocalizedRank(lang, xpReward.newRank.id, xpReward.newRank).title;
  const prevTitle = getLocalizedRank(lang, xpReward.previousRank.id, xpReward.previousRank).title;
  return (
    <div data-testid="rank-up-banner" className="px-3 py-2 rounded border-2 border-amber-300 bg-amber-500/20 text-amber-200 text-center animate-pulse">
      <p className="font-display font-bold text-sm uppercase tracking-wider">{tr('AWANS! Nowa ranga:', 'PROMOTION! New rank:')} {newTitle}</p>
      <p className="text-[11px] text-amber-100/90">{prevTitle} → {newTitle}</p>
    </div>
  );
}

export function SummaryXpCard({ snapshot, xpReward, driverProfile }: ISummaryXpCardProps) {
  const { lang, tr } = useI18n();
  const rankProgress = xpReward ? getRankProgress(xpReward.totalXpAfter) : driverProfile ? getRankProgress(driverProfile.xp) : null;
  if (!xpReward || !rankProgress) return null;
  const currentTitle = getLocalizedRank(lang, rankProgress.currentRank.id, rankProgress.currentRank).title;
  const nextTitle = rankProgress.nextRank ? getLocalizedRank(lang, rankProgress.nextRank.id, rankProgress.nextRank).title : null;
  const xpLeft = rankProgress.nextRank ? Math.max(0, rankProgress.nextRank.minXp - xpReward.totalXpAfter) : 0;
  return (
    <div data-testid="summary-xp-panel" className="mb-5 rounded-md border border-slate-700/90 bg-[#0a0f18] p-3.5 space-y-2">
      <RankUpBanner xpReward={xpReward} />
      <div className="flex items-center justify-between gap-2 text-xs font-mono-tabular">
        <div><span className="text-slate-400">{tr('Ranga: ', 'Rank: ')}</span><span className="font-bold text-slate-100">{currentTitle}</span></div>
        <div className="flex items-center gap-2">
          {xpReward.ecoXp > 0 && <span data-testid="summary-eco-xp-bonus" className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/60 text-emerald-200 text-[10px] font-bold">Eco {snapshot.ecoDriving.grade}: +{xpReward.ecoXp} XP</span>}
          <span className="font-bold text-emerald-300">+{xpReward.gainedXp} XP</span>
        </div>
      </div>
      <div className="w-full h-2 bg-slate-800 rounded overflow-hidden"><div className="h-full transition-all duration-700" style={{ width: `${Math.round(rankProgress.progressRatio * 100)}%`, backgroundColor: rankProgress.currentRank.badgeColor }} /></div>
      <div className="flex items-center justify-between text-[10px] font-mono-tabular text-slate-400">
        <span>{tr(`Łącznie: ${xpReward.totalXpAfter} XP`, `Total: ${xpReward.totalXpAfter} XP`)}</span>
        <span>{nextTitle ? tr(`Do ${nextTitle}: ${xpLeft} XP`, `To ${nextTitle}: ${xpLeft} XP`) : tr('Maksymalny poziom', 'Max rank')}</span>
      </div>
    </div>
  );
}
