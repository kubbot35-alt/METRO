import type { ISimulationSnapshot } from '../../domain/types';
import { useI18n } from '../../i18n/LanguageContext';
import { GhostDeltaBadge } from '../GhostDeltaBadge';
import type { IGhostDeltaSnapshot } from '../../domain/types';
import { SandboxControlsBar } from '../SandboxControlsBar';
import { getLocalizedChallenge } from '../../domain/i18nCatalog';

interface ITopHudLeftTelemetryProps {
  readonly snapshot: ISimulationSnapshot;
  readonly ghostDelta: IGhostDeltaSnapshot | null;
  readonly barClasses: string;
  readonly onSandboxSpawnTrain: () => void;
  readonly onSandboxCycleSignal: () => void;
}

function getTimeOfDayLabel(
  id: string,
  tr: (pl: string, en: string) => string,
): string {
  if (id === 'rush') {
    return tr('Szczyt', 'Rush');
  }
  return id === 'night_service' ? tr('Nocny Serwis', 'Night Service') : tr('Wieczór', 'Evening');
}

function HudMetricCell({
  label,
  value,
  valueClass,
  testId,
}: {
  readonly label: string;
  readonly value: string;
  readonly valueClass: string;
  readonly testId?: string;
}) {
  return (
    <div className="flex flex-col leading-tight" data-testid={testId}>
      <span className="text-[9px] sm:text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <span className={`font-mono-tabular font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

function NightInspectionBadge({ snapshot }: { readonly snapshot: ISimulationSnapshot }) {
  const { tr } = useI18n();
  const ni = snapshot.nightInspection;
  if (!ni.active) {
    return null;
  }
  return (
    <div
      data-testid="night-inspection-progress"
      className="mt-1.5 px-2.5 py-1 rounded-md border border-orange-400/75 bg-[#221309]/92 text-orange-100 text-[11px] font-mono-tabular font-bold flex items-center gap-2 shadow-lg"
    >
      <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse shrink-0" />
      <span>{tr('INSPEKCJA 02:30', 'NIGHT INSPECTION')} · {ni.passedCount}/{ni.totalCount}</span>
      {ni.violatedCount > 0 && (
        <span className="px-1.5 py-0.5 rounded bg-red-500/25 border border-red-400/60 text-red-200 text-[9.5px]">
          BHP: -{ni.violatedCount}
        </span>
      )}
    </div>
  );
}

function ChallengeObjectiveCard({ snapshot }: { readonly snapshot: ISimulationSnapshot }) {
  const { lang, tr } = useI18n();
  const challenge = snapshot.challenge;
  const localized = challenge ? getLocalizedChallenge(lang, challenge.id, challenge) : null;
  if (!localized) {
    return null;
  }
  return (
    <div
      data-testid="challenge-objective-bar"
      className="mt-1.5 px-3 py-1.5 rounded-md border border-fuchsia-400/70 bg-[#1d1026]/92 text-fuchsia-100 text-[11px] font-mono-tabular shadow-lg max-w-[360px]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold uppercase tracking-wider text-fuchsia-300">
          {tr('WYZWANIE', 'CHALLENGE')} · {localized.title}
        </span>
        <span className="px-1.5 py-0.5 rounded bg-fuchsia-500/20 border border-fuchsia-400/50 text-[9px] font-bold text-amber-200 whitespace-nowrap">
          {localized.badge}
        </span>
      </div>
      <p className="text-[10px] text-slate-200 mt-0.5 leading-snug">{localized.objectiveSummary}</p>
    </div>
  );
}

function TrainAndLegSummary({ snapshot }: { readonly snapshot: ISimulationSnapshot }) {
  const { tr } = useI18n();
  const legs = snapshot.turnaround.legsCompleted;
  return (
    <div className="hidden lg:flex flex-col leading-tight">
      <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
        {tr('Skład', 'Train')}
      </span>
      <span className="font-mono-tabular text-xs font-semibold text-slate-200 whitespace-nowrap">
        {snapshot.trainModel.name} · {getTimeOfDayLabel(snapshot.timeOfDay.id, tr)}
        {legs > 0 && (
          <span
            data-testid="return-leg-badge"
            className="ml-1.5 px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/70 text-cyan-200 text-[10px] font-bold"
          >
            {tr(`Kurs #${legs + 1}`, `Leg #${legs + 1}`)}
          </span>
        )}
      </span>
    </div>
  );
}

function PassengerAtoBadge({ active }: { readonly active: boolean }) {
  const { tr } = useI18n();
  if (!active) return null;
  return (
    <div data-testid="passenger-ato-badge" className="mt-1.5 px-2.5 py-1 rounded-md border border-emerald-400/75 bg-[#0b1f18]/92 text-emerald-200 text-[11px] font-mono-tabular font-bold flex items-center gap-2 shadow-lg">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
      <span>{tr('PRZEJAZD PASAŻERA · AUTOPILOT ATO', 'PASSENGER RIDE · ATO AUTOPILOT')}</span>
    </div>
  );
}

export function TopHudLeftTelemetry({ snapshot, ghostDelta, barClasses, onSandboxSpawnTrain, onSandboxCycleSignal }: ITopHudLeftTelemetryProps) {
  const { tr } = useI18n();
  const stationVal = `${snapshot.currentStation.stationIndex + 1} / ${snapshot.totalStations}`;
  return (
    <div className="flex flex-col items-start shrink-0">
      <div className={`${barClasses} border rounded-md px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-2 sm:gap-3`}>
        <HudMetricCell label={tr('Punkty', 'Score')} value={String(Math.round(snapshot.score))} valueClass="text-base sm:text-xl font-bold text-slate-50" />
        <div className="h-6 sm:h-7 w-px bg-slate-700/80" aria-hidden="true" />
        <HudMetricCell label={tr('Stacja', 'Station')} value={stationVal} valueClass="text-sm sm:text-base text-amber-300" />
        <div className="h-6 sm:h-7 w-px bg-slate-700/80" aria-hidden="true" />
        <HudMetricCell label={tr('Pasaż.', 'Pax')} value={String(snapshot.passengersCarried)} valueClass="text-sm sm:text-base text-emerald-300" testId="passengers-counter" />
        <div className="h-7 w-px bg-slate-700/80 hidden lg:block" aria-hidden="true" />
        <TrainAndLegSummary snapshot={snapshot} />
      </div>
      <GhostDeltaBadge delta={ghostDelta} />
      <NightInspectionBadge snapshot={snapshot} />
      <PassengerAtoBadge active={snapshot.gameMode === 'passenger'} />
      {snapshot.gameMode === 'sandbox' && (
        <SandboxControlsBar nextSignalAspect={snapshot.nextSignal?.signal.aspect} oncomingActive={snapshot.oncomingTrain.active} onSpawnOncoming={onSandboxSpawnTrain} onCycleSignal={onSandboxCycleSignal} />
      )}
      <ChallengeObjectiveCard snapshot={snapshot} />
    </div>
  );
}
