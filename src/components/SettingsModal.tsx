import { GRAPHICS_QUALITY_PRESETS } from '../domain/settingsService';
import type { GraphicsQualityId, IGameSettings } from '../domain/types';

interface ISettingsModalProps {
  readonly settings: IGameSettings;
  readonly onUpdate: (partial: Partial<IGameSettings>) => void;
  readonly onReset: () => void;
  readonly onClose: () => void;
}

export function SettingsModal({ settings, onUpdate, onReset, onClose }: ISettingsModalProps) {
  return (
    <div className="fixed inset-0 z-40 bg-[#06080d]/86 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        data-testid="settings-modal"
        className="w-full max-w-xl bg-[#111620] border border-slate-700 rounded-lg p-5 shadow-2xl max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-amber-400">
              Konfiguracja symulatora · Zapis automatyczny
            </p>
            <h2
              id="settings-modal-title"
              className="font-display text-2xl font-bold text-slate-50 mt-0.5"
            >
              Ustawienia
            </h2>
          </div>
          <button
            type="button"
            aria-label="Zamknij ustawienia"
            onClick={onClose}
            className="w-8 h-8 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono-tabular text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <section className="rounded-md border border-slate-800 bg-[#0a0d13] p-3.5 space-y-3">
            <h3 className="text-xs font-mono-tabular uppercase tracking-[0.16em] text-amber-300 font-bold">
              1. Dźwięk i mikser audio
            </h3>
            <VolumeSliderRow
              id="setting-master-vol"
              testId="slider-master-volume"
              label="Głośność ogólna"
              value={settings.masterVolume}
              onChange={(v) => onUpdate({ masterVolume: v })}
            />
            <VolumeSliderRow
              id="setting-train-vol"
              testId="slider-train-volume"
              label="Dźwięki pociągu i otoczenia (silnik, tory, deszcz)"
              value={settings.trainVolume}
              onChange={(v) => onUpdate({ trainVolume: v })}
            />
            <VolumeSliderRow
              id="setting-voice-vol"
              testId="slider-voice-volume"
              label="Głos lektora i radio dyspozytora"
              value={settings.voiceVolume}
              onChange={(v) => onUpdate({ voiceVolume: v })}
            />
          </section>

          <section className="rounded-md border border-slate-800 bg-[#0a0d13] p-3.5 space-y-2.5">
            <h3 className="text-xs font-mono-tabular uppercase tracking-[0.16em] text-amber-300 font-bold">
              2. Grafika i wydajność
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {GRAPHICS_QUALITY_PRESETS.map((preset) => {
                const selected = preset.id === settings.graphicsQuality;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    data-testid={`select-quality-${preset.id}`}
                    aria-pressed={selected}
                    onClick={() => onUpdate({ graphicsQuality: preset.id as GraphicsQualityId })}
                    className={`text-left rounded-md border-2 p-2.5 transition-colors cursor-pointer ${
                      selected
                        ? 'border-amber-400 bg-[#221a0f] text-slate-50'
                        : 'border-slate-700/80 bg-[#0d1118] hover:border-slate-500 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-display text-sm font-bold">{preset.label}</span>
                      <span className="text-[10px] font-mono-tabular text-amber-300">
                        {preset.drawDistanceM} m
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-md border border-slate-800 bg-[#0a0d13] p-3.5 space-y-3">
            <h3 className="text-xs font-mono-tabular uppercase tracking-[0.16em] text-amber-300 font-bold">
              3. Kamera i HUD
            </h3>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label htmlFor="setting-cab-fov" className="text-slate-200 font-medium">
                  Kąt widzenia w kabinie (FOV)
                </label>
                <span
                  data-testid="fov-value-label"
                  className="font-mono-tabular font-bold text-amber-300"
                >
                  {settings.cabFovDeg}°
                </span>
              </div>
              <input
                id="setting-cab-fov"
                data-testid="slider-cab-fov"
                type="range"
                min={60}
                max={95}
                step={1}
                value={settings.cabFovDeg}
                onChange={(e) => onUpdate({ cabFovDeg: Number(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono-tabular text-slate-500 mt-0.5">
                <span>60° (Zbliżenie)</span>
                <span>75°</span>
                <span>95° (Szeroki kąt)</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/90">
              <div>
                <p className="text-xs font-medium text-slate-200">Licznik FPS w rogu ekranu</p>
                <p className="text-[11px] text-slate-400">
                  Wyświetla aktualną płynność animacji podczas jazdy
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.showFps}
                aria-label="Licznik FPS w rogu ekranu"
                data-testid="toggle-show-fps"
                onClick={() => onUpdate({ showFps: !settings.showFps })}
                className={`px-3 py-1.5 rounded-md border text-xs font-mono-tabular font-bold cursor-pointer transition-colors ${
                  settings.showFps
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {settings.showFps ? 'WŁĄCZONY' : 'WYŁĄCZONY'}
              </button>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between gap-3 mt-5">
          <button
            type="button"
            data-testid="settings-reset-btn"
            onClick={onReset}
            className="px-4 py-2 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-mono-tabular text-slate-300 cursor-pointer"
          >
            Przywróć domyślne
          </button>
          <button
            type="button"
            data-testid="settings-close-btn"
            onClick={onClose}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm rounded-md cursor-pointer"
          >
            Zastosuj i zamknij
          </button>
        </div>
      </div>
    </div>
  );
}

function VolumeSliderRow({
  id,
  testId,
  label,
  value,
  onChange,
}: {
  readonly id: string;
  readonly testId: string;
  readonly label: string;
  readonly value: number;
  readonly onChange: (val: number) => void;
}) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <label htmlFor={id} className="text-slate-200 font-medium">
          {label}
        </label>
        <span className="font-mono-tabular font-bold text-amber-300">{pct}%</span>
      </div>
      <input
        id={id}
        data-testid={testId}
        type="range"
        min={0}
        max={100}
        step={5}
        value={pct}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="w-full accent-amber-400 cursor-pointer"
      />
    </div>
  );
}
