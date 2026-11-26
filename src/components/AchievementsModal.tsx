import { formatLeaderboardDate } from '../domain/leaderboard';
import type { IAchievementRecord, IAchievementSpec } from '../domain/types';

interface IAchievementsModalProps {
  readonly catalog: readonly IAchievementSpec[];
  readonly unlockedRecords: readonly IAchievementRecord[];
  readonly onClose: () => void;
}

export function AchievementsModal({
  catalog,
  unlockedRecords,
  onClose,
}: IAchievementsModalProps) {
  const unlockedMap = new Map(unlockedRecords.map((rec) => [rec.id, rec.unlockedAtIso]));
  const unlockedCount = unlockedMap.size;
  const totalCount = catalog.length;
  const progressPct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <div className="fixed inset-0 z-40 bg-[#06080d]/85 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="achievements-modal-title"
        data-testid="achievements-modal"
        className="w-full max-w-2xl max-h-[86vh] flex flex-col bg-[#10151f] border border-slate-700 rounded-lg p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-amber-400">
              Odznaki maszynisty · Metro M1 / M2
            </p>
            <h2
              id="achievements-modal-title"
              className="font-display text-2xl font-bold text-slate-50 mt-0.5"
            >
              Osiągnięcia
            </h2>
          </div>
          <button
            type="button"
            data-testid="achievements-close-btn"
            aria-label="Zamknij osiągnięcia"
            onClick={onClose}
            className="w-8 h-8 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono-tabular text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 rounded-md bg-[#0a0e16] border border-slate-800 p-3">
          <div className="flex items-center justify-between text-xs font-mono-tabular mb-1.5">
            <span className="text-slate-300 uppercase tracking-wider">Postęp odblokowania</span>
            <span data-testid="achievements-progress-text" className="font-bold text-amber-300">
              {unlockedCount} / {totalCount} ({progressPct}%)
            </span>
          </div>
          <svg viewBox="0 0 1000 14" className="w-full h-3" role="img" aria-label={`Postęp ${progressPct}%`}>
            <rect x={0} y={0} width={1000} height={14} rx={7} fill="#1e293b" />
            {progressPct > 0 && (
              <rect x={0} y={0} width={Math.max(24, progressPct * 10)} height={14} rx={7} fill="#f59e0b" />
            )}
          </svg>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto pr-1">
          {catalog.map((spec) => {
            const unlockedIso = unlockedMap.get(spec.id);
            const isUnlocked = unlockedIso !== undefined;
            return (
              <div
                key={spec.id}
                data-testid={`achievement-card-${spec.id}`}
                data-unlocked={isUnlocked ? '1' : '0'}
                className={`rounded-md border p-3 flex items-start gap-3 ${
                  isUnlocked
                    ? 'bg-[#171d29] border-amber-400/60'
                    : 'bg-[#0b0f17] border-slate-800/90 opacity-75'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-md shrink-0 flex items-center justify-center border ${
                    isUnlocked
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-slate-900 border-slate-700 text-slate-500'
                  }`}
                  aria-hidden="true"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {isUnlocked ? (
                      <>
                        <circle cx="12" cy="9" r="6" />
                        <path d="M9 14.5L7.5 22l4.5-2.5L16.5 22 15 14.5" />
                      </>
                    ) : (
                      <>
                        <rect x="5" y="11" width="14" height="10" rx="2" />
                        <path d="M8 11V7a4 4 0 018 0v4" />
                      </>
                    )}
                  </svg>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={`font-display text-sm font-bold leading-tight ${
                        isUnlocked ? 'text-amber-200' : 'text-slate-300'
                      }`}
                    >
                      {spec.title}
                    </h3>
                    {isUnlocked && (
                      <span className="text-[10px] font-mono-tabular text-emerald-300 shrink-0">
                        {formatLeaderboardDate(unlockedIso)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug mt-1">
                    {spec.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-2.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm cursor-pointer"
        >
          Zamknij
        </button>
      </div>
    </div>
  );
}
