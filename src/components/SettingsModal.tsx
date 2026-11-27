import { useState } from 'react';
import { GAMEPAD_BUTTON_MAPPINGS } from '../domain/gamepadMapping';
import { GRAPHICS_QUALITY_PRESETS } from '../domain/settingsService';
import type {
  GraphicsQualityId,
  IGamepadStatus,
  IGameSettings,
  TouchControlsMode,
} from '../domain/types';

interface ISettingsModalProps {
  readonly settings: IGameSettings;
  readonly gamepadStatus: IGamepadStatus;
  readonly onUpdate: (partial: Partial<IGameSettings>) => void;
  readonly onReset: () => void;
  readonly onClose: () => void;
}

type SettingsTabId = 'general' | 'gamepad';

export function SettingsModal({
  settings,
  gamepadStatus,
  onUpdate,
  onReset,
  onClose,
}: ISettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('general');

  return (
    <div className="fixed inset-0 z-40 bg-[#06080d]/86 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        data-testid="settings-modal"
        className="w-full max-w-2xl bg-[#111620] border border-slate-700 rounded-lg p-5 shadow-2xl max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4 mb-3">
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

        <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2.5">
          <button
            type="button"
            data-testid="settings-tab-general"
            aria-pressed={activeTab === 'general'}
            onClick={() => setActiveTab('general')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-mono-tabular font-bold border transition-colors cursor-pointer ${
              activeTab === 'general'
                ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            Ogólne (Dźwięk i Grafika)
          </button>
          <button
            type="button"
            data-testid="settings-tab-gamepad"
            aria-pressed={activeTab === 'gamepad'}
            onClick={() => setActiveTab('gamepad')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-mono-tabular font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'gamepad'
                ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Kontroler / Pad</span>
            {gamepadStatus.connected && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
            )}
          </button>
        </div>

        {activeTab === 'general' ? (
          <GeneralSettingsTab settings={settings} onUpdate={onUpdate} />
        ) : (
          <GamepadSettingsTab
            settings={settings}
            gamepadStatus={gamepadStatus}
            onUpdate={onUpdate}
          />
        )}

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

function GeneralSettingsTab({
  settings,
  onUpdate,
}: {
  readonly settings: IGameSettings;
  readonly onUpdate: (partial: Partial<IGameSettings>) => void;
}) {
  return (
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

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5 border-t border-slate-800/90">
          <div>
            <p className="text-xs font-medium text-slate-200">
              Sterowanie dotykowe (Telefony / Tablety)
            </p>
            <p className="text-[11px] text-slate-400">
              Pionowy suwak nastawnika i ergonomiczny panel przycisków na ekranie
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0" role="group" aria-label="Sterowanie dotykowe">
            {(
              [
                { id: 'auto', label: 'Auto' },
                { id: 'on', label: 'Wł.' },
                { id: 'off', label: 'Wył.' },
              ] as const
            ).map((opt) => {
              const selected = settings.touchControlsMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-testid={`select-touch-${opt.id}`}
                  aria-pressed={selected}
                  onClick={() => onUpdate({ touchControlsMode: opt.id as TouchControlsMode })}
                  className={`px-3 py-1.5 rounded-md border text-xs font-mono-tabular font-bold cursor-pointer transition-colors ${
                    selected
                      ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function GamepadSettingsTab({
  settings,
  gamepadStatus,
  onUpdate,
}: {
  readonly settings: IGameSettings;
  readonly gamepadStatus: IGamepadStatus;
  readonly onUpdate: (partial: Partial<IGameSettings>) => void;
}) {
  return (
    <div className="space-y-4" data-testid="gamepad-settings-panel">
      <section className="rounded-md border border-slate-800 bg-[#0a0d13] p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-mono-tabular uppercase tracking-[0.16em] text-sky-300 font-bold">
              Status kontrolera (Gamepad API)
            </h3>
            <p className="text-xs text-slate-200 mt-1" data-testid="gamepad-status-text">
              {gamepadStatus.connected
                ? `Podłączono: ${gamepadStatus.name}`
                : 'Nie wykryto kontrolera — podłącz pada Xbox/PlayStation i naciśnij dowolny przycisk.'}
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded text-[10px] font-mono-tabular font-bold uppercase whitespace-nowrap border ${
              gamepadStatus.connected
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            {gamepadStatus.connected ? 'AKTYWNY' : 'BRAK PADA'}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/90">
          <div>
            <p className="text-xs font-medium text-slate-200">
              Wibracje kontrolera (Force Feedback)
            </p>
            <p className="text-[11px] text-slate-400">
              Wibracje podczas ostrego hamowania, poślizgu kół i przejazdu przez rozjazdy (martwa strefa 0.1)
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.gamepadVibration}
            aria-label="Wibracje kontrolera"
            data-testid="toggle-gamepad-vibration"
            onClick={() => onUpdate({ gamepadVibration: !settings.gamepadVibration })}
            className={`px-3 py-1.5 rounded-md border text-xs font-mono-tabular font-bold cursor-pointer transition-colors shrink-0 ${
              settings.gamepadVibration
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
            }`}
          >
            {settings.gamepadVibration ? 'WŁĄCZONE' : 'WYŁĄCZONE'}
          </button>
        </div>
      </section>

      <section className="rounded-md border border-slate-800 bg-[#0a0d13] p-3.5">
        <h3 className="text-xs font-mono-tabular uppercase tracking-[0.16em] text-amber-300 font-bold mb-2.5">
          Mapowanie przycisków (Xbox / PlayStation)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px] font-mono-tabular">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                <th className="py-1.5 pr-2 font-semibold">Funkcja</th>
                <th className="py-1.5 px-2 font-semibold text-emerald-300">Xbox</th>
                <th className="py-1.5 px-2 font-semibold text-sky-300">PlayStation</th>
                <th className="py-1.5 pl-2 font-semibold text-slate-400">Klawiatura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {GAMEPAD_BUTTON_MAPPINGS.map((row) => (
                <tr key={row.action}>
                  <td className="py-1.5 pr-2 text-slate-200">{row.action}</td>
                  <td className="py-1.5 px-2 text-emerald-200 font-semibold">{row.xbox}</td>
                  <td className="py-1.5 px-2 text-sky-200 font-semibold">{row.playstation}</td>
                  <td className="py-1.5 pl-2 text-slate-400">{row.keyboard}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
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
