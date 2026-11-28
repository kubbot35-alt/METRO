import type { IAdCampaignSpec } from '../domain/metroAdsCatalog';
import type { LanguageId } from '../domain/types';
import { drawAdBackground, drawAdMotifBadge, drawAdPillHeader } from './adCanvasMotifs';

function localizeAd(ad: IAdCampaignSpec, lang: LanguageId) {
  return {
    badge: lang === 'en' ? ad.badgeEn : ad.badgePl,
    title: lang === 'en' ? ad.titleEn : ad.titlePl,
    tagline: lang === 'en' ? ad.taglineEn : ad.taglinePl,
    footer: lang === 'en' ? ad.footerEn : ad.footerPl,
  };
}

export function paintLandscapeAdCanvas(ctx: CanvasRenderingContext2D, w: number, h: number, ad: IAdCampaignSpec, lang: LanguageId): void {
  drawAdBackground(ctx, w, h, ad);
  drawAdMotifBadge(ctx, w * 0.81, h * 0.52, Math.min(w, h) * 0.29, ad);
  const copy = localizeAd(ad, lang);
  drawAdPillHeader(ctx, 26, 22, copy.badge, ad.accentHex);
  ctx.fillStyle = ad.textHex;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '900 38px "Inter", "Segoe UI", sans-serif';
  ctx.fillText(copy.title, 26, h * 0.43, w * 0.62);
  ctx.fillStyle = ad.accentHex;
  ctx.font = '700 24px "Inter", "Segoe UI", sans-serif';
  ctx.fillText(copy.tagline, 26, h * 0.64, w * 0.62);
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.font = '600 14px "JetBrains Mono", monospace';
  ctx.fillText(copy.footer, 26, h - 24, w * 0.66);
}

export function paintPortraitCitylightCanvas(ctx: CanvasRenderingContext2D, w: number, h: number, ad: IAdCampaignSpec, lang: LanguageId): void {
  drawAdBackground(ctx, w, h, ad);
  const copy = localizeAd(ad, lang);
  ctx.fillStyle = ad.accentHex;
  ctx.fillRect(18, 22, w - 36, 4);
  ctx.font = '800 11px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(copy.badge, w * 0.5, 42, w - 28);
  drawAdMotifBadge(ctx, w * 0.5, h * 0.37, w * 0.25, ad);
  ctx.fillStyle = ad.textHex;
  ctx.font = '900 25px "Inter", "Segoe UI", sans-serif';
  ctx.fillText(copy.title, w * 0.5, h * 0.64, w - 26);
  ctx.fillStyle = ad.accentHex;
  ctx.font = '700 16px "Inter", "Segoe UI", sans-serif';
  ctx.fillText(copy.tagline, w * 0.5, h * 0.76, w - 26);
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.font = '600 11px "Inter", sans-serif';
  ctx.fillText(copy.footer, w * 0.5, h - 28, w - 24);
}

export function paintInteriorStripAdCanvas(ctx: CanvasRenderingContext2D, w: number, h: number, ad: IAdCampaignSpec, lang: LanguageId): void {
  drawAdBackground(ctx, w, h, ad);
  drawAdMotifBadge(ctx, 56, h * 0.5, h * 0.34, ad);
  const copy = localizeAd(ad, lang);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ad.accentHex;
  ctx.font = '800 11px "JetBrains Mono", monospace';
  ctx.fillText(copy.badge, 112, 24, w - 130);
  ctx.fillStyle = ad.textHex;
  ctx.font = '900 24px "Inter", "Segoe UI", sans-serif';
  ctx.fillText(`${copy.title} — ${copy.tagline}`, 112, h * 0.56, w - 128);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '600 12px "Inter", sans-serif';
  ctx.fillText(copy.footer, 112, h - 18, w - 128);
}
