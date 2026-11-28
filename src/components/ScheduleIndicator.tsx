import { formatClockTime, formatDeviationTime } from '../domain/scheduleSystem';
import type { IScheduleSnapshot, PunctualityStatus } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';

interface IScheduleIndicatorProps {
  readonly schedule: IScheduleSnapshot;
}

function getDeviationClasses(status: PunctualityStatus): string {
  if (status === 'heavy-delay') return 'bg-red-950/90 border-red-500/75 text-red-300';
  if (status === 'slight-delay') return 'bg-amber-950/90 border-amber-500/75 text-amber-300';
  return 'bg-emerald-950/90 border-emerald-500/70 text-emerald-300';
}

function ScheduleTimeRow({ label, value, valueClassName }: { readonly label: string; readonly value: string; readonly valueClassName: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">{label}</span>
      <span className={`font-mono-tabular ${valueClassName}`}>{value}</span>
    </div>
  );
}

export function ScheduleIndicator({ schedule }: IScheduleIndicatorProps) {
  const { tr } = useI18n();
  const clockText = formatClockTime(schedule.currentClockSec);
  const arrivalText = formatClockTime(schedule.nextArrivalClockSec);
  const deviationText = formatDeviationTime(schedule.deviationSec);
  const ariaLabel = `${tr('Zegar', 'Clock')} ${clockText}, ${tr('rozkład', 'ETA')} ${arrivalText}, ${tr('odchyłka', 'delta')} ${deviationText}`;
  return (
    <div data-testid="schedule-indicator" aria-label={ariaLabel} className="border-l border-slate-800 pl-3.5 flex flex-col gap-1 min-w-[148px]">
      <ScheduleTimeRow label={tr('Czas', 'Time')} value={clockText} valueClassName="text-sm font-bold text-slate-100" />
      <ScheduleTimeRow label={tr('Przyjazd', 'Arrival')} value={arrivalText} valueClassName="text-xs font-semibold text-amber-200" />
      <div className={`mt-0.5 px-2 py-0.5 rounded border text-xs font-mono-tabular font-bold flex items-center justify-between ${getDeviationClasses(schedule.status)}`}>
        <span className="text-[10px] uppercase tracking-wider opacity-85">{tr('Rozkład', 'Timetable')}</span>
        <span>{deviationText}</span>
      </div>
    </div>
  );
}
