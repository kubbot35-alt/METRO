import { getLocalizedTrain } from '../../domain/i18nCatalog';
import { TRAIN_CATALOG } from '../../domain/trainCatalog';
import {
  getLiveriesForTrain,
  getRequiredRankTitle,
  isLiverySelectable,
  isLiveryUnlockedByRank,
} from '../../domain/trainLiveryCatalog';
import type {
  DriverRankId,
  GameModeId,
  ITrainLiverySpec,
  ITrainModelSpec,
  TrainLiveryId,
  TrainModelId,
} from '../../domain/types';
import { useI18n } from '../../i18n/LanguageContext';

interface ILiveryOptionButtonProps {
  readonly livery: ITrainLiverySpec;
  readonly selectedModelId: TrainModelId;
  readonly selectedLiveryId: TrainLiveryId;
  readonly currentRankId: DriverRankId;
  readonly selectedGameMode: GameModeId;
  readonly onSelectLivery: (id: TrainLiveryId) => void;
}

interface ITrainAndLiverySectionProps {
  readonly selectedModelId: TrainModelId;
  readonly selectedLiveryId: TrainLiveryId;
  readonly currentRankId: DriverRankId;
  readonly selectedGameMode: GameModeId;
  readonly onSelectModel: (modelId: TrainModelId) => void;
  readonly onSelectLivery: (liveryId: TrainLiveryId) => void;
}

function getTrainCardStyles(theme: ITrainModelSpec['visual']['theme'], selected: boolean): { card: string; badge: string } {
  if (!selected) return { card: 'border-slate-700/80 bg-[#0d1118]/90 hover:border-slate-500', badge: 'bg-slate-800 text-slate-400' };
  if (theme === 'retro') return { card: 'border-emerald-400 bg-[#15221e]/95 shadow-lg', badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50' };
  if (theme === 'varsovia') return { card: 'border-cyan-400 bg-[#0d1c27]/95 shadow-lg', badge: 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50' };
  return { card: 'border-amber-400 bg-[#121926]/95 shadow-lg', badge: 'bg-amber-500/20 text-amber-300 border border-amber-400/50' };
}

function TrainSelectionCard({ spec, selected, onSelect }: { readonly spec: ITrainModelSpec; readonly selected: boolean; readonly onSelect: () => void }) {
  const { lang, tr } = useI18n();
  const loc = getLocalizedTrain(lang, spec.id, spec);
  const styles = getTrainCardStyles(spec.visual.theme, selected);
  return (
    <button type="button" data-testid={`select-train-${spec.id}`} aria-pressed={selected} onClick={(e) => { e.currentTarget.blur(); onSelect(); }} className={`text-left rounded-lg border-2 p-2 transition-colors cursor-pointer flex flex-col justify-between gap-1.5 ${styles.card}`}>
      <div>
        <div className="flex items-center justify-between gap-1.5 mb-1">
          <span className="font-display text-sm font-bold text-slate-50 leading-none truncate">{spec.name}</span>
          <span className={`text-[9px] font-mono-tabular uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold shrink-0 whitespace-nowrap ${styles.badge}`}>{selected ? tr('WYBRANY', 'SELECTED') : loc.subtitle}</span>
        </div>
        <p className="text-[10.5px] text-slate-300 leading-snug line-clamp-2">{loc.description}</p>
      </div>
      <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-700/60 font-mono-tabular text-[10px]">
        <div className="min-w-0"><span className="block text-[8.5px] uppercase text-slate-400">{tr('Masa', 'Mass')}</span><span className="text-slate-100 font-semibold truncate block">{spec.massLabel}</span></div>
        <div className="min-w-0"><span className="block text-[8.5px] uppercase text-slate-400">{tr('Rozruch', 'Launch')}</span><span className="text-slate-100 font-semibold truncate block">{loc.accelLabel}</span></div>
        <div className="min-w-0"><span className="block text-[8.5px] uppercase text-slate-400">{tr('Hamulce', 'Brakes')}</span><span className="text-slate-100 font-semibold truncate block">{loc.brakeLabel}</span></div>
      </div>
    </button>
  );
}

function LiveryOptionButton({ livery, selectedModelId, selectedLiveryId, currentRankId, selectedGameMode, onSelectLivery }: ILiveryOptionButtonProps) {
  const { lang, tr } = useI18n();
  const unlockedByRank = isLiveryUnlockedByRank(livery.id, currentRankId);
  const selectable = isLiverySelectable(livery.id, selectedModelId, currentRankId, selectedGameMode);
  const isSelected = selectedLiveryId === livery.id;
  const reqTitle = getRequiredRankTitle(livery.requiredRankId, lang);
  const subtitle = unlockedByRank ? (lang === 'en' ? livery.subtitleEn : livery.subtitle) : selectedGameMode === 'sandbox' ? tr(`Podgląd (${reqTitle})`, `Preview (${reqTitle})`) : `${tr('Od rangi', 'Rank')}: ${reqTitle}`;
  const statusBadge = isSelected ? tr('AKTYWNE', 'ACTIVE') : unlockedByRank ? tr('ODBLOK.', 'READY') : selectedGameMode === 'sandbox' ? 'SANDBOX' : tr('ZABLOK.', 'LOCKED');
  const btnCls = isSelected ? 'border-amber-400 bg-[#231b0e]/95 text-slate-50 shadow' : selectable ? 'border-slate-700 bg-[#101622]/90 hover:border-slate-500 text-slate-200 cursor-pointer' : 'border-slate-800/80 bg-[#0a0e16]/70 text-slate-500 cursor-not-allowed';
  const badgeCls = isSelected ? 'bg-amber-500/25 text-amber-200 border border-amber-400/60' : unlockedByRank ? 'bg-emerald-500/15 text-emerald-300' : selectedGameMode === 'sandbox' ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50' : 'bg-slate-900 text-slate-400 border border-slate-700';
  return (
    <button type="button" data-testid={`select-livery-${livery.id}`} data-unlocked={unlockedByRank ? '1' : '0'} aria-pressed={isSelected} disabled={!selectable} onClick={(e) => { e.currentTarget.blur(); if (selectable) onSelectLivery(livery.id); }} title={unlockedByRank ? (lang === 'en' ? livery.subtitleEn : livery.subtitle) : `${tr('Wymagana ranga', 'Required rank')}: ${reqTitle}`} className={`text-left rounded-md border px-2.5 py-1.5 transition-colors flex items-center justify-between gap-2 ${btnCls}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex items-center -space-x-1 shrink-0" aria-hidden="true">{livery.swatchColors.map((hex, idx) => <span key={idx} className="w-3.5 h-3.5 rounded-full border border-slate-950" style={{ backgroundColor: hex }} />)}</span>
        <div className="min-w-0">
          <span className="block font-display text-xs font-bold truncate leading-tight">{lang === 'en' ? livery.nameEn : livery.name}</span>
          <span className="block text-[9.5px] font-mono-tabular text-slate-400 truncate">{subtitle}</span>
        </div>
      </div>
      <span className={`text-[8.5px] font-mono-tabular font-bold px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap ${badgeCls}`}>{statusBadge}</span>
    </button>
  );
}

export function TrainAndLiverySection({ selectedModelId, selectedLiveryId, currentRankId, selectedGameMode, onSelectModel, onSelectLivery }: ITrainAndLiverySectionProps) {
  const { tr } = useI18n();
  return (
    <div className="mb-2.5">
      <p className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-slate-400 mb-1">{tr('2. Wybierz skład metra i malowanie (Zajezdnia)', '2. Select Train Model & Livery (Depot)')}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {TRAIN_CATALOG.map((spec) => <TrainSelectionCard key={spec.id} spec={spec} selected={spec.id === selectedModelId} onSelect={() => onSelectModel(spec.id)} />)}
      </div>
      <div data-testid="train-livery-selector" className="mt-2 rounded-lg border border-slate-700/80 bg-[#0b1019]/95 px-2.5 py-2 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-amber-300 font-bold">{tr('Zajezdnia · Malowanie składu (Odblokowywane za rangi XP):', 'Depot · Train Livery (Unlocked by XP Rank):')}</span>
          {selectedGameMode === 'sandbox' && <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/60 text-cyan-200 text-[9px] font-mono-tabular font-bold">{tr('SANDBOX: PODGLĄD WSZYSTKICH MALOWAŃ', 'SANDBOX: ALL LIVERIES PREVIEWABLE')}</span>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {getLiveriesForTrain(selectedModelId).map((livery) => (
            <LiveryOptionButton key={livery.id} livery={livery} selectedModelId={selectedModelId} selectedLiveryId={selectedLiveryId} currentRankId={currentRankId} selectedGameMode={selectedGameMode} onSelectLivery={onSelectLivery} />
          ))}
        </div>
      </div>
    </div>
  );
}
