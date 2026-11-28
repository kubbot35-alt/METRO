import type { ISimulationSnapshot, SignalAspect } from '../../domain/types';
import type { ISlidingRouteWindow, ISlidingRouteBead } from '../../domain/routeVariant';
import { useI18n } from '../../i18n/LanguageContext';

const TRACK_X_START = 38;
const TRACK_SPAN = 962 - TRACK_X_START;
const TRACK_Y = 17;

export function ratioToSvgX(ratio: number): number {
  return TRACK_X_START + Math.min(1, Math.max(0, ratio)) * TRACK_SPAN;
}

function abbreviateStationName(name: string): string {
  if (name.length <= 13) {
    return name;
  }
  const compact = name
    .replace('Centrum Nauki ', 'CN ')
    .replace('Targówek Mieszkaniowy', 'Targówek M.')
    .replace('Nowy Świat-Uniwersytet', 'Nowy Świat')
    .replace('Pole Mokotowskie', 'Pole Mokot.')
    .replace('Rondo Daszyńskiego', 'R. Daszyńsk.')
    .replace('Dworzec Wileński', 'Dw. Wileński')
    .replace('Dworzec Gdański', 'Dw. Gdański')
    .replace('Stadion Narodowy', 'Stadion Nar.')
    .replace('Księcia Janusza', 'Ks. Janusza')
    .replace('Ratusz Arsenał', 'Ratusz Ars.');
  return compact.length <= 14 ? compact : `${compact.slice(0, 12)}…`;
}

function getSignalStyle(aspect: SignalAspect | undefined): { readonly dotClass: string; readonly textClass: string } {
  if (aspect === 'red') {
    return { dotClass: 'bg-red-500', textClass: 'text-red-300' };
  }
  return aspect === 'yellow'
    ? { dotClass: 'bg-amber-400', textClass: 'text-amber-300' }
    : { dotClass: 'bg-emerald-400', textClass: 'text-emerald-300' };
}

export function RouteLineHeader({ snapshot, badgeLabel, lineHex }: { readonly snapshot: ISimulationSnapshot; readonly badgeLabel: string; readonly lineHex: string }) {
  const { tr } = useI18n();
  const { line, currentStation, nextSignal, trackworkZones } = snapshot;
  const sigStyle = getSignalStyle(nextSignal?.signal.aspect);
  return (
    <div className="flex items-center justify-between gap-2 text-[11px] font-mono-tabular">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-bold tracking-wider shrink-0 text-white" style={{ backgroundColor: lineHex }}>{badgeLabel}</span>
        <span className="text-[10px] text-slate-400 hidden sm:inline shrink-0">→ {line.destinationLed}</span>
        <span className="text-slate-100 font-semibold truncate">{currentStation.station.name}</span>
        <span className="text-amber-300 shrink-0">{Math.max(0, Math.round(currentStation.distanceToTargetM))} m</span>
      </div>
      <div className="flex items-center gap-2 shrink-0" data-testid="koralik-signal">
        {trackworkZones.length > 0 && <span className="text-[10px] text-amber-300 font-semibold hidden sm:inline">{tr('ROBOTY', 'WORKS')}</span>}
        <span className={`w-2.5 h-2.5 rounded-full inline-block ${sigStyle.dotClass}`} aria-hidden="true" />
        <span className={`text-[10px] font-bold ${sigStyle.textClass}`}>
          {nextSignal ? `${tr('SEM', 'SIG')} ${Math.max(0, Math.round(nextSignal.distanceAheadM))}m` : tr('KONIEC', 'END')}
        </span>
      </div>
    </div>
  );
}

function RouteStationBead({ bead, lineHex }: { readonly bead: ISlidingRouteBead; readonly lineHex: string }) {
  const cx = ratioToSvgX(bead.ratioInWindow);
  const isPassed = bead.state === 'passed';
  const isCurrent = bead.state === 'current';
  return (
    <g data-testid={`koralik-station-${bead.station.code}`}>
      {isCurrent && <circle cx={cx} cy={TRACK_Y} r={10.5} fill="none" stroke="#facc15" strokeWidth={2.2} />}
      <circle cx={cx} cy={TRACK_Y} r={isCurrent ? 6.5 : 5} fill={isPassed ? lineHex : isCurrent ? '#f8fafc' : '#0f172a'} stroke={isCurrent ? lineHex : isPassed ? '#cbd5e1' : '#94a3b8'} strokeWidth={2} />
      <text x={cx} y={43} textAnchor="middle" fontSize={isCurrent ? '14' : '12.5'} fontWeight={isCurrent ? '700' : '500'} fill={isCurrent ? '#fef08a' : isPassed ? '#64748b' : '#cbd5e1'} style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
        {abbreviateStationName(bead.station.name)}
      </text>
    </g>
  );
}

interface IRouteSignalAndTrackworkProps {
  readonly snapshot: ISimulationSnapshot;
  readonly win: ISlidingRouteWindow;
  readonly lineHex: string;
}

function RouteSignalAndTrackwork({ snapshot, win, lineHex }: IRouteSignalAndTrackworkProps) {
  const spanM = Math.max(1, win.windowEndM - win.windowStartM);
  const toX = (distM: number): number => ratioToSvgX((distM - win.windowStartM) / spanM);
  const sig = snapshot.nextSignal?.signal;
  const sigFill = sig?.aspect === 'red' ? '#ef4444' : sig?.aspect === 'yellow' ? '#f59e0b' : '#10b981';
  return (
    <>
      <rect x={TRACK_X_START} y={TRACK_Y - 3} width={TRACK_SPAN} height={6} rx={3} fill="#1e293b" />
      <rect x={TRACK_X_START} y={TRACK_Y - 2.2} width={TRACK_SPAN} height={4.4} rx={2.2} fill={lineHex} />
      {snapshot.trackworkZones.filter((z) => z.endM >= win.windowStartM && z.startM <= win.windowEndM).map((zone) => (
        <rect key={zone.id} data-testid="koralik-trackwork" x={toX(zone.startM)} y={TRACK_Y - 4} width={Math.max(toX(zone.endM) - toX(zone.startM), 10)} height={8} rx={2} fill="#facc15" stroke="#0f172a" strokeWidth={1.5} />
      ))}
      {sig && sig.distanceM >= win.windowStartM && sig.distanceM <= win.windowEndM && (
        <circle cx={toX(sig.distanceM)} cy={TRACK_Y} r={4.5} fill={sigFill} stroke="#090d16" strokeWidth={1.5} />
      )}
    </>
  );
}

export function RouteLineSvgDiagram({ snapshot, win, lineHex }: { readonly snapshot: ISimulationSnapshot; readonly win: ISlidingRouteWindow; readonly lineHex: string }) {
  const { tr } = useI18n();
  const trainX = ratioToSvgX(win.trainRatio);
  return (
    <svg viewBox="0 0 1000 50" data-testid="koralik-window" data-window-count={win.beads.length} className="w-full h-10 overflow-visible" role="img" aria-label={tr(`Schemat trasy ${snapshot.line.name}`, `Route map ${snapshot.line.name}`)}>
      {win.hasMoreBefore && <text x={14} y={TRACK_Y + 4} fill="#94a3b8" fontSize="16" fontWeight="700" textAnchor="middle">‹</text>}
      {win.hasMoreAfter && <text x={986} y={TRACK_Y + 4} fill="#94a3b8" fontSize="16" fontWeight="700" textAnchor="middle">›</text>}
      <RouteSignalAndTrackwork snapshot={snapshot} win={win} lineHex={lineHex} />
      {win.beads.map((bead) => <RouteStationBead key={bead.station.code} bead={bead} lineHex={lineHex} />)}
      <g transform={`translate(${trainX}, ${TRACK_Y})`} data-testid="koralik-train-icon">
        <rect x={-13} y={-9} width={26} height={14} rx={4} fill="#f8fafc" stroke="#090d16" strokeWidth={2} />
        <rect x={-9} y={-5.5} width={14} height={5} rx={1.5} fill={lineHex} />
        <polygon points="8,-5.5 11.5,-2 8,1.5" fill="#f59e0b" />
      </g>
    </svg>
  );
}
