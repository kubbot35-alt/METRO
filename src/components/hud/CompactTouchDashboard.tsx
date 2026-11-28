import { trainSupportsRegeneration } from '../../domain/ecoDrivingSystem';
import { localizeAtoStatus } from '../../domain/i18nDynamic';
import { getStationPlatformSide } from '../../domain/trackGeometry';
import type { ISimulationSnapshot } from '../../domain/types';
import { useI18n } from '../../i18n/LanguageContext';
import { ComfortGaugeWidget } from '../ComfortGaugeWidget';
import { EcoDrivingWidget } from '../EcoDrivingWidget';
import { Sop2Indicator } from '../Sop2Indicator';
import { StopApproachBar } from './StopApproachBar';

interface ICompactTouchDashboardProps {
  readonly snapshot: ISimulationSnapshot;
  readonly panelClasses: string;
  readonly dividerClass: string;
  readonly paPanelOpen: boolean;
  readonly onTogglePaPanel?: () => void;
}

function formatCompactGrade(gradePct: number): string {
  if (Math.abs(gradePct) < 0.15) return '0.0% →';
  return gradePct > 0 ? `+${gradePct.toFixed(1)}% ↗` : `${gradePct.toFixed(1)}% ↘`;
}

function CompactSpeedAndSignal({ snapshot, dividerClass }: { readonly snapshot: ISimulationSnapshot; readonly dividerClass: string }) {
  const { tr } = useI18n();
  const aspect = snapshot.nextSignal?.signal.aspect;
  const signalDot = aspect === 'red' ? 'bg-red-500' : aspect === 'yellow' ? 'bg-amber-400' : 'bg-emerald-400';
  const signalLabel = snapshot.atpActive ? 'ATP!' : aspect === 'red' ? tr('STÓJ', 'STOP') : aspect === 'yellow' ? tr('UWAGA', 'CAUTION') : tr('WOLNA', 'CLEAR');
  return (
    <>
      <div className="flex items-baseline gap-1.5 shrink-0">
        <span className={`font-mono-tabular text-2xl font-bold leading-none ${snapshot.isOverspeeding ? 'text-red-400' : 'text-slate-50'}`}>{Math.round(snapshot.kinematics.speedKmh)}</span>
        <div className="flex flex-col leading-tight text-[9.5px] font-mono-tabular">
          <span className={snapshot.trackProfile.inCurveLimitZone ? 'text-amber-300 font-bold' : 'text-slate-400'}>LIM {Math.round(snapshot.speedLimitKmh)}</span>
          <span className="text-slate-300">{formatCompactGrade(snapshot.trackProfile.gradePercent)}</span>
        </div>
      </div>
      <div className={`border-l ${dividerClass} pl-2 flex items-center gap-1.5 shrink-0`}>
        <span className={`w-3 h-3 rounded-full ${signalDot} shrink-0`} aria-hidden="true" />
        <div className="flex flex-col leading-tight text-[9.5px] font-mono-tabular">
          <span className="text-slate-200 font-bold">{snapshot.nextSignal ? `${Math.max(0, Math.round(snapshot.nextSignal.distanceAheadM))}m` : tr('KONIEC', 'END')}</span>
          <span className={snapshot.atpActive ? 'text-red-300 font-bold' : 'text-slate-400'}>{signalLabel}</span>
        </div>
      </div>
    </>
  );
}

function CompactStationStrip({ snapshot, dividerClass }: { readonly snapshot: ISimulationSnapshot; readonly dividerClass: string }) {
  const { tr } = useI18n();
  const { currentStation, doorState, doorFault } = snapshot;
  const distM = Math.round(currentStation.distanceToTargetM);
  const isLeftPlatform = getStationPlatformSide(currentStation.station) === 'left';
  const boardingPct = Math.min(100, (snapshot.boardingTimerSec / snapshot.boardingDurationSec) * 100);
  return (
    <div className={`flex-1 min-w-0 border-l ${dividerClass} pl-2 flex flex-col gap-0.5`}>
      <div className="flex items-center justify-between gap-1.5 min-w-0">
        <span className="font-display text-xs sm:text-sm font-semibold text-amber-300 truncate">{currentStation.station.code} · {currentStation.station.name}</span>
        <span className="font-mono-tabular text-xs font-bold text-slate-50 whitespace-nowrap shrink-0">{distM >= 0 ? `${distM} m` : `+${Math.abs(distM)} m`}</span>
        <span className={`px-1 py-0.5 rounded text-[9px] font-mono-tabular font-bold whitespace-nowrap shrink-0 border ${currentStation.inStopZone ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>{isLeftPlatform ? '◀ L' : `${tr('P', 'R')} ▶`}</span>
      </div>
      {doorState === 'open' ? (
        <div data-testid="boarding-progress-bar" className="w-full h-1.5 bg-slate-800 rounded overflow-hidden">
          <div className={`h-full transition-transform origin-left ${doorFault.phase !== 'none' ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ transform: `scaleX(${boardingPct / 100})` }} />
        </div>
      ) : (
        <StopApproachBar distanceToTargetM={currentStation.distanceToTargetM} compact />
      )}
    </div>
  );
}

export function CompactTouchDashboard({ snapshot, panelClasses, dividerClass, paPanelOpen, onTogglePaPanel }: ICompactTouchDashboardProps) {
  const { lang, tr } = useI18n();
  const supportsRegen = trainSupportsRegeneration(snapshot.trainModel.id);
  return (
    <div className="fixed bottom-0 inset-x-0 z-10 pointer-events-none flex justify-center px-2 pb-1.5">
      <section aria-label={tr('Kompaktowy pulpit maszynisty', 'Compact driver dashboard')} data-testid="compact-touch-hud" data-theme={snapshot.trainModel.visual.theme} className={`pointer-events-auto w-full max-w-[780px] ${panelClasses} border rounded-lg px-2.5 py-1.5 shadow-2xl flex items-center justify-between gap-2.5`}>
        <CompactSpeedAndSignal snapshot={snapshot} dividerClass={dividerClass} />
        <Sop2Indicator sop2={snapshot.sop2} compact />
        {snapshot.atoEnabled && <span data-testid="compact-ato-status" className="px-1.5 py-0.5 rounded border border-emerald-400/80 bg-emerald-500/20 text-emerald-200 text-[9px] font-mono-tabular font-bold whitespace-nowrap shrink-0">{localizeAtoStatus(lang, snapshot.atoStatus)}</span>}
        <div className={`border-l ${dividerClass} pl-2 flex items-center gap-1.5 shrink-0`}>
          <ComfortGaugeWidget comfort={snapshot.comfort} compact />
          <EcoDrivingWidget eco={snapshot.ecoDriving} supportsRegen={supportsRegen} compact />
          {onTogglePaPanel && (
            <button type="button" data-testid="compact-pa-toggle" aria-pressed={paPanelOpen} onClick={(e) => { e.currentTarget.blur(); onTogglePaPanel(); }} className={`px-1.5 py-1 rounded text-[9.5px] font-mono-tabular font-bold border cursor-pointer ${paPanelOpen ? 'bg-cyan-500/30 border-cyan-300 text-cyan-100' : 'bg-slate-800 border-slate-600 text-cyan-200'}`}>PA</button>
          )}
        </div>
        <CompactStationStrip snapshot={snapshot} dividerClass={dividerClass} />
      </section>
    </div>
  );
}
