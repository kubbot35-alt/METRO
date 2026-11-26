import { getMetroLineSpec, METRO_LINE_CATALOG } from '../domain/routeData';
import { TIME_OF_DAY_CATALOG } from '../domain/timeOfDayCatalog';
import { TRAIN_CATALOG } from '../domain/trainCatalog';
import type {
  GameModeId,
  ILeaderboardEntry,
  IMetroLineSpec,
  ITimeOfDaySpec,
  ITrainModelSpec,
  MetroLineId,
  TimeOfDayId,
  TrainModelId,
} from '../domain/types';
import { LeaderboardPanel } from './LeaderboardPanel';

interface ITitleOverlayProps {
  readonly selectedLineId: MetroLineId;
  readonly selectedModelId: TrainModelId;
  readonly selectedTimeOfDayId: TimeOfDayId;
  readonly selectedGameMode: GameModeId;
  readonly leaderboard: readonly ILeaderboardEntry[];
  readonly achievementsUnlocked: number;
  readonly achievementsTotal: number;
  readonly onSelectLine: (lineId: MetroLineId) => void;
  readonly onSelectModel: (modelId: TrainModelId) => void;
  readonly onSelectTimeOfDay: (timeOfDayId: TimeOfDayId) => void;
  readonly onSelectGameMode: (mode: GameModeId) => void;
  readonly onOpenAchievements: () => void;
  readonly onToggleHelp: () => void;
  readonly onStart: () => void;
}

const MODE_OPTIONS: ReadonlyArray<{
  readonly id: GameModeId;
  readonly title: string;
  readonly badge: string;
  readonly description: string;
}> = [
  {
    id: 'duty',
    title: 'Tryb Służbowy',
    badge: 'REKORDY',
    description: 'Rozkład jazdy, punktacja, czuwak, losowe awarie i zapis wyniku w TOP 5.',
  },
  {
    id: 'sandbox',
    title: 'Wolna Jazda (Sandbox)',
    badge: 'BEZ KAR',
    description: 'Brak kar, czuwaka i awarii. Ręczne wywoływanie mijanek oraz zmiana semaforów.',
  },
];

export function TitleOverlay({
  selectedLineId,
  selectedModelId,
  selectedTimeOfDayId,
  selectedGameMode,
  leaderboard,
  achievementsUnlocked,
  achievementsTotal,
  onSelectLine,
  onSelectModel,
  onSelectTimeOfDay,
  onSelectGameMode,
  onOpenAchievements,
  onToggleHelp,
  onStart,
}: ITitleOverlayProps) {
  const activeLine = getMetroLineSpec(selectedLineId);
  const isM2 = activeLine.id === 'M2';

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 md:p-5 bg-gradient-to-r from-[#06090f]/94 via-[#06090f]/78 to-[#06090f]/45 overflow-y-auto">
      <div className="w-full max-w-6xl mx-auto my-auto pointer-events-auto grid grid-cols-1 lg:grid-cols-[1.62fr_0.86fr] gap-5 items-start">
        <div>
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-3">
              <svg width="42" height="42" viewBox="0 0 56 56" fill="none" aria-hidden="true" className="shrink-0">
                <rect x="2" y="2" width="52" height="52" rx="10" fill="#111620" stroke="#e2e8f0" strokeWidth="2.5" />
                <path d="M12 41V15H19L28 29L37 15H44V41H37.5V26L28 40L18.5 26V41H12Z" fill="#f59e0b" />
                <rect x="12" y="45" width="32" height="3.5" fill={activeLine.cssColor} />
              </svg>
              <div>
                <p
                  data-testid="title-route-subtitle"
                  className={`text-[11px] font-mono-tabular tracking-[0.16em] uppercase ${
                    isM2 ? 'text-red-400' : 'text-blue-400'
                  }`}
                >
                  {activeLine.name} · {activeLine.stations.length} Stacji · {activeLine.routeLabel}
                </p>
                <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-slate-50 leading-none mt-0.5">
                  METRO {activeLine.id}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="title-achievements-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onOpenAchievements();
                }}
                className="px-3 py-1.5 rounded-md border border-amber-500/60 bg-[#18140d]/95 hover:bg-amber-950/70 text-xs font-mono-tabular text-amber-200 font-semibold cursor-pointer flex items-center gap-1.5"
              >
                <span>Osiągnięcia</span>
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
                className="px-3 py-1.5 rounded-md border border-slate-700 bg-[#0d1118]/90 hover:bg-slate-800 text-xs font-mono-tabular text-slate-200 cursor-pointer"
              >
                ? Sterowanie
              </button>
            </div>
          </div>

          <div className="mb-2.5">
            <p className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-slate-400 mb-1">
              1. Wybierz linię metra
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {METRO_LINE_CATALOG.map((lineSpec) => (
                <LineSelectionCard
                  key={lineSpec.id}
                  spec={lineSpec}
                  selected={lineSpec.id === selectedLineId}
                  onSelect={() => onSelectLine(lineSpec.id)}
                />
              ))}
            </div>
          </div>

          <div className="mb-2.5">
            <p className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-slate-400 mb-1">
              2. Wybierz skład metra
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
              3. Pora dnia i natężenie ruchu
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {TIME_OF_DAY_CATALOG.map((tod) => (
                <TimeOfDayCard
                  key={tod.id}
                  spec={tod}
                  selected={tod.id === selectedTimeOfDayId}
                  onSelect={() => onSelectTimeOfDay(tod.id)}
                />
              ))}
            </div>
          </div>

          <div className="mb-3">
            <p className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-slate-400 mb-1">
              4. Tryb gry
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {MODE_OPTIONS.map((opt) => {
                const selected = opt.id === selectedGameMode;
                const isSandbox = opt.id === 'sandbox';
                const cardClass = selected
                  ? isSandbox
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
                    className={`text-left rounded-lg border-2 p-2.5 transition-colors cursor-pointer flex flex-col gap-0.5 ${cardClass}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-sm font-bold text-slate-50">
                        {opt.title}
                      </span>
                      <span
                        className={`text-[10px] font-mono-tabular font-bold px-1.5 py-0.5 rounded ${
                          selected
                            ? isSandbox
                              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50'
                              : 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/50'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">{opt.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStart();
            }}
            className="px-7 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-display font-bold text-base tracking-wide rounded-md shadow-lg transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            {selectedGameMode === 'sandbox'
              ? `Uruchom Wolną Jazdę (${activeLine.id})`
              : `Rozpocznij kurs (${activeLine.id})`}
          </button>
        </div>

        <div className="lg:pt-10">
          <LeaderboardPanel entries={leaderboard} />
        </div>
      </div>

      <div className="w-full flex justify-center mt-2">
        <p className="text-xs font-mono-tabular text-slate-300 tracking-wide text-center bg-[#090b0f]/85 px-4 py-1.5 rounded border border-slate-800/80">
          W / S Moc · Spacja Hamulec · B Awaryjny · Q / E Drzwi L/P · V Kamera · C Czuwak · L Światła · H Klakson · ? Pomoc
        </p>
      </div>
    </div>
  );
}

function LineSelectionCard({
  spec,
  selected,
  onSelect,
}: {
  readonly spec: IMetroLineSpec;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  const isM2 = spec.id === 'M2';
  const activeStyles = selected
    ? isM2
      ? 'border-red-500 bg-[#231015]/95 shadow-lg'
      : 'border-blue-500 bg-[#10192b]/95 shadow-lg'
    : 'border-slate-700/80 bg-[#0d1118]/90 hover:border-slate-500';
  const badgeColor = isM2 ? 'bg-red-600 text-white' : 'bg-blue-600 text-white';

  return (
    <button
      type="button"
      data-testid={`select-line-${spec.id}`}
      aria-pressed={selected}
      onClick={(e) => {
        e.currentTarget.blur();
        onSelect();
      }}
      className={`text-left rounded-lg border-2 p-2 transition-colors cursor-pointer flex flex-col gap-0.5 ${activeStyles}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-xs font-mono-tabular text-xs font-bold ${badgeColor}`}>
            {spec.id}
          </span>
          <span className="font-display text-sm font-bold text-slate-50">{spec.name}</span>
        </div>
        <span className="text-[10px] font-mono-tabular text-slate-300">
          {spec.stations.length} stacji · {spec.destinationLed}
        </span>
      </div>
      <p className="text-[11px] text-slate-300 leading-snug">{spec.routeLabel}</p>
    </button>
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
  const isRetro = spec.visual.theme === 'retro';
  const activeStyles = selected
    ? isRetro
      ? 'border-emerald-400 bg-[#15221e]/95 shadow-lg'
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
      className={`text-left rounded-lg border-2 p-2.5 transition-colors cursor-pointer flex flex-col justify-between gap-1.5 ${activeStyles}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-display text-sm font-bold text-slate-50 leading-none">
            {spec.name}
          </span>
          <span
            className={`text-[10px] font-mono-tabular uppercase tracking-wider px-2 py-0.5 rounded font-semibold ${
              selected
                ? isRetro
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-400/50'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {selected ? 'WYBRANY' : spec.subtitle}
          </span>
        </div>
        <p className="text-[11px] text-slate-300 leading-snug">{spec.description}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-slate-700/60 font-mono-tabular text-[11px]">
        <div>
          <span className="block text-[9px] uppercase text-slate-400">Masa</span>
          <span className="text-slate-100 font-semibold">{spec.massLabel}</span>
        </div>
        <div>
          <span className="block text-[9px] uppercase text-slate-400">Rozruch</span>
          <span className="text-slate-100 font-semibold">{spec.accelLabel}</span>
        </div>
        <div>
          <span className="block text-[9px] uppercase text-slate-400">Hamulce</span>
          <span className="text-slate-100 font-semibold">{spec.brakeLabel}</span>
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
  const isEvening = spec.id === 'evening';
  const activeStyles = selected
    ? isEvening
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
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-sm font-bold text-slate-50">{spec.name}</span>
        <span
          className={`text-[11px] font-mono-tabular font-bold px-2 py-0.5 rounded ${
            selected
              ? isEvening
                ? 'bg-sky-500/20 text-sky-200 border border-sky-400/50'
                : 'bg-amber-500/20 text-amber-200 border border-amber-400/50'
              : 'bg-slate-800 text-slate-300'
          }`}
        >
          {spec.clockLabel}
        </span>
      </div>
      <p className="text-[11px] text-slate-300 leading-snug">{spec.description}</p>
    </button>
  );
}
