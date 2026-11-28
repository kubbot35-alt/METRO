import {
  MAX_CUSTOM_STATIONS,
  MAX_STATION_SPACING_M,
  MIN_CUSTOM_STATIONS,
  MIN_STATION_SPACING_M,
  STATION_WALL_PALETTE,
} from '../../domain/customLines';
import type { ICustomStationDraft } from '../../domain/types';
import { useI18n } from '../../i18n/LanguageContext';

interface IStationRowItemProps {
  readonly station: ICustomStationDraft;
  readonly idx: number;
  readonly canRemove: boolean;
  readonly onUpdate: (index: number, patch: Partial<ICustomStationDraft>) => void;
  readonly onRemove: (index: number) => void;
}

interface ILineBuilderStationListProps {
  readonly stations: readonly ICustomStationDraft[];
  readonly onAdd: () => void;
  readonly onUpdate: (index: number, patch: Partial<ICustomStationDraft>) => void;
  readonly onRemove: (index: number) => void;
}

function StationRowItem({ station, idx, canRemove, onUpdate, onRemove }: IStationRowItemProps) {
  const { tr } = useI18n();
  const isSide = station.platformLayout === 'side';
  return (
    <div data-testid={`builder-station-row-${idx}`} className="rounded border border-slate-800 bg-[#111723] p-2 flex flex-wrap items-center gap-2">
      <span className="w-6 h-6 rounded text-[10px] font-mono-tabular font-bold text-white flex items-center justify-center shrink-0" style={{ backgroundColor: station.wallHex }}>{idx + 1}</span>
      <input type="text" maxLength={32} data-testid={`station-name-${idx}`} aria-label={tr(`Nazwa stacji ${idx + 1}`, `Station ${idx + 1} name`)} value={station.name} onChange={(e) => onUpdate(idx, { name: e.target.value })} className="flex-1 min-w-[130px] px-2 py-1 rounded bg-[#0a0f18] border border-slate-700 text-xs text-slate-100 focus:border-amber-400 focus:outline-none" />
      <select aria-label={tr(`Kolor ścian stacji ${idx + 1}`, `Station ${idx + 1} wall color`)} data-testid={`station-color-${idx}`} value={station.wallHex} onChange={(e) => onUpdate(idx, { wallHex: e.target.value })} className="px-1.5 py-1 rounded bg-[#0a0f18] border border-slate-700 text-[11px] font-mono-tabular text-slate-200 cursor-pointer">
        {STATION_WALL_PALETTE.map((c) => <option key={c.hex} value={c.hex}>{c.label}</option>)}
      </select>
      <button type="button" data-testid={`station-layout-${idx}`} onClick={() => onUpdate(idx, { platformLayout: isSide ? 'island' : 'side' })} className={`px-2 py-1 rounded border text-[10px] font-mono-tabular font-bold cursor-pointer whitespace-nowrap ${isSide ? 'bg-sky-500/20 border-sky-400/70 text-sky-200' : 'bg-amber-500/15 border-amber-400/60 text-amber-200'}`}>
        {isSide ? tr('Boczny [E]', 'Side [E]') : tr('Wyspowy [Q]', 'Island [Q]')}
      </button>
      <div className="flex items-center gap-1">
        <input type="number" min={MIN_STATION_SPACING_M} max={MAX_STATION_SPACING_M} step={50} data-testid={`station-spacing-${idx}`} aria-label={tr(`Odległość stacji ${idx + 1} w metrach`, `Station ${idx + 1} distance in meters`)} value={station.spacingFromPrevM} onChange={(e) => onUpdate(idx, { spacingFromPrevM: Number(e.target.value) || 600 })} className="w-16 px-1.5 py-1 rounded bg-[#0a0f18] border border-slate-700 font-mono-tabular text-[11px] text-slate-100 text-right" />
        <span className="text-[10px] font-mono-tabular text-slate-400">m</span>
      </div>
      <button type="button" aria-label={tr(`Usuń stację ${idx + 1}`, `Remove station ${idx + 1}`)} disabled={!canRemove} onClick={() => onRemove(idx)} className="w-6 h-6 rounded border border-slate-700 bg-slate-900 hover:bg-red-950/70 hover:border-red-500/60 disabled:opacity-30 text-xs text-slate-300 cursor-pointer shrink-0">✕</button>
    </div>
  );
}

export function LineBuilderStationList({ stations, onAdd, onUpdate, onRemove }: ILineBuilderStationListProps) {
  const { tr } = useI18n();
  return (
    <div className="rounded-md border border-slate-800 bg-[#0a0e16] p-3.5 flex flex-col min-h-0">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div>
          <p className="text-[10px] font-mono-tabular uppercase tracking-[0.16em] text-amber-300 font-bold">{tr(`3. Lista stacji (${stations.length} / ${MAX_CUSTOM_STATIONS} · min. ${MIN_CUSTOM_STATIONS})`, `3. Station List (${stations.length} / ${MAX_CUSTOM_STATIONS} · min. ${MIN_CUSTOM_STATIONS})`)}</p>
          <p className="text-[10px] text-slate-400">{tr('Nazwa, kolor ścian, typ peronu (Wyspowy [Q] / Boczny [E]) oraz odstęp (400–1200 m)', 'Name, wall color, platform type (Island [Q] / Side [E]), and spacing (400–1200 m)')}</p>
        </div>
        <button type="button" data-testid="line-add-station-btn" disabled={stations.length >= MAX_CUSTOM_STATIONS} onClick={onAdd} className="px-2.5 py-1.5 rounded border border-emerald-500/60 bg-emerald-600/20 hover:bg-emerald-600/35 disabled:opacity-40 text-xs font-mono-tabular font-bold text-emerald-200 cursor-pointer shrink-0">
          {tr('+ Dodaj stację', '+ Add Station')}
        </button>
      </div>
      <div className="space-y-2 overflow-y-auto pr-1 flex-1 max-h-[420px]">
        {stations.map((station, idx) => (
          <StationRowItem key={idx} station={station} idx={idx} canRemove={stations.length > MIN_CUSTOM_STATIONS} onUpdate={onUpdate} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}
