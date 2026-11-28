import { DRIVER_RANKS, getRankProgress } from '../../domain/driverProfile';
import { getLocalizedRank } from '../../domain/i18nCatalog';
import type { IDriverProfileStats, IGamepadStatus, ILeaderboardEntry } from '../../domain/types';
import { useI18n } from '../../i18n/LanguageContext';
import { LeaderboardPanel } from '../LeaderboardPanel';

interface ITitleSidebarProps {
  readonly driverProfile: IDriverProfileStats;
  readonly leaderboard: readonly ILeaderboardEntry[];
  readonly onOpenProfile: () => void;
}

function DriverRankFooter({ progressRatio, badgeColor, nextRankTitle }: { readonly progressRatio: number; readonly badgeColor: string; readonly nextRankTitle: string | null }) {
  const { tr } = useI18n();
  return (
    <>
      <div className="w-full h-1.5 bg-slate-800 rounded overflow-hidden"><div className="h-full transition-all duration-500" style={{ width: `${Math.round(progressRatio * 100)}%`, backgroundColor: badgeColor }} /></div>
      <div className="flex items-center justify-between gap-2 text-[10px] font-mono-tabular text-slate-400 mt-1.5">
        <span className="truncate">{nextRankTitle ? `${tr('Następna', 'Next')}: ${nextRankTitle}` : tr('Maksymalny stopień', 'Max rank')}</span>
        <span className="text-emerald-300 whitespace-nowrap shrink-0">{tr('Profil →', 'Profile →')}</span>
      </div>
    </>
  );
}

function DriverRankWidget({ driverProfile, onOpenProfile }: { readonly driverProfile: IDriverProfileStats; readonly onOpenProfile: () => void }) {
  const { lang, tr } = useI18n();
  const progress = getRankProgress(driverProfile.xp);
  const currentRankLoc = getLocalizedRank(lang, progress.currentRank.id, progress.currentRank);
  const nextRankLoc = progress.nextRank ? getLocalizedRank(lang, progress.nextRank.id, progress.nextRank) : null;
  const rankIndex = DRIVER_RANKS.findIndex((r) => r.id === progress.currentRank.id) + 1;
  return (
    <button type="button" data-testid="title-rank-widget" onClick={(e) => { e.currentTarget.blur(); onOpenProfile(); }} className="w-full text-left rounded-lg border border-slate-700/90 bg-[#0d121c]/95 hover:border-amber-400/70 p-3.5 shadow-lg transition-colors cursor-pointer">
      <div className="flex items-start gap-2.5 mb-2">
        <span className="w-8 h-8 rounded font-display text-sm font-bold text-slate-950 flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: progress.currentRank.badgeColor }}>{rankIndex}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2"><p className="text-[9.5px] font-mono-tabular uppercase tracking-[0.14em] text-slate-400">{tr('Ranga maszynisty', 'Driver Rank')}</p><span className="text-xs font-mono-tabular font-bold text-amber-300 whitespace-nowrap shrink-0">{driverProfile.xp} XP</span></div>
          <p className="font-display text-base font-bold text-slate-50 leading-tight mt-0.5">{currentRankLoc.title}</p>
          <p className="text-[10px] font-mono-tabular text-slate-400 mt-0.5">{driverProfile.totalDistanceKm.toFixed(1)} km · {driverProfile.completedCourses} {tr('kursów', 'runs')}</p>
        </div>
      </div>
      <DriverRankFooter progressRatio={progress.progressRatio} badgeColor={progress.currentRank.badgeColor} nextRankTitle={nextRankLoc?.title ?? null} />
    </button>
  );
}

export function TitleSidebar({ driverProfile, leaderboard, onOpenProfile }: ITitleSidebarProps) {
  return (
    <div className="lg:pt-1 space-y-3 min-w-0">
      <DriverRankWidget driverProfile={driverProfile} onOpenProfile={onOpenProfile} />
      <LeaderboardPanel entries={leaderboard} />
    </div>
  );
}

export function TitleFooter({ gamepadStatus }: { readonly gamepadStatus: IGamepadStatus }) {
  const { tr } = useI18n();
  return (
    <div className="w-full flex items-center justify-center gap-3 mt-1.5 relative">
      <p className="text-xs font-mono-tabular text-slate-300 tracking-wide text-center bg-[#090b0f]/85 px-4 py-1.5 rounded border border-slate-800/80">
        {tr('W / S Moc · Spacja Hamulec · B Awaryjny · Q / E Drzwi · A ATO · V Kamera · F Foto · R Radio · X Wycier. · C Czuwak · L Światła · K Kabina', 'W / S Power · Space Brake · B E-Brake · Q / E Doors · A ATO · V Camera · F Photo · R Radio · X Wipers · C Czuwak · L Lights · K Cab')}
      </p>
      {gamepadStatus.connected && (
        <div data-testid="gamepad-connected-badge" title={gamepadStatus.name} className="pointer-events-auto fixed bottom-4 right-4 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-sky-400/75 bg-[#091827]/95 text-sky-200 text-[11px] font-mono-tabular font-semibold shadow-lg">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-300 shrink-0" aria-hidden="true">
            <rect x="2" y="6" width="20" height="12" rx="4" /><path d="M6 12h4M8 10v4M15 11h.01M18 13h.01" />
          </svg>
          <span>{tr('Pad aktywny', 'Gamepad active')}</span>
        </div>
      )}
    </div>
  );
}
