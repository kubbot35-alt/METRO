import { getLocalizedCameraLabel, getLocalizedChallenge } from '../domain/i18nCatalog';
import { localizeFeedbackText, localizeRadioDispatch } from '../domain/i18nDynamic';
import { NIGHT_CREW_MAX_SPEED_KMH } from '../domain/nightInspectionSystem';
import type { FeedbackTone, IGhostDeltaSnapshot, ISimulationSnapshot } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';
import { GhostDeltaBadge } from './GhostDeltaBadge';
import { MetroLedDisplay } from './MetroLedDisplay';
import { RouteLineStrip } from './RouteLineStrip';
import { SandboxControlsBar } from './SandboxControlsBar';

interface ITopHudBarProps {
  readonly snapshot: ISimulationSnapshot;
  readonly ghostDelta: IGhostDeltaSnapshot | null;
  readonly muted: boolean;
  readonly onToggleMute: () => void;
  readonly onCycleCamera: () => void;
  readonly onToggleHelp: () => void;
  readonly onPause: () => void;
  readonly onRestart: () => void;
  readonly onSandboxSpawnTrain: () => void;
  readonly onSandboxCycleSignal: () => void;
  readonly onAcknowledgeRadio: () => void;
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
  ghostDelta,
  muted,
  onToggleMute,
  onCycleCamera,
  onToggleHelp,
  onPause,
  onRestart,
  onSandboxSpawnTrain,
  onSandboxCycleSignal,
  onAcknowledgeRadio,
}: ITopHudBarProps) {
  const { lang, tr } = useI18n();
  const { feedback, announcement, cameraNotice, radio, challenge } = snapshot;
  const localizedChallenge = challenge
    ? getLocalizedChallenge(lang, challenge.id, challenge)
    : null;
  const localizedRadio = localizeRadioDispatch(lang, radio);
  const localizedCameraLabel = cameraNotice
    ? getLocalizedCameraLabel(lang, snapshot.cameraMode, cameraNotice.label)
    : null;
  const localizedFeedback = feedback ? localizeFeedbackText(lang, feedback.text) : null;
  const theme = snapshot.trainModel.visual.theme;
  const isRetro = theme === 'retro';
  const isVarsovia = theme === 'varsovia';
  const barClasses = isRetro
    ? 'bg-[#15201c]/92 border-[#4c6b5f]'
    : isVarsovia
      ? 'bg-[#09101a]/92 border-cyan-500/45'
      : 'bg-[#10141c]/90 border-slate-700/75';

  return (
    <div className="fixed top-0 inset-x-0 z-10 pointer-events-none px-2 sm:px-4 pt-2 sm:pt-3 flex items-start justify-between gap-2 sm:gap-3">
      <div className="flex flex-col items-start shrink-0">
      <div className={`${barClasses} border rounded-md px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-2 sm:gap-3`}>
        <div className="flex flex-col leading-tight">
          <span className="text-[9px] sm:text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
            {tr('Punkty', 'Score')}
          </span>
          <span className="font-mono-tabular text-base sm:text-xl font-bold text-slate-50">
            {Math.round(snapshot.score)}
          </span>
        </div>
        <div className="h-6 sm:h-7 w-px bg-slate-700/80" aria-hidden="true" />
        <div className="flex flex-col leading-tight">
          <span className="text-[9px] sm:text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
            {tr('Stacja', 'Station')}
          </span>
          <span className="font-mono-tabular text-sm sm:text-base font-semibold text-amber-300">
            {snapshot.currentStation.stationIndex + 1} / {snapshot.totalStations}
          </span>
        </div>
        <div className="h-6 sm:h-7 w-px bg-slate-700/80" aria-hidden="true" />
        <div className="flex flex-col leading-tight" data-testid="passengers-counter">
          <span className="text-[9px] sm:text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
            {tr('Pasaż.', 'Pax')}
          </span>
          <span className="font-mono-tabular text-sm sm:text-base font-semibold text-emerald-300">
            {snapshot.passengersCarried}
          </span>
        </div>
        <div className="h-7 w-px bg-slate-700/80 hidden lg:block" aria-hidden="true" />
        <div className="hidden lg:flex flex-col leading-tight">
          <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
            {tr('Skład', 'Train')}
          </span>
          <span className="font-mono-tabular text-xs font-semibold text-slate-200 whitespace-nowrap">
            {snapshot.trainModel.name} ·{' '}
            {snapshot.timeOfDay.id === 'rush'
              ? tr('Szczyt', 'Rush')
              : snapshot.timeOfDay.id === 'night_service'
                ? tr('Nocny Serwis', 'Night Service')
                : tr('Wieczór', 'Evening')}
          </span>
        </div>
      </div>
      <GhostDeltaBadge delta={ghostDelta} />
      {snapshot.nightInspection.active && (
        <div
          data-testid="night-inspection-progress"
          className="mt-1.5 px-2.5 py-1 rounded-md border border-orange-400/75 bg-[#221309]/92 text-orange-100 text-[11px] font-mono-tabular font-bold flex items-center gap-2 shadow-lg"
        >
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse shrink-0" />
          <span>
            {tr('INSPEKCJA 02:30', 'NIGHT INSPECTION')} · {snapshot.nightInspection.passedCount}/
            {snapshot.nightInspection.totalCount}
          </span>
          {snapshot.nightInspection.violatedCount > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-red-500/25 border border-red-400/60 text-red-200 text-[9.5px]">
              BHP: -{snapshot.nightInspection.violatedCount}
            </span>
          )}
        </div>
      )}
      {snapshot.gameMode === 'passenger' && (
        <div
          data-testid="passenger-ato-badge"
          className="mt-1.5 px-2.5 py-1 rounded-md border border-emerald-400/75 bg-[#0b1f18]/92 text-emerald-200 text-[11px] font-mono-tabular font-bold flex items-center gap-2 shadow-lg"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span>{tr('PRZEJAZD PASAŻERA · AUTOPILOT ATO', 'PASSENGER RIDE · ATO AUTOPILOT')}</span>
        </div>
      )}
      {snapshot.gameMode === 'sandbox' && (
        <SandboxControlsBar
          nextSignalAspect={snapshot.nextSignal?.signal.aspect}
          oncomingActive={snapshot.oncomingTrain.active}
          onSpawnOncoming={onSandboxSpawnTrain}
          onCycleSignal={onSandboxCycleSignal}
        />
      )}
      {localizedChallenge && (
        <div
          data-testid="challenge-objective-bar"
          className="mt-1.5 px-3 py-1.5 rounded-md border border-fuchsia-400/70 bg-[#1d1026]/92 text-fuchsia-100 text-[11px] font-mono-tabular shadow-lg max-w-[360px]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold uppercase tracking-wider text-fuchsia-300">
              {tr('WYZWANIE', 'CHALLENGE')} · {localizedChallenge.title}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-fuchsia-500/20 border border-fuchsia-400/50 text-[9px] font-bold text-amber-200 whitespace-nowrap">
              {localizedChallenge.badge}
            </span>
          </div>
          <p className="text-[10px] text-slate-200 mt-0.5 leading-snug">
            {localizedChallenge.objectiveSummary}
          </p>
        </div>
      )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col items-center gap-1.5 max-w-[44vw]">
        <RouteLineStrip snapshot={snapshot} />
        <MetroLedDisplay
          announcement={announcement}
          lineId={snapshot.line.badgeCode ?? snapshot.line.id}
          lineCssColor={snapshot.line.cssColor}
        />
        {radio.active && (
          <div
            role="alert"
            data-testid="radio-dispatch-banner"
            className="pointer-events-auto w-full max-w-[560px] px-3.5 py-2 rounded-md border-2 border-cyan-400/85 bg-[#071824]/95 text-cyan-50 shadow-2xl flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-300 animate-pulse shrink-0" />
                <span className="text-[10px] font-mono-tabular font-bold uppercase tracking-[0.16em] text-cyan-300">
                  {tr('Radio Dyspozytora · Kanał Ruchowy', 'Dispatch Radio · Traffic Channel')}
                </span>
              </div>
              <button
                type="button"
                data-testid="radio-banner-ack-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onAcknowledgeRadio();
                }}
                className="px-2.5 py-1 rounded bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono-tabular font-bold text-[11px] whitespace-nowrap cursor-pointer"
              >
                {tr('Potwierdź [R]', 'Confirm [R]')}
                {snapshot.gameMode === 'sandbox' || snapshot.gameMode === 'passenger'
                  ? ''
                  : tr(' +40 pkt', ' +40 pts')}{' '}
                ({radio.remainingSec.toFixed(1)}s)
              </button>
            </div>
            <p className="text-xs font-medium text-slate-100 leading-snug">
              {localizedRadio.displayText}
            </p>
            <div className="w-full h-1 bg-slate-800 rounded overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-transform origin-left"
                style={{ transform: `scaleX(${Math.max(0, Math.min(1, radio.remainingSec / 6))})` }}
              />
            </div>
          </div>
        )}
        {snapshot.lightingEffects.dimHighBeamPromptActive && (
          <div
            role="alert"
            data-testid="dim-high-beam-prompt"
            className="px-3.5 py-1.5 rounded-md border-2 border-sky-300 bg-[#081c2e]/95 text-sky-100 text-xs font-mono-tabular font-bold tracking-wide shadow-2xl flex items-center gap-2 animate-pulse"
          >
            <span className="w-2 h-2 rounded-full bg-sky-300 shrink-0" />
            <span>
              {tr('Przygaś długie! [L] · Pociąg z naprzeciwka', 'Dim high beams! [L] · Oncoming train')}
            </span>
          </div>
        )}
        {snapshot.nightInspection.activeApproachCrew && (
          <div
            role="alert"
            data-testid="night-crew-warning"
            className="w-full max-w-[560px] px-3.5 py-2 rounded-md border-2 border-orange-400 bg-[#231107]/95 text-orange-50 shadow-2xl flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular"
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-ping shrink-0" />
              <span className="font-bold text-orange-200">
                {tr('EKIPA NA TORACH', 'TRACK CREW AHEAD')} (
                {Math.max(0, Math.round(snapshot.nightInspection.activeApproachDistanceM ?? 0))} m)
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold">
              <span
                className={`px-2 py-0.5 rounded border ${
                  snapshot.nightInspection.speedSafeNow
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                    : 'bg-red-500/25 border-red-400 text-red-200 animate-pulse'
                }`}
              >
                {snapshot.nightInspection.speedSafeNow ? '✓ ' : '⚠ '}
                ≤ {NIGHT_CREW_MAX_SPEED_KMH} km/h
              </span>
              <span
                className={`px-2 py-0.5 rounded border ${
                  snapshot.nightInspection.activeApproachCrew.hornSounded
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                    : 'bg-amber-500/25 border-amber-400 text-amber-200 animate-pulse'
                }`}
              >
                {snapshot.nightInspection.activeApproachCrew.hornSounded ? '✓ ' : '● '}
                {tr('Klakson [H]', 'Horn [H]')}
              </span>
            </div>
          </div>
        )}
        {localizedCameraLabel && (
          <div
            data-testid="camera-notice"
            className="px-3.5 py-1.5 rounded-md border border-sky-400/70 bg-[#0c1829]/95 text-sky-100 text-xs font-mono-tabular font-semibold tracking-wide shadow-lg"
          >
            {localizedCameraLabel}
          </div>
        )}
        {feedback && localizedFeedback && (
          <div
            role="status"
            data-testid="hud-feedback-banner"
            className={`px-4 py-2 rounded-md border text-sm font-medium flex items-center gap-2.5 shadow-lg ${getFeedbackColor(feedback.tone)}`}
          >
            <span>{localizedFeedback}</span>
            {feedback.pointsDelta !== 0 && (
              <span className="font-mono-tabular font-bold">
                {feedback.pointsDelta > 0 ? `+${feedback.pointsDelta}` : feedback.pointsDelta}{' '}
                {tr('pkt', 'pts')}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 shrink-0">
        <button
          type="button"
          tabIndex={-1}
          data-testid="help-toggle-btn"
          aria-label={tr('Pomoc i skróty klawiszowe [?]', 'Help & keybindings [?]')}
          title={tr('Pomoc i skróty klawiszowe [?]', 'Help & keybindings [?]')}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleHelp();
          }}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-md bg-[#10141c]/90 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-amber-300 font-mono-tabular font-bold text-sm sm:text-base cursor-pointer"
        >
          ?
        </button>

        <button
          type="button"
          tabIndex={-1}
          data-testid="camera-cycle-btn"
          aria-label={tr('Zmień kamerę [V]', 'Cycle camera [V]')}
          title={tr('Zmień kamerę [V]', 'Cycle camera [V]')}
          onClick={(e) => {
            e.currentTarget.blur();
            onCycleCamera();
          }}
          className="h-8 sm:h-10 px-2 sm:px-2.5 rounded-md bg-[#10141c]/90 hover:bg-slate-800 border border-slate-700/80 flex items-center gap-1.5 text-slate-200 cursor-pointer text-xs font-mono-tabular font-semibold"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 7l-7 5 7 5V7z" />
            <rect x="1" y="5" width="15" height="14" rx="2" />
          </svg>
          <span className="hidden sm:inline">[V]</span>
        </button>

        <button
          type="button"
          tabIndex={-1}
          aria-label={muted ? tr('Włącz dźwięk [M]', 'Unmute audio [M]') : tr('Wycisz dźwięk [M]', 'Mute audio [M]')}
          title={muted ? tr('Włącz dźwięk [M]', 'Unmute audio [M]') : tr('Wycisz dźwięk [M]', 'Mute audio [M]')}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-md bg-[#10141c]/90 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-200 cursor-pointer"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
          aria-label={tr('Pauza [P]', 'Pause [P]')}
          title={tr('Pauza [P]', 'Pause [P]')}
          onClick={(e) => {
            e.currentTarget.blur();
            onPause();
          }}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-md bg-[#10141c]/90 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-200 cursor-pointer"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        </button>

        <button
          type="button"
          tabIndex={-1}
          aria-label={tr('Restartuj kurs [Shift+R]', 'Restart run [Shift+R]')}
          title={tr('Restartuj kurs [Shift+R]', 'Restart run [Shift+R]')}
          onClick={(e) => {
            e.currentTarget.blur();
            onRestart();
          }}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-md bg-[#10141c]/90 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-200 cursor-pointer"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
