import { getStationPlatformSide } from '../../domain/trackGeometry';
import type { ISimulationSnapshot } from '../../domain/types';
import { useI18n } from '../../i18n/LanguageContext';

const HIGHLIGHT_RING = 'ring-2 ring-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.85)] animate-pulse';

function doorButtonClass(active: boolean, retryFault: boolean, recommended: boolean, canToggle: boolean, highlighted: boolean): string {
  const base = active && retryFault ? 'bg-amber-500 border-amber-300 text-slate-950 cursor-pointer'
    : active ? 'bg-emerald-500 border-emerald-300 text-slate-950 cursor-pointer'
    : recommended ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-slate-950 cursor-pointer'
    : canToggle ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200 cursor-pointer'
    : 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed';
  return `px-1.5 py-1.5 rounded text-[10.5px] font-mono-tabular font-bold whitespace-nowrap transition-colors border ${base} ${highlighted ? HIGHLIGHT_RING : ''}`;
}

function getDoorsMeta(snapshot: ISimulationSnapshot, tr: (p: string, e: string) => string) {
  const { doorState, openDoorSide, doorFault } = snapshot;
  const statusText = doorFault.phase !== 'none' ? tr('AWARIA', 'FAULT') : doorState === 'open' ? (openDoorSide === 'left' ? tr('OTWARTE L', 'OPEN L') : tr('OTWARTE P', 'OPEN R')) : tr('ZAMKNIĘTE', 'CLOSED');
  const statusClass = doorFault.phase !== 'none' ? 'text-amber-400 font-bold' : doorState === 'open' ? 'text-emerald-400 font-bold' : 'text-slate-200 font-semibold';
  const hint = snapshot.nightInspection.active ? tr('Nocny serwis · Ekipy ≤ 20 + [H]', 'Night service · Crews ≤ 20 + [H]')
    : snapshot.challenge?.skipStations ? tr('Przejazd techniczny — bez postojów', 'Technical run — non-stop')
    : doorFault.phase === 'resetting' ? `${tr('Reset drzwi', 'Door reset')}: ${doorFault.remainingSec.toFixed(1)} s`
    : snapshot.gameMode === 'sandbox' ? tr('Q Lewe · E Prawe · O Auto', 'Q Left · E Right · O Auto') : tr('0 km/h · Strona peronu', '0 km/h · Platform side');
  return { statusText, statusClass, hint };
}

interface IDashboardDoorsSectionProps {
  readonly snapshot: ISimulationSnapshot;
  readonly dividerClass: string;
  readonly academyHighlight: string | null;
  readonly onToggleDoorsLeft: () => void;
  readonly onToggleDoorsRight: () => void;
}

export function DashboardDoorsSection({ snapshot, dividerClass, academyHighlight, onToggleDoorsLeft, onToggleDoorsRight }: IDashboardDoorsSectionProps) {
  const { tr } = useI18n();
  const { doorState, openDoorSide, canToggleDoors, doorFault, currentStation } = snapshot;
  const isLeftPlatform = getStationPlatformSide(currentStation.station) === 'left';
  const meta = getDoorsMeta(snapshot, tr);
  return (
    <div className={`border-l ${dividerClass} pl-2 flex flex-col gap-1.5 min-w-[152px]`}>
      <div className="flex items-center justify-between text-xs font-mono-tabular gap-2">
        <span className="text-slate-400 uppercase">{tr('Drzwi L / P', 'Doors L / R')}</span>
        <span className={meta.statusClass}>{meta.statusText}</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" data-testid="doors-left-btn" data-academy-highlight={academyHighlight === 'doors-left' ? '1' : '0'} aria-label={tr('Drzwi lewe [Q]', 'Left doors [Q]')} disabled={!canToggleDoors} onClick={(e) => { e.currentTarget.blur(); onToggleDoorsLeft(); }} className={doorButtonClass(doorState === 'open' && openDoorSide === 'left', doorFault.phase === 'awaiting-retry', canToggleDoors && doorState === 'closed' && isLeftPlatform, canToggleDoors, academyHighlight === 'doors-left')}>{tr('◀ LEWE [Q]', '◀ LEFT [Q]')}</button>
        <button type="button" data-testid="doors-right-btn" data-academy-highlight={academyHighlight === 'doors-right' ? '1' : '0'} aria-label={tr('Drzwi prawe [E]', 'Right doors [E]')} disabled={!canToggleDoors} onClick={(e) => { e.currentTarget.blur(); onToggleDoorsRight(); }} className={doorButtonClass(doorState === 'open' && openDoorSide === 'right', doorFault.phase === 'awaiting-retry', canToggleDoors && doorState === 'closed' && !isLeftPlatform, canToggleDoors, academyHighlight === 'doors-right')}>{tr('PRAWE [E] ▶', 'RIGHT [E] ▶')}</button>
      </div>
      <span className="text-[9.5px] text-slate-400 font-mono-tabular whitespace-nowrap">{meta.hint}</span>
    </div>
  );
}
