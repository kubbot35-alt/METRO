import type { ReactNode } from 'react';
import { useI18n } from '../../i18n/LanguageContext';

interface ITopHudActionButtonsProps {
  readonly muted: boolean;
  readonly cctvPreviewOpen: boolean;
  readonly onToggleMute: () => void;
  readonly onToggleCctvPreview: () => void;
  readonly onCycleCamera: () => void;
  readonly onToggleHelp: () => void;
  readonly onPause: () => void;
  readonly onRestart: () => void;
}

interface IToolbarActionButtonProps {
  readonly testId?: string;
  readonly label: string;
  readonly pressed?: boolean;
  readonly className: string;
  readonly onClick: () => void;
  readonly children: ReactNode;
}

function ToolbarActionButton({ testId, label, pressed, className, onClick, children }: IToolbarActionButtonProps) {
  return (
    <button
      type="button" tabIndex={-1} data-testid={testId} aria-pressed={pressed} aria-label={label} title={label}
      onClick={(e) => { e.currentTarget.blur(); onClick(); }}
      className={className}
    >
      {children}
    </button>
  );
}

function MuteVolumeIcon({ muted }: { readonly muted: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      {muted ? <path d="M23 9l-6 6M17 9l6 6" /> : <path d="M15.5 8.5a5 5 0 010 7M19 5a9.5 9.5 0 010 14" />}
    </svg>
  );
}

const SQ_BTN = 'w-8 h-8 sm:w-10 sm:h-10 rounded-md bg-[#10141c]/90 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center cursor-pointer';

export function TopHudActionButtons({ muted, cctvPreviewOpen, onToggleMute, onToggleCctvPreview, onCycleCamera, onToggleHelp, onPause, onRestart }: ITopHudActionButtonsProps) {
  const { tr } = useI18n();
  const muteLabel = muted ? tr('Włącz dźwięk [Shift+M]', 'Unmute audio [Shift+M]') : tr('Wycisz dźwięk [Shift+M]', 'Mute audio [Shift+M]');
  const cctvCls = cctvPreviewOpen ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200' : 'bg-[#10141c]/90 hover:bg-slate-800 border-slate-700/80 text-slate-200';
  return (
    <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 shrink-0">
      <ToolbarActionButton testId="help-toggle-btn" label={tr('Pomoc i skróty klawiszowe [?]', 'Help & keybindings [?]')} onClick={onToggleHelp} className={`${SQ_BTN} text-amber-300 font-mono-tabular font-bold text-sm sm:text-base`}>?</ToolbarActionButton>
      <ToolbarActionButton testId="cctv-toggle-btn" pressed={cctvPreviewOpen} label={tr('Powiększony podgląd CCTV [M]', 'Enlarged CCTV monitor [M]')} onClick={onToggleCctvPreview} className={`h-8 sm:h-10 px-2 sm:px-2.5 rounded-md border flex items-center gap-1.5 cursor-pointer text-xs font-mono-tabular font-semibold transition-colors ${cctvCls}`}>
        <span>CCTV</span><span className="hidden sm:inline">[M]</span>
      </ToolbarActionButton>
      <ToolbarActionButton testId="camera-cycle-btn" label={tr('Zmień kamerę [V]', 'Cycle camera [V]')} onClick={onCycleCamera} className="h-8 sm:h-10 px-2 sm:px-2.5 rounded-md bg-[#10141c]/90 hover:bg-slate-800 border border-slate-700/80 flex items-center gap-1.5 text-slate-200 cursor-pointer text-xs font-mono-tabular font-semibold">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
        <span className="hidden sm:inline">[V]</span>
      </ToolbarActionButton>
      <ToolbarActionButton label={muteLabel} onClick={onToggleMute} className={`${SQ_BTN} text-slate-200`}><MuteVolumeIcon muted={muted} /></ToolbarActionButton>
      <ToolbarActionButton label={tr('Pauza [P]', 'Pause [P]')} onClick={onPause} className={`${SQ_BTN} text-slate-200`}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
      </ToolbarActionButton>
      <ToolbarActionButton label={tr('Restartuj kurs [Shift+R]', 'Restart run [Shift+R]')} onClick={onRestart} className={`${SQ_BTN} text-slate-200`}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
      </ToolbarActionButton>
    </div>
  );
}
