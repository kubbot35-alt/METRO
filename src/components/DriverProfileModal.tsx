import { useState } from 'react';
import { DRIVER_RANKS, getPunctualityPercent, getRankProgress } from '../domain/driverProfile';
import { getLocalizedRank } from '../domain/i18nCatalog';
import type { IDriverProfileStats } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';
import { ProfilePromotionGrid } from './modals/ProfilePromotionGrid';
import { ModalDialogShell } from './shared/ModalDialogShell';
import { StatTileCard } from './shared/ModalUiPrimitives';

interface IDriverProfileModalProps {
  readonly profile: IDriverProfileStats;
  readonly onReset: () => void;
  readonly onClose: () => void;
}

function formatTotalTime(totalSec: number): string {
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = Math.floor(totalSec % 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs} s`;
}

interface IProfileRankHeaderProps {
  readonly xp: number;
  readonly rankIndex: number;
  readonly badgeColor: string;
  readonly title: string;
  readonly description: string;
  readonly nextLabel: string;
}

function ProfileRankHeader({ xp, rankIndex, badgeColor, title, description, nextLabel }: IProfileRankHeaderProps) {
  const { tr } = useI18n();
  return (
    <div className="flex items-center justify-between gap-4 mb-2.5">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-md border-2 flex items-center justify-center font-display text-xl font-bold text-slate-950 shrink-0" style={{ backgroundColor: badgeColor, borderColor: '#f8fafc' }}>
          {rankIndex}
        </div>
        <div>
          <p className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">{tr('Aktualna ranga', 'Current Rank')}</p>
          <p data-testid="profile-rank-title" className="font-display text-xl font-bold text-slate-50 leading-tight">{title}</p>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
      </div>
      <div className="text-right shrink-0 font-mono-tabular">
        <p className="text-lg font-bold text-amber-300" data-testid="profile-xp-total">{xp} XP</p>
        <p className="text-[10px] text-slate-400">{nextLabel}</p>
      </div>
    </div>
  );
}

function ProfileRankCard({ xp }: { readonly xp: number }) {
  const { lang, tr } = useI18n();
  const progress = getRankProgress(xp);
  const currentLoc = getLocalizedRank(lang, progress.currentRank.id, progress.currentRank);
  const nextLoc = progress.nextRank ? getLocalizedRank(lang, progress.nextRank.id, progress.nextRank) : null;
  const remaining = progress.nextRank ? Math.max(0, progress.nextRank.minXp - xp) : 0;
  const rankIndex = DRIVER_RANKS.findIndex((r) => r.id === progress.currentRank.id) + 1;
  const nextLabel = nextLoc ? tr(`Do ${nextLoc.title}: ${remaining} XP`, `To ${nextLoc.title}: ${remaining} XP`) : tr('Maksymalna ranga!', 'Max rank!');
  return (
    <div className="rounded-lg border border-slate-700/90 bg-[#0a0f18] p-4 mb-4">
      <ProfileRankHeader xp={xp} rankIndex={rankIndex} badgeColor={progress.currentRank.badgeColor} title={currentLoc.title} description={currentLoc.description} nextLabel={nextLabel} />
      <div className="w-full h-2.5 bg-slate-800 rounded overflow-hidden">
        <div className="h-full transition-all duration-500" style={{ width: `${Math.round(progress.progressRatio * 100)}%`, backgroundColor: progress.currentRank.badgeColor }} />
      </div>
    </div>
  );
}

function ProfileStatsGrid({ profile }: { readonly profile: IDriverProfileStats }) {
  const { tr } = useI18n();
  const punctualityPct = getPunctualityPercent(profile);
  const punctualitySub = profile.totalArrivals > 0
    ? tr(`${profile.punctualArrivals}/${profile.totalArrivals} stacji o czasie`, `${profile.punctualArrivals}/${profile.totalArrivals} stops on time`)
    : tr('Brak przyjazdów', 'No arrivals yet');
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
      <StatTileCard testId="profile-stat-km" label={tr('Przejechane km', 'Distance Driven')} value={`${profile.totalDistanceKm.toFixed(2)} km`} />
      <StatTileCard testId="profile-stat-passengers" label={tr('Przewiezieni pasażerowie', 'Passengers Carried')} value={String(profile.totalPassengers)} />
      <StatTileCard testId="profile-stat-courses" label={tr('Ukończone kursy', 'Completed Runs')} value={String(profile.completedCourses)} />
      <StatTileCard testId="profile-stat-time" label={tr('Czas za sterami', 'Driving Time')} value={formatTotalTime(profile.totalDriveTimeSec)} />
      <StatTileCard testId="profile-stat-grade" label={tr('Najwyższa ocena', 'Highest Grade')} value={profile.highestGrade ?? '—'} />
      <StatTileCard testId="profile-stat-punctuality" label={tr('Punktualność', 'Punctuality')} value={punctualityPct !== null ? `${punctualityPct}%` : '—'} sub={punctualitySub} />
    </div>
  );
}

function ProfileFooter({ onReset, onClose }: { readonly onReset: () => void; readonly onClose: () => void }) {
  const { tr } = useI18n();
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3">
      {confirmReset ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-red-300 font-mono-tabular">{tr('Wyzerować karierę?', 'Reset career stats?')}</span>
          <button type="button" data-testid="profile-confirm-reset-btn" onClick={() => { onReset(); setConfirmReset(false); }} className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-xs font-mono-tabular font-bold text-white cursor-pointer">{tr('Tak, resetuj', 'Yes, reset')}</button>
          <button type="button" onClick={() => setConfirmReset(false)} className="px-2.5 py-1.5 rounded border border-slate-700 text-xs font-mono-tabular text-slate-300 cursor-pointer">{tr('Anuluj', 'Cancel')}</button>
        </div>
      ) : (
        <button type="button" data-testid="profile-reset-btn" onClick={() => setConfirmReset(true)} className="px-3.5 py-2 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-mono-tabular text-slate-400 cursor-pointer">
          {tr('Resetuj statystyki', 'Reset Stats')}
        </button>
      )}
      <button type="button" data-testid="profile-close-btn" onClick={onClose} className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm rounded-md cursor-pointer">
        {tr('Zamknij', 'Close')}
      </button>
    </div>
  );
}

export function DriverProfileModal({ profile, onReset, onClose }: IDriverProfileModalProps) {
  const { tr } = useI18n();
  const progress = getRankProgress(profile.xp);
  return (
    <ModalDialogShell
      titleId="driver-profile-title"
      testId="driver-profile-modal"
      backdropClassName="bg-[#05070c]/86"
      eyebrow={tr('Kariera Maszynisty · Statystyki Zapisywane Lokalnie', 'Driver Career · Locally Saved Statistics')}
      eyebrowClassName="text-[10px] font-mono-tabular uppercase tracking-[0.2em] text-amber-400"
      title={tr('Profil Maszynisty', 'Driver Profile')}
      onClose={onClose}
      closeAriaLabel={tr('Zamknij profil', 'Close profile')}
    >
      <ProfileRankCard xp={profile.xp} />
      <ProfileStatsGrid profile={profile} />
      <ProfilePromotionGrid xp={profile.xp} currentRankId={progress.currentRank.id} />
      <ProfileFooter onReset={onReset} onClose={onClose} />
    </ModalDialogShell>
  );
}
