import { useI18n } from '../../i18n/LanguageContext';

export function StopApproachBar({
  distanceToTargetM,
  compact = false,
}: {
  readonly distanceToTargetM: number;
  readonly compact?: boolean;
}) {
  const { tr } = useI18n();
  const clamped = Math.max(-20, Math.min(120, distanceToTargetM));
  const progressRatio = 1 - (clamped + 20) / 140;
  return (
    <div className="flex flex-col gap-1">
      <div className={`relative w-full ${compact ? 'h-1.5' : 'h-2'} bg-slate-800 rounded overflow-hidden`}>
        <div className="absolute top-0 bottom-0 bg-emerald-500/40 border-x border-emerald-400" style={{ left: '75.7%', width: '20%' }} />
        <div className="absolute top-0 bottom-0 w-1.5 bg-amber-400 rounded" style={{ left: `${Math.max(0, Math.min(98, progressRatio * 100))}%` }} />
      </div>
      {!compact && (
        <span className="text-[10px] font-mono-tabular text-slate-400 whitespace-nowrap">
          {tr('W/S Moc · Spacja Hamulec · Cel: STOP', 'W/S Power · Space Brake · Target: STOP')}
        </span>
      )}
    </div>
  );
}
