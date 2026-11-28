import { buildTrainspottingSpots } from '../../domain/trainspottingSystem';
import type { GameModeId, IMetroLineSpec } from '../../domain/types';
import { useI18n } from '../../i18n/LanguageContext';

interface IPassengerAndSpottingPanelProps {
  readonly activeLine: IMetroLineSpec;
  readonly selectedGameMode: GameModeId;
  readonly selectedSpotIndex: number;
  readonly onSelectGameMode: (mode: GameModeId) => void;
  readonly onSelectTrainspottingSpot: (spotIndex: number) => void;
}

export function PassengerAndSpottingPanel({
  activeLine,
  selectedGameMode,
  selectedSpotIndex,
  onSelectGameMode,
  onSelectTrainspottingSpot,
}: IPassengerAndSpottingPanelProps) {
  const { lang, tr } = useI18n();
  const spots = buildTrainspottingSpots(activeLine, activeLine.stations);
  const isSpotting = selectedGameMode === 'trainspotting';

  return (
    <div
      data-testid="passenger-spotting-panel"
      className="mt-2 rounded-lg border border-emerald-500/50 bg-[#0b1918]/95 p-2.5 flex flex-col gap-2"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          data-testid="submode-passenger"
          aria-pressed={!isSpotting}
          onClick={(e) => { e.currentTarget.blur(); onSelectGameMode('passenger'); }}
          className={`text-left rounded-md border px-2.5 py-2 transition-colors cursor-pointer ${!isSpotting ? 'border-emerald-400 bg-emerald-950/80 text-emerald-50' : 'border-slate-700 bg-[#0d131c] text-slate-300 hover:border-slate-500'}`}
        >
          <div className="text-xs font-display font-bold">{tr('Jazda jako pasażer (ATO)', 'Passenger Ride (ATO)')}</div>
          <div className="text-[10px] text-slate-300">{tr('6 wagonów, okna L/P, widok zza szyby kabiny i swobodne rozglądanie.', '6 cars, L/R windows, behind-cab glass view & free-look.')}</div>
        </button>
        <button
          type="button"
          data-testid="submode-trainspotting"
          aria-pressed={isSpotting}
          onClick={(e) => { e.currentTarget.blur(); onSelectGameMode('trainspotting'); }}
          className={`text-left rounded-md border px-2.5 py-2 transition-colors cursor-pointer ${isSpotting ? 'border-amber-400 bg-amber-950/60 text-amber-50' : 'border-slate-700 bg-[#0d131c] text-slate-300 hover:border-slate-500'}`}
        >
          <div className="text-xs font-display font-bold">{tr('Trainspotting (Obserwator na peronie)', 'Trainspotting (Platform Observer)')}</div>
          <div className="text-[10px] text-slate-300">{tr('Obserwuj żywy ruch składów AI na obu torach z dowolnej stacji lub STP Kabaty.', 'Watch live AI trains on both tracks from any station or STP Kabaty.')}</div>
        </button>
      </div>
      {isSpotting && (
        <label className="flex flex-wrap items-center gap-2 pt-0.5">
          <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-amber-300 shrink-0">
            {tr('Wybierz stację / punkt obserwacji:', 'Select observation station / spot:')}
          </span>
          <select
            data-testid="select-trainspotting-station"
            value={selectedSpotIndex}
            onChange={(e) => { onSelectTrainspottingSpot(Number(e.target.value)); e.currentTarget.blur(); }}
            className="flex-1 min-w-[200px] rounded border border-amber-500/60 bg-[#121926] px-2 py-1 text-xs font-mono-tabular text-slate-100 cursor-pointer focus:outline-none focus:border-amber-400"
          >
            {spots.map((spot, idx) => (
              <option key={spot.id} value={idx}>
                {lang === 'en' ? spot.nameEn : spot.namePl}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
