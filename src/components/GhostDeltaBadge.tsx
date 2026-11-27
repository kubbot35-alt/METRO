import { formatGhostScoreDelta, formatGhostTimeDelta } from '../domain/ghostDelta';
import type { IGhostDeltaSnapshot } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';

interface IGhostDeltaBadgeProps {
  readonly delta: IGhostDeltaSnapshot | null;
}

export function GhostDeltaBadge({ delta }: IGhostDeltaBadgeProps) {
  const { isEn, tr } = useI18n();
  if (!delta) {
    return null;
  }

  const isPositiveOverall = delta.hasSplitComparison
    ? delta.scoreDelta > 0 || (delta.scoreDelta === 0 && delta.timeDeltaSec <= 0)
    : true;
  const formattedScoreDelta = isEn
    ? formatGhostScoreDelta(delta.scoreDelta).replace(' pkt', ' pts')
    : formatGhostScoreDelta(delta.scoreDelta);

  return (
    <div
      data-testid="ghost-delta-badge"
      data-has-split={delta.hasSplitComparison ? '1' : '0'}
      className={`mt-1.5 px-2.5 py-1 rounded-md border font-mono-tabular text-[11px] flex items-center gap-2 shadow-lg whitespace-nowrap ${
        !delta.hasSplitComparison
          ? 'bg-[#0c1422]/92 border-slate-700/85 text-slate-300'
          : isPositiveOverall
            ? 'bg-emerald-950/92 border-emerald-400/75 text-emerald-200'
            : 'bg-red-950/92 border-red-400/75 text-red-200'
      }`}
    >
      <span className="text-[9.5px] uppercase tracking-wider text-slate-400 font-bold">
        {tr('vs Rekord', 'vs Record')}
      </span>
      {delta.hasSplitComparison ? (
        <span className="font-bold" data-testid="ghost-delta-values">
          {formattedScoreDelta} | {formatGhostTimeDelta(delta.timeDeltaSec)}
        </span>
      ) : (
        <span className="text-amber-300 font-semibold" data-testid="ghost-delta-target">
          {tr('Cel', 'Target')}: {delta.ghostBestScore} {tr('pkt', 'pts')}
        </span>
      )}
    </div>
  );
}
