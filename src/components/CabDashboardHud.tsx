import type { ISimulationSnapshot } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';
import { CompactTouchDashboard } from './hud/CompactTouchDashboard';
import { DashboardControllerSection } from './hud/DashboardControllerSection';
import { DashboardDoorsSection } from './hud/DashboardDoorsSection';
import { DashboardStationSection } from './hud/DashboardStationSection';
import { ScheduleIndicator } from './ScheduleIndicator';
import { SignalIndicator } from './SignalIndicator';
import { Sop2Indicator } from './Sop2Indicator';
import { SpeedometerGauge } from './SpeedometerGauge';

interface ICabDashboardHudProps {
  readonly snapshot: ISimulationSnapshot;
  readonly compactTouchMode?: boolean;
  readonly paPanelOpen?: boolean;
  readonly onTogglePaPanel?: () => void;
  readonly onToggleDoorsLeft: () => void;
  readonly onToggleDoorsRight: () => void;
  readonly onToggleHeadlights: () => void;
  readonly onToggleCabLight: () => void;
  readonly onToggleWipers: () => void;
  readonly onToggleAto: () => void;
  readonly onAcknowledgeCzuwak: () => void;
  readonly onAcknowledgeRadio: () => void;
  readonly onCycleCamera: () => void;
  readonly onEmergencyBrake: () => void;
  readonly onHornChange: (active: boolean) => void;
  readonly onLeverChange: (axis: number | null) => void;
}

export function CabDashboardHud(props: ICabDashboardHudProps) {
  const { tr } = useI18n();
  const { snapshot, compactTouchMode = false, paPanelOpen = false } = props;
  const theme = snapshot.trainModel.visual.theme;
  const panelClasses = theme === 'retro' ? 'bg-[#15201c]/95 border-[#4c6b5f]' : theme === 'varsovia' ? 'bg-[#09101a]/95 border-cyan-500/45' : 'bg-[#0d121b]/95 border-slate-700/80';
  const dividerClass = theme === 'retro' ? 'border-[#2f453d]' : 'border-slate-800';
  const academyHighlight = snapshot.academy && !snapshot.academy.completed ? snapshot.academy.highlightTarget : null;
  if (compactTouchMode) {
    return <CompactTouchDashboard snapshot={snapshot} panelClasses={panelClasses} dividerClass={dividerClass} paPanelOpen={paPanelOpen} onTogglePaPanel={props.onTogglePaPanel} />;
  }
  return (
    <div className="fixed bottom-0 inset-x-0 z-10 pointer-events-none flex justify-center px-2 pb-2">
      <section aria-label={tr('Pulpit maszynisty', 'Driver dashboard')} data-theme={theme} className={`pointer-events-auto w-full max-w-[1432px] ${panelClasses} border rounded-t-xl rounded-b-md px-2.5 py-2 shadow-2xl grid grid-cols-1 lg:grid-cols-[auto_auto_auto_auto_minmax(184px,1fr)_auto_auto] items-center gap-2`}>
        <SpeedometerGauge speedKmh={snapshot.kinematics.speedKmh} limitKmh={snapshot.speedLimitKmh} isOverspeeding={snapshot.isOverspeeding} gradePercent={snapshot.trackProfile.gradePercent} inCurveLimitZone={snapshot.trackProfile.inCurveLimitZone} theme={theme} />
        <Sop2Indicator sop2={snapshot.sop2} />
        <SignalIndicator nextSignal={snapshot.nextSignal} atpActive={snapshot.atpActive} highlighted={academyHighlight === 'signal'} />
        <ScheduleIndicator schedule={snapshot.schedule} />
        <DashboardStationSection snapshot={snapshot} dividerClass={dividerClass} />
        <DashboardDoorsSection snapshot={snapshot} dividerClass={dividerClass} academyHighlight={academyHighlight} onToggleDoorsLeft={props.onToggleDoorsLeft} onToggleDoorsRight={props.onToggleDoorsRight} />
        <DashboardControllerSection snapshot={snapshot} dividerClass={dividerClass} paPanelOpen={paPanelOpen} academyHighlight={academyHighlight} onTogglePaPanel={props.onTogglePaPanel} onToggleCabLight={props.onToggleCabLight} onToggleWipers={props.onToggleWipers} onToggleHeadlights={props.onToggleHeadlights} onToggleAto={props.onToggleAto} onAcknowledgeCzuwak={props.onAcknowledgeCzuwak} onAcknowledgeRadio={props.onAcknowledgeRadio} onCycleCamera={props.onCycleCamera} onEmergencyBrake={props.onEmergencyBrake} onHornChange={props.onHornChange} onLeverChange={props.onLeverChange} />
      </section>
    </div>
  );
}
