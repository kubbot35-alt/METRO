import type { ISimulationSnapshot } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';
import { ModalDialogShell } from './shared/ModalDialogShell';
import { StatTileCard } from './shared/ModalUiPrimitives';

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

function PauseExtraButtons({ onOpenPhotoMode, onOpenSettings, onRestart }: {
  readonly onOpenPhotoMode?: () => void;
  readonly onOpenSettings?: () => void;
  readonly onRestart: () => void;
}) {
  const { tr } = useI18n();
  return (
    <>
      {onOpenPhotoMode && (
        <button type="button" data-testid="pause-photo-mode-btn" onClick={onOpenPhotoMode} className="w-full py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/70 text-cyan-100 font-display font-bold rounded-md cursor-pointer">
          {tr('Tryb Fotograficzny (wolna kamera) [F]', 'Photo Mode (Free Camera) [F]')}
        </button>
      )}
      {onOpenSettings && (
        <button type="button" data-testid="pause-settings-btn" onClick={onOpenSettings} className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-medium rounded-md cursor-pointer">
          {tr('⚙ Ustawienia (dźwięk, grafika, FOV)', '⚙ Settings (Audio, Graphics, FOV)')}
        </button>
      )}
      <button type="button" onClick={onRestart} className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium rounded-md cursor-pointer">
        {tr('Restartuj kurs', 'Restart Run')}
      </button>
    </>
  );
}

function StatusActionButtons({ isPause, onResume, onRestart, onOpenPhotoMode, onOpenSettings, onTitle }: Omit<IStatusModalProps, 'snapshot'> & { readonly isPause: boolean }) {
  const { tr } = useI18n();
  return (
    <div className="flex flex-col gap-2.5">
      <button type="button" data-start={isPause ? undefined : 'true'} onClick={isPause ? onResume : onRestart} className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold rounded-md cursor-pointer">
        {isPause ? tr('Wznów jazdę', 'Resume Drive') : tr('Nowy kurs', 'New Run')}
      </button>
      {isPause && <PauseExtraButtons onOpenPhotoMode={onOpenPhotoMode} onOpenSettings={onOpenSettings} onRestart={onRestart} />}
      <button type="button" onClick={onTitle} className="w-full py-2.5 bg-transparent hover:bg-slate-800/70 border border-slate-700 text-slate-300 font-medium rounded-md cursor-pointer">
        {tr('Ekran startowy', 'Main Menu')}
      </button>
    </div>
  );
}

export function StatusModal({ snapshot, onResume, onRestart, onOpenPhotoMode, onOpenSettings, onTitle }: IStatusModalProps) {
  const { tr } = useI18n();
  const isPause = snapshot.phase === 'paused';
  const avgError = snapshot.stationsServed > 0 ? `${(snapshot.totalStopErrorM / snapshot.stationsServed).toFixed(1)} m` : '—';
  return (
    <ModalDialogShell
      titleId="status-modal-title"
      zIndexClassName="z-30"
      maxWidthClassName="max-w-md"
      backdropClassName="bg-[#07090e]/82"
      panelClassName="bg-[#121721] border border-slate-700 rounded-lg p-6 shadow-2xl"
      eyebrow={isPause ? tr('Symulacja wstrzymana', 'Simulation Paused') : tr(`Kurs zakończony · ${snapshot.line.name}`, `Run Finished · ${snapshot.line.name}`)}
      eyebrowClassName="text-xs font-mono-tabular uppercase tracking-widest text-amber-400"
      title={isPause ? tr('Pauza', 'Paused') : tr('Podsumowanie kursu', 'Run Summary')}
    >
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatTileCard label={tr('Wynik', 'Score')} value={`${Math.round(snapshot.score)} ${tr('pkt', 'pts')}`} cardClassName="bg-[#0b0e14] border border-slate-800 rounded-md px-3 py-2.5" />
        <StatTileCard label={tr('Obsłużone stacje', 'Stations Served')} value={`${snapshot.stationsServed} / ${snapshot.totalStations}`} cardClassName="bg-[#0b0e14] border border-slate-800 rounded-md px-3 py-2.5" />
        <StatTileCard label={tr('Przewiezieni pasażerowie', 'Passengers Carried')} value={String(snapshot.passengersCarried)} cardClassName="bg-[#0b0e14] border border-slate-800 rounded-md px-3 py-2.5" />
        <StatTileCard label={isPause ? tr('Czas jazdy', 'Elapsed Time') : tr('Błąd / Czas', 'Error / Time')} value={isPause ? formatDuration(snapshot.elapsedTimeSec) : `${avgError} · ${formatDuration(snapshot.elapsedTimeSec)}`} cardClassName="bg-[#0b0e14] border border-slate-800 rounded-md px-3 py-2.5" />
      </div>
      <StatusActionButtons isPause={isPause} onResume={onResume} onRestart={onRestart} onOpenPhotoMode={onOpenPhotoMode} onOpenSettings={onOpenSettings} onTitle={onTitle} />
    </ModalDialogShell>
  );
}
