import { getLocalizedCameraLabel } from '../../domain/i18nCatalog';
import { localizeFeedbackText, localizeRadioDispatch } from '../../domain/i18nDynamic';
import { NIGHT_CREW_MAX_SPEED_KMH } from '../../domain/nightInspectionSystem';
import type { FeedbackTone, ISimulationSnapshot } from '../../domain/types';
import { useI18n } from '../../i18n/LanguageContext';
import { MetroLedDisplay } from '../MetroLedDisplay';
import { RouteLineStrip } from '../RouteLineStrip';

interface ITopHudCenterAlertsProps {
  readonly snapshot: ISimulationSnapshot;
  readonly onAcknowledgeRadio: () => void;
}

function getFeedbackColor(tone: FeedbackTone): string {
  if (tone === 'success') {
    return 'bg-emerald-950/95 border-emerald-500/70 text-emerald-100';
  }
  if (tone === 'danger') {
    return 'bg-red-950/95 border-red-500/70 text-red-100';
  }
  if (tone === 'warning') {
    return 'bg-amber-950/95 border-amber-500/70 text-amber-100';
  }
  return 'bg-slate-900/95 border-slate-600 text-slate-100';
}

function PaBroadcastBanner({ snapshot }: { readonly snapshot: ISimulationSnapshot }) {
  const { lang } = useI18n();
  const msg = snapshot.paIntercom.activeMessage;
  if (!msg) {
    return null;
  }
  return (
    <div
      role="status"
      data-testid="pa-broadcast-banner"
      className="w-full max-w-[560px] px-3.5 py-1.5 rounded-md border border-cyan-400/80 bg-[#081a28]/95 text-cyan-100 text-xs font-mono-tabular shadow-xl flex items-center gap-2"
    >
      <span className="px-1.5 py-0.5 rounded bg-cyan-500/25 border border-cyan-300/70 text-cyan-200 text-[10px] font-bold uppercase shrink-0">
        PA
      </span>
      <span className="truncate font-medium">„{lang === 'en' ? msg.textEn : msg.textPl}”</span>
    </div>
  );
}

function RadioDispatchBanner({ snapshot, onAcknowledgeRadio }: ITopHudCenterAlertsProps) {
  const { lang, tr } = useI18n();
  const { radio, gameMode } = snapshot;
  if (!radio.active) return null;
  const localized = localizeRadioDispatch(lang, radio);
  const bonus = gameMode === 'sandbox' || gameMode === 'passenger' ? '' : tr(' +40 pkt', ' +40 pts');
  return (
    <div role="alert" data-testid="radio-dispatch-banner" className="pointer-events-auto w-full max-w-[560px] px-3.5 py-2 rounded-md border-2 border-cyan-400/85 bg-[#071824]/95 text-cyan-50 shadow-2xl flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-300 animate-pulse shrink-0" />
          <span className="text-[10px] font-mono-tabular font-bold uppercase tracking-[0.16em] text-cyan-300">{tr('Radio Dyspozytora · Kanał Ruchowy', 'Dispatch Radio · Traffic Channel')}</span>
        </div>
        <button type="button" data-testid="radio-banner-ack-btn" onClick={(e) => { e.currentTarget.blur(); onAcknowledgeRadio(); }} className="px-2.5 py-1 rounded bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono-tabular font-bold text-[11px] whitespace-nowrap cursor-pointer">
          {tr('Potwierdź [R]', 'Confirm [R]')}{bonus} ({radio.remainingSec.toFixed(1)}s)
        </button>
      </div>
      <p className="text-xs font-medium text-slate-100 leading-snug">{localized.displayText}</p>
      <div className="w-full h-1 bg-slate-800 rounded overflow-hidden">
        <div className="h-full bg-cyan-400 transition-transform origin-left" style={{ transform: `scaleX(${Math.max(0, Math.min(1, radio.remainingSec / 6))})` }} />
      </div>
    </div>
  );
}

function NightCrewWarningBanner({ snapshot }: { readonly snapshot: ISimulationSnapshot }) {
  const { tr } = useI18n();
  const ni = snapshot.nightInspection;
  if (!ni.activeApproachCrew) return null;
  const speedCls = ni.speedSafeNow ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200' : 'bg-red-500/25 border-red-400 text-red-200 animate-pulse';
  const hornCls = ni.activeApproachCrew.hornSounded ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200' : 'bg-amber-500/25 border-amber-400 text-amber-200 animate-pulse';
  return (
    <div role="alert" data-testid="night-crew-warning" className="w-full max-w-[560px] px-3.5 py-2 rounded-md border-2 border-orange-400 bg-[#231107]/95 text-orange-50 shadow-2xl flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-ping shrink-0" />
        <span className="font-bold text-orange-200">{tr('EKIPA NA TORACH', 'TRACK CREW AHEAD')} ({Math.max(0, Math.round(ni.activeApproachDistanceM ?? 0))} m)</span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] font-bold">
        <span className={`px-2 py-0.5 rounded border ${speedCls}`}>{ni.speedSafeNow ? '✓ ' : '⚠ '}≤ {NIGHT_CREW_MAX_SPEED_KMH} km/h</span>
        <span className={`px-2 py-0.5 rounded border ${hornCls}`}>{ni.activeApproachCrew.hornSounded ? '✓ ' : '● '}{tr('Klakson [H]', 'Horn [H]')}</span>
      </div>
    </div>
  );
}

function HudFeedbackBanner({ snapshot }: { readonly snapshot: ISimulationSnapshot }) {
  const { lang, tr } = useI18n();
  const feedback = snapshot.feedback;
  const text = feedback ? localizeFeedbackText(lang, feedback.text) : null;
  if (!feedback || !text) return null;
  const deltaStr = feedback.pointsDelta > 0 ? `+${feedback.pointsDelta}` : String(feedback.pointsDelta);
  return (
    <div role="status" data-testid="hud-feedback-banner" className={`px-4 py-2 rounded-md border text-sm font-medium flex items-center gap-2.5 shadow-lg ${getFeedbackColor(feedback.tone)}`}>
      <span>{text}</span>
      {feedback.pointsDelta !== 0 && <span className="font-mono-tabular font-bold">{deltaStr} {tr('pkt', 'pts')}</span>}
    </div>
  );
}

function DimHighBeamPrompt({ active }: { readonly active: boolean }) {
  const { tr } = useI18n();
  if (!active) return null;
  return (
    <div role="alert" data-testid="dim-high-beam-prompt" className="px-3.5 py-1.5 rounded-md border-2 border-sky-300 bg-[#081c2e]/95 text-sky-100 text-xs font-mono-tabular font-bold tracking-wide shadow-2xl flex items-center gap-2 animate-pulse">
      <span className="w-2 h-2 rounded-full bg-sky-300 shrink-0" />
      <span>{tr('Przygaś długie! [L] · Pociąg z naprzeciwka', 'Dim high beams! [L] · Oncoming train')}</span>
    </div>
  );
}

function Sop2InterventionBanner({ active, limitKmh }: { readonly active: boolean; readonly limitKmh: number }) {
  const { tr } = useI18n();
  if (!active) return null;
  return (
    <div role="alert" data-testid="sop2-intervention-banner" className="px-3.5 py-1.5 rounded-md border-2 border-red-400 bg-red-950/95 text-red-100 text-xs font-mono-tabular font-bold tracking-wide shadow-2xl flex items-center gap-2 animate-pulse">
      <span className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0" />
      <span>{tr(`INTERWENCJA SOP-2 · HAMOWANIE AWARYJNE DO ≤ ${limitKmh} km/h`, `SOP-2 INTERVENTION · EMERGENCY BRAKING TO ≤ ${limitKmh} km/h`)}</span>
    </div>
  );
}

export function TopHudCenterAlerts({ snapshot, onAcknowledgeRadio }: ITopHudCenterAlertsProps) {
  const { lang } = useI18n();
  const cameraLabel = snapshot.cameraNotice ? getLocalizedCameraLabel(lang, snapshot.cameraMode, snapshot.cameraNotice.label) : null;
  return (
    <div className="flex-1 min-w-0 flex flex-col items-center gap-1.5 max-w-[44vw]">
      <RouteLineStrip snapshot={snapshot} />
      <MetroLedDisplay announcement={snapshot.announcement} lineId={snapshot.line.badgeCode ?? snapshot.line.id} lineCssColor={snapshot.line.cssColor} />
      <Sop2InterventionBanner active={snapshot.sop2.interventionActive} limitKmh={snapshot.sop2.currentLimitKmh} />
      <PaBroadcastBanner snapshot={snapshot} />
      <RadioDispatchBanner snapshot={snapshot} onAcknowledgeRadio={onAcknowledgeRadio} />
      <DimHighBeamPrompt active={snapshot.lightingEffects.dimHighBeamPromptActive} />
      <NightCrewWarningBanner snapshot={snapshot} />
      {cameraLabel && <div data-testid="camera-notice" className="px-3.5 py-1.5 rounded-md border border-sky-400/70 bg-[#0c1829]/95 text-sky-100 text-xs font-mono-tabular font-semibold tracking-wide shadow-lg">{cameraLabel}</div>}
      <HudFeedbackBanner snapshot={snapshot} />
    </div>
  );
}
