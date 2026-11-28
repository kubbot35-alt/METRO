import { triggerSubtleTouchHaptic } from '../../domain/mobileTouch';
import { getStationPlatformSide } from '../../domain/trackGeometry';
import type { ISimulationSnapshot } from '../../domain/types';
import { useI18n } from '../../i18n/LanguageContext';

interface ITouchActionKeypadProps {
  readonly snapshot: ISimulationSnapshot;
  readonly highlightRing: string;
  readonly academyHighlight: string | null;
  readonly onToggleDoorsLeft: () => void;
  readonly onToggleDoorsRight: () => void;
  readonly onAcknowledgeCzuwak: () => void;
  readonly onAcknowledgeRadio: () => void;
  readonly onEmergencyBrake: () => void;
  readonly onCycleCamera: () => void;
  readonly onToggleHeadlights: () => void;
  readonly onHornChange: (active: boolean) => void;
}

interface ITouchDoorRowProps {
  readonly snapshot: ISimulationSnapshot;
  readonly hl: string | null;
  readonly hlRing: string;
  readonly onLeft: () => void;
  readonly onRight: () => void;
}

interface ITouchSafetyRowProps {
  readonly snapshot: ISimulationSnapshot;
  readonly hl: string | null;
  readonly hlRing: string;
  readonly onCzuwak: () => void;
  readonly onRadio: () => void;
}

interface ITouchHornButtonProps {
  readonly hornActive: boolean;
  readonly highlighted: boolean;
  readonly hlRing: string;
  readonly onHornChange: (active: boolean) => void;
}

const KEY_BASE = 'min-h-[38px] [@media(min-height:560px)]:min-h-[44px] px-1.5 py-1 rounded-lg border text-[10px] font-mono-tabular font-bold whitespace-nowrap touch-none cursor-pointer';

function tap(fn: () => void): void {
  triggerSubtleTouchHaptic(15);
  fn();
}

function TouchDoorRow({ snapshot, hl, hlRing, onLeft, onRight }: ITouchDoorRowProps) {
  const { tr } = useI18n();
  const isLeft = getStationPlatformSide(snapshot.currentStation.station) === 'left';
  const canToggle = snapshot.canToggleDoors;
  const doorStyle = (rec: boolean): string =>
    rec ? 'bg-emerald-500 border-emerald-200 text-slate-950' : canToggle ? 'bg-slate-800 border-slate-600 text-slate-100 active:bg-slate-700' : 'bg-slate-900/90 border-slate-800 text-slate-500';
  const leftLit = (snapshot.doorState === 'open' && snapshot.openDoorSide === 'left') || (canToggle && snapshot.doorState === 'closed' && isLeft);
  const rightLit = (snapshot.doorState === 'open' && snapshot.openDoorSide === 'right') || (canToggle && snapshot.doorState === 'closed' && !isLeft);
  return (
    <>
      <button type="button" data-testid="touch-doors-left" disabled={!canToggle} onClick={() => tap(onLeft)} className={`${KEY_BASE} ${doorStyle(leftLit)} ${hl === 'doors-left' ? hlRing : ''}`}>{tr('◀ DRZWI L', '◀ DOORS L')}</button>
      <button type="button" data-testid="touch-doors-right" disabled={!canToggle} onClick={() => tap(onRight)} className={`${KEY_BASE} ${doorStyle(rightLit)} ${hl === 'doors-right' ? hlRing : ''}`}>{tr('DRZWI P ▶', 'DOORS R ▶')}</button>
    </>
  );
}

function TouchSafetyRow({ snapshot, hl, hlRing, onCzuwak, onRadio }: ITouchSafetyRowProps) {
  const czCls = snapshot.czuwak.active ? 'bg-orange-500 border-orange-200 text-slate-950 animate-pulse' : 'bg-slate-800 border-slate-600 text-slate-200 active:bg-slate-700';
  const rdCls = snapshot.radio.active ? 'bg-cyan-400 border-cyan-100 text-slate-950 animate-pulse' : 'bg-slate-800 border-slate-600 text-slate-200 active:bg-slate-700';
  return (
    <>
      <button type="button" data-testid="touch-czuwak" onClick={() => tap(onCzuwak)} className={`${KEY_BASE} ${czCls} ${hl === 'czuwak' ? hlRing : ''}`}>
        {snapshot.czuwak.active ? `CZUWAK ${Math.ceil(snapshot.czuwak.remainingSec)}s` : 'CZUWAK'}
      </button>
      <button type="button" data-testid="touch-radio" onClick={() => tap(onRadio)} className={`${KEY_BASE} ${rdCls} ${hl === 'radio' ? hlRing : ''}`}>
        {snapshot.radio.active ? `RADIO ${Math.ceil(snapshot.radio.remainingSec)}s` : 'RADIO'}
      </button>
    </>
  );
}

function TouchHornButton({ hornActive, highlighted, hlRing, onHornChange }: ITouchHornButtonProps) {
  const { tr } = useI18n();
  const cls = hornActive ? 'bg-amber-400 border-amber-200 text-slate-950' : 'bg-slate-800 border-slate-600 text-slate-200 active:bg-slate-700';
  return (
    <button
      type="button" data-testid="touch-horn"
      onPointerDown={() => { triggerSubtleTouchHaptic(15); onHornChange(true); }}
      onPointerUp={() => onHornChange(false)} onPointerLeave={() => onHornChange(false)} onPointerCancel={() => onHornChange(false)}
      className={`${KEY_BASE} ${cls} ${highlighted ? hlRing : ''}`}
    >
      {tr('KLAKSON', 'HORN')}
    </button>
  );
}

export function TouchActionKeypad(props: ITouchActionKeypadProps) {
  const { tr } = useI18n();
  const { snapshot, highlightRing, academyHighlight } = props;
  const hlCls = snapshot.headlightMode === 'high' ? 'bg-sky-400/30 border-sky-300 text-sky-100' : snapshot.headlightMode === 'low' ? 'bg-amber-500/25 border-amber-400 text-amber-200' : 'bg-slate-800 border-slate-600 text-slate-300';
  const hlText = snapshot.headlightMode === 'high' ? tr('DŁUGIE', 'HIGH') : snapshot.headlightMode === 'low' ? tr('KRÓTKIE', 'LOW') : tr('ŚWIATŁA', 'LIGHTS');
  const ebrakeCls = snapshot.kinematics.emergencyBrake ? 'bg-red-600 border-red-200 text-white' : 'bg-red-950/90 border-red-500/75 text-red-200 active:bg-red-800';
  return (
    <div className="pointer-events-auto grid grid-cols-2 gap-1.5 w-[178px] sm:w-[190px] bg-[#0a1019]/90 border border-slate-700/85 rounded-xl p-1.5 shadow-2xl touch-none">
      <TouchDoorRow snapshot={snapshot} hl={academyHighlight} hlRing={highlightRing} onLeft={props.onToggleDoorsLeft} onRight={props.onToggleDoorsRight} />
      <TouchSafetyRow snapshot={snapshot} hl={academyHighlight} hlRing={highlightRing} onCzuwak={props.onAcknowledgeCzuwak} onRadio={props.onAcknowledgeRadio} />
      <button type="button" data-testid="touch-headlights" onClick={() => tap(props.onToggleHeadlights)} className={`${KEY_BASE} ${hlCls} ${academyHighlight === 'headlights' ? highlightRing : ''}`}>{hlText}</button>
      <TouchHornButton hornActive={snapshot.hornActive} highlighted={academyHighlight === 'horn'} hlRing={highlightRing} onHornChange={props.onHornChange} />
      <button type="button" data-testid="touch-camera" onClick={() => tap(props.onCycleCamera)} className={`${KEY_BASE} bg-slate-800 border-slate-600 text-sky-200 active:bg-slate-700`}>{tr('KAMERA', 'CAMERA')}</button>
      <button type="button" data-testid="touch-ebrake" onClick={() => tap(props.onEmergencyBrake)} className={`${KEY_BASE} ${ebrakeCls}`}>{tr('HAM. AWAR.', 'E-BRAKE')}</button>
    </div>
  );
}
