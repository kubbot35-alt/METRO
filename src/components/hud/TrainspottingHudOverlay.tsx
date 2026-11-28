import { buildTrainspottingSpots } from '../../domain/trainspottingSystem';
import type { ISimulationSnapshot, OncomingTrainMode, TrainModelId } from '../../domain/types';
import { useI18n } from '../../i18n/LanguageContext';

interface ITrainspottingHudOverlayProps {
  readonly snapshot: ISimulationSnapshot;
  readonly muted: boolean;
  readonly onSelectSpot: (spotIndex: number) => void;
  readonly onWalkStep: (deltaM: number) => void;
  readonly onEnterPhotoMode: () => void;
  readonly onToggleMute: () => void;
  readonly onReturnToTitle: () => void;
}

function formatModelLabel(id: TrainModelId): string {
  if (id === 'varsovia') return 'Varsovia';
  if (id === 'seria81') return 'Seria 81';
  return 'Inspiro';
}

function formatAiPhase(mode: OncomingTrainMode, doorsOpen: boolean, tr: (pl: string, en: string) => string): string {
  if (doorsOpen || mode === 'station-dwelling') return tr('Postój · Drzwi otwarte', 'Boarding · Doors open');
  if (mode === 'station-arriving') return tr('Wjazd na peron', 'Arriving');
  if (mode === 'station-departing') return tr('Odjazd ze stacji', 'Departing');
  return tr('W ruchu', 'Approaching');
}

function TrackTrafficBadge({
  trackLabel, active, modelId, mode, doorsOpen,
}: {
  readonly trackLabel: string; readonly active: boolean; readonly modelId: TrainModelId;
  readonly mode: OncomingTrainMode; readonly doorsOpen: boolean;
}) {
  const { tr } = useI18n();
  return (
    <div className="px-2.5 py-1 rounded border border-slate-700 bg-[#0d1420] text-[11px] font-mono-tabular flex items-center gap-2">
      <span className="font-bold text-amber-300">{trackLabel}</span>
      <span className="text-slate-100">{active ? formatModelLabel(modelId) : '—'}</span>
      <span className={doorsOpen ? 'text-emerald-300 font-bold' : 'text-sky-300'}>
        {active ? formatAiPhase(mode, doorsOpen, tr) : tr('Oczekiwanie…', 'Waiting…')}
      </span>
    </div>
  );
}

export function TrainspottingHudOverlay(props: ITrainspottingHudOverlayProps) {
  const { lang, tr } = useI18n();
  const { snapshot } = props;
  const spots = buildTrainspottingSpots(snapshot.line, snapshot.stations);
  const sp = snapshot.trainspotting;
  return (
    <>
      <div
        data-testid="trainspotting-top-bar"
        className="fixed top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-auto rounded-lg border border-amber-500/60 bg-[#090e17]/95 px-3 py-2 shadow-2xl flex flex-wrap items-center gap-2.5 max-w-[96vw]"
      >
        <span className="text-xs font-display font-bold uppercase tracking-wider text-amber-300">TRAINSPOTTING</span>
        <select
          data-testid="trainspotting-live-station-select"
          value={sp.spotIndex}
          onChange={(e) => { props.onSelectSpot(Number(e.target.value)); e.currentTarget.blur(); }}
          className="rounded border border-slate-600 bg-[#121a28] px-2 py-1 text-xs font-mono-tabular text-slate-100 cursor-pointer"
        >
          {spots.map((s, idx) => <option key={s.id} value={idx}>{lang === 'en' ? s.nameEn : s.namePl}</option>)}
        </select>
        <TrackTrafficBadge trackLabel="TOR 1" active={snapshot.leadingTrain.active} modelId={snapshot.leadingTrain.modelId} mode={snapshot.leadingTrain.mode} doorsOpen={snapshot.leadingTrain.doorsOpen} />
        <TrackTrafficBadge trackLabel="TOR 2" active={snapshot.oncomingTrain.active} modelId={snapshot.oncomingTrain.modelId} mode={snapshot.oncomingTrain.mode} doorsOpen={snapshot.oncomingTrain.doorsOpen} />
      </div>
      <div
        data-testid="trainspotting-bottom-dock"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto rounded-lg border border-slate-700 bg-[#090e17]/95 px-3 py-2 shadow-2xl flex flex-wrap items-center justify-center gap-2 max-w-[96vw]"
      >
        <button type="button" data-testid="spotting-walk-back" onClick={() => props.onWalkStep(-16)} className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono-tabular text-slate-100 cursor-pointer">◀ {tr('Tył peronu', 'Rear')}</button>
        <button type="button" data-testid="spotting-walk-center" onClick={() => props.onWalkStep(-sp.walkOffsetM)} className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono-tabular text-slate-100 cursor-pointer">{tr('Środek', 'Center')}</button>
        <button type="button" data-testid="spotting-walk-front" onClick={() => props.onWalkStep(16)} className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono-tabular text-slate-100 cursor-pointer">{tr('Czoło W4', 'Front W4')} ▶</button>
        <span className="text-[10px] font-mono-tabular text-slate-400 hidden sm:inline px-1">{tr('Przeciągnij myszką (rozglądanie) · W/S spacer', 'Drag to look · W/S walk')}</span>
        <button type="button" data-testid="spotting-photo-btn" onClick={props.onEnterPhotoMode} className="px-2.5 py-1 rounded bg-sky-500/20 border border-sky-400/60 text-sky-200 hover:bg-sky-500/35 text-xs font-mono-tabular font-bold cursor-pointer">{tr('Tryb Foto [F]', 'Photo [F]')}</button>
        <button type="button" onClick={props.onToggleMute} className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono-tabular text-slate-200 cursor-pointer">{props.muted ? tr('Dźwięk: WYŁ', 'Audio: OFF') : tr('Dźwięk: WŁ', 'Audio: ON')}</button>
        <button type="button" data-testid="spotting-menu-btn" onClick={props.onReturnToTitle} className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-xs font-mono-tabular font-bold text-slate-950 cursor-pointer">{tr('Menu', 'Menu')}</button>
      </div>
    </>
  );
}
