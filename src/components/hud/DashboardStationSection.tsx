import { localizeAtoStatus } from '../../domain/i18nDynamic';
import { getStationPlatformSide } from '../../domain/trackGeometry';
import type { ISimulationSnapshot } from '../../domain/types';
import { useI18n } from '../../i18n/LanguageContext';
import { ComfortGaugeWidget } from '../ComfortGaugeWidget';
import { StopApproachBar } from './StopApproachBar';

function resolvePlatformHint(snapshot: ISimulationSnapshot, tr: (p: string, e: string) => string): { cls: string; text: string } {
  const { currentStation } = snapshot;
  const isLeft = getStationPlatformSide(currentStation.station) === 'left';
  const approaching = currentStation.distanceToTargetM <= 220;
  const cls = snapshot.nightInspection.active ? 'bg-orange-500/20 border-orange-400/80 text-orange-200'
    : snapshot.challenge?.skipStations ? 'bg-fuchsia-500/20 border-fuchsia-400/80 text-fuchsia-200'
    : currentStation.inStopZone ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
    : approaching ? 'bg-amber-500/20 border-amber-400/80 text-amber-200' : 'bg-slate-800/90 border-slate-700 text-slate-300';
  const text = snapshot.nightInspection.active ? tr('INSPEKCJA 02:30', 'NIGHT SERVICE')
    : snapshot.challenge?.skipStations ? `${tr('PRZEJAZD', 'PASS')} ≤ ${snapshot.challenge.stationPassLimitKmh ?? 40}`
    : isLeft ? tr('◀ Peron L [Q]', '◀ Platf. L [Q]') : tr('Peron P [E] ▶', 'Platf. R [E] ▶');
  return { cls, text };
}

function StationHeaderRow({ snapshot }: { readonly snapshot: ISimulationSnapshot }) {
  const { lang, tr } = useI18n();
  const hint = resolvePlatformHint(snapshot, tr);
  return (
    <div className="flex items-center justify-between gap-1.5 min-w-0">
      <div className="flex items-center gap-1 min-w-0 shrink">
        <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400 whitespace-nowrap">{snapshot.currentStation.station.code}</span>
        {snapshot.atoEnabled && <span data-testid="hud-ato-status" className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/75 text-emerald-200 font-mono-tabular text-[9px] font-bold uppercase whitespace-nowrap">{localizeAtoStatus(lang, snapshot.atoStatus)}</span>}
        {snapshot.weather.wheelSlipActive ? (
          <span data-testid="wheel-slip-indicator" className="px-1 py-0.5 rounded bg-amber-500 text-slate-950 font-mono-tabular text-[9px] font-bold uppercase animate-pulse whitespace-nowrap">{tr('POŚLIZG!', 'SLIP!')}</span>
        ) : (snapshot.weather.wetRailsActive || snapshot.radio.slipperyRailsActive) && (
          <span data-testid="wet-rails-badge" className="px-1 py-0.5 rounded bg-sky-500/20 border border-sky-400/60 text-sky-200 font-mono-tabular text-[9px] font-bold uppercase whitespace-nowrap">{tr('ŚLISKIE SZYNY', 'SLIPPERY RAILS')}</span>
        )}
      </div>
      <span data-testid="platform-side-hint" className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono-tabular font-bold uppercase tracking-wide whitespace-nowrap shrink-0 border ${hint.cls}`}>{hint.text}</span>
    </div>
  );
}

function BoardingProgressRow({ snapshot, expectedKey }: { readonly snapshot: ISimulationSnapshot; readonly expectedKey: string }) {
  const { tr } = useI18n();
  const { doorFault } = snapshot;
  const boardingPct = Math.min(100, (snapshot.boardingTimerSec / snapshot.boardingDurationSec) * 100);
  const remainingSec = Math.max(0, snapshot.boardingDurationSec - snapshot.boardingTimerSec);
  const paxCount = `${snapshot.currentStationBoardedCount}/${snapshot.effectiveWaitingPassengers}`;
  const label = doorFault.phase === 'awaiting-retry' ? tr(`AWARIA DRZWI — powtórz [${expectedKey}]`, `DOOR FAULT — retry [${expectedKey}]`)
    : doorFault.phase === 'resetting' ? tr('Reset drzwi...', 'Resetting doors...')
    : snapshot.boardingCompletedForCurrent ? tr(`Wymiana zakończona — zamknij [${expectedKey}]`, `Exchange done — close [${expectedKey}]`)
    : tr(`Wymiana pasażerów (${paxCount})`, `Passenger exchange (${paxCount})`);
  return (
    <div data-testid="boarding-progress-bar" className="flex flex-col gap-1">
      <div className="flex justify-between text-[11px] font-mono-tabular text-emerald-300 gap-2">
        <span className="truncate">{label}</span>
        <span className="whitespace-nowrap">{doorFault.phase === 'resetting' ? `${doorFault.remainingSec.toFixed(1)} s` : `${Math.round(boardingPct)}% · ${remainingSec.toFixed(1)} s`}</span>
      </div>
      <div className="w-full h-2 bg-slate-800 rounded overflow-hidden">
        <div className={`h-full transition-transform origin-left ${doorFault.phase !== 'none' ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ transform: `scaleX(${boardingPct / 100})` }} />
      </div>
    </div>
  );
}

function resolveZoneBadgeText(snapshot: ISimulationSnapshot, isLeftPlatform: boolean, tr: (p: string, e: string) => string): { readonly alert: boolean; readonly label: string } {
  const trackworkAlert = snapshot.activeTrackworkZone !== null || snapshot.upcomingTrackworkDistanceM !== null;
  const alert = trackworkAlert || snapshot.trackProfile.inCurveLimitZone || snapshot.trackProfile.upcomingCurveLimitKmh !== null;
  const label = trackworkAlert ? tr('ROBOTY 25', 'WORKS 25')
    : snapshot.trackProfile.inCurveLimitZone ? tr('ŁUK 45', 'CURVE 45')
    : snapshot.trackProfile.upcomingCurveLimitKmh !== null ? `${tr('ŁUK', 'CURVE')} ${snapshot.trackProfile.upcomingCurveLimitKmh}`
    : snapshot.challenge?.skipStations ? tr('PRZEJAZD 40', 'PASS 40')
    : snapshot.currentStation.inStopZone ? tr('STREFA STOP', 'STOP ZONE')
    : isLeftPlatform ? tr('WYSPOWY', 'ISLAND') : tr('BOCZNY', 'SIDE');
  return { alert, label };
}

export function DashboardStationSection({ snapshot, dividerClass }: { readonly snapshot: ISimulationSnapshot; readonly dividerClass: string }) {
  const { tr } = useI18n();
  const { currentStation } = snapshot;
  const distM = Math.round(currentStation.distanceToTargetM);
  const isLeftPlatform = getStationPlatformSide(currentStation.station) === 'left';
  const expectedKey = isLeftPlatform ? 'Q' : 'E';
  const zoneBadge = resolveZoneBadgeText(snapshot, isLeftPlatform, tr);
  return (
    <div className={`min-w-0 overflow-hidden border-l ${dividerClass} pl-2.5 flex flex-col gap-1`}>
      <StationHeaderRow snapshot={snapshot} />
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-base font-semibold text-amber-300 truncate">{currentStation.station.name}</span>
        <div className="flex items-baseline gap-2 shrink-0">
          <span className={`text-[10px] font-mono-tabular whitespace-nowrap ${zoneBadge.alert ? 'text-amber-400 font-bold' : 'text-emerald-400'}`}>{zoneBadge.label}</span>
          <span className="font-mono-tabular text-base font-bold text-slate-50 whitespace-nowrap">{distM >= 0 ? `${distM} m` : `+${Math.abs(distM)} m`}</span>
        </div>
      </div>
      {snapshot.doorState === 'open' ? <BoardingProgressRow snapshot={snapshot} expectedKey={expectedKey} /> : <StopApproachBar distanceToTargetM={currentStation.distanceToTargetM} />}
      <ComfortGaugeWidget comfort={snapshot.comfort} />
    </div>
  );
}
