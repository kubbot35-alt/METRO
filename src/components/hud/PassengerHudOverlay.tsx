import {
  PASSENGER_CAR_COUNT,
  PASSENGER_SEAT_CATALOG,
  type IPassengerViewState,
  type PassengerSeatId,
} from '../../domain/passengerViewModel';
import { useI18n } from '../../i18n/LanguageContext';

interface IPassengerHudOverlayProps {
  readonly view: IPassengerViewState;
  readonly onSelectSeat: (seatId: PassengerSeatId) => void;
  readonly onSelectCar: (carIndex: number) => void;
  readonly onEnterPhotoMode: () => void;
}

export function PassengerHudOverlay({
  view,
  onSelectSeat,
  onSelectCar,
  onEnterPhotoMode,
}: IPassengerHudOverlayProps) {
  const { lang, tr } = useI18n();
  const carIndices = Array.from({ length: PASSENGER_CAR_COUNT }, (_, idx) => idx);
  return (
    <div
      data-testid="passenger-hud-dock"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto rounded-lg border border-emerald-500/60 bg-[#081217]/95 px-3 py-2 shadow-2xl flex flex-wrap items-center justify-center gap-2.5 max-w-[96vw]"
    >
      <div className="flex items-center gap-1">
        {PASSENGER_SEAT_CATALOG.map((seat) => {
          const active = seat.id === view.seatId;
          return (
            <button
              key={seat.id}
              type="button"
              data-testid={`passenger-seat-${seat.id}`}
              aria-pressed={active}
              onClick={(e) => { e.currentTarget.blur(); onSelectSeat(seat.id); }}
              className={`px-2.5 py-1 rounded text-xs font-mono-tabular font-bold transition-colors cursor-pointer whitespace-nowrap ${active ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
            >
              {lang === 'en' ? seat.labelEn : seat.labelPl}
            </button>
          );
        })}
      </div>
      {view.seatId !== 'behind_cab' && (
        <div className="flex items-center gap-1 border-l border-slate-700 pl-2.5">
          <span className="text-[10px] font-mono-tabular uppercase text-slate-400 mr-0.5">{tr('Wagon', 'Car')}:</span>
          {carIndices.map((idx) => (
            <button
              key={idx}
              type="button"
              data-testid={`passenger-car-${idx + 1}`}
              aria-pressed={view.carIndex === idx}
              onClick={(e) => { e.currentTarget.blur(); onSelectCar(idx); }}
              className={`w-6 h-6 rounded text-xs font-mono-tabular font-bold cursor-pointer ${view.carIndex === idx ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 border-l border-slate-700 pl-2.5">
        <span className="text-[10px] font-mono-tabular text-emerald-300 hidden sm:inline">
          {tr('Przeciągnij, by się rozglądać', 'Drag to look around')}
        </span>
        <button
          type="button"
          data-testid="passenger-photo-btn"
          onClick={(e) => { e.currentTarget.blur(); onEnterPhotoMode(); }}
          className="px-2 py-1 rounded bg-sky-500/20 border border-sky-400/60 text-sky-200 hover:bg-sky-500/35 text-[11px] font-mono-tabular font-bold cursor-pointer"
        >
          {tr('Foto [F]', 'Photo [F]')}
        </button>
      </div>
    </div>
  );
}
