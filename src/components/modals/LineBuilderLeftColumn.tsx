import { LINE_COLOR_PALETTE } from '../../domain/customLines';
import type { ICustomLineDraft, TrackAlignmentIntensity } from '../../domain/types';
import { useI18n } from '../../i18n/LanguageContext';
import { ToggleSwitchButton } from '../shared/ModalUiPrimitives';

interface IJsonExchangeCardProps {
  readonly jsonCode: string;
  readonly setJsonCode: (v: string) => void;
  readonly jsonNotice: { readonly tone: 'ok' | 'err'; readonly text: string } | null;
  readonly onExport: () => void;
  readonly onImport: () => void;
}

interface ILineBuilderLeftColumnProps extends IJsonExchangeCardProps {
  readonly draft: ICustomLineDraft;
  readonly setDraft: (next: ICustomLineDraft) => void;
}

const INTENSITY_OPTIONS: ReadonlyArray<{
  readonly id: TrackAlignmentIntensity; readonly labelPl: string; readonly labelEn: string; readonly hintPl: string; readonly hintEn: string;
}> = [
  { id: 'flat', labelPl: 'Płasko', labelEn: 'Flat', hintPl: 'Proste tunele bez łuków i wzniesień', hintEn: 'Straight flat tunnels with no curves or grades' },
  { id: 'moderate', labelPl: 'Umiarkowanie', labelEn: 'Moderate', hintPl: 'Łagodne łuki i spadki jak M1/M2', hintEn: 'Gentle curves and gradients like M1/M2' },
  { id: 'curvy', labelPl: 'Kręto', labelEn: 'Curvy', hintPl: 'Ostrzejsze zakręty (45 km/h) i strome podjazdy', hintEn: 'Tighter curves (45 km/h) and steeper grades' },
];

function LineColorSwatchPicker({ cssColor, onSelect }: { readonly cssColor: string; readonly onSelect: (hex: string) => void }) {
  const { tr } = useI18n();
  return (
    <div>
      <span className="block text-xs text-slate-300 mb-1.5">{tr('Kolor przewodni linii (koralik i tablice)', 'Line Accent Color (strip & signage)')}</span>
      <div className="flex flex-wrap gap-1.5">
        {LINE_COLOR_PALETTE.map((swatch) => {
          const active = cssColor.toLowerCase() === swatch.hex.toLowerCase();
          return (
            <button key={swatch.hex} type="button" data-testid={`line-color-${swatch.hex}`} title={swatch.label} onClick={() => onSelect(swatch.hex)} className={`w-7 h-7 rounded border-2 cursor-pointer transition-transform ${active ? 'border-white scale-110 shadow-md' : 'border-slate-700 hover:scale-105'}`} style={{ backgroundColor: swatch.hex }} />
          );
        })}
      </div>
    </div>
  );
}

function LineParamsCard({ draft, setDraft }: { readonly draft: ICustomLineDraft; readonly setDraft: (next: ICustomLineDraft) => void }) {
  const { tr } = useI18n();
  return (
    <div className="rounded-md border border-slate-800 bg-[#0a0e16] p-3.5 space-y-3">
      <p className="text-[10px] font-mono-tabular uppercase tracking-[0.16em] text-amber-300 font-bold">{tr('1. Parametry linii', '1. Line Parameters')}</p>
      <div>
        <label htmlFor="builder-line-name" className="block text-xs text-slate-300 mb-1">{tr('Nazwa linii', 'Line Name')}</label>
        <input id="builder-line-name" data-testid="line-builder-name" type="text" maxLength={36} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={tr('np. M3 Gocław', 'e.g. M3 Gocław')} className="w-full px-3 py-1.5 rounded bg-[#121826] border border-slate-700 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none" />
      </div>
      <div>
        <label htmlFor="builder-line-led" className="block text-xs text-slate-300 mb-1">{tr('Kierunek na wyświetlaczu LED', 'Destination LED Sign')}</label>
        <input id="builder-line-led" data-testid="line-builder-led" type="text" maxLength={22} value={draft.destinationLed} onChange={(e) => setDraft({ ...draft, destinationLed: e.target.value.toUpperCase() })} placeholder={tr('np. M3 GOCŁAW', 'e.g. M3 GOCŁAW')} className="w-full px-3 py-1.5 rounded bg-[#121826] border border-slate-700 font-mono-tabular text-sm text-amber-300 uppercase focus:border-emerald-400 focus:outline-none" />
      </div>
      <LineColorSwatchPicker cssColor={draft.cssColor} onSelect={(cssColor) => setDraft({ ...draft, cssColor })} />
    </div>
  );
}

function RouteOptionsCard({ draft, setDraft }: { readonly draft: ICustomLineDraft; readonly setDraft: (next: ICustomLineDraft) => void }) {
  const { tr } = useI18n();
  const activeIntensity = INTENSITY_OPTIONS.find((o) => o.id === draft.alignmentIntensity);
  return (
    <div className="rounded-md border border-slate-800 bg-[#0a0e16] p-3.5 space-y-3">
      <p className="text-[10px] font-mono-tabular uppercase tracking-[0.16em] text-amber-300 font-bold">{tr('2. Opcje trasy i geometria toru', '2. Route Options & Track Geometry')}</p>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-slate-200">{tr('Start z odcinka naziemnego', 'Start from Surface Section')}</p>
          <p className="text-[10px] text-slate-400">{tr('Zajezdnia na powierzchni + zjazd do portalu tunelu (działa deszcz)', 'Surface depot + descent into tunnel portal (supports rain)')}</p>
        </div>
        <ToggleSwitchButton checked={draft.hasSurfaceStart} testId="line-builder-surface-toggle" onLabel={tr('WŁĄCZONY', 'ENABLED')} offLabel={tr('WYŁĄCZONY', 'DISABLED')} onToggle={() => setDraft({ ...draft, hasSurfaceStart: !draft.hasSurfaceStart })} className="px-2.5 py-1 rounded border text-[11px] font-mono-tabular font-bold cursor-pointer shrink-0" />
      </div>
      <div>
        <span className="block text-xs text-slate-300 mb-1.5">{tr('Intensywność zakrętów i wzniesień', 'Curve & Gradient Intensity')}</span>
        <div className="grid grid-cols-3 gap-1.5">
          {INTENSITY_OPTIONS.map((opt) => (
            <button key={opt.id} type="button" data-testid={`line-intensity-${opt.id}`} aria-pressed={draft.alignmentIntensity === opt.id} onClick={() => setDraft({ ...draft, alignmentIntensity: opt.id })} className={`px-2 py-1.5 rounded border text-xs font-mono-tabular font-semibold cursor-pointer ${draft.alignmentIntensity === opt.id ? 'bg-amber-500/20 border-amber-400 text-amber-200' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}>{tr(opt.labelPl, opt.labelEn)}</button>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-1">{activeIntensity ? tr(activeIntensity.hintPl, activeIntensity.hintEn) : ''}</p>
      </div>
    </div>
  );
}

function JsonExchangeCard({ jsonCode, setJsonCode, jsonNotice, onExport, onImport }: IJsonExchangeCardProps) {
  const { tr } = useI18n();
  return (
    <div className="rounded-md border border-slate-800 bg-[#0a0e16] p-3.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-mono-tabular uppercase tracking-[0.16em] text-cyan-300 font-bold">{tr('Eksport / Import (JSON)', 'Export / Import (JSON)')}</p>
        <div className="flex gap-1.5">
          <button type="button" data-testid="line-export-btn" onClick={onExport} className="px-2 py-1 rounded border border-cyan-500/50 bg-cyan-950/40 hover:bg-cyan-900/50 text-[10px] font-mono-tabular text-cyan-200 cursor-pointer">{tr('Eksportuj JSON', 'Export JSON')}</button>
          <button type="button" data-testid="line-import-btn" onClick={onImport} className="px-2 py-1 rounded border border-emerald-500/50 bg-emerald-950/40 hover:bg-emerald-900/50 text-[10px] font-mono-tabular text-emerald-200 cursor-pointer">{tr('Importuj JSON', 'Import JSON')}</button>
        </div>
      </div>
      <textarea data-testid="line-json-input" rows={2} value={jsonCode} onChange={(e) => setJsonCode(e.target.value)} placeholder={tr('Wklej kod JSON trasy do zaimportowania lub kliknij Eksportuj JSON...', 'Paste route JSON to import or click Export JSON...')} className="w-full px-2.5 py-1.5 rounded bg-[#121826] border border-slate-700 font-mono-tabular text-[11px] text-slate-200 focus:border-cyan-400 focus:outline-none resize-none" />
      {jsonNotice && <p data-testid="line-json-notice" className={`text-[11px] font-mono-tabular ${jsonNotice.tone === 'ok' ? 'text-emerald-300' : 'text-red-300'}`}>{jsonNotice.text}</p>}
    </div>
  );
}

export function LineBuilderLeftColumn(props: ILineBuilderLeftColumnProps) {
  return (
    <div className="space-y-3.5">
      <LineParamsCard draft={props.draft} setDraft={props.setDraft} />
      <RouteOptionsCard draft={props.draft} setDraft={props.setDraft} />
      <JsonExchangeCard jsonCode={props.jsonCode} setJsonCode={props.setJsonCode} jsonNotice={props.jsonNotice} onExport={props.onExport} onImport={props.onImport} />
    </div>
  );
}
