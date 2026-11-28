import { formatClockTime } from '../../domain/scheduleSystem';
import type { CctvPreviewChannel, GraphicsQualityId, ISimulationSnapshot } from '../../domain/types';
import type { IMirrorPerformancePolicy } from '../../domain/mirrorCctvSystem';
import { useI18n } from '../../i18n/LanguageContext';

interface ICctvHeaderBarProps {
  readonly resolved: CctvPreviewChannel;
  readonly policyEnabled: boolean;
  readonly clockSec: number;
  readonly onClose: () => void;
}

interface ICctvViewportProps {
  readonly snapshot: ISimulationSnapshot;
  readonly resolved: CctvPreviewChannel;
  readonly platformSide: 'left' | 'right';
  readonly isPlatformSideActive: boolean;
  readonly graphicsQuality: GraphicsQualityId;
  readonly policy: IMirrorPerformancePolicy;
  readonly onCanvasRef: (canvas: HTMLCanvasElement | null) => void;
}

const CHANNEL_BUTTONS: readonly { readonly id: CctvPreviewChannel; readonly labelPl: string; readonly labelEn: string }[] = [
  { id: 'auto', labelPl: 'Auto', labelEn: 'Auto' },
  { id: 'left', labelPl: 'CAM L', labelEn: 'CAM L' },
  { id: 'right', labelPl: 'CAM P', labelEn: 'CAM R' },
  { id: 'interior', labelPl: 'Wnętrze', labelEn: 'Interior' },
];

export function CctvHeaderBar({ resolved, policyEnabled, clockSec, onClose }: ICctvHeaderBarProps) {
  const { tr } = useI18n();
  const title = resolved === 'left' ? tr('CAM L · LEWA STRONA', 'CAM L · LEFT FLANK') : resolved === 'right' ? tr('CAM P · PRAWA STRONA', 'CAM R · RIGHT FLANK') : tr('CAM W · WNĘTRZE WAGONU', 'CAM INT · PASSENGER CAR');
  return (
    <div className="px-2.5 py-1.5 bg-[#0e1420] border-b border-slate-700/80 flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`w-2 h-2 rounded-full shrink-0 ${policyEnabled ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`} aria-hidden="true" />
        <span className="text-[10px] font-mono-tabular font-bold text-slate-100 truncate">{title}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-mono-tabular text-emerald-300 font-semibold">REC ● {formatClockTime(clockSec)}</span>
        <button type="button" data-testid="cctv-close-btn" aria-label={tr('Zamknij podgląd CCTV [M]', 'Close CCTV monitor [M]')} onClick={(e) => { e.currentTarget.blur(); onClose(); }} className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono-tabular flex items-center justify-center cursor-pointer">
          ✕
        </button>
      </div>
    </div>
  );
}

function CctvStandbyNotice({ graphicsQuality }: { readonly graphicsQuality: GraphicsQualityId }) {
  const { tr } = useI18n();
  const hint = graphicsQuality === 'low'
    ? tr('Zmień jakość grafiki na Średnią lub Wysoką w Ustawieniach.', 'Set Graphics Quality to Medium or High in Settings.')
    : tr('Włącz „Lusterka i kamery na żywo” w Ustawieniach.', 'Enable "Live Mirrors & Cameras" in Settings.');
  return (
    <div data-testid="cctv-standby-notice" className="absolute inset-0 bg-[#05080f]/88 flex flex-col items-center justify-center p-3 text-center">
      <p className="text-xs font-mono-tabular font-bold text-amber-300 uppercase tracking-wider">{tr('PODGLĄD NA ŻYWO WYŁĄCZONY', 'LIVE FEED DISABLED')}</p>
      <p className="text-[10px] text-slate-400 mt-1 leading-snug max-w-[230px]">{hint}</p>
    </div>
  );
}

function CctvViewportHudOverlays({ snapshot, platformSide, isPlatformSideActive, fpsLabel }: {
  readonly snapshot: ISimulationSnapshot; readonly platformSide: 'left' | 'right'; readonly isPlatformSideActive: boolean; readonly fpsLabel: string;
}) {
  const { tr } = useI18n();
  const doorOpen = snapshot.doorState === 'open';
  return (
    <>
      <div className="pointer-events-none absolute top-1.5 left-2 right-2 flex items-center justify-between text-[9px] font-mono-tabular">
        <span className="px-1.5 py-0.5 rounded bg-black/70 text-slate-200 border border-slate-700/70">{snapshot.trainModel.name.toUpperCase()} · {fpsLabel}</span>
        {isPlatformSideActive && <span className="px-1.5 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-400/60 font-bold">{platformSide === 'left' ? tr('PERON L [Q]', 'PLAT L [Q]') : tr('PERON P [E]', 'PLAT R [E]')}</span>}
      </div>
      <div className="pointer-events-none absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[9.5px] font-mono-tabular">
        <span className="px-1.5 py-0.5 rounded bg-black/75 text-slate-200 truncate max-w-[60%]">{snapshot.currentStation.station.name}</span>
        <span className={`px-1.5 py-0.5 rounded font-bold ${doorOpen ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-400/60' : 'bg-black/75 text-slate-400'}`}>
          {doorOpen ? tr('DRZWI OTWARTE', 'DOORS OPEN') : tr('DRZWI ZAMKNIĘTE', 'DOORS CLOSED')}
        </span>
      </div>
    </>
  );
}

export function CctvCanvasViewport({ snapshot, resolved, platformSide, isPlatformSideActive, graphicsQuality, policy, onCanvasRef }: ICctvViewportProps) {
  return (
    <div className="relative aspect-[16/10] w-full bg-[#04070d] overflow-hidden">
      <canvas ref={onCanvasRef} data-testid="cctv-preview-canvas" width={256} height={160} className={`w-full h-full block object-cover ${resolved === 'interior' ? 'contrast-110 saturate-75' : 'contrast-105'}`} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 1px, transparent 1px, transparent 3px)' }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-2 border border-white/10" />
      <CctvViewportHudOverlays snapshot={snapshot} platformSide={platformSide} isPlatformSideActive={isPlatformSideActive} fpsLabel={policy.approxFpsLabel} />
      {!policy.enabled && <CctvStandbyNotice graphicsQuality={graphicsQuality} />}
    </div>
  );
}

export function CctvChannelBar({ channel, onSelectChannel }: { readonly channel: CctvPreviewChannel; readonly onSelectChannel: (c: CctvPreviewChannel) => void }) {
  const { tr } = useI18n();
  return (
    <div className="p-1.5 bg-[#0b1019] border-t border-slate-800 grid grid-cols-4 gap-1">
      {CHANNEL_BUTTONS.map((btn) => {
        const active = channel === btn.id;
        const cls = active ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200' : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200';
        return (
          <button key={btn.id} type="button" data-testid={`cctv-channel-${btn.id}`} aria-pressed={active} onClick={(e) => { e.currentTarget.blur(); onSelectChannel(btn.id); }} className={`py-1 rounded border text-[10px] font-mono-tabular font-bold transition-colors cursor-pointer ${cls}`}>
            {tr(btn.labelPl, btn.labelEn)}
          </button>
        );
      })}
    </div>
  );
}
