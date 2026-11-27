import { formatGhostScoreDelta, formatGhostTimeDelta } from '../domain/ghostDelta';
import type { IGhostDeltaSnapshot } from '../domain/types';

interface IGhostDeltaBadgeProps {
  readonly delta: IGhostDeltaSnapshot | null;
}

export function GhostDeltaBadge({ delta }: IGhostDeltaBadgeProps) {
  if (!delta) {
    return null;
  }

  const isPositiveOverall = delta.hasSplitComparison
    ? delta.scoreDelta > 0 || (delta.scoreDelta === 0 && delta.timeDeltaSec <= 0)
    : true;

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
        vs Rekord
      </span>
      {delta.hasSplitComparison ? (
        <span className="font-bold" data-testid="ghost-delta-values">
          {formatGhostScoreDelta(delta.scoreDelta)} | {formatGhostTimeDelta(delta.timeDeltaSec)}
        </span>
      ) : (
        <span className="text-amber-300 font-semibold" data-testid="ghost-delta-target">
          Cel: {delta.ghostBestScore} pkt
        </span>
      )}
    </div>
  );
}
