import type { IGameSettings, LanguageId } from '../../domain/types';
import { useI18n } from '../../i18n/LanguageContext';
import { ToggleSwitchButton, VolumeSliderRow } from '../shared/ModalUiPrimitives';

interface ISettingsLanguageSectionProps {
  readonly language: LanguageId;
  readonly onSelectLanguage: (lang: LanguageId) => void;
}

interface ISettingsAudioSectionProps {
  readonly settings: IGameSettings;
  readonly onUpdate: (partial: Partial<IGameSettings>) => void;
}

const LANGUAGE_OPTIONS = [
  { id: 'pl', label: 'Polski (PL)' },
  { id: 'en', label: 'English (EN)' },
] as const;

export function SettingsLanguageSection({ language, onSelectLanguage }: ISettingsLanguageSectionProps) {
  const { tr } = useI18n();
  return (
    <section className="rounded-md border border-slate-800 bg-[#0a0d13] p-3.5 space-y-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-mono-tabular uppercase tracking-[0.16em] text-amber-300 font-bold">{tr('Język interfejsu i zapowiedzi', 'Interface & Announcer Language')}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">{tr('Zmienia wszystkie napisy oraz język lektora stacji (nazwy stacji pozostają warszawskie)', 'Switches all UI text and Web Speech announcements (Polish station names are preserved)')}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0" role="group" aria-label={tr('Język interfejsu', 'Interface language')}>
          {LANGUAGE_OPTIONS.map((opt) => (
            <button key={opt.id} type="button" data-testid={`settings-lang-${opt.id}`} aria-pressed={language === opt.id} onClick={() => onSelectLanguage(opt.id as LanguageId)} className={`px-3 py-1.5 rounded-md border text-xs font-mono-tabular font-bold cursor-pointer transition-colors ${language === opt.id ? 'bg-amber-500/25 border-amber-400 text-amber-200' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SettingsAudioSection({ settings, onUpdate }: ISettingsAudioSectionProps) {
  const { tr } = useI18n();
  return (
    <section className="rounded-md border border-slate-800 bg-[#0a0d13] p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-mono-tabular uppercase tracking-[0.16em] text-amber-300 font-bold">{tr('1. Dźwięk i mikser audio (Web Audio API)', '1. Audio & Volume Mixer (Web Audio API)')}</h3>
        <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/50 text-[9.5px] font-mono-tabular text-emerald-200">{tr('Limiter Anti-Clip aktywny', 'Anti-Clip Limiter Active')}</span>
      </div>
      <VolumeSliderRow id="setting-master-vol" testId="slider-master-volume" label={tr('Głośność główna (Master)', 'Master Volume')} value={settings.masterVolume} onChange={(v) => onUpdate({ masterVolume: v })} />
      <VolumeSliderRow id="setting-train-vol" testId="slider-train-volume" label={tr('Silniki i tory (falownik IGBT, stukot szyn, zakręty, pogłos tunelu)', 'Motors & Rails (IGBT inverter, rail joints, flange squeal, tunnel reverb)')} value={settings.trainVolume} onChange={(v) => onUpdate({ trainVolume: v })} />
      <VolumeSliderRow id="setting-voice-vol" testId="slider-voice-volume" label={tr('Zapowiedzi i Gong (SIP / Interkom PA)', 'Announcements & Chime (SIP / PA Intercom)')} value={settings.voiceVolume} onChange={(v) => onUpdate({ voiceVolume: v })} />
      <VolumeSliderRow id="setting-alerts-vol" testId="slider-alerts-volume" label={tr('Alarmy i Radio (Czuwak, SOP-2, ATP, syrena, dyspozytor)', 'Alerts & Radio (Czuwak, SOP-2, ATP, horn, dispatch)')} value={settings.alertsVolume ?? 0.9} onChange={(v) => onUpdate({ alertsVolume: v })} />
    </section>
  );
}

export function SettingsSafetySection({ settings, onUpdate }: ISettingsAudioSectionProps) {
  const { tr } = useI18n();
  return (
    <section className="rounded-md border border-slate-800 bg-[#0a0d13] p-3.5 space-y-2.5">
      <h3 className="text-xs font-mono-tabular uppercase tracking-[0.16em] text-amber-300 font-bold">{tr('4. System bezpieczeństwa SOP-2 (ATP)', '4. SOP-2 Safety System (ATP)')}</h3>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-200">{tr('Interwencja SOP-2 (Wł./Wył.)', 'SOP-2 Intervention (On/Off)')}</p>
          <p className="text-[11px] text-slate-400">{tr('Automatyczne hamowanie awaryjne po przekroczeniu limitu o >7 km/h przez 2,5 s (domyślnie WŁ. w Trybie Służbowym, WYŁ. w Sandboxie)', 'Automatic emergency braking when exceeding limit by >7 km/h for 2.5 s (ON by default in Duty Mode, OFF in Sandbox)')}</p>
        </div>
        <ToggleSwitchButton checked={settings.sop2InterventionEnabled} ariaLabel={tr('Interwencja SOP-2', 'SOP-2 Intervention')} testId="toggle-sop2-intervention" onLabel={tr('WŁ.', 'ON')} offLabel={tr('WYŁ.', 'OFF')} onToggle={() => onUpdate({ sop2InterventionEnabled: !settings.sop2InterventionEnabled })} />
      </div>
    </section>
  );
}
