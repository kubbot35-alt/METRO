import { compileCustomLineSpec } from '../../domain/customLines';
import { METRO_LINE_CATALOG } from '../../domain/routeData';
import { getRouteStartOptions } from '../../domain/routeVariant';
import type { ICustomLineDraft, IMetroLineSpec, MetroLineId, RouteDirection } from '../../domain/types';
import { useI18n } from '../../i18n/LanguageContext';

interface ILineSelectionCardProps {
  readonly spec: IMetroLineSpec;
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly onEdit?: () => void;
  readonly onDelete?: () => void;
}

interface IRouteVariantBarProps {
  readonly baseLineSpec: IMetroLineSpec;
  readonly routeDirection: RouteDirection;
  readonly startStationIndex: number;
  readonly onSelectRouteDirection: (direction: RouteDirection) => void;
  readonly onSelectStartStation: (startIndex: number) => void;
}

interface ILineAndVariantSectionProps extends IRouteVariantBarProps {
  readonly activeLine: IMetroLineSpec;
  readonly depotHallStart: boolean;
  readonly customLines: readonly ICustomLineDraft[];
  readonly onSelectLine: (lineId: MetroLineId) => void;
  readonly onToggleDepotHallStart: (enabled: boolean) => void;
  readonly onOpenLineBuilder: () => void;
  readonly onEditCustomLine: (draft: ICustomLineDraft) => void;
  readonly onDeleteCustomLine: (id: string) => void;
}

function CustomLineActions({ spec, onEdit, onDelete }: { readonly spec: IMetroLineSpec; readonly onEdit: () => void; readonly onDelete: () => void }) {
  const { tr } = useI18n();
  return (
    <div className="flex items-center gap-1 shrink-0 ml-1">
      <button type="button" data-testid={`edit-custom-line-${spec.id}`} aria-label={`${tr('Edytuj', 'Edit')} ${spec.name}`} onClick={onEdit} className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono-tabular text-slate-200 cursor-pointer">{tr('Edytuj', 'Edit')}</button>
      <button type="button" data-testid={`delete-custom-line-${spec.id}`} aria-label={`${tr('Usuń', 'Delete')} ${spec.name}`} onClick={onDelete} className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-red-900/80 text-[10px] font-mono-tabular text-red-300 cursor-pointer">✕</button>
    </div>
  );
}

function LineSelectionCard({ spec, selected, onSelect, onEdit, onDelete }: ILineSelectionCardProps) {
  const { tr } = useI18n();
  const badge = spec.badgeCode ?? spec.id;
  const activeStyles = selected ? 'bg-[#121a28]/95 shadow-lg' : 'border-slate-700/80 bg-[#0d1118]/90 hover:border-slate-500';
  const suffix = spec.isCustom ? (spec.hasSurfaceStart ? tr(' · Start naziemny', ' · Surface start') : tr(' · Własna trasa', ' · Custom line')) : '';
  return (
    <div className={`rounded-lg border-2 p-2 transition-colors flex flex-col gap-0.5 ${activeStyles}`} style={selected ? { borderColor: spec.cssColor } : undefined}>
      <div className="flex items-center justify-between gap-2">
        <button type="button" data-testid={`select-line-${spec.id}`} aria-pressed={selected} onClick={(e) => { e.currentTarget.blur(); onSelect(); }} className="flex-1 text-left flex items-center justify-between gap-2 cursor-pointer min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded-xs font-mono-tabular text-xs font-bold text-white shrink-0" style={{ backgroundColor: spec.cssColor }}>{badge}</span>
            <span className="font-display text-sm font-bold text-slate-50 truncate">{spec.name}</span>
          </div>
          <span className="text-[10px] font-mono-tabular text-slate-300 shrink-0">{spec.stations.length} st. · {spec.destinationLed}</span>
        </button>
        {spec.isCustom && onEdit && onDelete && <CustomLineActions spec={spec} onEdit={onEdit} onDelete={onDelete} />}
      </div>
      <button type="button" onClick={(e) => { e.currentTarget.blur(); onSelect(); }} className="text-left text-[11px] text-slate-300 leading-snug truncate cursor-pointer">{spec.routeLabel}{suffix}</button>
    </div>
  );
}

function RouteVariantBar({ baseLineSpec, routeDirection, startStationIndex, onSelectRouteDirection, onSelectStartStation }: IRouteVariantBarProps) {
  const { lang, tr } = useI18n();
  const startOptions = getRouteStartOptions(baseLineSpec, routeDirection);
  return (
    <div data-testid="route-variant-bar" className="mt-2 rounded-lg border border-slate-700/80 bg-[#0b1019]/95 px-2.5 py-2 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-2 items-center">
      <label className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400 whitespace-nowrap shrink-0">{tr('Stacja startowa', 'Start Station')}:</span>
        <select data-testid="select-start-station" value={startStationIndex} onChange={(e) => { onSelectStartStation(Number(e.target.value)); e.currentTarget.blur(); }} className="flex-1 min-w-0 rounded border border-slate-600/90 bg-[#121926] px-2 py-1 text-xs font-mono-tabular text-slate-100 focus:outline-none focus:border-amber-400 cursor-pointer">
          {startOptions.map((opt) => <option key={opt.startIndex} value={opt.startIndex}>{lang === 'en' ? opt.labelEn : opt.labelPl}</option>)}
        </select>
      </label>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400 whitespace-nowrap">{tr('Kierunek', 'Direction')}:</span>
        <div role="group" aria-label={tr('Kierunek jazdy', 'Route direction')} className="flex items-center rounded-md border border-slate-600/90 bg-[#0d1420] p-0.5">
          {(['normal', 'reverse'] as const).map((dir) => (
            <button key={dir} type="button" data-testid={`select-direction-${dir}`} aria-pressed={routeDirection === dir} onClick={(e) => { e.currentTarget.blur(); onSelectRouteDirection(dir); }} className={`px-2 py-1 rounded text-[10.5px] font-mono-tabular font-bold transition-colors cursor-pointer whitespace-nowrap ${routeDirection === dir ? 'text-white shadow' : 'text-slate-300 hover:text-white'}`} style={routeDirection === dir ? { backgroundColor: baseLineSpec.cssColor } : undefined}>
              {dir === 'normal' ? `${tr('Normalny', 'Normal')} → ${baseLineSpec.destinationLed}` : `${tr('Powrotny', 'Reverse')} → ${baseLineSpec.oppositeDestinationLed}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LineAndVariantSection(props: ILineAndVariantSectionProps) {
  const { tr } = useI18n();
  const compiled = props.customLines.map((draft) => ({ draft, spec: compileCustomLineSpec(draft) }));
  return (
    <div className="mb-2.5">
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-slate-400">{tr('1. Wybierz linię metra', '1. Select Metro Line')}</p>
        <button type="button" data-testid="open-line-builder-btn" onClick={(e) => { e.currentTarget.blur(); props.onOpenLineBuilder(); }} className="px-2 py-0.5 rounded border border-emerald-500/60 bg-emerald-500/15 hover:bg-emerald-500/25 text-[10px] font-mono-tabular font-bold text-emerald-200 cursor-pointer whitespace-nowrap">{tr('+ Stwórz własną linię', '+ Create Custom Line')}</button>
      </div>
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 ${compiled.length > 2 ? 'max-h-[156px] overflow-y-auto pr-0.5' : ''}`}>
        {METRO_LINE_CATALOG.map((spec) => <LineSelectionCard key={spec.id} spec={spec} selected={spec.id === props.activeLine.id} onSelect={() => props.onSelectLine(spec.id)} />)}
        {compiled.map(({ draft, spec }) => (
          <LineSelectionCard key={spec.id} spec={spec} selected={spec.id === props.activeLine.id} onSelect={() => props.onSelectLine(spec.id)} onEdit={() => props.onEditCustomLine(draft)} onDelete={() => props.onDeleteCustomLine(draft.id)} />
        ))}
      </div>
      <RouteVariantBar baseLineSpec={props.baseLineSpec} routeDirection={props.routeDirection} startStationIndex={props.startStationIndex} onSelectRouteDirection={props.onSelectRouteDirection} onSelectStartStation={props.onSelectStartStation} />
      {props.activeLine.hasSurfaceStart && (
        <button
          type="button"
          data-testid="toggle-depot-hall-start"
          aria-pressed={props.depotHallStart}
          onClick={(e) => { e.currentTarget.blur(); props.onToggleDepotHallStart(!props.depotHallStart); }}
          className={`mt-1.5 w-full rounded-md border px-2.5 py-1.5 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${props.depotHallStart ? 'border-amber-400 bg-amber-950/50 text-amber-100' : 'border-slate-700/80 bg-[#0b1019]/90 text-slate-300 hover:border-slate-500'}`}
        >
          <span className="text-[11px] font-mono-tabular font-bold">
            {tr('Start z hali STP Kabaty (wyjazd przez myjnię 10 km/h i rozjazd 20 km/h)', 'Start from STP Kabaty Hall (exit via 10 km/h wash & 20 km/h turnout)')}
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono-tabular font-bold shrink-0 ${props.depotHallStart ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
            {props.depotHallStart ? tr('WŁ.', 'ON') : tr('WYŁ.', 'OFF')}
          </span>
        </button>
      )}
    </div>
  );
}
