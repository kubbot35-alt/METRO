import { DRIVER_RANKS } from '../../domain/driverProfile';
import { getLocalizedRank } from '../../domain/i18nCatalog';
import { TRAIN_LIVERIES } from '../../domain/trainLiveryCatalog';
import type { ITrainLiverySpec } from '../../domain/types';
import { useI18n } from '../../i18n/LanguageContext';

interface IRankUnlockTileProps {
  readonly rank: (typeof DRIVER_RANKS)[number];
  readonly index: number;
  readonly xp: number;
  readonly currentRankId: string;
}

function RankLiveryUnlockBadge({ livery }: { readonly livery: ITrainLiverySpec }) {
  const { lang } = useI18n();
  return (
    <div className="flex items-center gap-1 mt-1 pt-1 border-t border-slate-800/80">
      <span className="flex items-center -space-x-1 shrink-0" aria-hidden="true">
        {livery.swatchColors.map((hex, sIdx) => (
          <span key={sIdx} className="w-2.5 h-2.5 rounded-full border border-slate-950" style={{ backgroundColor: hex }} />
        ))}
      </span>
      <span className="text-[9.5px] font-mono-tabular text-emerald-300 truncate">{lang === 'en' ? livery.nameEn : livery.name}</span>
    </div>
  );
}

function RankUnlockTile({ rank, index, xp, currentRankId }: IRankUnlockTileProps) {
  const { lang } = useI18n();
  const unlocked = xp >= rank.minXp;
  const isCurrent = rank.id === currentRankId;
  const loc = getLocalizedRank(lang, rank.id, rank);
  const unlockedLivery = TRAIN_LIVERIES.find((item) => item.requiredRankId === rank.id);
  const borderClass = isCurrent ? 'border-amber-400 bg-amber-500/12' : unlocked ? 'border-emerald-500/45 bg-emerald-950/20' : 'border-slate-800 bg-[#0d1118] opacity-65';
  return (
    <div className={`rounded border px-2.5 py-2 ${borderClass}`}>
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-mono-tabular text-slate-400">#{index + 1}</span>
        <span className="text-[10px] font-mono-tabular text-amber-300">{rank.minXp} XP</span>
      </div>
      <p className="font-display text-xs font-bold text-slate-100 mt-0.5 leading-tight">{loc.title}</p>
      {unlockedLivery && <RankLiveryUnlockBadge livery={unlockedLivery} />}
    </div>
  );
}

export function ProfilePromotionGrid({ xp, currentRankId }: { readonly xp: number; readonly currentRankId: string }) {
  const { tr } = useI18n();
  return (
    <div className="rounded-md border border-slate-800 bg-[#0a0d13] p-3.5 mb-4">
      <p className="text-[10px] font-mono-tabular uppercase tracking-[0.16em] text-amber-300 font-bold mb-2">
        {tr('Ścieżka awansu maszynisty i odblokowania Zajezdni', 'Driver Promotion Path & Depot Livery Unlocks')}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {DRIVER_RANKS.map((rank, idx) => (
          <RankUnlockTile key={rank.id} rank={rank} index={idx} xp={xp} currentRankId={currentRankId} />
        ))}
      </div>
    </div>
  );
}
