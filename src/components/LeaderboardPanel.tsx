import { formatLeaderboardDate } from '../domain/leaderboard';
import type { DriverGrade, ILeaderboardEntry } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';

interface ILeaderboardPanelProps {
  readonly entries: readonly ILeaderboardEntry[];
}

const GRADE_PILL_STYLES: Record<DriverGrade, string> = {
  S: 'bg-amber-400/20 text-amber-300 border-amber-400/60',
  A: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60',
  B: 'bg-sky-500/20 text-sky-300 border-sky-400/60',
  C: 'bg-orange-500/20 text-orange-300 border-orange-400/60',
  D: 'bg-red-500/20 text-red-300 border-red-400/60',
};

function LeaderboardRow({ entry, idx }: { readonly entry: ILeaderboardEntry; readonly idx: number }) {
  const { tr } = useI18n();
  const timeLabel = entry.timeOfDayId === 'rush' ? tr('Szczyt 08:00', 'Rush 08:00') : tr('Wieczór 23:30', 'Evening 23:30');
  return (
    <li data-testid={`leaderboard-row-${idx}`} className="rounded-md bg-[#121824] border border-slate-800 px-3 py-2 flex items-center justify-between gap-2.5">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`font-mono-tabular text-xs font-bold w-5 text-center shrink-0 ${idx === 0 ? 'text-amber-400' : 'text-slate-400'}`}>#{idx + 1}</span>
        <span className={`w-6 h-6 rounded border flex items-center justify-center font-display text-xs font-bold shrink-0 ${GRADE_PILL_STYLES[entry.grade]}`}>{entry.grade}</span>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-100 truncate">{entry.trainName}</div>
          <div className="text-[10px] font-mono-tabular text-slate-400 truncate">
            {timeLabel} · {formatLeaderboardDate(entry.dateIso)}
          </div>
        </div>
      </div>
      <span className="font-mono-tabular text-sm font-bold text-amber-300 whitespace-nowrap shrink-0">
        {entry.score} {tr('pkt', 'pts')}
      </span>
    </li>
  );
}

export function LeaderboardPanel({ entries }: ILeaderboardPanelProps) {
  const { tr } = useI18n();
  return (
    <section aria-label={tr('Najlepsze wyniki', 'Top Scores')} data-testid="leaderboard-panel" className="rounded-lg border border-slate-700/80 bg-[#0c1018]/92 p-4 shadow-xl">
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800">
        <div>
          <p className="text-[10px] font-mono-tabular uppercase tracking-[0.2em] text-amber-400">{tr('Tablica rekordów', 'Leaderboard')}</p>
          <h2 className="font-display text-lg font-bold text-slate-50 leading-tight">{tr('Najlepsze wyniki', 'Best Runs')}</h2>
        </div>
        <span className="text-[11px] font-mono-tabular text-slate-400 whitespace-nowrap shrink-0">TOP 5</span>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-slate-400 leading-relaxed py-4 text-center">
          {tr('Brak zapisanych kursów. Ukończ przejazd dowolną linią metra, aby zapisać pierwszy rekord.', 'No saved runs yet. Complete a run on any metro line to set your first record.')}
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {entries.map((entry, idx) => <LeaderboardRow key={entry.id} entry={entry} idx={idx} />)}
        </ol>
      )}
    </section>
  );
}
