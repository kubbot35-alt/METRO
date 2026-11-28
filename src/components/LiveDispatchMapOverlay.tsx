import { useMemo } from 'react';
import { buildDispatchMapModel, type IDispatchMapModel } from '../domain/dispatchMapModel';
import type { ISimulationSnapshot } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';
import { DispatchMapTrackDiagram } from './hud/DispatchMapTrackDiagram';

interface ILiveDispatchMapOverlayProps {
  readonly snapshot: ISimulationSnapshot;
  readonly onClose: () => void;
}

function DispatchHeadwayBadge({ distanceM, blocks }: { readonly distanceM: number; readonly blocks: number | null }) {
  const { tr } = useI18n();
  const isClose = blocks !== null && blocks <= 2;
  const cls = isClose ? 'bg-amber-500/20 border-amber-400/70 text-amber-200' : 'bg-slate-800/90 border-slate-700 text-slate-200';
  return (
    <span data-testid="dispatch-map-headway-badge" className={`px-2 py-0.5 rounded border text-[11px] font-mono-tabular font-semibold ${cls}`}>
      {tr(
        `Skład przed tobą: ${Math.round(distanceM)} m (${blocks ?? 0} odst.)`,
        `Train ahead: ${Math.round(distanceM)} m (${blocks ?? 0} blk)`,
      )}
    </span>
  );
}

function DispatchMapHeader({ model, onClose }: { readonly model: IDispatchMapModel; readonly onClose: () => void }) {
  const { tr } = useI18n();
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
      <div className="flex items-center gap-2">
        <span style={{ backgroundColor: model.lineColorCss }} className="px-2 py-0.5 rounded text-[11px] font-mono-tabular font-bold text-white">
          {model.lineBadge}
        </span>
        <span className="font-display font-bold text-sm text-slate-100 tracking-wide">{tr('Mapa Linii na żywo', 'Live Dispatch Map')}</span>
        <span className="hidden sm:inline text-xs text-slate-400 font-mono-tabular">{model.routeLabel}</span>
      </div>
      <div className="flex items-center gap-2">
        {model.headwayDistanceM !== null && <DispatchHeadwayBadge distanceM={model.headwayDistanceM} blocks={model.headwayBlocks} />}
        <button
          type="button" tabIndex={-1} data-testid="dispatch-map-close-btn"
          onClick={(e) => { e.currentTarget.blur(); onClose(); }}
          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-mono-tabular cursor-pointer"
        >
          [Tab] ×
        </button>
      </div>
    </div>
  );
}

function DispatchMapLegend() {
  const { tr } = useI18n();
  return (
    <div className="pt-2 mt-1 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono-tabular text-slate-400">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2 rounded-sm bg-cyan-400 inline-block" />{tr('Twój pociąg ▶', 'Your train ▶')}</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2 rounded-sm bg-amber-400 inline-block" />{tr('Poprzedzający AI ▶', 'Leading AI ▶')}</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2 rounded-sm bg-indigo-400 inline-block" />{tr('Przeciwny tor AI ◀', 'Opposite AI ◀')}</span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />{tr('Zielony / Obsłużona', 'Green / Served')}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />{tr('Żółty / Następna', 'Yellow / Next')}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />{tr('Czerwony (zajęty blok)', 'Red (occupied block)')}</span>
      </div>
    </div>
  );
}

export function LiveDispatchMapOverlay({ snapshot, onClose }: ILiveDispatchMapOverlayProps) {
  const model = useMemo(() => buildDispatchMapModel(snapshot), [snapshot]);
  return (
    <section
      data-testid="live-dispatch-map-overlay"
      aria-label="Live Dispatch Map"
      className="fixed top-[96px] sm:top-[104px] inset-x-2 sm:inset-x-6 z-20 pointer-events-auto bg-[#0a1019]/95 border border-slate-700/90 rounded-lg px-3 sm:px-4 py-2.5 shadow-2xl"
    >
      <DispatchMapHeader model={model} onClose={onClose} />
      <DispatchMapTrackDiagram model={model} />
      <DispatchMapLegend />
    </section>
  );
}
