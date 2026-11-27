import {
  isPaBonusConditionMet,
  PA_ANNOUNCEMENT_SPECS,
  type IPaTriggerContext,
} from '../domain/paIntercomSystem';
import type { ISimulationSnapshot, PaAnnouncementId } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';

interface IPaIntercomPanelProps {
  readonly snapshot: ISimulationSnapshot;
  readonly onTriggerAnnouncement: (id: PaAnnouncementId) => void;
  readonly onClose: () => void;
}

export function PaIntercomPanel({
  snapshot,
  onTriggerAnnouncement,
  onClose,
}: IPaIntercomPanelProps) {
  const { tr } = useI18n();
  const { paIntercom } = snapshot;
  const cooldownActive = paIntercom.cooldownRemainingSec > 0;
  const ctx: IPaTriggerContext = {
    doorState: snapshot.doorState,
    boardingCompleted: snapshot.boardingCompletedForCurrent,
    timeOfDayId: snapshot.timeOfDay.id,
    speedKmh: snapshot.kinematics.speedKmh,
    nextSignal: snapshot.nextSignal,
    weatherMode: snapshot.weather.mode,
    stationIndex: snapshot.currentStation.stationIndex,
  };

  return (
    <aside
      aria-label={tr('Panel komunikatów maszynisty PA', 'Driver PA Intercom Panel')}
      data-testid="pa-intercom-panel"
      className="fixed bottom-36 right-3 sm:right-4 z-20 w-[332px] max-w-[calc(100vw-24px)] rounded-lg border border-cyan-500/60 bg-[#0b1320]/96 shadow-2xl p-3 text-slate-100"
    >
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
          <span className="font-mono-tabular text-[11px] font-bold uppercase tracking-wider text-cyan-200 truncate">
            {tr('Interkom PA · Komunikaty [I]', 'PA Intercom · Messages [I]')}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {cooldownActive && (
            <span className="text-[10px] font-mono-tabular text-amber-300 font-bold">
              {paIntercom.cooldownRemainingSec.toFixed(1)}s
            </span>
          )}
          <button
            type="button"
            aria-label={tr('Zamknij panel PA', 'Close PA panel')}
            onClick={(e) => {
              e.currentTarget.blur();
              onClose();
            }}
            className="w-6 h-6 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono-tabular cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {PA_ANNOUNCEMENT_SPECS.map((spec, idx) => {
          const bonusReady = isPaBonusConditionMet(spec.id, ctx);
          return (
            <button
              key={spec.id}
              type="button"
              data-testid={`pa-btn-${spec.id}`}
              disabled={cooldownActive}
              onClick={(e) => {
                e.currentTarget.blur();
                onTriggerAnnouncement(spec.id);
              }}
              className={`text-left rounded-md border px-2.5 py-2 transition-colors ${
                cooldownActive
                  ? 'bg-slate-900/75 border-slate-800 text-slate-500 cursor-not-allowed'
                  : bonusReady
                    ? 'bg-emerald-950/75 hover:bg-emerald-900/80 border-emerald-400/75 text-slate-50 cursor-pointer'
                    : 'bg-[#101929] hover:bg-slate-800 border-slate-700/80 text-slate-100 cursor-pointer'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono-tabular font-bold text-cyan-200">
                  {idx + 1}. {tr(spec.shortTitlePl, spec.shortTitleEn)}
                </span>
                {bonusReady && !cooldownActive && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/25 border border-emerald-400/70 text-emerald-200 text-[9px] font-mono-tabular font-bold uppercase whitespace-nowrap">
                    {tr('BONUS', 'BONUS')}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-200 mt-0.5 leading-snug">
                „{tr(spec.textPl, spec.textEn)}”
              </p>
              <p className="text-[9.5px] font-mono-tabular text-slate-400 mt-1">
                {tr(spec.effectHintPl, spec.effectHintEn)}
              </p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
