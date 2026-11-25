interface ITitleOverlayProps {
  readonly onStart: () => void;
}

export function TitleOverlay({ onStart }: ITitleOverlayProps) {
  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-8 md:p-12">
      <div className="max-w-lg pointer-events-auto">
        <div className="flex items-center gap-4 mb-5">
          <svg
            width="56"
            height="56"
            viewBox="0 0 56 56"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <rect x="2" y="2" width="52" height="52" rx="10" fill="#111620" stroke="#e2e8f0" strokeWidth="2.5" />
            <path d="M12 41V15H19L28 29L37 15H44V41H37.5V26L28 40L18.5 26V41H12Z" fill="#f59e0b" />
            <rect x="12" y="45" width="32" height="3" fill="#10b981" />
          </svg>
          <div>
            <p className="text-xs font-mono-tabular tracking-[0.22em] text-amber-400 uppercase">
              Linia M1 · 5 Stacji · 3000 m
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-slate-50 leading-none mt-1">
              METRO M1
            </h1>
          </div>
        </div>

        <p className="text-base text-slate-200 leading-relaxed max-w-md mb-7">
          Symulator kabiny maszynisty. Kontroluj masę składu, przestrzegaj ograniczeń prędkości i zatrzymuj pociąg dokładnie w zielonej strefie na każdej stacji.
        </p>

        <button
          type="button"
          data-start="true"
          onClick={(e) => {
            e.currentTarget.blur();
            onStart();
          }}
          className="px-7 py-3.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-display font-bold text-base tracking-wide rounded-md shadow-lg transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        >
          Rozpocznij kurs
        </button>
      </div>

      <div className="w-full flex justify-center">
        <p className="text-xs md:text-sm font-mono-tabular text-slate-300 tracking-wide text-center bg-[#090b0f]/80 px-4 py-1.5 rounded">
          W / S Moc · Spacja Hamulec · B Awaryjny · O Drzwi · H Klakson · P Pauza
        </p>
      </div>
    </div>
  );
}
