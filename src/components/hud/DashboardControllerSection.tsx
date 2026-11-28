import { canEnableAtoForMode } from '../../domain/atoSystem';
import { trainSupportsRegeneration } from '../../domain/ecoDrivingSystem';
import type { ISimulationSnapshot } from '../../domain/types';
import { useI18n } from '../../i18n/LanguageContext';
import { CzuwakIndicator } from '../CzuwakIndicator';
import { EcoDrivingWidget } from '../EcoDrivingWidget';
import { MasterControllerSlider } from '../MasterControllerSlider';
import { RadioDispatchModule } from '../RadioDispatchModule';

const HIGHLIGHT_RING = 'ring-2 ring-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.85)] animate-pulse';

interface IControllerTopBarProps {
  readonly snapshot: ISimulationSnapshot;
  readonly paPanelOpen: boolean;
  readonly onToggleCabLight: () => void;
  readonly onTogglePaPanel?: () => void;
}

interface IWipersHeadlightsAtoProps {
  readonly snapshot: ISimulationSnapshot;
  readonly academyHighlight: string | null;
  readonly onToggleWipers: () => void;
  readonly onToggleHeadlights: () => void;
  readonly onToggleAto: () => void;
}

interface IDashboardControllerSectionProps {
  readonly snapshot: ISimulationSnapshot;
  readonly dividerClass: string;
  readonly paPanelOpen: boolean;
  readonly academyHighlight: string | null;
  readonly onTogglePaPanel?: () => void;
  readonly onToggleCabLight: () => void;
  readonly onToggleWipers: () => void;
  readonly onToggleHeadlights: () => void;
  readonly onToggleAto: () => void;
  readonly onAcknowledgeCzuwak: () => void;
  readonly onAcknowledgeRadio: () => void;
  readonly onCycleCamera: () => void;
  readonly onEmergencyBrake: () => void;
  readonly onHornChange: (active: boolean) => void;
  readonly onLeverChange: (axis: number | null) => void;
}

function getPowerDisplay(kinematics: ISimulationSnapshot['kinematics'], tr: (p: string, e: string) => string): { cls: string; label: string } {
  const brakePct = kinematics.emergencyBrake ? 100 : Math.round(kinematics.serviceBrake * 100);
  const cls = kinematics.emergencyBrake ? 'text-red-400 font-bold' : brakePct > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold';
  const label = kinematics.emergencyBrake ? tr('AWARYJNY', 'EMERGENCY') : brakePct > 0 ? `${tr('HAM', 'BRK')} -${brakePct}%` : `${tr('MOC', 'PWR')} +${Math.round(kinematics.throttle * 100)}%`;
  return { cls, label };
}

function ControllerTopBar({ snapshot, paPanelOpen, onToggleCabLight, onTogglePaPanel }: IControllerTopBarProps) {
  const { tr } = useI18n();
  const power = getPowerDisplay(snapshot.kinematics, tr);
  const cabCls = snapshot.cabLightOn ? 'bg-amber-400/25 border-amber-300 text-amber-200 hover:bg-amber-400/35' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200';
  const paCls = paPanelOpen || snapshot.paIntercom.activeMessage ? 'bg-cyan-500/30 border-cyan-300 text-cyan-100 hover:bg-cyan-500/40' : 'bg-slate-900 border-slate-700 text-cyan-300 hover:bg-slate-800 hover:border-cyan-500/60';
  return (
    <div className="flex items-center justify-between text-[11px] font-mono-tabular gap-1.5">
      <div className="flex items-center gap-1">
        <span className="text-slate-400 uppercase hidden xl:inline">{tr('Nastawnik', 'Controller')}</span>
        <button type="button" data-testid="cab-light-toggle" aria-pressed={snapshot.cabLightOn} title={tr('Lampka sufitowa w kabinie [K]', 'Cab ceiling light [K]')} onClick={(e) => { e.currentTarget.blur(); onToggleCabLight(); }} className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono-tabular font-semibold whitespace-nowrap cursor-pointer flex items-center gap-1 border ${cabCls}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${snapshot.cabLightOn ? 'bg-amber-300' : 'bg-slate-600'}`} aria-hidden="true" /><span>{tr('Kabina [K]', 'Cab [K]')}</span>
        </button>
        {onTogglePaPanel && (
          <button type="button" data-testid="pa-intercom-toggle" aria-pressed={paPanelOpen} title={tr('Interkom PA — komunikaty dla pasażerów [I]', 'PA Intercom — passenger announcements [I]')} onClick={(e) => { e.currentTarget.blur(); onTogglePaPanel(); }} className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono-tabular font-bold whitespace-nowrap cursor-pointer flex items-center gap-1 border ${paCls}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${snapshot.paIntercom.activeMessage ? 'bg-cyan-300 animate-pulse' : paPanelOpen ? 'bg-cyan-300' : 'bg-slate-600'}`} aria-hidden="true" /><span>PA [I]</span>
          </button>
        )}
        {snapshot.challenge && snapshot.challenge.tractionMultiplier < 1 && <span className="px-1 py-0.5 rounded bg-amber-500/20 border border-amber-400/60 text-amber-300 text-[9px] font-bold">{tr('MOC', 'PWR')} {Math.round(snapshot.challenge.tractionMultiplier * 100)}%</span>}
      </div>
      <span className={power.cls}>{power.label}</span>
    </div>
  );
}

function getControlButtonStyles(snapshot: ISimulationSnapshot, atoAllowed: boolean): { wipers: string; hl: string; ato: string } {
  const weatherAlert = snapshot.weather.rainIntensity > 0.1 || snapshot.weather.snowIntensity > 0.1 || snapshot.weather.frostIntensity > 0.15;
  const wipers = snapshot.weather.wipersOn ? 'bg-sky-500/25 border-sky-400 text-sky-200 hover:bg-sky-500/35' : weatherAlert ? 'bg-amber-500/15 border-amber-400/70 text-amber-200 hover:bg-amber-500/25' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800';
  const hl = snapshot.headlightMode === 'high' ? 'bg-sky-400/30 border-sky-300 text-sky-100 hover:bg-sky-400/40 shadow-[0_0_10px_rgba(56,189,248,0.45)]' : snapshot.headlightMode === 'low' ? 'bg-amber-500/20 border-amber-400/70 text-amber-200 hover:bg-amber-500/30' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800';
  const ato = snapshot.atoEnabled ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.35)]' : atoAllowed ? 'bg-slate-800 hover:bg-emerald-950/70 border-emerald-500/50 text-emerald-200' : 'bg-slate-900 border-slate-700/80 text-slate-500 hover:text-slate-300';
  return { wipers, hl, ato };
}

function WipersHeadlightsAtoButtons({ snapshot, academyHighlight, onToggleWipers, onToggleHeadlights, onToggleAto }: IWipersHeadlightsAtoProps) {
  const { tr } = useI18n();
  const atoAllowed = canEnableAtoForMode(snapshot.gameMode);
  const cls = getControlButtonStyles(snapshot, atoAllowed);
  const hlLabel = snapshot.headlightMode === 'high' ? tr('Długie [L]', 'High [L]') : snapshot.headlightMode === 'low' ? tr('Krótkie [L]', 'Low [L]') : tr('Światła [L]', 'Lights [L]');
  const hlDot = snapshot.headlightMode === 'high' ? 'bg-sky-300' : snapshot.headlightMode === 'low' ? 'bg-amber-300' : 'bg-slate-600';
  return (
    <>
      <button type="button" data-testid="wipers-toggle" aria-pressed={snapshot.weather.wipersOn} onClick={(e) => { e.currentTarget.blur(); onToggleWipers(); }} className={`px-1 py-1 rounded text-[10px] font-mono-tabular font-semibold whitespace-nowrap cursor-pointer flex items-center justify-center gap-1 border ${cls.wipers}`}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${snapshot.weather.wipersOn ? 'bg-sky-300' : 'bg-slate-600'}`} aria-hidden="true" /><span>{tr('Wycier. [X]', 'Wipers [X]')}</span>
      </button>
      <button type="button" data-testid="headlights-toggle" data-academy-highlight={academyHighlight === 'headlights' ? '1' : '0'} aria-pressed={snapshot.headlightsOn} title={tr('Przełącz reflektory: Wył. / Krótkie / Długie [L]', 'Cycle headlights: Off / Low / High [L]')} onClick={(e) => { e.currentTarget.blur(); onToggleHeadlights(); }} className={`px-1 py-1 rounded text-[10px] font-mono-tabular font-semibold whitespace-nowrap cursor-pointer flex items-center justify-center gap-1 border ${cls.hl} ${academyHighlight === 'headlights' ? HIGHLIGHT_RING : ''}`}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${hlDot}`} aria-hidden="true" /><span>{hlLabel}</span>
      </button>
      <button type="button" data-testid="ato-toggle-btn" aria-pressed={snapshot.atoEnabled} title={atoAllowed ? tr('Autopilot ATO [A]', 'ATO Autopilot [A]') : tr('ATO dostępne tylko w Sandbox / trybie Pasażera', 'ATO is only available in Sandbox / Passenger mode')} onClick={(e) => { e.currentTarget.blur(); onToggleAto(); }} className={`px-1 py-1 rounded text-[10px] font-mono-tabular font-bold whitespace-nowrap cursor-pointer flex items-center justify-center gap-1 border ${cls.ato}`}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${snapshot.atoEnabled ? 'bg-emerald-300 animate-pulse' : 'bg-slate-600'}`} aria-hidden="true" /><span>ATO [A]</span>
      </button>
    </>
  );
}

function ControllerActionGrid(props: IDashboardControllerSectionProps) {
  const { tr } = useI18n();
  const { snapshot, academyHighlight } = props;
  return (
    <div className="grid grid-cols-4 gap-1">
      <CzuwakIndicator czuwak={snapshot.czuwak} highlighted={academyHighlight === 'czuwak'} onAcknowledge={props.onAcknowledgeCzuwak} />
      <RadioDispatchModule radio={snapshot.radio} highlighted={academyHighlight === 'radio'} onAcknowledge={props.onAcknowledgeRadio} />
      <WipersHeadlightsAtoButtons snapshot={snapshot} academyHighlight={academyHighlight} onToggleWipers={props.onToggleWipers} onToggleHeadlights={props.onToggleHeadlights} onToggleAto={props.onToggleAto} />
      <button type="button" data-testid="hud-camera-btn" onClick={(e) => { e.currentTarget.blur(); props.onCycleCamera(); }} className="px-1 py-1 rounded text-[10px] font-mono-tabular font-semibold whitespace-nowrap cursor-pointer bg-slate-800 hover:bg-slate-700 text-sky-200 border border-slate-700">{tr('Kamera [V]', 'Camera [V]')}</button>
      <button type="button" data-testid="horn-btn" data-academy-highlight={academyHighlight === 'horn' ? '1' : '0'} onPointerDown={() => props.onHornChange(true)} onPointerUp={() => props.onHornChange(false)} onPointerLeave={() => props.onHornChange(false)} onPointerCancel={() => props.onHornChange(false)} onClick={(e) => e.currentTarget.blur()} className={`px-1 py-1 rounded text-[10px] font-mono-tabular font-semibold whitespace-nowrap cursor-pointer ${snapshot.hornActive ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'} ${academyHighlight === 'horn' ? HIGHLIGHT_RING : ''}`}>{tr('Klakson [H]', 'Horn [H]')}</button>
      <button type="button" onClick={(e) => { e.currentTarget.blur(); props.onEmergencyBrake(); }} className={`px-1 py-1 rounded text-[10px] font-mono-tabular font-semibold whitespace-nowrap cursor-pointer ${snapshot.kinematics.emergencyBrake ? 'bg-red-600 text-white' : 'bg-slate-800 hover:bg-red-900/70 text-red-300'}`}>{tr('Awaryjny [B]', 'E-Brake [B]')}</button>
    </div>
  );
}

export function DashboardControllerSection(props: IDashboardControllerSectionProps) {
  const { snapshot } = props;
  const throttlePct = Math.round(snapshot.kinematics.throttle * 100);
  const brakePct = snapshot.kinematics.emergencyBrake ? 100 : Math.round(snapshot.kinematics.serviceBrake * 100);
  return (
    <div className={`border-l ${props.dividerClass} pl-2 flex items-center gap-2 min-w-0`}>
      <MasterControllerSlider leverTarget={snapshot.leverTarget} emergencyBrake={snapshot.kinematics.emergencyBrake} theme={snapshot.trainModel.visual.theme} highlighted={props.academyHighlight === 'throttle'} onLeverChange={props.onLeverChange} />
      <div className="flex-1 flex flex-col gap-1.5 min-w-[294px]">
        <ControllerTopBar snapshot={snapshot} paPanelOpen={props.paPanelOpen} onToggleCabLight={props.onToggleCabLight} onTogglePaPanel={props.onTogglePaPanel} />
        <div className="grid grid-cols-2 gap-1 h-2 bg-slate-900 rounded p-0.5 border border-slate-800">
          <div className="w-full h-full bg-slate-800 rounded-l overflow-hidden flex justify-end"><div className={`h-full origin-right ${snapshot.kinematics.emergencyBrake ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${brakePct}%` }} /></div>
          <div className="w-full h-full bg-slate-800 rounded-r overflow-hidden"><div className="h-full bg-emerald-400" style={{ width: `${throttlePct}%` }} /></div>
        </div>
        <EcoDrivingWidget eco={snapshot.ecoDriving} supportsRegen={trainSupportsRegeneration(snapshot.trainModel.id)} />
        <ControllerActionGrid {...props} />
      </div>
    </div>
  );
}
