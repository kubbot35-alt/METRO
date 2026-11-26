interface IControlsHelpModalProps {
  readonly onClose: () => void;
}

const SHORTCUTS: ReadonlyArray<{ readonly key: string; readonly action: string }> = [
  { key: 'W / S  lub  ↑ / ↓', action: 'Zwiększ / zmniejsz moc (nastawnik jazdy)' },
  { key: 'Spacja', action: 'Hamulec roboczy (płynne zwalnianie)' },
  { key: 'Suwak na pulpicie', action: 'Przeciągnij myszką/palcem w górę (moc) lub dół (hamulec)' },
  { key: 'B', action: 'Hamulec awaryjny' },
  { key: 'Q', action: 'Otwórz / zamknij drzwi LEWE (peron wyspowy)' },
  { key: 'E', action: 'Otwórz / zamknij drzwi PRAWE (peron boczny)' },
  { key: 'O', action: 'Tryb Sandbox: automatyczna strona peronu' },
  { key: 'V', action: 'Zmiana kamery (Kabina · Lusterko · Zewnętrzna · Wnętrze wagonu)' },
  { key: 'F', action: 'Tryb Fotograficzny (stop-klatka, wolna kamera WASD/Q/E, filtry, PNG)' },
  { key: 'R', action: 'Potwierdzenie komunikatu radia dyspozytora (+40 pkt)' },
  { key: 'X', action: 'Wycieraczki przedniej szyby (włącz / wyłącz)' },
  { key: 'C', action: 'Potwierdzenie czuwaka (alarm bezpieczeństwa)' },
  { key: 'L', action: 'Reflektory przednie (włącz / wyłącz)' },
  { key: 'H', action: 'Klakson' },
  { key: 'M', action: 'Wyciszenie dźwięków' },
  { key: 'P / Esc', action: 'Pauza / wznowienie kursu i dostęp do Ustawień' },
  { key: 'Shift + R', action: 'Restart kursu od początku' },
];

export function ControlsHelpModal({ onClose }: IControlsHelpModalProps) {
  return (
    <div className="fixed inset-0 z-40 bg-[#06080d]/85 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="controls-help-title"
        data-testid="controls-help-modal"
        className="w-full max-w-lg bg-[#111620] border border-slate-700 rounded-lg p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-amber-400">
              Ściągawka maszynisty · Metro M1 / M2
            </p>
            <h2 id="controls-help-title" className="font-display text-2xl font-bold text-slate-50 mt-1">
              Sterowanie i skróty
            </h2>
          </div>
          <button
            type="button"
            aria-label="Zamknij pomoc"
            onClick={onClose}
            className="w-8 h-8 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono-tabular text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="divide-y divide-slate-800/90 border border-slate-800 rounded-md bg-[#0a0d13] mb-5">
          {SHORTCUTS.map((item) => (
            <div key={item.key} className="px-3.5 py-2 flex items-center justify-between gap-4 text-xs">
              <span className="font-mono-tabular font-semibold text-amber-300 whitespace-nowrap">
                {item.key}
              </span>
              <span className="text-slate-200 text-right">{item.action}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold rounded-md cursor-pointer"
        >
          Wróć do symulatora
        </button>
      </div>
    </div>
  );
}
