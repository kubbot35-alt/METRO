import type { GraphicsQualityId } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';

interface IFpsCounterBadgeProps {
  readonly fps: number;
  readonly quality: GraphicsQualityId;
}

const QUALITY_SHORT_PL: Record<GraphicsQualityId, string> = {
  low: 'NIS',
  medium: 'ŚRD',
  high: 'WYS',
};

const QUALITY_SHORT_EN: Record<GraphicsQualityId, string> = {
  low: 'LOW',
  medium: 'MED',
  high: 'HIGH',
};

export function FpsCounterBadge({ fps, quality }: IFpsCounterBadgeProps) {
  const { isEn } = useI18n();
  const color =
    fps >= 45 ? 'text-emerald-300' : fps >= 24 ? 'text-amber-300' : 'text-red-300';
  return (
    <div
      data-testid="fps-counter"
      className="fixed top-14 right-4 z-20 pointer-events-none px-2.5 py-1 rounded border border-slate-700/80 bg-[#0b1018]/90 font-mono-tabular text-[11px] flex items-center gap-2 shadow-md"
    >
      <span className={`font-bold ${color}`}>{fps} FPS</span>
      <span className="text-slate-500">·</span>
      <span className="text-slate-400">
        {isEn ? QUALITY_SHORT_EN[quality] : QUALITY_SHORT_PL[quality]}
      </span>
    </div>
  );
}
