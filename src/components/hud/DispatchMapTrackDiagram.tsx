import { useEffect, useRef } from 'react';
import {
  formatShortTrainModel,
  type IDispatchMapModel,
  type IDispatchMapSignalNode,
  type IDispatchMapStationNode,
  type IDispatchMapTrainMarker,
} from '../../domain/dispatchMapModel';
import { useI18n } from '../../i18n/LanguageContext';

interface IDispatchMapTrackDiagramProps {
  readonly model: IDispatchMapModel;
}

const TRACK_PAD_X = 48;

function getSignalDotClass(aspect: IDispatchMapSignalNode['aspect']): string {
  if (aspect === 'red') return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.95)]';
  if (aspect === 'yellow') return 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]';
  return 'bg-emerald-400/90';
}

function getStationNodeClass(status: IDispatchMapStationNode['status']): string {
  if (status === 'served') return 'bg-emerald-400 border-emerald-200';
  if (status === 'current') return 'bg-amber-400 border-white ring-2 ring-amber-400/60';
  return 'bg-slate-800 border-slate-400';
}

function getTrainCapsuleStyle(kind: IDispatchMapTrainMarker['kind']): string {
  if (kind === 'player') return 'bg-cyan-500 text-slate-950 border-white shadow-[0_0_14px_rgba(34,211,238,0.85)] animate-pulse';
  if (kind === 'leading') return 'bg-amber-500 text-slate-950 border-amber-100 shadow-[0_0_10px_rgba(245,158,11,0.7)]';
  return 'bg-indigo-500 text-white border-indigo-200 shadow-[0_0_10px_rgba(99,102,241,0.7)]';
}

interface ITrainCapsuleProps {
  readonly marker: IDispatchMapTrainMarker;
  readonly trackTopClass: string;
  readonly testId: string;
  readonly label: string;
}

function TrainCapsule({ marker, trackTopClass, testId, label }: ITrainCapsuleProps) {
  const { tr } = useI18n();
  const arrow = marker.direction === 'forward' ? '▶' : '◀';
  const statusTag = marker.doorsOpen ? tr('DRZWI', 'DOORS') : `${marker.speedKmh}`;
  const leftStyle = { left: `calc(${TRACK_PAD_X}px + (100% - ${TRACK_PAD_X * 2}px) * ${marker.progress01})` };
  return (
    <div data-testid={testId} style={leftStyle} className={`absolute ${trackTopClass} -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-none transition-[left] duration-150`}>
      <div className={`px-1.5 py-0.5 rounded border text-[10px] font-mono-tabular font-bold leading-none whitespace-nowrap flex items-center gap-1 ${getTrainCapsuleStyle(marker.kind)}`}>
        {marker.direction === 'reverse' && <span>{arrow}</span>}
        <span>{label}</span>
        <span className="opacity-80">{statusTag}</span>
        {marker.direction === 'forward' && <span>{arrow}</span>}
      </div>
    </div>
  );
}

function StationTickColumn({ station }: { readonly station: IDispatchMapStationNode }) {
  const isStaggered = station.index % 2 === 1;
  const textCls = station.status === 'current' ? 'text-amber-300 font-bold' : station.status === 'served' ? 'text-emerald-300' : 'text-slate-300';
  const leftStyle = { left: `calc(${TRACK_PAD_X}px + (100% - ${TRACK_PAD_X * 2}px) * ${station.progress01})` };
  return (
    <div style={leftStyle} className="absolute top-0 bottom-0 -translate-x-1/2 flex flex-col items-center pointer-events-none">
      <div className="absolute top-[22px] h-[38px] w-px bg-slate-600/70" />
      <div className={`absolute top-[22px] -translate-y-1/2 w-2.5 h-2.5 rounded-full border ${getStationNodeClass(station.status)}`} />
      <div className="absolute top-[60px] -translate-y-1/2 w-2 h-2 rounded-full bg-slate-700 border border-slate-500" />
      <div className={`absolute ${isStaggered ? 'top-[86px]' : 'top-[70px]'} text-[10px] leading-tight text-center whitespace-nowrap px-1 ${textCls}`}>
        {station.status === 'served' && <span className="mr-0.5">✓</span>}
        <span>{station.name}</span>
      </div>
    </div>
  );
}

function SignalDotRow({ signals }: { readonly signals: readonly IDispatchMapSignalNode[] }) {
  return (
    <>
      {signals.map((sig) => (
        <span
          key={sig.id} data-signal-aspect={sig.aspect}
          style={{ left: `calc(${TRACK_PAD_X}px + (100% - ${TRACK_PAD_X * 2}px) * ${sig.progress01})` }}
          className={`absolute top-[22px] -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full z-10 ${getSignalDotClass(sig.aspect)}`}
        />
      ))}
    </>
  );
}

function TrackRailsLayer({ lineColorCss }: { readonly lineColorCss: string }) {
  return (
    <>
      <div className="absolute left-2 top-[15px] text-[9px] font-mono-tabular text-slate-400 uppercase">T1 ▶</div>
      <div className="absolute left-2 top-[53px] text-[9px] font-mono-tabular text-slate-500 uppercase">T2 ◀</div>
      <div style={{ left: `${TRACK_PAD_X}px`, right: `${TRACK_PAD_X}px`, backgroundColor: lineColorCss }} className="absolute top-[21px] h-[3px] rounded-full opacity-90" />
      <div style={{ left: `${TRACK_PAD_X}px`, right: `${TRACK_PAD_X}px` }} className="absolute top-[59px] h-[2px] rounded-full bg-slate-600/85" />
    </>
  );
}

function TrainMarkersLayer({ model }: { readonly model: IDispatchMapModel }) {
  const { tr } = useI18n();
  return (
    <>
      <TrainCapsule marker={model.playerMarker} trackTopClass="top-[22px]" testId="dispatch-map-player-marker" label={tr('TY', 'YOU')} />
      {model.leadingMarker && (
        <TrainCapsule marker={model.leadingMarker} trackTopClass="top-[22px]" testId="dispatch-map-leading-ai" label={`AI ${formatShortTrainModel(model.leadingMarker.modelId)}`} />
      )}
      {model.oppositeMarker && (
        <TrainCapsule marker={model.oppositeMarker} trackTopClass="top-[60px]" testId="dispatch-map-opposite-ai" label={`AI ${formatShortTrainModel(model.oppositeMarker.modelId)}`} />
      )}
    </>
  );
}

export function DispatchMapTrackDiagram({ model }: IDispatchMapTrackDiagramProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const trackMinWidthPx = Math.max(760, model.stations.length * 88);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const target = model.playerMarker.progress01 * el.scrollWidth - el.clientWidth * 0.45;
    el.scrollLeft = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, target));
  }, [model.playerMarker.progress01]);

  return (
    <div ref={scrollerRef} className="overflow-x-auto pb-1">
      <div className="relative h-[108px]" style={{ minWidth: `${trackMinWidthPx}px` }}>
        <TrackRailsLayer lineColorCss={model.lineColorCss} />
        <SignalDotRow signals={model.signals} />
        {model.stations.map((st) => <StationTickColumn key={st.id} station={st} />)}
        <TrainMarkersLayer model={model} />
      </div>
    </div>
  );
}
