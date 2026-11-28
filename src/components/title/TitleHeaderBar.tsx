import type { IMetroLineSpec } from '../../domain/types';
import { useI18n } from '../../i18n/LanguageContext';

interface ITitleHeaderBarProps {
  readonly activeLine: IMetroLineSpec;
  readonly achievementsUnlocked: number;
  readonly achievementsTotal: number;
  readonly onOpenProfile: () => void;
  readonly onOpenSettings: () => void;
  readonly onOpenAchievements: () => void;
  readonly onToggleHelp: () => void;
}

function LanguageToggleGroup() {
  const { lang, setLanguage, tr } = useI18n();
  return (
    <div role="group" aria-label={tr('Język interfejsu', 'Interface language')} data-testid="title-lang-toggle" className="flex items-center rounded-md border border-slate-600/90 bg-[#0c111b]/95 p-0.5 shrink-0">
      {(['pl', 'en'] as const).map((code) => (
        <button key={code} type="button" data-testid={`lang-toggle-${code}`} aria-pressed={lang === code} onClick={(e) => { e.currentTarget.blur(); setLanguage(code); }} className={`px-2 py-1 rounded text-[11px] font-mono-tabular font-bold transition-colors cursor-pointer ${lang === code ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'}`}>
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function TitleBrandLogo({ activeLine }: { readonly activeLine: IMetroLineSpec }) {
  const { tr } = useI18n();
  const activeBadge = activeLine.badgeCode ?? activeLine.id;
  return (
    <div className="flex items-center gap-3 min-w-0">
      <svg width="42" height="42" viewBox="0 0 56 56" fill="none" aria-hidden="true" className="shrink-0">
        <rect x="2" y="2" width="52" height="52" rx="10" fill="#111620" stroke="#e2e8f0" strokeWidth="2.5" />
        <path d="M12 41V15H19L28 29L37 15H44V41H37.5V26L28 40L18.5 26V41H12Z" fill="#f59e0b" />
        <rect x="12" y="45" width="32" height="3.5" fill={activeLine.cssColor} />
      </svg>
      <div className="min-w-0">
        <p data-testid="title-route-subtitle" className="text-[10.5px] font-mono-tabular tracking-[0.07em] uppercase truncate" style={{ color: activeLine.cssColor }}>
          {activeLine.name} · {activeLine.stations.length} {tr('Stacji', 'Stations')} · {activeLine.routeLabel}
        </p>
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-slate-50 leading-none mt-0.5">METRO {activeBadge}</h1>
      </div>
    </div>
  );
}

export function TitleHeaderBar({ activeLine, achievementsUnlocked, achievementsTotal, onOpenProfile, onOpenSettings, onOpenAchievements, onToggleHelp }: ITitleHeaderBarProps) {
  const { tr } = useI18n();
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
      <TitleBrandLogo activeLine={activeLine} />
      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        <LanguageToggleGroup />
        <button type="button" data-testid="title-profile-btn" onClick={(e) => { e.currentTarget.blur(); onOpenProfile(); }} className="px-2.5 py-1.5 rounded-md border border-emerald-500/60 bg-[#0d1d19]/95 hover:bg-emerald-950/70 text-xs font-mono-tabular text-emerald-200 font-semibold cursor-pointer whitespace-nowrap shrink-0">{tr('Profil', 'Profile')}</button>
        <button type="button" data-testid="title-settings-btn" onClick={(e) => { e.currentTarget.blur(); onOpenSettings(); }} className="px-2.5 py-1.5 rounded-md border border-slate-600 bg-[#101622]/95 hover:bg-slate-800 text-xs font-mono-tabular text-slate-100 font-semibold cursor-pointer whitespace-nowrap shrink-0">⚙ {tr('Ustawienia', 'Settings')}</button>
        <button type="button" data-testid="title-achievements-btn" onClick={(e) => { e.currentTarget.blur(); onOpenAchievements(); }} className="px-2.5 py-1.5 rounded-md border border-amber-500/60 bg-[#18140d]/95 hover:bg-amber-950/70 text-xs font-mono-tabular text-amber-200 font-semibold cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0">
          <span>{tr('Osiągnięcia', 'Achievements')}</span>
          <span className="px-1.5 py-0.5 rounded-xs bg-amber-500/20 text-amber-300 text-[10px]">{achievementsUnlocked}/{achievementsTotal}</span>
        </button>
        <button type="button" data-testid="title-help-btn" onClick={(e) => { e.currentTarget.blur(); onToggleHelp(); }} className="px-2.5 py-1.5 rounded-md border border-slate-700 bg-[#0d1118]/90 hover:bg-slate-800 text-xs font-mono-tabular text-slate-200 cursor-pointer whitespace-nowrap shrink-0">? {tr('Sterowanie', 'Controls')}</button>
      </div>
    </div>
  );
}
