import {
  getMirrorPerformancePolicy,
  resolveCctvChannel,
} from '../domain/mirrorCctvSystem';
import { formatClockTime } from '../domain/scheduleSystem';
import { getStationPlatformSide } from '../domain/trackGeometry';
import type {
  CctvPreviewChannel,
  GraphicsQualityId,
  ISimulationSnapshot,
} from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';

interface ICctvPreviewOverlayProps {
  readonly snapshot: ISimulationSnapshot;
  readonly channel: CctvPreviewChannel;
  readonly graphicsQuality: GraphicsQualityId;
  readonly liveMirrorsEnabled: boolean;
  readonly onSelectChannel: (channel: CctvPreviewChannel) => void;
  readonly onCanvasRef: (canvas: HTMLCanvasElement | null) => void;
  readonly onClose: () => void;
}

const CHANNEL_BUTTONS: readonly {
  readonly id: CctvPreviewChannel;
  readonly labelPl: string;
  readonly labelEn: string;
}[] = [
  { id: 'auto', labelPl: 'Auto', labelEn: 'Auto' },
  { id: 'left', labelPl: 'CAM L', labelEn: 'CAM L' },
  { id: 'right', labelPl: 'CAM P', labelEn: 'CAM R' },
  { id: 'interior', labelPl: 'Wnętrze', labelEn: 'Interior' },
];

export function CctvPreviewOverlay({
  snapshot,
  channel,
  graphicsQuality,
  liveMirrorsEnabled,
  onSelectChannel,
  onCanvasRef,
  onClose,
}: ICctvPreviewOverlayProps) {
  const { tr } = useI18n();
  const platformSide = getStationPlatformSide(snapshot.currentStation.station);
  const resolved = resolveCctvChannel(channel, platformSide);
  const policy = getMirrorPerformancePolicy(graphicsQuality, liveMirrorsEnabled);
  const isPlatformSideActive = resolved === platformSide;
  const clockStr = formatClockTime(snapshot.schedule.currentClockSec);

  const channelTitle =
    resolved === 'left'
      ? tr('CAM L · LEWA STRONA', 'CAM L · LEFT FLANK')
      : resolved === 'right'
        ? tr('CAM P · PRAWA STRONA', 'CAM R · RIGHT FLANK')
        : tr('CAM W · WNĘTRZE WAGONU', 'CAM INT · PASSENGER CAR');

  return (
    <aside
      data-testid="cctv-preview-overlay"
      data-resolved-channel={resolved}
      aria-label={tr('Podgląd kamer pokładowych CCTV', 'Onboard CCTV Monitor')}
      className={`fixed top-14 sm:top-16 right-2 sm:right-4 z-20 w-[292px] sm:w-[336px] rounded-md bg-[#080c13]/96 border-2 shadow-2xl overflow-hidden select-none ${
        isPlatformSideActive && policy.enabled
          ? 'border-emerald-400/85'
          : 'border-slate-600/90'
      }`}
    >
      <div className="px-2.5 py-1.5 bg-[#0e1420] border-b border-slate-700/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              policy.enabled ? 'bg-red-500 animate-pulse' : 'bg-amber-400'
            }`}
            aria-hidden="true"
          />
          <span className="text-[10px] font-mono-tabular font-bold text-slate-100 truncate">
            {channelTitle}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono-tabular text-emerald-300 font-semibold">
            REC ● {clockStr}
          </span>
          <button
            type="button"
            data-testid="cctv-close-btn"
            aria-label={tr('Zamknij podgląd CCTV [M]', 'Close CCTV monitor [M]')}
            onClick={(e) => {
              e.currentTarget.blur();
              onClose();
            }}
            className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono-tabular flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="relative aspect-[16/10] w-full bg-[#04070d] overflow-hidden">
        <canvas
          ref={onCanvasRef}
          data-testid="cctv-preview-canvas"
          width={256}
          height={160}
          className={`w-full h-full block object-cover ${
            resolved === 'interior' ? 'contrast-110 saturate-75' : 'contrast-105'
          }`}
        />

        {/* Subtle industrial CCTV scanline + corner brackets */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 1px, transparent 1px, transparent 3px)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-2 border border-white/10"
        />

        <div className="pointer-events-none absolute top-1.5 left-2 right-2 flex items-center justify-between text-[9px] font-mono-tabular">
          <span className="px-1.5 py-0.5 rounded bg-black/70 text-slate-200 border border-slate-700/70">
            {snapshot.trainModel.name.toUpperCase()} · {policy.approxFpsLabel}
          </span>
          {isPlatformSideActive && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-400/60 font-bold">
              {platformSide === 'left'
                ? tr('PERON L [Q]', 'PLAT L [Q]')
                : tr('PERON P [E]', 'PLAT R [E]')}
            </span>
          )}
        </div>

        <div className="pointer-events-none absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[9.5px] font-mono-tabular">
          <span className="px-1.5 py-0.5 rounded bg-black/75 text-slate-200 truncate max-w-[60%]">
            {snapshot.currentStation.station.name}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded font-bold ${
              snapshot.doorState === 'open'
                ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-400/60'
                : 'bg-black/75 text-slate-400'
            }`}
          >
            {snapshot.doorState === 'open'
              ? tr('DRZWI OTWARTE', 'DOORS OPEN')
              : tr('DRZWI ZAMKNIĘTE', 'DOORS CLOSED')}
          </span>
        </div>

        {!policy.enabled && (
          <div
            data-testid="cctv-standby-notice"
            className="absolute inset-0 bg-[#05080f]/88 flex flex-col items-center justify-center p-3 text-center"
          >
            <p className="text-xs font-mono-tabular font-bold text-amber-300 uppercase tracking-wider">
              {tr('PODGLĄD NA ŻYWO WYŁĄCZONY', 'LIVE FEED DISABLED')}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 leading-snug max-w-[230px]">
              {graphicsQuality === 'low'
                ? tr(
                    'Zmień jakość grafiki na Średnią lub Wysoką w Ustawieniach.',
                    'Set Graphics Quality to Medium or High in Settings.',
                  )
                : tr(
                    'Włącz „Lusterka i kamery na żywo” w Ustawieniach.',
                    'Enable "Live Mirrors & Cameras" in Settings.',
                  )}
            </p>
          </div>
        )}
      </div>

      <div className="p-1.5 bg-[#0b1019] border-t border-slate-800 grid grid-cols-4 gap-1">
        {CHANNEL_BUTTONS.map((btn) => {
          const active = channel === btn.id;
          return (
            <button
              key={btn.id}
              type="button"
              data-testid={`cctv-channel-${btn.id}`}
              aria-pressed={active}
              onClick={(e) => {
                e.currentTarget.blur();
                onSelectChannel(btn.id);
              }}
              className={`py-1 rounded border text-[10px] font-mono-tabular font-bold transition-colors cursor-pointer ${
                active
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                  : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {tr(btn.labelPl, btn.labelEn)}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
