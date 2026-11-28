import { useState, type Dispatch, type SetStateAction } from 'react';
import {
  exportCustomLineJson,
  importCustomLineJson,
  MAX_CUSTOM_STATIONS,
  MAX_STATION_SPACING_M,
  MIN_CUSTOM_STATIONS,
  MIN_STATION_SPACING_M,
  STATION_WALL_PALETTE,
} from '../domain/customLines';
import type { ICustomLineDraft, ICustomStationDraft } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';
import { LineBuilderLeftColumn } from './modals/LineBuilderLeftColumn';
import { LineBuilderStationList } from './modals/LineBuilderStationList';
import { ModalDialogShell } from './shared/ModalDialogShell';

interface ICustomLineBuilderModalProps {
  readonly initialDraft: ICustomLineDraft;
  readonly isEditing: boolean;
  readonly onSave: (draft: ICustomLineDraft) => void;
  readonly onClose: () => void;
}

type TranslateFn = (pl: string, en: string) => string;
type JsonNotice = { readonly tone: 'ok' | 'err'; readonly text: string } | null;

function cleanStationDrafts(stations: readonly ICustomStationDraft[], tr: TranslateFn): ICustomStationDraft[] {
  return stations.map((st, idx) => ({
    ...st,
    name: st.name.trim() || tr(`Stacja ${idx + 1}`, `Station ${idx + 1}`),
    spacingFromPrevM: Math.max(MIN_STATION_SPACING_M, Math.min(MAX_STATION_SPACING_M, Math.round(st.spacingFromPrevM))),
  }));
}

function validateAndCleanDraft(
  draft: ICustomLineDraft,
  tr: TranslateFn,
): { readonly ok: true; readonly cleaned: ICustomLineDraft } | { readonly ok: false; readonly error: string } {
  const trimmedName = draft.name.trim();
  if (trimmedName.length < 2) {
    return { ok: false, error: tr('Wpisz nazwę linii (minimum 2 znaki).', 'Enter a line name (minimum 2 characters).') };
  }
  if (draft.stations.length < MIN_CUSTOM_STATIONS || draft.stations.length > MAX_CUSTOM_STATIONS) {
    return { ok: false, error: tr(`Trasa musi zawierać od ${MIN_CUSTOM_STATIONS} do ${MAX_CUSTOM_STATIONS} stacji.`, `Route must have between ${MIN_CUSTOM_STATIONS} and ${MAX_CUSTOM_STATIONS} stations.`) };
  }
  const cleanStations = cleanStationDrafts(draft.stations, tr);
  const destinationLed = (draft.destinationLed.trim() || cleanStations[cleanStations.length - 1].name).toUpperCase();
  return { ok: true, cleaned: { ...draft, name: trimmedName, destinationLed, stations: cleanStations } };
}

function createNextStation(index: number, tr: TranslateFn): ICustomStationDraft {
  return {
    name: tr(`Nowa Stacja ${index + 1}`, `New Station ${index + 1}`),
    wallHex: STATION_WALL_PALETTE[index % STATION_WALL_PALETTE.length].hex,
    platformLayout: index % 3 === 0 ? 'side' : 'island',
    spacingFromPrevM: 600,
  };
}

function computeDraftDistanceM(draft: ICustomLineDraft): number {
  return draft.stations.reduce(
    (sum, st, idx) => sum + (idx === 0 && draft.hasSurfaceStart ? Math.max(560, st.spacingFromPrevM) : st.spacingFromPrevM),
    0,
  );
}

interface IBuilderFooterProps {
  readonly draft: ICustomLineDraft;
  readonly errorText: string | null;
  readonly onClose: () => void;
  readonly onSave: () => void;
}

function BuilderFooter({ draft, errorText, onClose, onSave }: IBuilderFooterProps) {
  const { tr } = useI18n();
  const totalDistanceKm = (computeDraftDistanceM(draft) / 1000).toFixed(2);
  return (
    <>
      {errorText && <p className="text-xs font-mono-tabular text-red-300 mb-2">{errorText}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
        <div className="flex items-center gap-2 text-xs font-mono-tabular text-slate-300">
          <span className="w-3 h-3 rounded-xs inline-block" style={{ backgroundColor: draft.cssColor }} />
          <span>
            {tr('Podgląd trasy:', 'Route preview:')} <strong>{draft.stations.length} {tr('stacji', 'stations')}</strong> · <strong>{totalDistanceKm} km</strong> ·{' '}
            {draft.hasSurfaceStart ? tr('Start naziemny', 'Surface start') : tr('Tunel podziemny', 'Underground tunnel')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-mono-tabular text-slate-300 cursor-pointer">{tr('Anuluj', 'Cancel')}</button>
          <button type="button" data-testid="line-builder-save-btn" onClick={onSave} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-sm rounded-md cursor-pointer">{tr('Zapisz własną linię', 'Save Custom Line')}</button>
        </div>
      </div>
    </>
  );
}

function createStationMutators(draft: ICustomLineDraft, setDraft: Dispatch<SetStateAction<ICustomLineDraft>>, tr: TranslateFn) {
  const updateStation = (index: number, patch: Partial<ICustomStationDraft>): void =>
    setDraft((prev) => ({ ...prev, stations: prev.stations.map((st, idx) => (idx === index ? { ...st, ...patch } : st)) }));
  const addStation = (): void => {
    if (draft.stations.length < MAX_CUSTOM_STATIONS) {
      setDraft((prev) => ({ ...prev, stations: [...prev.stations, createNextStation(prev.stations.length, tr)] }));
    }
  };
  const removeStation = (index: number): void => {
    if (draft.stations.length > MIN_CUSTOM_STATIONS) {
      setDraft((prev) => ({ ...prev, stations: prev.stations.filter((_, idx) => idx !== index) }));
    }
  };
  return { updateStation, addStation, removeStation };
}

function useLineJsonExchange(
  draft: ICustomLineDraft,
  isEditing: boolean,
  setDraft: Dispatch<SetStateAction<ICustomLineDraft>>,
  setErrorText: Dispatch<SetStateAction<string | null>>,
) {
  const { tr } = useI18n();
  const [jsonCode, setJsonCode] = useState<string>('');
  const [jsonNotice, setJsonNotice] = useState<JsonNotice>(null);
  const handleExport = (): void => {
    const encoded = exportCustomLineJson(draft);
    setJsonCode(encoded);
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) navigator.clipboard.writeText(encoded).catch(() => {});
    setJsonNotice({ tone: 'ok', text: tr('Wygenerowano kod JSON trasy (gotowy do udostępnienia).', 'Generated route JSON code (ready to share).') });
  };
  const handleImport = (): void => {
    const res = importCustomLineJson(jsonCode);
    if (!res.ok) return setJsonNotice({ tone: 'err', text: res.error });
    setDraft({ ...res.draft, id: isEditing ? draft.id : res.draft.id });
    setJsonNotice({ tone: 'ok', text: tr(`Wczytano trasę „${res.draft.name}” (${res.draft.stations.length} stacji).`, `Loaded route "${res.draft.name}" (${res.draft.stations.length} stations).`) });
    setErrorText(null);
  };
  return { jsonCode, setJsonCode, jsonNotice, handleExport, handleImport };
}

function useLineBuilderState(initialDraft: ICustomLineDraft, isEditing: boolean, onSave: (d: ICustomLineDraft) => void) {
  const { tr } = useI18n();
  const [draft, setDraft] = useState<ICustomLineDraft>(initialDraft);
  const [errorText, setErrorText] = useState<string | null>(null);
  const stationActions = createStationMutators(draft, setDraft, tr);
  const jsonExchange = useLineJsonExchange(draft, isEditing, setDraft, setErrorText);
  const handleSubmit = (): void => {
    const validated = validateAndCleanDraft(draft, tr);
    if (!validated.ok) return setErrorText(validated.error);
    onSave(validated.cleaned);
  };
  return { draft, setDraft, errorText, handleSubmit, ...stationActions, ...jsonExchange };
}

export function CustomLineBuilderModal({ initialDraft, isEditing, onSave, onClose }: ICustomLineBuilderModalProps) {
  const { tr } = useI18n();
  const state = useLineBuilderState(initialDraft, isEditing, onSave);
  return (
    <ModalDialogShell
      titleId="line-builder-title" testId="custom-line-builder-modal" maxWidthClassName="max-w-5xl"
      backdropClassName="bg-[#05070c]/88" panelClassName="bg-[#10151f] border border-slate-700 rounded-lg p-5 shadow-2xl max-h-[94vh] flex flex-col"
      headerBordered eyebrow={tr('Kreator Własnej Trasy · Custom Line Builder', 'Custom Line Builder · Route Editor')}
      eyebrowClassName="text-[10px] font-mono-tabular uppercase tracking-[0.2em] text-emerald-400"
      title={isEditing ? tr(`Edycja linii: ${initialDraft.name}`, `Edit Line: ${initialDraft.name}`) : tr('Stwórz własną linię metra', 'Create Custom Metro Line')}
      onClose={onClose} closeAriaLabel={tr('Zamknij kreator trasy', 'Close line builder')}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[0.92fr_1.35fr] gap-4 py-4 overflow-y-auto flex-1 min-h-0">
        <LineBuilderLeftColumn draft={state.draft} setDraft={state.setDraft} jsonCode={state.jsonCode} setJsonCode={state.setJsonCode} jsonNotice={state.jsonNotice} onExport={state.handleExport} onImport={state.handleImport} />
        <LineBuilderStationList stations={state.draft.stations} onAdd={state.addStation} onUpdate={state.updateStation} onRemove={state.removeStation} />
      </div>
      <BuilderFooter draft={state.draft} errorText={state.errorText} onClose={onClose} onSave={state.handleSubmit} />
    </ModalDialogShell>
  );
}
