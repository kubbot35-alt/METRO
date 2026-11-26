import type { FeedbackTone, ISimulationSnapshot } from '../domain/types';
import { MetroLedDisplay } from './MetroLedDisplay';
import { RouteLineStrip } from './RouteLineStrip';
import { SandboxControlsBar } from './SandboxControlsBar';

interface ITopHudBarProps {
  readonly snapshot: ISimulationSnapshot;
  readonly muted: boolean;
  readonly onToggleMute: () => void;
  readonly onCycleCamera: () => void;
  readonly onToggleHelp: () => void;
  readonly onPause: () => void;
  readonly onRestart: () => void;
  readonly onSandboxSpawnTrain: () => void;
  readonly onSandboxCycleSignal: () => void;
}

function getFeedbackColor(tone: FeedbackTone): string {
  if (tone === 'success') {
    return 'bg-emerald-950/95 border-emerald-500/70 text-emerald-100';
  }
  if (tone === 'danger') {
    return 'bg-red-950/95 border-red-500/70 text-red-100';
  }
  if (tone === 'warning') {
    return 'bg-amber-950/95 border-amber-500/70 text-amber-100';
  }
  return 'bg-slate-900/95 border-slate-600 text-slate-100';
}

export function TopHudBar({
  snapshot,
  muted,
  onToggleMute,
  onCycleCamera,
  onToggleHelp,
  onPause,
  onRestart,
  onSandboxSpawnTrain,
  onSandboxCycleSignal,
}: ITopHudBarProps) {
  const { feedback, announcement, cameraNotice } = snapshot;
  const isRetro = snapshot.trainModel.visual.theme === 'retro';
  const barClasses = isRetro
    ? 'bg-[#15201c]/92 border-[#4c6b5f]'
    : 'bg-[#10141c]/90 border-slate-700/75';

  return (
    <div className="fixed top-0 inset-x-0 z-10 pointer-events-none px-4 pt-3 flex items-start justify-between gap-3">
      <div className="flex flex-col items-start shrink-0">
      <div className={`${barClasses} border rounded-md px-3 py-2 flex items-center gap-3`}>
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
            Punkty
          </span>
          <span className="font-mono-tabular text-xl font-bold text-slate-50">
            {Math.round(snapshot.score)}
          </span>
        </div>
        <div className="h-7 w-px bg-slate-700/80" aria-hidden="true" />
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
            Stacja
          </span>
          <span className="font-mono-tabular text-base font-semibold text-amber-300">
            {snapshot.currentStation.stationIndex + 1} / {snapshot.totalStations}
          </span>
        </div>
        <div className="h-7 w-px bg-slate-700/80" aria-hidden="true" />
        <div className="flex flex-col leading-tight" data-testid="passengers-counter">
          <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
            Pasażerowie
          </span>
          <span className="font-mono-tabular text-base font-semibold text-emerald-300">
            {snapshot.passengersCarried}
          </span>
        </div>
        <div className="h-7 w-px bg-slate-700/80 hidden sm:block" aria-hidden="true" />
        <div className="hidden sm:flex flex-col leading-tight">
          <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
            Skład
          </span>
          <span className="font-mono-tabular text-xs font-semibold text-slate-200 whitespace-nowrap">
            {snapshot.trainModel.name} · {snapshot.timeOfDay.id === 'rush' ? 'Szczyt' : 'Wieczór'}
          </span>
        </div>
      </div>
      {snapshot.gameMode === 'sandbox' && (
        <SandboxControlsBar
          nextSignalAspect={snapshot.nextSignal?.signal.aspect}
          oncomingActive={snapshot.oncomingTrain.active}
          onSpawnOncoming={onSandboxSpawnTrain}
          onCycleSignal={onSandboxCycleSignal}
        />
      )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col items-center gap-1.5 max-w-[44vw]">
        <RouteLineStrip snapshot={snapshot} />
        <MetroLedDisplay announcement={announcement} lineId={snapshot.line.id} />
        {cameraNotice && (
          <div
            data-testid="camera-notice"
            className="px-3.5 py-1.5 rounded-md border border-sky-400/70 bg-[#0c1829]/95 text-sky-100 text-xs font-mono-tabular font-semibold tracking-wide shadow-lg"
          >
            {cameraNotice.label}
          </div>
        )}
        {feedback && (
          <div
            role="status"
            className={`px-4 py-2 rounded-md border text-sm font-medium flex items-center gap-2.5 shadow-lg ${getFeedbackColor(feedback.tone)}`}
          >
            <span>{feedback.text}</span>
            {feedback.pointsDelta !== 0 && (
              <span className="font-mono-tabular font-bold">
                {feedback.pointsDelta > 0 ? `+${feedback.pointsDelta}` : feedback.pointsDelta} pkt
              </span>
            )}
          </div>
        )}
      </div>

      <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          tabIndex={-1}
          data-testid="help-toggle-btn"
          aria-label="Pomoc i skróty klawiszowe [?]"
          title="Pomoc i skróty klawiszowe [?]"
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleHelp();
          }}
          className="w-10 h-10 rounded-md bg-[#10141c]/90 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-amber-300 font-mono-tabular font-bold text-base cursor-pointer"
        >
          ?
        </button>

        <button
          type="button"
          tabIndex={-1}
          data-testid="camera-cycle-btn"
          aria-label="Zmień kamerę [V]"
          title="Zmień kamerę [V]"
          onClick={(e) => {
            e.currentTarget.blur();
            onCycleCamera();
          }}
          className="h-10 px-2.5 rounded-md bg-[#10141c]/90 hover:bg-slate-800 border border-slate-700/80 flex items-center gap-1.5 text-slate-200 cursor-pointer text-xs font-mono-tabular font-semibold"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 7l-7 5 7 5V7z" />
            <rect x="1" y="5" width="15" height="14" rx="2" />
          </svg>
          <span>[V]</span>
        </button>

        <button
          type="button"
          tabIndex={-1}
          aria-label={muted ? 'Włącz dźwięk [M]' : 'Wycisz dźwięk [M]'}
          title={muted ? 'Włącz dźwięk [M]' : 'Wycisz dźwięk [M]'}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          className="w-10 h-10 rounded-md bg-[#10141c]/90 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-200 cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            {muted ? (
              <path d="M23 9l-6 6M17 9l6 6" />
            ) : (
              <path d="M15.5 8.5a5 5 0 010 7M19 5a9.5 9.5 0 010 14" />
            )}
          </svg>
        </button>

        <button
          type="button"
          tabIndex={-1}
          aria-label="Pauza [P]"
          title="Pauza [P]"
          onClick={(e) => {
            e.currentTarget.blur();
            onPause();
          }}
          className="w-10 h-10 rounded-md bg-[#10141c]/90 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-200 cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        </button>

        <button
          type="button"
          tabIndex={-1}
          aria-label="Restartuj kurs [R]"
          title="Restartuj kurs [R]"
          onClick={(e) => {
            e.currentTarget.blur();
            onRestart();
          }}
          className="w-10 h-10 rounded-md bg-[#10141c]/90 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-200 cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
