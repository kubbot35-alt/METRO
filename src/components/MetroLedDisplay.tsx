import type { IAnnouncementState } from '../domain/types';

interface IMetroLedDisplayProps {
  readonly announcement: IAnnouncementState | null;
}

export function MetroLedDisplay({ announcement }: IMetroLedDisplayProps) {
  if (!announcement) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="metro-led-display"
      className="bg-[#080b10] border border-amber-500/55 rounded px-4 py-1.5 shadow-xl flex items-center gap-3"
    >
      <span className="px-1.5 py-0.5 rounded-sm bg-amber-500 text-slate-950 font-mono-tabular text-[10px] font-bold tracking-wider">
        M1
      </span>
      <span className="font-mono-tabular text-xs md:text-sm font-semibold tracking-[0.11em] uppercase text-amber-300 whitespace-nowrap">
        {announcement.text}
      </span>
    </div>
  );
}
