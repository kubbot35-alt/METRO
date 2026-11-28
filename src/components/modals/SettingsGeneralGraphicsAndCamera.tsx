import { getLocalizedQuality } from '../../domain/i18nCatalog';
import { getMirrorPerformancePolicy } from '../../domain/mirrorCctvSystem';
import { GRAPHICS_QUALITY_PRESETS } from '../../domain/settingsService';
import type { GraphicsQualityId, IGameSettings, TouchControlsMode } from '../../domain/types';
import { useI18n } from '../../i18n/LanguageContext';
import { ToggleSwitchButton } from '../shared/ModalUiPrimitives';

interface ISettingsUpdateProps {
  readonly settings: IGameSettings;
  readonly onUpdate: (p: Partial<IGameSettings>) => void;
}

function QualityPresetGrid({ settings, onUpdate }: ISettingsUpdateProps) {
  const { lang } = useI18n();
  return (
    <div className="grid grid-cols-3 gap-2">
      {GRAPHICS_QUALITY_PRESETS.map((preset) => {
        const selected = preset.id === settings.graphicsQuality;
        const loc = getLocalizedQuality(lang, preset.id, preset);
        const cls = selected ? 'border-amber-400 bg-[#221a0f] text-slate-50' : 'border-slate-700/80 bg-[#0d1118] hover:border-slate-500 text-slate-300';
        const patch: Partial<IGameSettings> = { graphicsQuality: preset.id as GraphicsQualityId, ...(preset.id === 'medium' || preset.id === 'high' ? { liveMirrorsEnabled: true } : {}) };
        return (
          <button key={preset.id} type="button" data-testid={`select-quality-${preset.id}`} aria-pressed={selected} onClick={() => onUpdate(patch)} className={`text-left rounded-md border-2 p-2.5 transition-colors cursor-pointer ${cls}`}>
            <div className="flex items-center justify-between gap-1">
              <span className="font-display text-sm font-bold">{loc.label}</span>
              <span className="text-[10px] font-mono-tabular text-amber-300">{preset.drawDistanceM} m</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-snug">{loc.description}</p>
          </button>
        );
      })}
    </div>
  );
}

export function SettingsGraphicsSection({ settings, onUpdate }: ISettingsUpdateProps) {
  const { tr } = useI18n();
  const fpsBadge = getMirrorPerformancePolicy(settings.graphicsQuality, settings.liveMirrorsEnabled).approxFpsLabel;
  return (
    <section className="rounded-md border border-slate-800 bg-[#0a0d13] p-3.5 space-y-2.5">
      <h3 className="text-xs font-mono-tabular uppercase tracking-[0.16em] text-amber-300 font-bold">{tr('2. Grafika i wydajność', '2. Graphics & Performance')}</h3>
      <QualityPresetGrid settings={settings} onUpdate={onUpdate} />
      <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-800/90">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-slate-200">{tr('Lusterka i kamery na żywo (CCTV)', 'Live Mirrors & Cameras (CCTV)')}</p>
            <span data-testid="mirror-fps-policy-badge" className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono-tabular text-amber-300">{fpsBadge}</span>
          </div>
          <p className="text-[11px] text-slate-400">{tr('Renderowanie w czasie rzeczywistym lusterek (Seria 81) i monitorów CCTV (Inspiro / Varsovia)', 'Real-time rendering for Seria 81 side mirrors and Inspiro / Varsovia cab CCTV monitors')}</p>
        </div>
        <ToggleSwitchButton checked={settings.liveMirrorsEnabled} ariaLabel={tr('Lusterka i kamery na żywo', 'Live Mirrors & Cameras')} testId="toggle-live-mirrors" onLabel={tr('WŁ.', 'ON')} offLabel={tr('WYŁ.', 'OFF')} onToggle={() => onUpdate({ liveMirrorsEnabled: !settings.liveMirrorsEnabled })} />
      </div>
    </section>
  );
}

function TouchModeSelector({ mode, onUpdate }: { readonly mode: TouchControlsMode; readonly onUpdate: (p: Partial<IGameSettings>) => void }) {
  const { tr } = useI18n();
  const opts = [{ id: 'auto', label: 'Auto' }, { id: 'on', label: tr('Wł.', 'On') }, { id: 'off', label: tr('Wył.', 'Off') }] as const;
  return (
    <div className="flex items-center gap-1 shrink-0" role="group" aria-label={tr('Sterowanie dotykowe', 'Touch Controls')}>
      {opts.map((opt) => (
        <button key={opt.id} type="button" data-testid={`select-touch-${opt.id}`} aria-pressed={mode === opt.id} onClick={() => onUpdate({ touchControlsMode: opt.id as TouchControlsMode })} className={`px-3 py-1.5 rounded-md border text-xs font-mono-tabular font-bold cursor-pointer transition-colors ${mode === opt.id ? 'bg-amber-500/25 border-amber-400 text-amber-200' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function CabFovSliderBlock({ cabFovDeg, onChange }: { readonly cabFovDeg: number; readonly onChange: (fov: number) => void }) {
  const { tr } = useI18n();
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <label htmlFor="setting-cab-fov" className="text-slate-200 font-medium">{tr('Kąt widzenia w kabinie (FOV)', 'Cab Field of View (FOV)')}</label>
        <span data-testid="fov-value-label" className="font-mono-tabular font-bold text-amber-300">{cabFovDeg}°</span>
      </div>
      <input id="setting-cab-fov" data-testid="slider-cab-fov" type="range" min={60} max={95} step={1} value={cabFovDeg} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-amber-400 cursor-pointer" />
      <div className="flex justify-between text-[10px] font-mono-tabular text-slate-500 mt-0.5">
        <span>{tr('60° (Zbliżenie)', '60° (Narrow)')}</span><span>75°</span><span>{tr('95° (Szeroki kąt)', '95° (Wide)')}</span>
      </div>
    </div>
  );
}

export function SettingsCameraSection({ settings, onUpdate }: ISettingsUpdateProps) {
  const { tr } = useI18n();
  return (
    <section className="rounded-md border border-slate-800 bg-[#0a0d13] p-3.5 space-y-3">
      <h3 className="text-xs font-mono-tabular uppercase tracking-[0.16em] text-amber-300 font-bold">{tr('3. Kamera i HUD', '3. Camera & HUD')}</h3>
      <CabFovSliderBlock cabFovDeg={settings.cabFovDeg} onChange={(cabFovDeg) => onUpdate({ cabFovDeg })} />
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/90">
        <div>
          <p className="text-xs font-medium text-slate-200">{tr('Licznik FPS w rogu ekranu', 'On-screen FPS Counter')}</p>
          <p className="text-[11px] text-slate-400">{tr('Wyświetla aktualną płynność animacji podczas jazdy', 'Displays live frame rate in the top-left corner')}</p>
        </div>
        <ToggleSwitchButton checked={settings.showFps} ariaLabel={tr('Licznik FPS w rogu ekranu', 'On-screen FPS Counter')} testId="toggle-show-fps" onLabel={tr('WŁĄCZONY', 'ON')} offLabel={tr('WYŁĄCZONY', 'OFF')} onToggle={() => onUpdate({ showFps: !settings.showFps })} />
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5 border-t border-slate-800/90">
        <div>
          <p className="text-xs font-medium text-slate-200">{tr('Sterowanie dotykowe (Telefony / Tablety)', 'Touch Controls (Phones / Tablets)')}</p>
          <p className="text-[11px] text-slate-400">{tr('Pionowy suwak nastawnika i ergonomiczny panel przycisków na ekranie', 'Vertical thumb throttle/brake slider and ergonomic on-screen action pad')}</p>
        </div>
        <TouchModeSelector mode={settings.touchControlsMode} onUpdate={onUpdate} />
      </div>
    </section>
  );
}
