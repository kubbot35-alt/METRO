import { useState } from 'react';
import {
  exportCustomLineJson,
  importCustomLineJson,
  LINE_COLOR_PALETTE,
  MAX_CUSTOM_STATIONS,
  MAX_STATION_SPACING_M,
  MIN_CUSTOM_STATIONS,
  MIN_STATION_SPACING_M,
  STATION_WALL_PALETTE,
} from '../domain/customLines';
import type {
  ICustomLineDraft,
  ICustomStationDraft,
  TrackAlignmentIntensity,
} from '../domain/types';

interface ICustomLineBuilderModalProps {
  readonly initialDraft: ICustomLineDraft;
  readonly isEditing: boolean;
  readonly onSave: (draft: ICustomLineDraft) => void;
  readonly onClose: () => void;
}

const INTENSITY_OPTIONS: ReadonlyArray<{
  readonly id: TrackAlignmentIntensity;
  readonly label: string;
  readonly hint: string;
}> = [
  { id: 'flat', label: 'Płasko', hint: 'Proste tunele bez łuków i wzniesień' },
  { id: 'moderate', label: 'Umiarkowanie', hint: 'Łagodne łuki i spadki jak M1/M2' },
  { id: 'curvy', label: 'Kręto', hint: 'Ostrzejsze zakręty (45 km/h) i strome podjazdy' },
];

export function CustomLineBuilderModal({
  initialDraft,
  isEditing,
  onSave,
  onClose,
}: ICustomLineBuilderModalProps) {
  const [draft, setDraft] = useState<ICustomLineDraft>(initialDraft);
  const [jsonCode, setJsonCode] = useState<string>('');
  const [jsonNotice, setJsonNotice] = useState<{ readonly tone: 'ok' | 'err'; readonly text: string } | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const totalDistanceM = draft.stations.reduce((sum, st, idx) => {
    const leg = idx === 0 && draft.hasSurfaceStart ? Math.max(560, st.spacingFromPrevM) : st.spacingFromPrevM;
    return sum + leg;
  }, 0);

  const updateStation = (index: number, patch: Partial<ICustomStationDraft>): void => {
    setDraft((prev) => ({
      ...prev,
      stations: prev.stations.map((st, idx) => (idx === index ? { ...st, ...patch } : st)),
    }));
  };

  const addStation = (): void => {
    if (draft.stations.length >= MAX_CUSTOM_STATIONS) {
      return;
    }
    const nextIdx = draft.stations.length;
    setDraft((prev) => ({
      ...prev,
      stations: [
        ...prev.stations,
        {
          name: `Nowa Stacja ${nextIdx + 1}`,
          wallHex: STATION_WALL_PALETTE[nextIdx % STATION_WALL_PALETTE.length].hex,
          platformLayout: nextIdx % 3 === 0 ? 'side' : 'island',
          spacingFromPrevM: 600,
        },
      ],
    }));
  };

  const removeStation = (index: number): void => {
    if (draft.stations.length <= MIN_CUSTOM_STATIONS) {
      return;
    }
    setDraft((prev) => ({
      ...prev,
      stations: prev.stations.filter((_, idx) => idx !== index),
    }));
  };

  const handleExport = (): void => {
    const encoded = exportCustomLineJson(draft);
    setJsonCode(encoded);
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(encoded).catch(() => {});
    }
    setJsonNotice({ tone: 'ok', text: 'Wygenerowano kod JSON trasy (gotowy do udostępnienia).' });
  };

  const handleImport = (): void => {
    const res = importCustomLineJson(jsonCode);
    if (!res.ok) {
      setJsonNotice({ tone: 'err', text: res.error });
      return;
    }
    setDraft({ ...res.draft, id: isEditing ? draft.id : res.draft.id });
    setJsonNotice({ tone: 'ok', text: `Wczytano trasę „${res.draft.name}” (${res.draft.stations.length} stacji).` });
    setErrorText(null);
  };

  const handleSubmit = (): void => {
    const trimmedName = draft.name.trim();
    if (trimmedName.length < 2) {
      setErrorText('Wpisz nazwę linii (minimum 2 znaki).');
      return;
    }
    if (draft.stations.length < MIN_CUSTOM_STATIONS || draft.stations.length > MAX_CUSTOM_STATIONS) {
      setErrorText(`Trasa musi zawierać od ${MIN_CUSTOM_STATIONS} do ${MAX_CUSTOM_STATIONS} stacji.`);
      return;
    }
    const cleanStations = draft.stations.map((st, idx) => ({
      ...st,
      name: st.name.trim() || `Stacja ${idx + 1}`,
      spacingFromPrevM: Math.max(
        MIN_STATION_SPACING_M,
        Math.min(MAX_STATION_SPACING_M, Math.round(st.spacingFromPrevM)),
      ),
    }));
    onSave({
      ...draft,
      name: trimmedName,
      destinationLed: (draft.destinationLed.trim() || cleanStations[cleanStations.length - 1].name).toUpperCase(),
      stations: cleanStations,
    });
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#05070c]/88 flex items-center justify-center p-3 md:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="line-builder-title"
        data-testid="custom-line-builder-modal"
        className="w-full max-w-5xl bg-[#10151f] border border-slate-700 rounded-lg p-5 shadow-2xl max-h-[94vh] flex flex-col"
      >
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-800">
          <div>
            <p className="text-[10px] font-mono-tabular uppercase tracking-[0.2em] text-emerald-400">
              Kreator Własnej Trasy · Custom Line Builder
            </p>
            <h2 id="line-builder-title" className="font-display text-2xl font-bold text-slate-50">
              {isEditing ? `Edycja linii: ${initialDraft.name}` : 'Stwórz własną linię metra'}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Zamknij kreator trasy"
            onClick={onClose}
            className="w-8 h-8 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono-tabular text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[0.92fr_1.35fr] gap-4 py-4 overflow-y-auto flex-1 min-h-0">
          <div className="space-y-3.5">
            <div className="rounded-md border border-slate-800 bg-[#0a0e16] p-3.5 space-y-3">
              <p className="text-[10px] font-mono-tabular uppercase tracking-[0.16em] text-amber-300 font-bold">
                1. Parametry linii
              </p>
              <div>
                <label htmlFor="builder-line-name" className="block text-xs text-slate-300 mb-1">
                  Nazwa linii
                </label>
                <input
                  id="builder-line-name"
                  data-testid="line-builder-name"
                  type="text"
                  maxLength={36}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="np. M3 Gocław"
                  className="w-full px-3 py-1.5 rounded bg-[#121826] border border-slate-700 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="builder-line-led" className="block text-xs text-slate-300 mb-1">
                  Kierunek na wyświetlaczu LED
                </label>
                <input
                  id="builder-line-led"
                  data-testid="line-builder-led"
                  type="text"
                  maxLength={22}
                  value={draft.destinationLed}
                  onChange={(e) => setDraft({ ...draft, destinationLed: e.target.value.toUpperCase() })}
                  placeholder="np. M3 GOCŁAW"
                  className="w-full px-3 py-1.5 rounded bg-[#121826] border border-slate-700 font-mono-tabular text-sm text-amber-300 uppercase focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <span className="block text-xs text-slate-300 mb-1.5">
                  Kolor przewodni linii (koralik i tablice)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {LINE_COLOR_PALETTE.map((swatch) => {
                    const active = draft.cssColor.toLowerCase() === swatch.hex.toLowerCase();
                    return (
                      <button
                        key={swatch.hex}
                        type="button"
                        data-testid={`line-color-${swatch.hex}`}
                        title={swatch.label}
                        onClick={() => setDraft({ ...draft, cssColor: swatch.hex })}
                        className={`w-7 h-7 rounded border-2 cursor-pointer transition-transform ${
                          active ? 'border-white scale-110 shadow-md' : 'border-slate-700 hover:scale-105'
                        }`}
                        style={{ backgroundColor: swatch.hex }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-md border border-slate-800 bg-[#0a0e16] p-3.5 space-y-3">
              <p className="text-[10px] font-mono-tabular uppercase tracking-[0.16em] text-amber-300 font-bold">
                2. Opcje trasy i geometria toru
              </p>

              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-slate-200">Start z odcinka naziemnego</p>
                  <p className="text-[10px] text-slate-400">
                    Zajezdnia na powierzchni + zjazd do portalu tunelu (działa deszcz)
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draft.hasSurfaceStart}
                  data-testid="line-builder-surface-toggle"
                  onClick={() => setDraft({ ...draft, hasSurfaceStart: !draft.hasSurfaceStart })}
                  className={`px-2.5 py-1 rounded border text-[11px] font-mono-tabular font-bold cursor-pointer shrink-0 ${
                    draft.hasSurfaceStart
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {draft.hasSurfaceStart ? 'WŁĄCZONY' : 'WYŁĄCZONY'}
                </button>
              </div>

              <div>
                <span className="block text-xs text-slate-300 mb-1.5">
                  Intensywność zakrętów i wzniesień
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {INTENSITY_OPTIONS.map((opt) => {
                    const active = draft.alignmentIntensity === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        data-testid={`line-intensity-${opt.id}`}
                        aria-pressed={active}
                        onClick={() => setDraft({ ...draft, alignmentIntensity: opt.id })}
                        className={`px-2 py-1.5 rounded border text-xs font-mono-tabular font-semibold cursor-pointer ${
                          active
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {INTENSITY_OPTIONS.find((o) => o.id === draft.alignmentIntensity)?.hint}
                </p>
              </div>
            </div>

            <div className="rounded-md border border-slate-800 bg-[#0a0e16] p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-mono-tabular uppercase tracking-[0.16em] text-cyan-300 font-bold">
                  Eksport / Import (JSON)
                </p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    data-testid="line-export-btn"
                    onClick={handleExport}
                    className="px-2 py-1 rounded border border-cyan-500/50 bg-cyan-950/40 hover:bg-cyan-900/50 text-[10px] font-mono-tabular text-cyan-200 cursor-pointer"
                  >
                    Eksportuj JSON
                  </button>
                  <button
                    type="button"
                    data-testid="line-import-btn"
                    onClick={handleImport}
                    className="px-2 py-1 rounded border border-emerald-500/50 bg-emerald-950/40 hover:bg-emerald-900/50 text-[10px] font-mono-tabular text-emerald-200 cursor-pointer"
                  >
                    Importuj JSON
                  </button>
                </div>
              </div>
              <textarea
                data-testid="line-json-input"
                rows={2}
                value={jsonCode}
                onChange={(e) => setJsonCode(e.target.value)}
                placeholder="Wklej kod JSON trasy do zaimportowania lub kliknij Eksportuj JSON..."
                className="w-full px-2.5 py-1.5 rounded bg-[#121826] border border-slate-700 font-mono-tabular text-[11px] text-slate-200 focus:border-cyan-400 focus:outline-none resize-none"
              />
              {jsonNotice && (
                <p
                  data-testid="line-json-notice"
                  className={`text-[11px] font-mono-tabular ${
                    jsonNotice.tone === 'ok' ? 'text-emerald-300' : 'text-red-300'
                  }`}
                >
                  {jsonNotice.text}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-md border border-slate-800 bg-[#0a0e16] p-3.5 flex flex-col min-h-0">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div>
                <p className="text-[10px] font-mono-tabular uppercase tracking-[0.16em] text-amber-300 font-bold">
                  3. Lista stacji ({draft.stations.length} / {MAX_CUSTOM_STATIONS} · min. {MIN_CUSTOM_STATIONS})
                </p>
                <p className="text-[10px] text-slate-400">
                  Nazwa, kolor ścian, typ peronu (Wyspowy [Q] / Boczny [E]) oraz odstęp (400–1200 m)
                </p>
              </div>
              <button
                type="button"
                data-testid="line-add-station-btn"
                disabled={draft.stations.length >= MAX_CUSTOM_STATIONS}
                onClick={addStation}
                className="px-2.5 py-1.5 rounded border border-emerald-500/60 bg-emerald-600/20 hover:bg-emerald-600/35 disabled:opacity-40 text-xs font-mono-tabular font-bold text-emerald-200 cursor-pointer shrink-0"
              >
                + Dodaj stację
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto pr-1 flex-1 max-h-[420px]">
              {draft.stations.map((station, idx) => (
                <div
                  key={idx}
                  data-testid={`builder-station-row-${idx}`}
                  className="rounded border border-slate-800 bg-[#111723] p-2 flex flex-wrap items-center gap-2"
                >
                  <span
                    className="w-6 h-6 rounded text-[10px] font-mono-tabular font-bold text-white flex items-center justify-center shrink-0"
                    style={{ backgroundColor: station.wallHex }}
                  >
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    maxLength={32}
                    data-testid={`station-name-${idx}`}
                    aria-label={`Nazwa stacji ${idx + 1}`}
                    value={station.name}
                    onChange={(e) => updateStation(idx, { name: e.target.value })}
                    className="flex-1 min-w-[130px] px-2 py-1 rounded bg-[#0a0f18] border border-slate-700 text-xs text-slate-100 focus:border-amber-400 focus:outline-none"
                  />

                  <select
                    aria-label={`Kolor ścian stacji ${idx + 1}`}
                    data-testid={`station-color-${idx}`}
                    value={station.wallHex}
                    onChange={(e) => updateStation(idx, { wallHex: e.target.value })}
                    className="px-1.5 py-1 rounded bg-[#0a0f18] border border-slate-700 text-[11px] font-mono-tabular text-slate-200 cursor-pointer"
                  >
                    {STATION_WALL_PALETTE.map((c) => (
                      <option key={c.hex} value={c.hex}>
                        {c.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    data-testid={`station-layout-${idx}`}
                    onClick={() =>
                      updateStation(idx, {
                        platformLayout: station.platformLayout === 'island' ? 'side' : 'island',
                      })
                    }
                    className={`px-2 py-1 rounded border text-[10px] font-mono-tabular font-bold cursor-pointer whitespace-nowrap ${
                      station.platformLayout === 'side'
                        ? 'bg-sky-500/20 border-sky-400/70 text-sky-200'
                        : 'bg-amber-500/15 border-amber-400/60 text-amber-200'
                    }`}
                  >
                    {station.platformLayout === 'side' ? 'Boczny [E]' : 'Wyspowy [Q]'}
                  </button>

                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={MIN_STATION_SPACING_M}
                      max={MAX_STATION_SPACING_M}
                      step={50}
                      data-testid={`station-spacing-${idx}`}
                      aria-label={`Odległość stacji ${idx + 1} w metrach`}
                      value={station.spacingFromPrevM}
                      onChange={(e) =>
                        updateStation(idx, { spacingFromPrevM: Number(e.target.value) || 600 })
                      }
                      className="w-16 px-1.5 py-1 rounded bg-[#0a0f18] border border-slate-700 font-mono-tabular text-[11px] text-slate-100 text-right"
                    />
                    <span className="text-[10px] font-mono-tabular text-slate-400">m</span>
                  </div>

                  <button
                    type="button"
                    aria-label={`Usuń stację ${idx + 1}`}
                    disabled={draft.stations.length <= MIN_CUSTOM_STATIONS}
                    onClick={() => removeStation(idx)}
                    className="w-6 h-6 rounded border border-slate-700 bg-slate-900 hover:bg-red-950/70 hover:border-red-500/60 disabled:opacity-30 text-xs text-slate-300 cursor-pointer shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {errorText && (
          <p className="text-xs font-mono-tabular text-red-300 mb-2">{errorText}</p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs font-mono-tabular text-slate-300">
            <span
              className="w-3 h-3 rounded-xs inline-block"
              style={{ backgroundColor: draft.cssColor }}
            />
            <span>
              Podgląd trasy: <strong>{draft.stations.length} stacji</strong> ·{' '}
              <strong>{(totalDistanceM / 1000).toFixed(2)} km</strong> ·{' '}
              {draft.hasSurfaceStart ? 'Start naziemny' : 'Tunel podziemny'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-mono-tabular text-slate-300 cursor-pointer"
            >
              Anuluj
            </button>
            <button
              type="button"
              data-testid="line-builder-save-btn"
              onClick={handleSubmit}
              className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-sm rounded-md cursor-pointer"
            >
              Zapisz własną linię
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
