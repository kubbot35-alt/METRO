import { CHALLENGE_CATALOG, getChallengeSpec } from '../domain/challengeCatalog';
import { compileCustomLineSpec } from '../domain/customLines';
import { DRIVER_RANKS, getRankProgress } from '../domain/driverProfile';
import {
  getLocalizedChallenge,
  getLocalizedRank,
  getLocalizedTimeOfDay,
  getLocalizedTrain,
} from '../domain/i18nCatalog';
import { METRO_LINE_CATALOG } from '../domain/routeData';
import { TIME_OF_DAY_CATALOG } from '../domain/timeOfDayCatalog';
import { TRAIN_CATALOG } from '../domain/trainCatalog';
import type {
  ChallengeId,
  GameModeId,
  IChallengeSpec,
  ICustomLineDraft,
  IDriverProfileStats,
  IGamepadStatus,
  ILeaderboardEntry,
  IMetroLineSpec,
  ITimeOfDaySpec,
  ITrainModelSpec,
  MetroLineId,
  TimeOfDayId,
  TrainModelId,
  WeatherModeId,
} from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';
import { LeaderboardPanel } from './LeaderboardPanel';

interface ITitleOverlayProps {
  readonly activeLine: IMetroLineSpec;
  readonly customLines: readonly ICustomLineDraft[];
  readonly driverProfile: IDriverProfileStats;
  readonly gamepadStatus: IGamepadStatus;
  readonly selectedModelId: TrainModelId;
  readonly selectedTimeOfDayId: TimeOfDayId;
  readonly selectedWeatherMode: WeatherModeId;
  readonly selectedGameMode: GameModeId;
  readonly selectedChallengeId: ChallengeId;
  readonly leaderboard: readonly ILeaderboardEntry[];
  readonly achievementsUnlocked: number;
  readonly achievementsTotal: number;
  readonly onSelectLine: (lineId: MetroLineId) => void;
  readonly onOpenLineBuilder: () => void;
  readonly onEditCustomLine: (draft: ICustomLineDraft) => void;
  readonly onDeleteCustomLine: (id: string) => void;
  readonly onSelectModel: (modelId: TrainModelId) => void;
  readonly onSelectTimeOfDay: (timeOfDayId: TimeOfDayId) => void;
  readonly onSelectWeatherMode: (mode: WeatherModeId) => void;
  readonly onSelectGameMode: (mode: GameModeId) => void;
  readonly onSelectChallenge: (challengeId: ChallengeId) => void;
  readonly onOpenProfile: () => void;
  readonly onOpenAchievements: () => void;
  readonly onOpenSettings: () => void;
  readonly onToggleHelp: () => void;
  readonly onStartAcademy: () => void;
  readonly onStartPassengerAto: () => void;
  readonly onStart: () => void;
}

const MODE_OPTIONS: ReadonlyArray<{
  readonly id: GameModeId;
  readonly titlePl: string;
  readonly titleEn: string;
  readonly badgePl: string;
  readonly badgeEn: string;
  readonly descPl: string;
  readonly descEn: string;
}> = [
  {
    id: 'duty',
    titlePl: 'Tryb Służbowy',
    titleEn: 'Duty Mode',
    badgePl: 'REKORDY',
    badgeEn: 'RECORDS',
    descPl: 'Rozkład jazdy, punktacja, czuwak, losowe awarie i zapis w TOP 5.',
    descEn: 'Timetable, scoring, Czuwak vigilance, random faults, and TOP 5 records.',
  },
  {
    id: 'sandbox',
    titlePl: 'Wolna Jazda',
    titleEn: 'Sandbox',
    badgePl: 'BEZ KAR · ATO',
    badgeEn: 'NO PENALTY · ATO',
    descPl: 'Swobodna jazda bez kar, sterowanie semaforami i opcjonalny Autopilot [A].',
    descEn: 'Free driving without penalties, signal control, and optional ATO Autopilot [A].',
  },
  {
    id: 'challenge',
    titlePl: 'Wyzwania',
    titleEn: 'Challenges',
    badgePl: '4 SCENARIUSZE',
    badgeEn: '4 SCENARIOS',
    descPl: 'Scenariusze specjalne z osobnymi odznakami w Osiągnięciach.',
    descEn: 'Special scenarios with dedicated badges in Achievements.',
  },
];

export function TitleOverlay({
  activeLine,
  customLines,
  driverProfile,
  gamepadStatus,
  selectedModelId,
  selectedTimeOfDayId,
  selectedWeatherMode,
  selectedGameMode,
  selectedChallengeId,
  leaderboard,
  achievementsUnlocked,
  achievementsTotal,
  onSelectLine,
  onOpenLineBuilder,
  onEditCustomLine,
  onDeleteCustomLine,
  onSelectModel,
  onSelectTimeOfDay,
  onSelectWeatherMode,
  onSelectGameMode,
  onSelectChallenge,
  onOpenProfile,
  onOpenAchievements,
  onOpenSettings,
  onToggleHelp,
  onStartAcademy,
  onStartPassengerAto,
  onStart,
}: ITitleOverlayProps) {
  const { lang, setLanguage, tr } = useI18n();
  const activeChallengeRaw = getChallengeSpec(selectedChallengeId);
  const activeChallenge = getLocalizedChallenge(lang, activeChallengeRaw.id, activeChallengeRaw);
  const rankProgress = getRankProgress(driverProfile.xp);
  const currentRankLoc = getLocalizedRank(lang, rankProgress.currentRank.id, rankProgress.currentRank);
  const nextRankLoc = rankProgress.nextRank
    ? getLocalizedRank(lang, rankProgress.nextRank.id, rankProgress.nextRank)
    : null;
  const rankIndex = DRIVER_RANKS.findIndex((r) => r.id === rankProgress.currentRank.id) + 1;
  const activeBadge = activeLine.badgeCode ?? activeLine.id;
  const compiledCustomLines = customLines.map((draft) => ({
    draft,
    spec: compileCustomLineSpec(draft),
  }));

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 md:p-5 bg-gradient-to-r from-[#06090f]/94 via-[#06090f]/78 to-[#06090f]/45 overflow-y-auto">
      <div className="w-full max-w-6xl mx-auto my-auto pointer-events-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-5 items-start">
        <div className="min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <svg width="42" height="42" viewBox="0 0 56 56" fill="none" aria-hidden="true" className="shrink-0">
                <rect x="2" y="2" width="52" height="52" rx="10" fill="#111620" stroke="#e2e8f0" strokeWidth="2.5" />
                <path d="M12 41V15H19L28 29L37 15H44V41H37.5V26L28 40L18.5 26V41H12Z" fill="#f59e0b" />
                <rect x="12" y="45" width="32" height="3.5" fill={activeLine.cssColor} />
              </svg>
              <div className="min-w-0">
                <p
                  data-testid="title-route-subtitle"
                  className="text-[11px] font-mono-tabular tracking-[0.14em] uppercase truncate"
                  style={{ color: activeLine.cssColor }}
                >
                  {activeLine.name} · {activeLine.stations.length} {tr('Stacji', 'Stations')} · {activeLine.routeLabel}
                </p>
                <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-slate-50 leading-none mt-0.5">
                  METRO {activeBadge}
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <div
                role="group"
                aria-label={tr('Język interfejsu', 'Interface language')}
                data-testid="title-lang-toggle"
                className="flex items-center rounded-md border border-slate-600/90 bg-[#0c111b]/95 p-0.5 shrink-0"
              >
                <button
                  type="button"
                  data-testid="lang-toggle-pl"
                  aria-pressed={lang === 'pl'}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setLanguage('pl');
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-mono-tabular font-bold transition-colors cursor-pointer ${
                    lang === 'pl'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  PL
                </button>
                <button
                  type="button"
                  data-testid="lang-toggle-en"
                  aria-pressed={lang === 'en'}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setLanguage('en');
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-mono-tabular font-bold transition-colors cursor-pointer ${
                    lang === 'en'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  EN
                </button>
              </div>
              <button
                type="button"
                data-testid="title-profile-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onOpenProfile();
                }}
                className="px-2.5 py-1.5 rounded-md border border-emerald-500/60 bg-[#0d1d19]/95 hover:bg-emerald-950/70 text-xs font-mono-tabular text-emerald-200 font-semibold cursor-pointer whitespace-nowrap shrink-0"
              >
                {tr('Profil', 'Profile')}
              </button>
              <button
                type="button"
                data-testid="title-settings-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onOpenSettings();
                }}
                className="px-2.5 py-1.5 rounded-md border border-slate-600 bg-[#101622]/95 hover:bg-slate-800 text-xs font-mono-tabular text-slate-100 font-semibold cursor-pointer whitespace-nowrap shrink-0"
              >
                ⚙ {tr('Ustawienia', 'Settings')}
              </button>
              <button
                type="button"
                data-testid="title-achievements-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onOpenAchievements();
                }}
                className="px-2.5 py-1.5 rounded-md border border-amber-500/60 bg-[#18140d]/95 hover:bg-amber-950/70 text-xs font-mono-tabular text-amber-200 font-semibold cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <span>{tr('Osiągnięcia', 'Achievements')}</span>
                <span className="px-1.5 py-0.5 rounded-xs bg-amber-500/20 text-amber-300 text-[10px]">
                  {achievementsUnlocked}/{achievementsTotal}
                </span>
              </button>
              <button
                type="button"
                data-testid="title-help-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleHelp();
                }}
                className="px-2.5 py-1.5 rounded-md border border-slate-700 bg-[#0d1118]/90 hover:bg-slate-800 text-xs font-mono-tabular text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
              >
                ? {tr('Sterowanie', 'Controls')}
              </button>
            </div>
          </div>

          <div className="mb-2.5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-slate-400">
                {tr('1. Wybierz linię metra', '1. Select Metro Line')}
              </p>
              <button
                type="button"
                data-testid="open-line-builder-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onOpenLineBuilder();
                }}
                className="px-2 py-0.5 rounded border border-emerald-500/60 bg-emerald-500/15 hover:bg-emerald-500/25 text-[10px] font-mono-tabular font-bold text-emerald-200 cursor-pointer whitespace-nowrap"
              >
                {tr('+ Stwórz własną linię', '+ Create Custom Line')}
              </button>
            </div>
            <div
              className={`grid grid-cols-1 md:grid-cols-2 gap-2 ${
                compiledCustomLines.length > 2 ? 'max-h-[156px] overflow-y-auto pr-0.5' : ''
              }`}
            >
              {METRO_LINE_CATALOG.map((lineSpec) => (
                <LineSelectionCard
                  key={lineSpec.id}
                  spec={lineSpec}
                  selected={lineSpec.id === activeLine.id}
                  onSelect={() => onSelectLine(lineSpec.id)}
                />
              ))}
              {compiledCustomLines.map(({ draft, spec }) => (
                <LineSelectionCard
                  key={spec.id}
                  spec={spec}
                  selected={spec.id === activeLine.id}
                  onSelect={() => onSelectLine(spec.id)}
                  onEdit={() => onEditCustomLine(draft)}
                  onDelete={() => onDeleteCustomLine(draft.id)}
                />
              ))}
            </div>
          </div>

          <div className="mb-2.5">
            <p className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-slate-400 mb-1">
              {tr('2. Wybierz skład metra', '2. Select Train Model')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {TRAIN_CATALOG.map((spec) => (
                <TrainSelectionCard
                  key={spec.id}
                  spec={spec}
                  selected={spec.id === selectedModelId}
                  onSelect={() => onSelectModel(spec.id)}
                />
              ))}
            </div>
          </div>

          <div className="mb-2.5">
            <p className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-slate-400 mb-1">
              {tr('3. Pora dnia i pogoda (STP Kabaty)', '3. Time of Day & Weather (STP Kabaty)')}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {TIME_OF_DAY_CATALOG.map((tod) => (
                <TimeOfDayCard
                  key={tod.id}
                  spec={tod}
                  selected={tod.id === selectedTimeOfDayId}
                  onSelect={() => onSelectTimeOfDay(tod.id)}
                />
              ))}
              <WeatherModeCard
                mode="clear"
                title={tr('Bez opadów', 'Clear')}
                badge={tr('SUCHO', 'DRY')}
                description={tr(
                  'Dobra widoczność i pełna przyczepność hamowania.',
                  'Clear visibility and full rail braking adhesion.',
                )}
                selected={selectedWeatherMode === 'clear'}
                onSelect={() => onSelectWeatherMode('clear')}
              />
              <WeatherModeCard
                mode="rain"
                title={tr('Deszcz', 'Rain')}
                badge={tr('MOKRO', 'WET')}
                description={tr(
                  'Opady na STP Kabaty, wycieraczki [X] i śliskie szyny (+20% hamowania).',
                  'Rain on STP Kabaty surface track, wipers [X], and slippery rails (+20% braking).',
                )}
                selected={selectedWeatherMode === 'rain'}
                onSelect={() => onSelectWeatherMode('rain')}
              />
            </div>
          </div>

          <div className="mb-2.5">
            <p className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-slate-400 mb-1">
              {tr('4. Tryb gry', '4. Game Mode')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {MODE_OPTIONS.map((opt) => {
                const selected = opt.id === selectedGameMode;
                const isSandbox = opt.id === 'sandbox';
                const isChallenge = opt.id === 'challenge';
                const cardClass = selected
                  ? isChallenge
                    ? 'border-fuchsia-400 bg-[#22122b]/95 shadow-lg'
                    : isSandbox
                      ? 'border-cyan-400 bg-[#0d1c26]/95 shadow-lg'
                      : 'border-emerald-400 bg-[#0e1f1a]/95 shadow-lg'
                  : 'border-slate-700/80 bg-[#0d1118]/90 hover:border-slate-500';
                return (
                  <button
                    key={opt.id}
                    type="button"
                    data-testid={`select-mode-${opt.id}`}
                    aria-pressed={selected}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onSelectGameMode(opt.id);
                    }}
                    className={`text-left rounded-lg border-2 p-2 transition-colors cursor-pointer flex flex-col gap-0.5 ${cardClass}`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-display text-sm font-bold text-slate-50">
                        {tr(opt.titlePl, opt.titleEn)}
                      </span>
                      <span
                        className={`text-[9px] font-mono-tabular font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${
                          selected
                            ? isChallenge
                              ? 'bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-400/50'
                              : isSandbox
                                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50'
                                : 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/50'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {tr(opt.badgePl, opt.badgeEn)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      {tr(opt.descPl, opt.descEn)}
                    </p>
                  </button>
                );
              })}
            </div>

            {selectedGameMode === 'challenge' && (
              <div
                data-testid="challenge-selector"
                className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2"
              >
                {CHALLENGE_CATALOG.map((challenge) => (
                  <ChallengeScenarioCard
                    key={challenge.id}
                    spec={challenge}
                    selected={challenge.id === selectedChallengeId}
                    onSelect={() => onSelectChallenge(challenge.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-start="true"
              onClick={(e) => {
                e.currentTarget.blur();
                onStart();
              }}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-display font-bold text-base tracking-wide rounded-md shadow-lg transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              {selectedGameMode === 'sandbox'
                ? tr(`Uruchom Wolną Jazdę (${activeBadge})`, `Start Sandbox (${activeBadge})`)
                : selectedGameMode === 'challenge'
                  ? tr(
                      `Start wyzwania: ${activeChallenge.title} (${activeBadge})`,
                      `Start Challenge: ${activeChallenge.title} (${activeBadge})`,
                    )
                  : tr(`Rozpocznij kurs (${activeBadge})`, `Start Course (${activeBadge})`)}
            </button>

            <button
              type="button"
              data-testid="start-passenger-ato-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onStartPassengerAto();
              }}
              className="px-4 py-2.5 bg-[#0e221b]/95 hover:bg-emerald-950/90 border-2 border-emerald-400/80 text-emerald-100 font-display font-bold text-sm tracking-wide rounded-md shadow-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap"
            >
              <span>{tr('Przejazd jako Pasażer', 'Passenger Ride')}</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200 text-[10px] font-mono-tabular">
                ATO
              </span>
            </button>

            <button
              type="button"
              data-testid="title-academy-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onStartAcademy();
              }}
              className="px-4 py-2.5 bg-[#0a1d2a]/95 hover:bg-cyan-950/90 border-2 border-cyan-400/80 text-cyan-100 font-display font-bold text-sm tracking-wide rounded-md shadow-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap"
            >
              <span>{tr('Samouczek / Akademia', 'Tutorial / Academy')}</span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200 text-[10px] font-mono-tabular">
                +250 XP
              </span>
            </button>
          </div>
        </div>

        <div className="lg:pt-1 space-y-3 min-w-0">
          <button
            type="button"
            data-testid="title-rank-widget"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenProfile();
            }}
            className="w-full text-left rounded-lg border border-slate-700/90 bg-[#0d121c]/95 hover:border-amber-400/70 p-3.5 shadow-lg transition-colors cursor-pointer"
          >
            <div className="flex items-start gap-2.5 mb-2">
              <span
                className="w-8 h-8 rounded font-display text-sm font-bold text-slate-950 flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: rankProgress.currentRank.badgeColor }}
              >
                {rankIndex}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[9.5px] font-mono-tabular uppercase tracking-[0.14em] text-slate-400">
                    {tr('Ranga maszynisty', 'Driver Rank')}
                  </p>
                  <span className="text-xs font-mono-tabular font-bold text-amber-300 whitespace-nowrap shrink-0">
                    {driverProfile.xp} XP
                  </span>
                </div>
                <p className="font-display text-base font-bold text-slate-50 leading-tight mt-0.5">
                  {currentRankLoc.title}
                </p>
                <p className="text-[10px] font-mono-tabular text-slate-400 mt-0.5">
                  {driverProfile.totalDistanceKm.toFixed(1)} km · {driverProfile.completedCourses}{' '}
                  {tr('kursów', 'runs')}
                </p>
              </div>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${Math.round(rankProgress.progressRatio * 100)}%`,
                  backgroundColor: rankProgress.currentRank.badgeColor,
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-2 text-[10px] font-mono-tabular text-slate-400 mt-1.5">
              <span className="truncate">
                {nextRankLoc
                  ? `${tr('Następna', 'Next')}: ${nextRankLoc.title}`
                  : tr('Maksymalny stopień', 'Max rank')}
              </span>
              <span className="text-emerald-300 whitespace-nowrap shrink-0">
                {tr('Profil →', 'Profile →')}
              </span>
            </div>
          </button>

          <LeaderboardPanel entries={leaderboard} />
        </div>
      </div>

      <div className="w-full flex items-center justify-center gap-3 mt-1.5 relative">
        <p className="text-xs font-mono-tabular text-slate-300 tracking-wide text-center bg-[#090b0f]/85 px-4 py-1.5 rounded border border-slate-800/80">
          {tr(
            'W / S Moc · Spacja Hamulec · B Awaryjny · Q / E Drzwi · A ATO · V Kamera · F Foto · R Radio · X Wycier. · C Czuwak · L Światła · K Kabina',
            'W / S Power · Space Brake · B E-Brake · Q / E Doors · A ATO · V Camera · F Photo · R Radio · X Wipers · C Czuwak · L Lights · K Cab',
          )}
        </p>
        {gamepadStatus.connected && (
          <div
            data-testid="gamepad-connected-badge"
            title={gamepadStatus.name}
            className="pointer-events-auto fixed bottom-4 right-4 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-sky-400/75 bg-[#091827]/95 text-sky-200 text-[11px] font-mono-tabular font-semibold shadow-lg"
          >
            <svg
              width="16"
              height="16"
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
            <span>{tr('Pad aktywny', 'Gamepad active')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ChallengeScenarioCard({
  spec,
  selected,
  onSelect,
}: {
  readonly spec: IChallengeSpec;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  const { lang } = useI18n();
  const loc = getLocalizedChallenge(lang, spec.id, spec);
  return (
    <button
      type="button"
      data-testid={`select-challenge-${spec.id}`}
      aria-pressed={selected}
      onClick={(e) => {
        e.currentTarget.blur();
        onSelect();
      }}
      className={`text-left rounded-lg border-2 p-2 transition-colors cursor-pointer flex flex-col gap-0.5 ${
        selected
          ? 'border-amber-400 bg-[#251a0f]/95 shadow-lg'
          : 'border-slate-700/80 bg-[#0d1118]/92 hover:border-fuchsia-400/60'
      }`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="font-display text-xs font-bold text-slate-50 leading-tight">
          {loc.title}
        </span>
        <span
          className={`text-[9px] font-mono-tabular font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${
            selected
              ? 'bg-amber-500/25 text-amber-200 border border-amber-400/60'
              : 'bg-slate-800 text-slate-300'
          }`}
        >
          {loc.badge}
        </span>
      </div>
      <p className="text-[10px] font-mono-tabular text-fuchsia-300">{loc.shortLabel}</p>
      <p className="text-[10px] text-slate-300 leading-snug line-clamp-2">{loc.description}</p>
    </button>
  );
}

function LineSelectionCard({
  spec,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: {
  readonly spec: IMetroLineSpec;
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly onEdit?: () => void;
  readonly onDelete?: () => void;
}) {
  const { tr } = useI18n();
  const badge = spec.badgeCode ?? spec.id;
  const activeStyles = selected
    ? 'bg-[#121a28]/95 shadow-lg'
    : 'border-slate-700/80 bg-[#0d1118]/90 hover:border-slate-500';

  return (
    <div
      className={`rounded-lg border-2 p-2 transition-colors flex flex-col gap-0.5 ${activeStyles}`}
      style={selected ? { borderColor: spec.cssColor } : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          data-testid={`select-line-${spec.id}`}
          aria-pressed={selected}
          onClick={(e) => {
            e.currentTarget.blur();
            onSelect();
          }}
          className="flex-1 text-left flex items-center justify-between gap-2 cursor-pointer min-w-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="px-2 py-0.5 rounded-xs font-mono-tabular text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: spec.cssColor }}
            >
              {badge}
            </span>
            <span className="font-display text-sm font-bold text-slate-50 truncate">{spec.name}</span>
          </div>
          <span className="text-[10px] font-mono-tabular text-slate-300 shrink-0">
            {spec.stations.length} st. · {spec.destinationLed}
          </span>
        </button>
        {spec.isCustom && onEdit && onDelete && (
          <div className="flex items-center gap-1 shrink-0 ml-1">
            <button
              type="button"
              data-testid={`edit-custom-line-${spec.id}`}
              aria-label={`${tr('Edytuj', 'Edit')} ${spec.name}`}
              onClick={onEdit}
              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono-tabular text-slate-200 cursor-pointer"
            >
              {tr('Edytuj', 'Edit')}
            </button>
            <button
              type="button"
              data-testid={`delete-custom-line-${spec.id}`}
              aria-label={`${tr('Usuń', 'Delete')} ${spec.name}`}
              onClick={onDelete}
              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-red-900/80 text-[10px] font-mono-tabular text-red-300 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.currentTarget.blur();
          onSelect();
        }}
        className="text-left text-[11px] text-slate-300 leading-snug truncate cursor-pointer"
      >
        {spec.routeLabel}
        {spec.isCustom
          ? spec.hasSurfaceStart
            ? tr(' · Start naziemny', ' · Surface start')
            : tr(' · Własna trasa', ' · Custom line')
          : ''}
      </button>
    </div>
  );
}

function TrainSelectionCard({
  spec,
  selected,
  onSelect,
}: {
  readonly spec: ITrainModelSpec;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  const { lang, tr } = useI18n();
  const loc = getLocalizedTrain(lang, spec.id, spec);
  const isRetro = spec.visual.theme === 'retro';
  const isVarsovia = spec.visual.theme === 'varsovia';
  const activeStyles = selected
    ? isRetro
      ? 'border-emerald-400 bg-[#15221e]/95 shadow-lg'
      : isVarsovia
        ? 'border-cyan-400 bg-[#0d1c27]/95 shadow-lg'
        : 'border-amber-400 bg-[#121926]/95 shadow-lg'
    : 'border-slate-700/80 bg-[#0d1118]/90 hover:border-slate-500';

  return (
    <button
      type="button"
      data-testid={`select-train-${spec.id}`}
      aria-pressed={selected}
      onClick={(e) => {
        e.currentTarget.blur();
        onSelect();
      }}
      className={`text-left rounded-lg border-2 p-2 transition-colors cursor-pointer flex flex-col justify-between gap-1.5 ${activeStyles}`}
    >
      <div>
        <div className="flex items-center justify-between gap-1.5 mb-1">
          <span className="font-display text-sm font-bold text-slate-50 leading-none truncate">
            {spec.name}
          </span>
          <span
            className={`text-[9px] font-mono-tabular uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold shrink-0 whitespace-nowrap ${
              selected
                ? isRetro
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
                  : isVarsovia
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-400/50'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {selected ? tr('WYBRANY', 'SELECTED') : loc.subtitle}
          </span>
        </div>
        <p className="text-[10.5px] text-slate-300 leading-snug line-clamp-2">{loc.description}</p>
      </div>

      <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-700/60 font-mono-tabular text-[10px]">
        <div className="min-w-0">
          <span className="block text-[8.5px] uppercase text-slate-400">{tr('Masa', 'Mass')}</span>
          <span className="text-slate-100 font-semibold truncate block">{spec.massLabel}</span>
        </div>
        <div className="min-w-0">
          <span className="block text-[8.5px] uppercase text-slate-400">{tr('Rozruch', 'Launch')}</span>
          <span className="text-slate-100 font-semibold truncate block">{loc.accelLabel}</span>
        </div>
        <div className="min-w-0">
          <span className="block text-[8.5px] uppercase text-slate-400">{tr('Hamulce', 'Brakes')}</span>
          <span className="text-slate-100 font-semibold truncate block">{loc.brakeLabel}</span>
        </div>
      </div>
    </button>
  );
}

function TimeOfDayCard({
  spec,
  selected,
  onSelect,
}: {
  readonly spec: ITimeOfDaySpec;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  const { lang } = useI18n();
  const loc = getLocalizedTimeOfDay(lang, spec.id, spec);
  const isEvening = spec.id === 'evening';
  const isNightService = spec.id === 'night_service';
  const activeStyles = selected
    ? isNightService
      ? 'border-orange-400 bg-[#21130b]/95 shadow-lg'
      : isEvening
        ? 'border-sky-400 bg-[#101929]/95 shadow-lg'
        : 'border-amber-400 bg-[#20190f]/95 shadow-lg'
    : 'border-slate-700/80 bg-[#0d1118]/90 hover:border-slate-500';

  return (
    <button
      type="button"
      data-testid={`select-tod-${spec.id}`}
      aria-pressed={selected}
      onClick={(e) => {
        e.currentTarget.blur();
        onSelect();
      }}
      className={`text-left rounded-lg border-2 p-2 transition-colors cursor-pointer flex flex-col gap-0.5 ${activeStyles}`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="font-display text-xs xl:text-sm font-bold text-slate-50 leading-tight truncate">
          {loc.name}
        </span>
        <span
          className={`text-[10px] font-mono-tabular font-bold px-1.5 py-0.5 rounded shrink-0 ${
            selected
              ? isNightService
                ? 'bg-orange-500/25 text-orange-200 border border-orange-400/60'
                : isEvening
                  ? 'bg-sky-500/20 text-sky-200 border border-sky-400/50'
                  : 'bg-amber-500/20 text-amber-200 border border-amber-400/50'
              : 'bg-slate-800 text-slate-300'
          }`}
        >
          {spec.clockLabel}
        </span>
      </div>
      <p className="text-[10px] text-slate-300 leading-snug line-clamp-2">{loc.description}</p>
    </button>
  );
}

function WeatherModeCard({
  mode,
  title,
  badge,
  description,
  selected,
  onSelect,
}: {
  readonly mode: WeatherModeId;
  readonly title: string;
  readonly badge: string;
  readonly description: string;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  const isRain = mode === 'rain';
  const activeStyles = selected
    ? isRain
      ? 'border-cyan-400 bg-[#0d1c27]/95 shadow-lg'
      : 'border-amber-400 bg-[#20190f]/95 shadow-lg'
    : 'border-slate-700/80 bg-[#0d1118]/90 hover:border-slate-500';

  return (
    <button
      type="button"
      data-testid={`select-weather-${mode}`}
      aria-pressed={selected}
      onClick={(e) => {
        e.currentTarget.blur();
        onSelect();
      }}
      className={`text-left rounded-lg border-2 p-2 transition-colors cursor-pointer flex flex-col gap-0.5 ${activeStyles}`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="font-display text-sm font-bold text-slate-50">{title}</span>
        <span
          className={`text-[10px] font-mono-tabular font-bold px-1.5 py-0.5 rounded ${
            selected
              ? isRain
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50'
                : 'bg-amber-500/20 text-amber-200 border border-amber-400/50'
              : 'bg-slate-800 text-slate-300'
          }`}
        >
          {badge}
        </span>
      </div>
      <p className="text-[10px] text-slate-300 leading-snug line-clamp-2">{description}</p>
    </button>
  );
}
