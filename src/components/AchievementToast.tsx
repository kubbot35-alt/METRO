import { getLocalizedAchievement } from '../domain/i18nCatalog';
import type { IAchievementToast } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';

interface IAchievementToastProps {
  readonly toast: IAchievementToast | null;
}

export function AchievementToast({ toast }: IAchievementToastProps) {
  const { lang, tr } = useI18n();
  if (!toast) {
    return null;
  }
  const loc = getLocalizedAchievement(lang, toast.spec.id, {
    title: toast.spec.title,
    description: toast.spec.description,
  });

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="achievement-toast"
      className="fixed top-16 right-4 z-30 pointer-events-none max-w-xs bg-[#111722] border-2 border-amber-400/85 rounded-lg px-3.5 py-2.5 shadow-2xl flex items-start gap-3"
    >
      <div
        className="w-8 h-8 rounded-md bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 shrink-0 mt-0.5"
        aria-hidden="true"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="12" cy="9" r="6" />
          <path d="M9 14.5L7.5 22l4.5-2.5L16.5 22 15 14.5" />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-mono-tabular uppercase tracking-widest text-amber-400 font-bold">
          {tr('Osiągnięcie odblokowane', 'Achievement Unlocked')}
        </p>
        <p className="font-display text-sm font-bold text-slate-50 leading-tight mt-0.5">
          {loc.title}
        </p>
        <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
          {loc.description}
        </p>
      </div>
    </div>
  );
}
