import { getMirrorPerformancePolicy, resolveCctvChannel } from '../domain/mirrorCctvSystem';
import { getStationPlatformSide } from '../domain/trackGeometry';
import type { CctvPreviewChannel, GraphicsQualityId, ISimulationSnapshot } from '../domain/types';
import { useI18n } from '../i18n/LanguageContext';
import { CctvCanvasViewport, CctvChannelBar, CctvHeaderBar } from './hud/CctvOverlayParts';

interface ICctvPreviewOverlayProps {
  readonly snapshot: ISimulationSnapshot;
  readonly channel: CctvPreviewChannel;
  readonly graphicsQuality: GraphicsQualityId;
  readonly liveMirrorsEnabled: boolean;
  readonly onSelectChannel: (channel: CctvPreviewChannel) => void;
  readonly onCanvasRef: (canvas: HTMLCanvasElement | null) => void;
  readonly onClose: () => void;
}

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
  const borderCls = isPlatformSideActive && policy.enabled ? 'border-emerald-400/85' : 'border-slate-600/90';
  return (
    <aside data-testid="cctv-preview-overlay" data-resolved-channel={resolved} aria-label={tr('Podgląd kamer pokładowych CCTV', 'Onboard CCTV Monitor')} className={`fixed top-14 sm:top-16 right-2 sm:right-4 z-20 w-[292px] sm:w-[336px] rounded-md bg-[#080c13]/96 border-2 shadow-2xl overflow-hidden select-none ${borderCls}`}>
      <CctvHeaderBar resolved={resolved} policyEnabled={policy.enabled} clockSec={snapshot.schedule.currentClockSec} onClose={onClose} />
      <CctvCanvasViewport snapshot={snapshot} resolved={resolved} platformSide={platformSide} isPlatformSideActive={isPlatformSideActive} graphicsQuality={graphicsQuality} policy={policy} onCanvasRef={onCanvasRef} />
      <CctvChannelBar channel={channel} onSelectChannel={onSelectChannel} />
    </aside>
  );
}
