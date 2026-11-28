import type { AdGraphicMotif, IAdCampaignSpec } from '../domain/metroAdsCatalog';

export function drawAdBackground(ctx: CanvasRenderingContext2D, w: number, h: number, ad: IAdCampaignSpec): void {
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

export function drawAdPillHeader(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, accentHex: string): void {
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

export function drawAdMotifBadge(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, ad: IAdCampaignSpec): void {
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
  ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, motif: AdGraphicMotif, accentHex: string, textHex: string,
): void {
  ctx.strokeStyle = accentHex;
  ctx.fillStyle = accentHex;
  ctx.lineWidth = Math.max(2.5, s * 0.12);
  if (motif === 'coffee') return drawCoffeeGlyph(ctx, cx, cy, s, textHex);
  if (motif === 'laptop' || motif === 'cinema') {
    ctx.strokeRect(cx - s * 0.65, cy - s * 0.48, s * 1.3, s * 0.82);
    ctx.fillRect(cx - s * 0.82, cy + s * 0.4, s * 1.64, s * 0.14);
    return;
  }
  if (motif === 'eco' || motif === 'safety') return drawBoltGlyph(ctx, cx, cy, s);
  drawBadgeSymbolGlyph(ctx, cx, cy, s, motif, textHex);
}

function drawCoffeeGlyph(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, textHex: string): void {
  ctx.fillRect(cx - s * 0.55, cy - s * 0.2, s * 0.95, s * 0.72);
  ctx.strokeRect(cx + s * 0.4, cy - s * 0.08, s * 0.26, s * 0.42);
  ctx.fillStyle = textHex;
  ctx.fillRect(cx - s * 0.7, cy + s * 0.56, s * 1.3, s * 0.12);
}

function drawBoltGlyph(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.1, cy - s * 0.75);
  ctx.lineTo(cx - s * 0.48, cy + s * 0.08);
  ctx.lineTo(cx + s * 0.04, cy + s * 0.08);
  ctx.lineTo(cx - s * 0.14, cy + s * 0.75);
  ctx.lineTo(cx + s * 0.52, cy - s * 0.08);
  ctx.lineTo(cx, cy - s * 0.08);
  ctx.closePath();
  ctx.fill();
}

function drawBadgeSymbolGlyph(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, motif: AdGraphicMotif, textHex: string): void {
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
