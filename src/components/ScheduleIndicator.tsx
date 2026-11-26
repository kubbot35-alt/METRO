import { formatClockTime, formatDeviationTime } from '../domain/scheduleSystem';
import type { IScheduleSnapshot, PunctualityStatus } from '../domain/types';

interface IScheduleIndicatorProps {
  readonly schedule: IScheduleSnapshot;
}

function getDeviationClasses(status: PunctualityStatus): string {
  if (status === 'heavy-delay') {
    return 'bg-red-950/90 border-red-500/75 text-red-300';
  }
  if (status === 'slight-delay') {
    return 'bg-amber-950/90 border-amber-500/75 text-amber-300';
  }
  return 'bg-emerald-950/90 border-emerald-500/70 text-emerald-300';
}

export function ScheduleIndicator({ schedule }: IScheduleIndicatorProps) {
  const clockText = formatClockTime(schedule.currentClockSec);
  const arrivalText = formatClockTime(schedule.nextArrivalClockSec);
  const deviationText = formatDeviationTime(schedule.deviationSec);

  return (
    <div
      data-testid="schedule-indicator"
      aria-label={`Zegar ${clockText}, rozkład ${arrivalText}, odchyłka ${deviationText}`}
      className="border-l border-slate-800 pl-3.5 flex flex-col gap-1 min-w-[148px]"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
          Czas
        </span>
        <span className="font-mono-tabular text-sm font-bold text-slate-100">
          {clockText}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
          Przyjazd
        </span>
        <span className="font-mono-tabular text-xs font-semibold text-amber-200">
          {arrivalText}
        </span>
      </div>

      <div
        className={`mt-0.5 px-2 py-0.5 rounded border text-xs font-mono-tabular font-bold flex items-center justify-between ${getDeviationClasses(schedule.status)}`}
      >
        <span className="text-[10px] uppercase tracking-wider opacity-85">Rozkład</span>
        <span>{deviationText}</span>
      </div>
    </div>
  );
}
