import { TIME_OF_DAY_CATALOG } from '../domain/timeOfDayCatalog';
import { TRAIN_CATALOG } from '../domain/trainCatalog';
import type {
  ILeaderboardEntry,
  ITimeOfDaySpec,
  ITrainModelSpec,
  TimeOfDayId,
  TrainModelId,
} from '../domain/types';
import { LeaderboardPanel } from './LeaderboardPanel';

interface ITitleOverlayProps {
  readonly selectedModelId: TrainModelId;
  readonly selectedTimeOfDayId: TimeOfDayId;
  readonly leaderboard: readonly ILeaderboardEntry[];
  readonly onSelectModel: (modelId: TrainModelId) => void;
  readonly onSelectTimeOfDay: (timeOfDayId: TimeOfDayId) => void;
  readonly onToggleHelp: () => void;
  readonly onStart: () => void;
}

function hexToCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

export function TitleOverlay({
  selectedModelId,
  selectedTimeOfDayId,
  leaderboard,
  onSelectModel,
  onSelectTimeOfDay,
  onToggleHelp,
  onStart,
}: ITitleOverlayProps) {
  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-5 md:p-8 bg-gradient-to-r from-[#06090f]/94 via-[#06090f]/78 to-[#06090f]/45 overflow-y-auto">
      <div className="w-full max-w-6xl mx-auto my-auto pointer-events-auto grid grid-cols-1 lg:grid-cols-[1.55fr_0.9fr] gap-6 items-start">
        <div>
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3.5">
              <svg
                width="48"
                height="48"
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
                <p className="text-[11px] font-mono-tabular tracking-[0.22em] text-amber-400 uppercase">
                  Linia M1 · 12 Stacji · Kabaty — Centrum
                </p>
                <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-slate-50 leading-none mt-1">
                  METRO M1
                </h1>
              </div>
            </div>

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

          <div className="mb-4">
            <p className="text-[11px] font-mono-tabular uppercase tracking-[0.18em] text-slate-400 mb-2">
              1. Wybierz skład metra
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

          <div className="mb-5">
            <p className="text-[11px] font-mono-tabular uppercase tracking-[0.18em] text-slate-400 mb-2">
              2. Pora dnia i natężenie ruchu
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStart();
            }}
            className="px-7 py-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-display font-bold text-base tracking-wide rounded-md shadow-lg transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            Rozpocznij kurs
          </button>
        </div>

        <div className="lg:pt-12">
          <LeaderboardPanel entries={leaderboard} />
        </div>
      </div>

      <div className="w-full flex justify-center mt-3">
        <p className="text-xs font-mono-tabular text-slate-300 tracking-wide text-center bg-[#090b0f]/85 px-4 py-1.5 rounded border border-slate-800/80">
          W / S Moc · Spacja Hamulec · B Awaryjny · O Drzwi · V Kamera · C Czuwak · L Światła · H Klakson · ? Pomoc
        </p>
      </div>
    </div>
  );
}

interface ITrainSelectionCardProps {
  readonly spec: ITrainModelSpec;
  readonly selected: boolean;
  readonly onSelect: () => void;
}

function TrainSelectionCard({ spec, selected, onSelect }: ITrainSelectionCardProps) {
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
      className={`text-left rounded-lg border-2 p-3.5 transition-colors cursor-pointer flex flex-col justify-between gap-2.5 ${activeStyles}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <span
              className="w-6 h-3 rounded-xs border border-white/20 shrink-0"
              style={{
                background: `linear-gradient(180deg, ${hexToCss(spec.visual.bodyHex)} 55%, ${hexToCss(spec.visual.stripeHex)} 55%)`,
              }}
              aria-hidden="true"
            />
            <span className="font-display text-base font-bold text-slate-50 leading-none">
              {spec.name}
            </span>
          </div>
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

        <p className="text-[11px] text-slate-300 leading-relaxed">{spec.description}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700/60 font-mono-tabular text-[11px]">
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

interface ITimeOfDayCardProps {
  readonly spec: ITimeOfDaySpec;
  readonly selected: boolean;
  readonly onSelect: () => void;
}

function TimeOfDayCard({ spec, selected, onSelect }: ITimeOfDayCardProps) {
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
      className={`text-left rounded-lg border-2 p-3 transition-colors cursor-pointer flex flex-col gap-1.5 ${activeStyles}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-sm font-bold text-slate-50">
          {spec.name}
        </span>
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
