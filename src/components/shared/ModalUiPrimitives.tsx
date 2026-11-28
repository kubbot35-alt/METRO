interface IStatTileCardProps {
  readonly label: string;
  readonly value: string;
  readonly sub?: string;
  readonly testId?: string;
  readonly cardClassName?: string;
}

interface IToggleSwitchButtonProps {
  readonly checked: boolean;
  readonly ariaLabel?: string;
  readonly testId: string;
  readonly onLabel: string;
  readonly offLabel: string;
  readonly onToggle: () => void;
  readonly className?: string;
}

interface IVolumeSliderRowProps {
  readonly id: string;
  readonly testId: string;
  readonly label: string;
  readonly value: number;
  readonly onChange: (val: number) => void;
}

export function StatTileCard({
  label, value, sub, testId,
  cardClassName = 'rounded-md border border-slate-800 bg-[#0b0f17] px-3 py-2.5',
}: IStatTileCardProps) {
  return (
    <div data-testid={testId} className={cardClassName}>
      <p className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">{label}</p>
      <p className="font-mono-tabular text-lg font-bold text-slate-100 mt-0.5">{value}</p>
      {sub && <p className="text-[10px] font-mono-tabular text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export function ToggleSwitchButton({
  checked, ariaLabel, testId, onLabel, offLabel, onToggle,
  className = 'px-3 py-1.5 rounded-md border text-xs font-mono-tabular font-bold cursor-pointer transition-colors shrink-0',
}: IToggleSwitchButtonProps) {
  const tone = checked ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800';
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={ariaLabel} data-testid={testId} onClick={onToggle} className={`${className} ${tone}`}>
      {checked ? onLabel : offLabel}
    </button>
  );
}

export function VolumeSliderRow({ id, testId, label, value, onChange }: IVolumeSliderRowProps) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <label htmlFor={id} className="text-slate-200 font-medium">{label}</label>
        <span className="font-mono-tabular font-bold text-amber-300">{pct}%</span>
      </div>
      <input id={id} data-testid={testId} type="range" min={0} max={100} step={5} value={pct} onChange={(e) => onChange(Number(e.target.value) / 100)} className="w-full accent-amber-400 cursor-pointer" />
    </div>
  );
}
