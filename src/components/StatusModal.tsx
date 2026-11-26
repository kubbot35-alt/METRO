import type { ISimulationSnapshot } from '../domain/types';

interface IStatusModalProps {
  readonly snapshot: ISimulationSnapshot;
  readonly onResume: () => void;
  readonly onRestart: () => void;
  readonly onOpenPhotoMode?: () => void;
  readonly onOpenSettings?: () => void;
  readonly onTitle: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function StatusModal({
  snapshot,
  onResume,
  onRestart,
  onOpenPhotoMode,
  onOpenSettings,
  onTitle,
}: IStatusModalProps) {
  const isPause = snapshot.phase === 'paused';
  const avgError =
    snapshot.stationsServed > 0
      ? `${(snapshot.totalStopErrorM / snapshot.stationsServed).toFixed(1)} m`
      : '—';

  return (
    <div className="fixed inset-0 z-30 bg-[#07090e]/82 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-modal-title"
        className="w-full max-w-md bg-[#121721] border border-slate-700 rounded-lg p-6 shadow-2xl"
      >
        <p className="text-xs font-mono-tabular uppercase tracking-widest text-amber-400">
          {isPause ? 'Symulacja wstrzymana' : `Kurs zakończony · ${snapshot.line.name}`}
        </p>
        <h2
          id="status-modal-title"
          className="font-display text-2xl font-bold text-slate-50 mt-1 mb-5"
        >
          {isPause ? 'Pauza' : 'Podsumowanie kursu'}
        </h2>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatTile label="Wynik" value={`${Math.round(snapshot.score)} pkt`} />
          <StatTile
            label="Obsłużone stacje"
            value={`${snapshot.stationsServed} / ${snapshot.totalStations}`}
          />
          <StatTile label="Przewiezieni pasażerowie" value={String(snapshot.passengersCarried)} />
          <StatTile
            label={isPause ? 'Czas jazdy' : 'Błąd / Czas'}
            value={
              isPause
                ? formatDuration(snapshot.elapsedTimeSec)
                : `${avgError} · ${formatDuration(snapshot.elapsedTimeSec)}`
            }
          />
        </div>

        <div className="flex flex-col gap-2.5">
          {isPause ? (
            <button
              type="button"
              onClick={onResume}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold rounded-md cursor-pointer"
            >
              Wznów jazdę
            </button>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onRestart}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold rounded-md cursor-pointer"
            >
              Nowy kurs
            </button>
          )}

          {isPause && onOpenPhotoMode && (
            <button
              type="button"
              data-testid="pause-photo-mode-btn"
              onClick={onOpenPhotoMode}
              className="w-full py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/70 text-cyan-100 font-display font-bold rounded-md cursor-pointer"
            >
              Tryb Fotograficzny (wolna kamera) [F]
            </button>
          )}

          {isPause && onOpenSettings && (
            <button
              type="button"
              data-testid="pause-settings-btn"
              onClick={onOpenSettings}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-medium rounded-md cursor-pointer"
            >
              ⚙ Ustawienia (dźwięk, grafika, FOV)
            </button>
          )}

          {isPause && (
            <button
              type="button"
              onClick={onRestart}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium rounded-md cursor-pointer"
            >
              Restartuj kurs
            </button>
          )}

          <button
            type="button"
            onClick={onTitle}
            className="w-full py-2.5 bg-transparent hover:bg-slate-800/70 border border-slate-700 text-slate-300 font-medium rounded-md cursor-pointer"
          >
            Ekran startowy
          </button>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="bg-[#0b0e14] border border-slate-800 rounded-md px-3 py-2.5">
      <div className="text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="font-mono-tabular text-lg font-bold text-slate-100 mt-0.5">{value}</div>
    </div>
  );
}
