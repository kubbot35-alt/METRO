import { formatCabControlLabel, type ICabHoverTooltip } from '../../domain/cabControlsCatalog';
import { useI18n } from '../../i18n/LanguageContext';

interface ICabControlTooltipProps {
  readonly tooltip: ICabHoverTooltip | null;
}

export function CabControlTooltip({ tooltip }: ICabControlTooltipProps) {
  const { lang, tr } = useI18n();
  if (!tooltip) return null;
  return (
    <div
      data-testid="cab-control-tooltip"
      className="fixed z-40 pointer-events-none px-2.5 py-1.5 rounded-md border border-amber-400/80 bg-[#090d16]/95 text-slate-50 shadow-xl"
      style={{
        left: `${Math.min(window.innerWidth - 220, tooltip.screenX + 14)}px`,
        top: `${Math.max(12, tooltip.screenY - 42)}px`,
      }}
    >
      <div className="text-xs font-mono-tabular font-bold text-amber-200 whitespace-nowrap">
        {formatCabControlLabel(tooltip.controlId, lang)}
      </div>
      <div className="text-[10px] text-slate-300">
        {tr('Kliknij przycisk na pulpicie 3D', 'Click 3D cab desk button')}
      </div>
    </div>
  );
}
