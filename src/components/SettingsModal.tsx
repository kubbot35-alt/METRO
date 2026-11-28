import { useState } from 'react';
import type { IGamepadStatus, IGameSettings, LanguageId } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';
import { GamepadSettingsTab } from './modals/SettingsGamepadTab';
import { SettingsAudioSection, SettingsLanguageSection, SettingsSafetySection } from './modals/SettingsGeneralAudioAndLang';
import { SettingsCameraSection, SettingsGraphicsSection } from './modals/SettingsGeneralGraphicsAndCamera';
import { ModalDialogShell } from './shared/ModalDialogShell';

interface ISettingsModalProps {
  readonly settings: IGameSettings;
  readonly gamepadStatus: IGamepadStatus;
  readonly onUpdate: (partial: Partial<IGameSettings>) => void;
  readonly onReset: () => void;
  readonly onClose: () => void;
}

type SettingsTabId = 'general' | 'gamepad';

function SettingsTabBar({
  activeTab,
  gamepadConnected,
  onSelectTab,
}: {
  readonly activeTab: SettingsTabId;
  readonly gamepadConnected: boolean;
  readonly onSelectTab: (tab: SettingsTabId) => void;
}) {
  const { tr } = useI18n();
  return (
    <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2.5">
      <button type="button" data-testid="settings-tab-general" aria-pressed={activeTab === 'general'} onClick={() => onSelectTab('general')} className={`px-3.5 py-1.5 rounded-md text-xs font-mono-tabular font-bold border transition-colors cursor-pointer ${activeTab === 'general' ? 'bg-amber-500/20 border-amber-400 text-amber-200' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'}`}>
        {tr('Ogólne (Dźwięk, Grafika, Język)', 'General (Audio, Graphics, Language)')}
      </button>
      <button type="button" data-testid="settings-tab-gamepad" aria-pressed={activeTab === 'gamepad'} onClick={() => onSelectTab('gamepad')} className={`px-3.5 py-1.5 rounded-md text-xs font-mono-tabular font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${activeTab === 'gamepad' ? 'bg-sky-500/20 border-sky-400 text-sky-200' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'}`}>
        <span>{tr('Kontroler / Pad', 'Controller / Gamepad')}</span>
        {gamepadConnected && <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />}
      </button>
    </div>
  );
}

function GeneralSettingsTab({ settings, onUpdate }: { readonly settings: IGameSettings; readonly onUpdate: (p: Partial<IGameSettings>) => void }) {
  return (
    <div className="space-y-4">
      <SettingsLanguageSection language={settings.language} onSelectLanguage={(language: LanguageId) => onUpdate({ language })} />
      <SettingsAudioSection settings={settings} onUpdate={onUpdate} />
      <SettingsGraphicsSection settings={settings} onUpdate={onUpdate} />
      <SettingsCameraSection settings={settings} onUpdate={onUpdate} />
      <SettingsSafetySection settings={settings} onUpdate={onUpdate} />
    </div>
  );
}

function SettingsFooterActions({ onReset, onClose }: { readonly onReset: () => void; readonly onClose: () => void }) {
  const { tr } = useI18n();
  return (
    <div className="flex items-center justify-between gap-3 mt-5">
      <button type="button" data-testid="settings-reset-btn" onClick={onReset} className="px-4 py-2 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-mono-tabular text-slate-300 cursor-pointer">
        {tr('Przywróć domyślne', 'Restore Defaults')}
      </button>
      <button type="button" data-testid="settings-close-btn" onClick={onClose} className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm rounded-md cursor-pointer">
        {tr('Zastosuj i zamknij', 'Apply & Close')}
      </button>
    </div>
  );
}

export function SettingsModal({ settings, gamepadStatus, onUpdate, onReset, onClose }: ISettingsModalProps) {
  const { tr } = useI18n();
  const [activeTab, setActiveTab] = useState<SettingsTabId>('general');
  return (
    <ModalDialogShell
      titleId="settings-modal-title" testId="settings-modal" backdropClassName="bg-[#06080d]/86"
      panelClassName="bg-[#111620] border border-slate-700 rounded-lg p-5 shadow-2xl max-h-[92vh] overflow-y-auto"
      eyebrow={tr('Konfiguracja symulatora · Zapis automatyczny', 'Simulator Configuration · Auto-saved')}
      title={tr('Ustawienia', 'Settings')} onClose={onClose} closeAriaLabel={tr('Zamknij ustawienia', 'Close settings')}
    >
      <SettingsTabBar activeTab={activeTab} gamepadConnected={gamepadStatus.connected} onSelectTab={setActiveTab} />
      {activeTab === 'general' ? <GeneralSettingsTab settings={settings} onUpdate={onUpdate} /> : <GamepadSettingsTab settings={settings} gamepadStatus={gamepadStatus} onUpdate={onUpdate} />}
      <SettingsFooterActions onReset={onReset} onClose={onClose} />
    </ModalDialogShell>
  );
}
