import type { AdGraphicMotif, IAdCampaignSpec } from '../domain/metroAdsCatalog';
import type { LanguageId } from '../domain/types';

export function paintLandscapeAdCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  ad: IAdCampaignSpec,
  lang: LanguageId,
): void {
  drawBackground(ctx, w, h, ad);
  drawMotifBadge(ctx, w * 0.81, h * 0.52, Math.min(w, h) * 0.29, ad);

  const badge = lang === 'en' ? ad.badgeEn : ad.badgePl;
  const title = lang === 'en' ? ad.titleEn : ad.titlePl;
  const tagline = lang === 'en' ? ad.taglineEn : ad.taglinePl;
  const footer = lang === 'en' ? ad.footerEn : ad.footerPl;

  drawPillHeader(ctx, 26, 22, badge, ad.accentHex);
  ctx.fillStyle = ad.textHex;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '900 38px "Inter", "Segoe UI", sans-serif';
  ctx.fillText(title, 26, h * 0.43, w * 0.62);

  ctx.fillStyle = ad.accentHex;
  ctx.font = '700 24px "Inter", "Segoe UI", sans-serif';
  ctx.fillText(tagline, 26, h * 0.64, w * 0.62);

  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.font = '600 14px "JetBrains Mono", monospace';
  ctx.fillText(footer, 26, h - 24, w * 0.66);
}

export function paintPortraitCitylightCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  ad: IAdCampaignSpec,
  lang: LanguageId,
): void {
  drawBackground(ctx, w, h, ad);
  const badge = lang === 'en' ? ad.badgeEn : ad.badgePl;
  const title = lang === 'en' ? ad.titleEn : ad.titlePl;
  const tagline = lang === 'en' ? ad.taglineEn : ad.taglinePl;
  const footer = lang === 'en' ? ad.footerEn : ad.footerPl;

  ctx.fillStyle = ad.accentHex;
  ctx.fillRect(18, 22, w - 36, 4);
  ctx.font = '800 11px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge, w * 0.5, 42, w - 28);

  drawMotifBadge(ctx, w * 0.5, h * 0.37, w * 0.25, ad);

  ctx.fillStyle = ad.textHex;
  ctx.font = '900 25px "Inter", "Segoe UI", sans-serif';
  ctx.fillText(title, w * 0.5, h * 0.64, w - 26);

  ctx.fillStyle = ad.accentHex;
  ctx.font = '700 16px "Inter", "Segoe UI", sans-serif';
  ctx.fillText(tagline, w * 0.5, h * 0.76, w - 26);

  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.font = '600 11px "Inter", sans-serif';
  ctx.fillText(footer, w * 0.5, h - 28, w - 24);
}

export function paintInteriorStripAdCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  ad: IAdCampaignSpec,
  lang: LanguageId,
): void {
  drawBackground(ctx, w, h, ad);
  drawMotifBadge(ctx, 56, h * 0.5, h * 0.34, ad);

  const title = lang === 'en' ? ad.titleEn : ad.titlePl;
  const tagline = lang === 'en' ? ad.taglineEn : ad.taglinePl;
  const badge = lang === 'en' ? ad.badgeEn : ad.badgePl;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ad.accentHex;
  ctx.font = '800 11px "JetBrains Mono", monospace';
  ctx.fillText(badge, 112, 24, w - 130);

  ctx.fillStyle = ad.textHex;
  ctx.font = '900 24px "Inter", "Segoe UI", sans-serif';
  ctx.fillText(`${title} — ${tagline}`, 112, h * 0.56, w - 128);

  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '600 12px "Inter", sans-serif';
  ctx.fillText(lang === 'en' ? ad.footerEn : ad.footerPl, 112, h - 18, w - 128);
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  ad: IAdCampaignSpec,
): void {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, ad.bgStartHex);
  grad.addColorStop(1, ad.bgEndHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = ad.accentHex;
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, w - 12, h - 12);

  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.beginPath();
  ctx.arc(w * 0.82, h * 0.25, Math.max(w, h) * 0.32, 0, Math.PI * 2);
  ctx.fill();
}

function drawPillHeader(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  accentHex: string,
): void {
  ctx.font = '800 12px "JetBrains Mono", monospace';
  const padX = 12;
  const textW = Math.min(280, ctx.measureText(label).width);
  ctx.fillStyle = accentHex;
  ctx.fillRect(x, y, textW + padX * 2, 24);
  ctx.fillStyle = '#090d16';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + padX, y + 12.5, 280);
}

function drawMotifBadge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  ad: IAdCampaignSpec,
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(9, 13, 22, 0.45)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = ad.accentHex;
  ctx.stroke();
  drawMotifGlyph(ctx, cx, cy, r * 0.56, ad.motif, ad.accentHex, ad.textHex);
  ctx.restore();
}

function drawMotifGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
  motif: AdGraphicMotif,
  accentHex: string,
  textHex: string,
): void {
  ctx.strokeStyle = accentHex;
  ctx.fillStyle = accentHex;
  ctx.lineWidth = Math.max(2.5, s * 0.12);
  if (motif === 'coffee') {
    ctx.fillRect(cx - s * 0.55, cy - s * 0.2, s * 0.95, s * 0.72);
    ctx.strokeRect(cx + s * 0.4, cy - s * 0.08, s * 0.26, s * 0.42);
    ctx.fillStyle = textHex;
    ctx.fillRect(cx - s * 0.7, cy + s * 0.56, s * 1.3, s * 0.12);
    return;
  }
  if (motif === 'laptop' || motif === 'cinema') {
    ctx.strokeRect(cx - s * 0.65, cy - s * 0.48, s * 1.3, s * 0.82);
    ctx.fillRect(cx - s * 0.82, cy + s * 0.4, s * 1.64, s * 0.14);
    return;
  }
  if (motif === 'eco' || motif === 'safety') {
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.1, cy - s * 0.75);
    ctx.lineTo(cx - s * 0.48, cy + s * 0.08);
    ctx.lineTo(cx + s * 0.04, cy + s * 0.08);
    ctx.lineTo(cx - s * 0.14, cy + s * 0.75);
    ctx.lineTo(cx + s * 0.52, cy - s * 0.08);
    ctx.lineTo(cx, cy - s * 0.08);
    ctx.closePath();
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.55, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = textHex;
  ctx.font = `900 ${Math.round(s * 0.75)}px "Inter", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const symbol = motif === 'transit' ? 'M' : motif === 'academy' ? '★' : motif === 'concert' ? '♪' : '●';
  ctx.fillText(symbol, cx, cy + 2);
}
