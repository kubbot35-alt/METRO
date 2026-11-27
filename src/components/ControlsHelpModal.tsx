import { useI18n } from '../i18n/LanguageContext';

interface IControlsHelpModalProps {
  readonly onClose: () => void;
}

interface IShortcutEntry {
  readonly keyPl: string;
  readonly keyEn: string;
  readonly actionPl: string;
  readonly actionEn: string;
}

const SHORTCUTS: readonly IShortcutEntry[] = [
  {
    keyPl: 'W / S  lub  ↑ / ↓',
    keyEn: 'W / S  or  ↑ / ↓',
    actionPl: 'Zwiększ / zmniejsz moc (nastawnik jazdy)',
    actionEn: 'Increase / decrease power (master controller)',
  },
  {
    keyPl: 'Spacja',
    keyEn: 'Space',
    actionPl: 'Hamulec roboczy (płynne zwalnianie)',
    actionEn: 'Service brake (smooth deceleration)',
  },
  {
    keyPl: 'Suwak na pulpicie',
    keyEn: 'Dashboard Slider',
    actionPl: 'Przeciągnij myszką/palcem w górę (moc) lub dół (hamulec)',
    actionEn: 'Drag mouse/thumb up (power) or down (brake)',
  },
  {
    keyPl: 'A',
    keyEn: 'A',
    actionPl: 'Autopilot ATO — automatyczne prowadzenie (Sandbox / Pasażer)',
    actionEn: 'ATO Autopilot — automatic train operation (Sandbox / Passenger)',
  },
  { keyPl: 'B', keyEn: 'B', actionPl: 'Hamulec awaryjny', actionEn: 'Emergency brake' },
  {
    keyPl: 'Q',
    keyEn: 'Q',
    actionPl: 'Otwórz / zamknij drzwi LEWE (peron wyspowy)',
    actionEn: 'Open / close LEFT doors (island platform)',
  },
  {
    keyPl: 'E',
    keyEn: 'E',
    actionPl: 'Otwórz / zamknij drzwi PRAWE (peron boczny)',
    actionEn: 'Open / close RIGHT doors (side platform)',
  },
  {
    keyPl: 'O',
    keyEn: 'O',
    actionPl: 'Tryb Sandbox: automatyczna strona peronu',
    actionEn: 'Sandbox mode: automatic platform side',
  },
  {
    keyPl: 'V',
    keyEn: 'V',
    actionPl: 'Zmiana kamery (Kabina · Lusterko · Zewn. · Wnętrze · Wózek · Peronowa)',
    actionEn: 'Cycle camera (Cab · Mirror · Exterior · Interior · Bogie · Station)',
  },
  {
    keyPl: 'M / Klik na monitor 3D',
    keyEn: 'M / Click 3D Monitor',
    actionPl: 'Powiększony podgląd CCTV (L/P/Wnętrze) w rogu ekranu',
    actionEn: 'Enlarged CCTV PiP monitor (L/R/Interior) in screen corner',
  },
  {
    keyPl: 'F',
    keyEn: 'F',
    actionPl: 'Tryb Fotograficzny (stop-klatka, wolna kamera WASD/Q/E, filtry, PNG)',
    actionEn: 'Photo Mode (freeze frame, free camera WASD/Q/E, filters, PNG)',
  },
  {
    keyPl: 'R',
    keyEn: 'R',
    actionPl: 'Potwierdzenie komunikatu radia dyspozytora (+40 pkt)',
    actionEn: 'Confirm dispatcher radio message (+40 pts)',
  },
  {
    keyPl: 'I',
    keyEn: 'I',
    actionPl: 'Interkom PA — ręczne komunikaty maszynisty dla pasażerów',
    actionEn: 'PA Intercom — manual driver announcements to passengers',
  },
  {
    keyPl: 'T',
    keyEn: 'T',
    actionPl: 'Zmiana kabiny na torze odstawczym (ciągły kurs powrotny)',
    actionEn: 'Switch cab on turnaround siding (continuous return trip)',
  },
  {
    keyPl: 'X',
    keyEn: 'X',
    actionPl: 'Wycieraczki przedniej szyby (włącz / wyłącz)',
    actionEn: 'Windshield wipers (on / off)',
  },
  {
    keyPl: 'C',
    keyEn: 'C',
    actionPl: 'Potwierdzenie czuwaka (alarm bezpieczeństwa)',
    actionEn: 'Acknowledge Czuwak vigilance alarm',
  },
  {
    keyPl: 'L',
    keyEn: 'L',
    actionPl: 'Reflektory przednie (Wył. → Krótkie → Długie)',
    actionEn: 'Front headlights (Off → Low → High beams)',
  },
  {
    keyPl: 'K',
    keyEn: 'K',
    actionPl: 'Lampka sufitowa w kabinie (włącz / wyłącz)',
    actionEn: 'Cab ceiling dome light (on / off)',
  },
  { keyPl: 'H', keyEn: 'H', actionPl: 'Klakson', actionEn: 'Horn' },
  { keyPl: 'Shift + M / U', keyEn: 'Shift + M / U', actionPl: 'Wyciszenie dźwięków', actionEn: 'Mute audio' },
  {
    keyPl: 'P / Esc',
    keyEn: 'P / Esc',
    actionPl: 'Pauza / wznowienie kursu i dostęp do Ustawień',
    actionEn: 'Pause / resume run and access Settings',
  },
  {
    keyPl: 'Shift + R',
    keyEn: 'Shift + R',
    actionPl: 'Restart kursu od początku',
    actionEn: 'Restart run from the beginning',
  },
];

export function ControlsHelpModal({ onClose }: IControlsHelpModalProps) {
  const { tr } = useI18n();

  return (
    <div className="fixed inset-0 z-40 bg-[#06080d]/85 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="controls-help-title"
        data-testid="controls-help-modal"
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-[#111620] border border-slate-700 rounded-lg p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-amber-400">
              {tr('Ściągawka maszynisty · Metro M1 / M2', 'Driver Reference · Metro M1 / M2')}
            </p>
            <h2 id="controls-help-title" className="font-display text-2xl font-bold text-slate-50 mt-1">
              {tr('Sterowanie i skróty', 'Controls & Shortcuts')}
            </h2>
          </div>
          <button
            type="button"
            aria-label={tr('Zamknij pomoc', 'Close help')}
            onClick={onClose}
            className="w-8 h-8 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono-tabular text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="divide-y divide-slate-800/90 border border-slate-800 rounded-md bg-[#0a0d13] mb-5">
          {SHORTCUTS.map((item) => (
            <div key={item.keyPl} className="px-3.5 py-2 flex items-center justify-between gap-4 text-xs">
              <span className="font-mono-tabular font-semibold text-amber-300 whitespace-nowrap">
                {tr(item.keyPl, item.keyEn)}
              </span>
              <span className="text-slate-200 text-right">{tr(item.actionPl, item.actionEn)}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold rounded-md cursor-pointer"
        >
          {tr('Wróć do symulatora', 'Back to Simulator')}
        </button>
      </div>
    </div>
  );
}
