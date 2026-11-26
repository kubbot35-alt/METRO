import { formatDeviationTime } from '../domain/scheduleSystem';
import type { DriverGrade, ISimulationSnapshot } from '../domain/types';

interface ICourseSummaryModalProps {
  readonly snapshot: ISimulationSnapshot;
  readonly isNewRecord: boolean;
  readonly onRestart: () => void;
  readonly onTitle: () => void;
}

const GRADE_STYLES: Record<DriverGrade, { readonly badge: string; readonly title: string }> = {
  S: { badge: 'bg-amber-400 text-slate-950 border-amber-200', title: 'Mistrz Linii M1' },
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
  onRestart,
  onTitle,
}: ICourseSummaryModalProps) {
  const gradeStyle = GRADE_STYLES[snapshot.driverGrade];
  const totalViolations =
    snapshot.overspeedViolations + snapshot.redSignalViolations + snapshot.czuwakViolations;
  const punctualityText = formatDeviationTime(snapshot.schedule.averageDeviationSec);

  return (
    <div className="fixed inset-0 z-30 bg-[#07090e]/85 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-summary-title"
        data-testid="course-summary-modal"
        className="w-full max-w-lg bg-[#111620] border border-slate-700 rounded-lg p-6 shadow-2xl"
      >
        {isNewRecord && (
          <div
            data-testid="new-record-badge"
            className="mb-4 px-3.5 py-2 rounded-md bg-amber-500/20 border border-amber-400 text-amber-300 font-display font-bold text-sm tracking-wide text-center uppercase"
          >
            NOWY REKORD! Najlepszy wynik zapisany w tabeli
          </div>
        )}

        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-mono-tabular uppercase tracking-widest text-amber-400">
              Stacja końcowa · Centrum · {snapshot.trainModel.name} · {snapshot.timeOfDay.name}
            </p>
            <h2
              id="course-summary-title"
              className="font-display text-2xl font-bold text-slate-50 mt-1"
            >
              Podsumowanie kursu
            </h2>
            <p className="text-sm text-slate-300 mt-0.5">{gradeStyle.title}</p>
          </div>

          <div className="flex flex-col items-center shrink-0">
            <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400 mb-1">
              Ocena
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
          <SummaryTile label="Łączny wynik" value={`${Math.round(snapshot.score)} pkt`} />
          <SummaryTile label="Pasażerowie" value={String(snapshot.passengersCarried)} />
          <SummaryTile label="Śr. punktualność" value={punctualityText} />
          <SummaryTile
            label="Obsłużone stacje"
            value={`${snapshot.stationsServed} / ${snapshot.totalStations}`}
          />
          <SummaryTile
            label="Wykroczenia"
            value={String(totalViolations)}
            sub={`V:${snapshot.overspeedViolations} · S:${snapshot.redSignalViolations} · C:${snapshot.czuwakViolations}`}
          />
          <SummaryTile label="Czas kursu" value={formatDuration(snapshot.elapsedTimeSec)} />
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onRestart}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold rounded-md cursor-pointer"
          >
            Jedź ponownie
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="sm:w-44 py-2.5 bg-transparent hover:bg-slate-800/70 border border-slate-700 text-slate-300 font-medium rounded-md cursor-pointer"
          >
            Ekran startowy
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
