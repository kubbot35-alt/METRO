import type { GamepadBrand } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';

interface IGamepadToastProps {
  readonly toast: { readonly name: string; readonly brand: GamepadBrand } | null;
}

export function GamepadToast({ toast }: IGamepadToastProps) {
  const { tr } = useI18n();
  if (!toast) {
    return null;
  }
  const brandLabel =
    toast.brand === 'playstation'
      ? 'PlayStation'
      : toast.brand === 'xbox'
        ? 'Xbox'
        : tr('Standardowy', 'Standard');

  return (
    <div
      role="status"
      data-testid="gamepad-connected-toast"
      className="fixed top-4 right-4 z-50 pointer-events-none flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border-2 border-sky-400 bg-[#081726]/96 shadow-2xl max-w-sm"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-sky-300 shrink-0"
        aria-hidden="true"
      >
        <rect x="2" y="6" width="20" height="12" rx="4" />
        <path d="M6 12h4M8 10v4M15 11h.01M18 13h.01" />
      </svg>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-display text-xs font-bold uppercase tracking-wide text-sky-200">
            {tr('Podłączono kontroler', 'Controller Connected')}
          </p>
          <span className="px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/50 text-[9px] font-mono-tabular font-bold text-sky-200">
            {brandLabel}
          </span>
        </div>
        <p className="text-[11px] font-mono-tabular text-slate-300 truncate mt-0.5">
          {toast.name}
        </p>
      </div>
    </div>
  );
}
