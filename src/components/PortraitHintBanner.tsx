import { useI18n } from '../i18n/LanguageContext';

interface IPortraitHintBannerProps {
  readonly onDismiss: () => void;
}

export function PortraitHintBanner({ onDismiss }: IPortraitHintBannerProps) {
  const { tr } = useI18n();
  return (
    <div
      role="status"
      data-testid="portrait-hint-banner"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-1rem)] max-w-sm bg-[#0b1625]/96 border border-amber-400/80 rounded-lg px-3 py-2 shadow-2xl flex items-center justify-between gap-2.5"
    >
      <div className="flex items-center gap-2 min-w-0">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-amber-300 shrink-0"
          aria-hidden="true"
        >
          <rect x="6" y="3" width="12" height="18" rx="2" />
          <path d="M12 17h.01" />
          <path d="M2 12a10 10 0 014-8" />
          <path d="M22 12a10 10 0 01-4 8" />
        </svg>
        <p className="text-xs font-medium text-amber-100 leading-snug">
          {tr('Obróć telefon poziomo dla lepszego widoku', 'Rotate your phone to landscape for a better view')}
        </p>
      </div>
      <button
        type="button"
        aria-label={tr('Zamknij podpowiedź orientacji', 'Dismiss orientation hint')}
        data-testid="dismiss-portrait-hint"
        onClick={onDismiss}
        className="w-7 h-7 rounded border border-slate-600 bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-mono-tabular shrink-0 cursor-pointer"
      >
        ✕
      </button>
    </div>
  );
}
