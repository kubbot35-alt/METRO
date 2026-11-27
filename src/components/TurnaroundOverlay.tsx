import type { ITurnaroundState } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';

interface ITurnaroundOverlayProps {
  readonly turnaround: ITurnaroundState;
  readonly speedKmh: number;
  readonly onSwitchCab: () => void;
}

export function TurnaroundOverlay({
  turnaround,
  speedKmh,
  onSwitchCab,
}: ITurnaroundOverlayProps) {
  const { tr } = useI18n();

  if (turnaround.phase === 'inactive') {
    return null;
  }

  if (turnaround.phase === 'switching_cab') {
    const fadeOpacity = Math.sin(Math.PI * Math.max(0, Math.min(1, turnaround.switchProgress)));
    return (
      <div
        data-testid="cab-switch-fade"
        className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center bg-[#04060b]"
        style={{ opacity: Math.min(0.98, Math.max(0.15, fadeOpacity * 1.15)) }}
      >
        <div className="px-5 py-3 rounded-lg border border-cyan-400/70 bg-[#0a1422] text-center shadow-2xl">
          <p className="font-display text-lg font-bold text-cyan-200 tracking-wide">
            {tr('Zmiana kabiny maszynisty...', 'Switching Driver Cab...')}
          </p>
          <p className="font-mono-tabular text-xs text-slate-300 mt-1">
            {tr(
              'Przeliczanie rozkładu i zmiana kierunku na wyświetlaczu LED',
              'Recalculating timetable & reversing LED destination display',
            )}
          </p>
        </div>
      </div>
    );
  }

  const isReady = turnaround.phase === 'ready_to_switch';
  const overLimit = speedKmh > turnaround.maxSidingSpeedKmh + 1;

  return (
    <div
      data-testid="turnaround-siding-panel"
      className="fixed top-24 left-1/2 -translate-x-1/2 z-20 pointer-events-auto w-[440px] max-w-[calc(100vw-24px)] rounded-lg border-2 border-cyan-400/80 bg-[#081321]/95 px-4 py-3 shadow-2xl text-slate-100"
    >
      <div className="flex items-center justify-between gap-2 text-[11px] font-mono-tabular">
        <span className="font-bold uppercase tracking-wider text-cyan-300">
          {tr('TOR ODSTAWCZY · MANEWR ZAWRACANIA', 'TURNAROUND SIDING · REVERSAL')}
        </span>
        <span
          className={`px-1.5 py-0.5 rounded font-bold border ${
            overLimit
              ? 'bg-red-500/25 border-red-400 text-red-200 animate-pulse'
              : 'bg-slate-800 border-slate-600 text-amber-300'
          }`}
        >
          MAX {turnaround.maxSidingSpeedKmh} km/h
        </span>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-3 text-xs font-mono-tabular">
        <span className="text-slate-200">
          {isReady
            ? tr('Zatrzymano w strefie — możesz zmienić kabinę', 'Stopped in zone — ready to switch cab')
            : turnaround.inStopZone
              ? tr('W strefie zawracania — zatrzymaj pociąg (0 km/h)', 'In turnaround zone — stop train (0 km/h)')
              : tr('Jedź powoli w głąb toru odstawczego', 'Proceed slowly into turnaround siding')}
        </span>
        <span className="font-bold text-red-300 whitespace-nowrap shrink-0">
          {tr('Kozioł', 'Buffer')}: {Math.round(turnaround.distanceToBufferM)} m
        </span>
      </div>

      {isReady && (
        <button
          type="button"
          data-testid="switch-cab-btn"
          onClick={(e) => {
            e.currentTarget.blur();
            onSwitchCab();
          }}
          className="mt-2.5 w-full py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-sm tracking-wide cursor-pointer shadow-lg"
        >
          {tr('Zmień kabinę [T] — Rozpocznij kurs powrotny', 'Switch Cab [T] — Start Return Trip')}
        </button>
      )}
    </div>
  );
}
