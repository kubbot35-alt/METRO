import { GAMEPAD_BUTTON_MAPPINGS } from '../../domain/gamepadMapping';
import { localizeGamepadAction } from '../../domain/i18nDynamic';
import type { IGamepadStatus, IGameSettings } from '../../domain/types';
import { useI18n } from '../../i18n/LanguageContext';
import { ToggleSwitchButton } from '../shared/ModalUiPrimitives';

interface IGamepadSettingsTabProps {
  readonly settings: IGameSettings;
  readonly gamepadStatus: IGamepadStatus;
  readonly onUpdate: (partial: Partial<IGameSettings>) => void;
}

function GamepadMappingTable() {
  const { lang, tr } = useI18n();
  return (
    <section className="rounded-md border border-slate-800 bg-[#0a0d13] p-3.5">
      <h3 className="text-xs font-mono-tabular uppercase tracking-[0.16em] text-amber-300 font-bold mb-2.5">{tr('Mapowanie przycisków (Xbox / PlayStation)', 'Button Mapping (Xbox / PlayStation)')}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[11px] font-mono-tabular">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
              <th className="py-1.5 pr-2 font-semibold">{tr('Funkcja', 'Action')}</th><th className="py-1.5 px-2 font-semibold text-emerald-300">Xbox</th><th className="py-1.5 px-2 font-semibold text-sky-300">PlayStation</th><th className="py-1.5 pl-2 font-semibold text-slate-400">{tr('Klawiatura', 'Keyboard')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {GAMEPAD_BUTTON_MAPPINGS.map((row) => (
              <tr key={row.action}><td className="py-1.5 pr-2 text-slate-200">{localizeGamepadAction(lang, row.action)}</td><td className="py-1.5 px-2 text-emerald-200 font-semibold">{row.xbox}</td><td className="py-1.5 px-2 text-sky-200 font-semibold">{row.playstation}</td><td className="py-1.5 pl-2 text-slate-400">{row.keyboard}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function GamepadStatusSection({ settings, gamepadStatus, onUpdate }: IGamepadSettingsTabProps) {
  const { tr } = useI18n();
  const statusText = gamepadStatus.connected
    ? `${tr('Podłączono', 'Connected')}: ${gamepadStatus.name}`
    : tr('Nie wykryto kontrolera — podłącz pada Xbox/PlayStation i naciśnij dowolny przycisk.', 'No controller detected — connect an Xbox/PlayStation pad and press any button.');
  const badgeCls = gamepadStatus.connected ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200' : 'bg-slate-900 border-slate-700 text-slate-400';
  return (
    <section className="rounded-md border border-slate-800 bg-[#0a0d13] p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-mono-tabular uppercase tracking-[0.16em] text-sky-300 font-bold">{tr('Status kontrolera (Gamepad API)', 'Controller Status (Gamepad API)')}</h3>
          <p className="text-xs text-slate-200 mt-1" data-testid="gamepad-status-text">{statusText}</p>
        </div>
        <span className={`px-2.5 py-1 rounded text-[10px] font-mono-tabular font-bold uppercase whitespace-nowrap border ${badgeCls}`}>{gamepadStatus.connected ? tr('AKTYWNY', 'ACTIVE') : tr('BRAK PADA', 'NONE')}</span>
      </div>
      <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/90">
        <div>
          <p className="text-xs font-medium text-slate-200">{tr('Wibracje kontrolera (Force Feedback)', 'Controller Vibration (Force Feedback)')}</p>
          <p className="text-[11px] text-slate-400">{tr('Wibracje podczas ostrego hamowania, poślizgu kół i przejazdu przez rozjazdy (martwa strefa 0.1)', 'Rumble feedback during hard braking, wheel slip, and turnout crossings (0.1 deadzone)')}</p>
        </div>
        <ToggleSwitchButton checked={settings.gamepadVibration} ariaLabel={tr('Wibracje kontrolera', 'Controller vibration')} testId="toggle-gamepad-vibration" onLabel={tr('WŁĄCZONE', 'ON')} offLabel={tr('WYŁĄCZONE', 'OFF')} onToggle={() => onUpdate({ gamepadVibration: !settings.gamepadVibration })} />
      </div>
    </section>
  );
}

export function GamepadSettingsTab(props: IGamepadSettingsTabProps) {
  return (
    <div className="space-y-4" data-testid="gamepad-settings-panel">
      <GamepadStatusSection {...props} />
      <GamepadMappingTable />
    </div>
  );
}
