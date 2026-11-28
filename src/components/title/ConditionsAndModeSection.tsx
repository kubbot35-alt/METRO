import { CHALLENGE_CATALOG, getChallengeSpec } from '../../domain/challengeCatalog';
import { getLocalizedChallenge, getLocalizedTimeOfDay } from '../../domain/i18nCatalog';
import { TIME_OF_DAY_CATALOG } from '../../domain/timeOfDayCatalog';
import { buildTrainspottingSpots } from '../../domain/trainspottingSystem';
import type { ChallengeId, GameModeId, IChallengeSpec, IMetroLineSpec, ITimeOfDaySpec, TimeOfDayId, WeatherModeId } from '../../domain/types';
import { useI18n } from '../../i18n/LanguageContext';
import { PassengerAndSpottingPanel } from './PassengerAndSpottingPanel';

interface IConditionsAndModeSectionProps {
  readonly activeLine: IMetroLineSpec;
  readonly selectedTimeOfDayId: TimeOfDayId;
  readonly selectedWeatherMode: WeatherModeId;
  readonly selectedGameMode: GameModeId;
  readonly selectedChallengeId: ChallengeId;
  readonly trainspottingSpotIndex: number;
  readonly onSelectTimeOfDay: (id: TimeOfDayId) => void;
  readonly onSelectWeatherMode: (mode: WeatherModeId) => void;
  readonly onSelectGameMode: (mode: GameModeId) => void;
  readonly onSelectChallenge: (id: ChallengeId) => void;
  readonly onSelectTrainspottingSpot: (spotIndex: number) => void;
  readonly onStart: () => void;
  readonly onStartPassengerAto: () => void;
  readonly onStartAcademy: () => void;
}

const MODE_OPTIONS: ReadonlyArray<{ readonly id: GameModeId; readonly titlePl: string; readonly titleEn: string; readonly badgePl: string; readonly badgeEn: string; readonly descPl: string; readonly descEn: string }> = [
  { id: 'duty', titlePl: 'Tryb Służbowy', titleEn: 'Duty Mode', badgePl: 'REKORDY', badgeEn: 'RECORDS', descPl: 'Rozkład jazdy, punktacja, czuwak, losowe awarie i zapis w TOP 5.', descEn: 'Timetable, scoring, Czuwak vigilance, random faults, and TOP 5 records.' },
  { id: 'sandbox', titlePl: 'Wolna Jazda', titleEn: 'Sandbox', badgePl: 'BEZ KAR · ATO', badgeEn: 'NO PENALTY · ATO', descPl: 'Swobodna jazda bez kar, sterowanie semaforami i opcjonalny Autopilot [A].', descEn: 'Free driving without penalties, signal control, and optional ATO Autopilot [A].' },
  { id: 'challenge', titlePl: 'Wyzwania', titleEn: 'Challenges', badgePl: '4 SCENARIUSZE', badgeEn: '4 SCENARIOS', descPl: 'Scenariusze specjalne z osobnymi odznakami w Osiągnięciach.', descEn: 'Special scenarios with dedicated badges in Achievements.' },
  { id: 'passenger', titlePl: 'Pasażer / Spotting', titleEn: 'Passenger / Spotting', badgePl: 'ATO · PERON', badgeEn: 'ATO · PLATFORM', descPl: 'Jazda w 6-wagonowym składzie lub obserwacja pociągów AI na peronie.', descEn: 'Ride inside the 6-car train or watch live AI trains from any station platform.' },
];

function TimeOfDayCard({ spec, selected, onSelect }: { readonly spec: ITimeOfDaySpec; readonly selected: boolean; readonly onSelect: () => void }) {
  const { lang } = useI18n();
  const loc = getLocalizedTimeOfDay(lang, spec.id, spec);
  const style = selected
    ? spec.id === 'night_service' ? 'border-orange-400 bg-[#21130b]/95 shadow-lg' : spec.id === 'evening' ? 'border-sky-400 bg-[#101929]/95 shadow-lg' : 'border-amber-400 bg-[#20190f]/95 shadow-lg'
    : 'border-slate-700/80 bg-[#0d1118]/90 hover:border-slate-500';
  const badge = selected
    ? spec.id === 'night_service' ? 'bg-orange-500/25 text-orange-200 border border-orange-400/60' : spec.id === 'evening' ? 'bg-sky-500/20 text-sky-200 border border-sky-400/50' : 'bg-amber-500/20 text-amber-200 border border-amber-400/50'
    : 'bg-slate-800 text-slate-300';
  return (
    <button type="button" data-testid={`select-tod-${spec.id}`} aria-pressed={selected} onClick={(e) => { e.currentTarget.blur(); onSelect(); }} className={`text-left rounded-lg border-2 p-2 transition-colors cursor-pointer flex flex-col gap-0.5 ${style}`}>
      <div className="flex items-center justify-between gap-1.5"><span className="font-display text-xs xl:text-sm font-bold text-slate-50 leading-tight truncate">{loc.name}</span><span className={`text-[10px] font-mono-tabular font-bold px-1.5 py-0.5 rounded shrink-0 ${badge}`}>{spec.clockLabel}</span></div>
      <p className="text-[10px] text-slate-300 leading-snug line-clamp-2">{loc.description}</p>
    </button>
  );
}

function WeatherModeCard({ mode, title, badge, description, selected, onSelect }: { readonly mode: WeatherModeId; readonly title: string; readonly badge: string; readonly description: string; readonly selected: boolean; readonly onSelect: () => void }) {
  const style = selected
    ? mode === 'snow' ? 'border-sky-300 bg-[#101e30]/95 shadow-lg' : mode === 'rain' ? 'border-cyan-400 bg-[#0d1c27]/95 shadow-lg' : 'border-amber-400 bg-[#20190f]/95 shadow-lg'
    : 'border-slate-700/80 bg-[#0d1118]/90 hover:border-slate-500';
  const badgeStyle = selected
    ? mode === 'snow' ? 'bg-sky-400/25 text-sky-100 border border-sky-300/60' : mode === 'rain' ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50' : 'bg-amber-500/20 text-amber-200 border border-amber-400/50'
    : 'bg-slate-800 text-slate-300';
  return (
    <button type="button" data-testid={`select-weather-${mode}`} aria-pressed={selected} onClick={(e) => { e.currentTarget.blur(); onSelect(); }} className={`text-left rounded-lg border-2 p-2 transition-colors cursor-pointer flex flex-col gap-0.5 ${style}`}>
      <div className="flex items-center justify-between gap-1.5"><span className="font-display text-xs xl:text-sm font-bold text-slate-50 truncate">{title}</span><span className={`text-[9.5px] font-mono-tabular font-bold px-1.5 py-0.5 rounded shrink-0 ${badgeStyle}`}>{badge}</span></div>
      <p className="text-[10px] text-slate-300 leading-snug line-clamp-2">{description}</p>
    </button>
  );
}

function ChallengeScenarioCard({ spec, selected, onSelect }: { readonly spec: IChallengeSpec; readonly selected: boolean; readonly onSelect: () => void }) {
  const { lang } = useI18n();
  const loc = getLocalizedChallenge(lang, spec.id, spec);
  return (
    <button type="button" data-testid={`select-challenge-${spec.id}`} aria-pressed={selected} onClick={(e) => { e.currentTarget.blur(); onSelect(); }} className={`text-left rounded-lg border-2 p-2 transition-colors cursor-pointer flex flex-col gap-0.5 ${selected ? 'border-amber-400 bg-[#251a0f]/95 shadow-lg' : 'border-slate-700/80 bg-[#0d1118]/92 hover:border-fuchsia-400/60'}`}>
      <div className="flex items-center justify-between gap-1.5">
        <span className="font-display text-xs font-bold text-slate-50 leading-tight">{loc.title}</span>
        <span className={`text-[9px] font-mono-tabular font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${selected ? 'bg-amber-500/25 text-amber-200 border border-amber-400/60' : 'bg-slate-800 text-slate-300'}`}>{loc.badge}</span>
      </div>
      <p className="text-[10px] font-mono-tabular text-fuchsia-300">{loc.shortLabel}</p>
      <p className="text-[10px] text-slate-300 leading-snug line-clamp-2">{loc.description}</p>
    </button>
  );
}

function TimeAndWeatherGrid({ selectedTimeOfDayId, selectedWeatherMode, onSelectTimeOfDay, onSelectWeatherMode }: Pick<IConditionsAndModeSectionProps, 'selectedTimeOfDayId' | 'selectedWeatherMode' | 'onSelectTimeOfDay' | 'onSelectWeatherMode'>) {
  const { tr } = useI18n();
  return (
    <div className="mb-2.5">
      <p className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-slate-400 mb-1">{tr('3. Pora dnia i pogoda (STP Kabaty)', '3. Time of Day & Weather (STP Kabaty)')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {TIME_OF_DAY_CATALOG.map((tod) => <TimeOfDayCard key={tod.id} spec={tod} selected={tod.id === selectedTimeOfDayId} onSelect={() => onSelectTimeOfDay(tod.id)} />)}
        <WeatherModeCard mode="clear" title={tr('Bez opadów', 'Clear')} badge={tr('SUCHO', 'DRY')} description={tr('Dobra widoczność i pełna przyczepność hamowania.', 'Clear visibility and full rail braking adhesion.')} selected={selectedWeatherMode === 'clear'} onSelect={() => onSelectWeatherMode('clear')} />
        <WeatherModeCard mode="rain" title={tr('Deszcz', 'Rain')} badge={tr('MOKRO', 'WET')} description={tr('Opady na STP Kabaty, wycieraczki [X] i śliskie szyny (+20% hamowania).', 'Rain on STP Kabaty surface track, wipers [X], and slippery rails (+20% braking).')} selected={selectedWeatherMode === 'rain'} onSelect={() => onSelectWeatherMode('rain')} />
        <WeatherModeCard mode="snow" title={tr('Śnieg (Zima)', 'Snow (Winter)')} badge={tr('ZIMA · LÓD', 'SNOW · ICE')} description={tr('Śnieg na STP Kabaty, szron na szybie [X] i oblodzone szyny (+30% hamowania, 200 m w tunelu).', 'Winter snow at STP Kabaty, windshield frost [X], and icy rails (+30% braking, 200m into tunnel).')} selected={selectedWeatherMode === 'snow'} onSelect={() => onSelectWeatherMode('snow')} />
      </div>
    </div>
  );
}

function GameModeOptionCard({ opt, selected, onSelect }: { readonly opt: (typeof MODE_OPTIONS)[number]; readonly selected: boolean; readonly onSelect: () => void }) {
  const { tr } = useI18n();
  const style = selected ? (opt.id === 'challenge' ? 'border-fuchsia-400 bg-[#22122b]/95 shadow-lg' : opt.id === 'sandbox' ? 'border-cyan-400 bg-[#0d1c26]/95 shadow-lg' : 'border-emerald-400 bg-[#0e1f1a]/95 shadow-lg') : 'border-slate-700/80 bg-[#0d1118]/90 hover:border-slate-500';
  const badge = selected ? (opt.id === 'challenge' ? 'bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-400/50' : opt.id === 'sandbox' ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50' : 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/50') : 'bg-slate-800 text-slate-300';
  return (
    <button type="button" data-testid={`select-mode-${opt.id}`} aria-pressed={selected} onClick={(e) => { e.currentTarget.blur(); onSelect(); }} className={`text-left rounded-lg border-2 p-2 transition-colors cursor-pointer flex flex-col gap-0.5 ${style}`}>
      <div className="flex items-center justify-between gap-1.5"><span className="font-display text-sm font-bold text-slate-50">{tr(opt.titlePl, opt.titleEn)}</span><span className={`text-[9px] font-mono-tabular font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${badge}`}>{tr(opt.badgePl, opt.badgeEn)}</span></div>
      <p className="text-[11px] text-slate-300 leading-snug">{tr(opt.descPl, opt.descEn)}</p>
    </button>
  );
}

function GameModeSelectorBlock({ activeLine, selectedGameMode, selectedChallengeId, trainspottingSpotIndex, onSelectGameMode, onSelectChallenge, onSelectTrainspottingSpot }: Pick<IConditionsAndModeSectionProps, 'activeLine' | 'selectedGameMode' | 'selectedChallengeId' | 'trainspottingSpotIndex' | 'onSelectGameMode' | 'onSelectChallenge' | 'onSelectTrainspottingSpot'>) {
  const { tr } = useI18n();
  const isObserver = selectedGameMode === 'passenger' || selectedGameMode === 'trainspotting';
  return (
    <div className="mb-2.5">
      <p className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-slate-400 mb-1">{tr('4. Tryb gry', '4. Game Mode')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {MODE_OPTIONS.map((opt) => (
          <GameModeOptionCard key={opt.id} opt={opt} selected={opt.id === selectedGameMode || (opt.id === 'passenger' && isObserver)} onSelect={() => onSelectGameMode(opt.id)} />
        ))}
      </div>
      {selectedGameMode === 'challenge' && (
        <div data-testid="challenge-selector" className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {CHALLENGE_CATALOG.map((challenge) => <ChallengeScenarioCard key={challenge.id} spec={challenge} selected={challenge.id === selectedChallengeId} onSelect={() => onSelectChallenge(challenge.id)} />)}
        </div>
      )}
      {isObserver && (
        <PassengerAndSpottingPanel activeLine={activeLine} selectedGameMode={selectedGameMode} selectedSpotIndex={trainspottingSpotIndex} onSelectGameMode={onSelectGameMode} onSelectTrainspottingSpot={onSelectTrainspottingSpot} />
      )}
    </div>
  );
}

function TitleStartActionsRow({ startLabel, onStart, onStartPassengerAto, onStartAcademy }: { readonly startLabel: string; readonly onStart: () => void; readonly onStartPassengerAto: () => void; readonly onStartAcademy: () => void }) {
  const { tr } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" data-start="true" onClick={(e) => { e.currentTarget.blur(); onStart(); }} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-display font-bold text-base tracking-wide rounded-md shadow-lg transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">{startLabel}</button>
      <button type="button" data-testid="start-passenger-ato-btn" onClick={(e) => { e.currentTarget.blur(); onStartPassengerAto(); }} className="px-4 py-2.5 bg-[#0e221b]/95 hover:bg-emerald-950/90 border-2 border-emerald-400/80 text-emerald-100 font-display font-bold text-sm tracking-wide rounded-md shadow-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap">
        <span>{tr('Przejazd jako Pasażer', 'Passenger Ride')}</span><span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200 text-[10px] font-mono-tabular">ATO</span>
      </button>
      <button type="button" data-testid="title-academy-btn" onClick={(e) => { e.currentTarget.blur(); onStartAcademy(); }} className="px-4 py-2.5 bg-[#0a1d2a]/95 hover:bg-cyan-950/90 border-2 border-cyan-400/80 text-cyan-100 font-display font-bold text-sm tracking-wide rounded-md shadow-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap">
        <span>{tr('Samouczek / Akademia', 'Tutorial / Academy')}</span><span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200 text-[10px] font-mono-tabular">+250 XP</span>
      </button>
    </div>
  );
}

export function ConditionsAndModeSection(props: IConditionsAndModeSectionProps) {
  const { lang, tr } = useI18n();
  const activeChallengeRaw = getChallengeSpec(props.selectedChallengeId);
  const activeChallenge = getLocalizedChallenge(lang, activeChallengeRaw.id, activeChallengeRaw);
  const activeBadge = props.activeLine.badgeCode ?? props.activeLine.id;
  const spots = buildTrainspottingSpots(props.activeLine, props.activeLine.stations);
  const spot = spots[props.trainspottingSpotIndex] ?? spots[0];
  const startLabel = props.selectedGameMode === 'trainspotting'
    ? tr(`Start Trainspotting: ${spot?.namePl ?? activeBadge}`, `Start Trainspotting: ${spot?.nameEn ?? activeBadge}`)
    : props.selectedGameMode === 'passenger'
      ? tr(`Jedź jako Pasażer (${activeBadge})`, `Ride as Passenger (${activeBadge})`)
      : props.selectedGameMode === 'sandbox'
        ? tr(`Uruchom Wolną Jazdę (${activeBadge})`, `Start Sandbox (${activeBadge})`)
        : props.selectedGameMode === 'challenge'
          ? tr(`Start wyzwania: ${activeChallenge.title} (${activeBadge})`, `Start Challenge: ${activeChallenge.title} (${activeBadge})`)
          : tr(`Rozpocznij kurs (${activeBadge})`, `Start Course (${activeBadge})`);
  return (
    <>
      <TimeAndWeatherGrid selectedTimeOfDayId={props.selectedTimeOfDayId} selectedWeatherMode={props.selectedWeatherMode} onSelectTimeOfDay={props.onSelectTimeOfDay} onSelectWeatherMode={props.onSelectWeatherMode} />
      <GameModeSelectorBlock activeLine={props.activeLine} selectedGameMode={props.selectedGameMode} selectedChallengeId={props.selectedChallengeId} trainspottingSpotIndex={props.trainspottingSpotIndex} onSelectGameMode={props.onSelectGameMode} onSelectChallenge={props.onSelectChallenge} onSelectTrainspottingSpot={props.onSelectTrainspottingSpot} />
      <TitleStartActionsRow startLabel={startLabel} onStart={props.onStart} onStartPassengerAto={props.onStartPassengerAto} onStartAcademy={props.onStartAcademy} />
    </>
  );
}
