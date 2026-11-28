import * as THREE from 'three';
import { createCanvasTextureSurface } from './shared/canvasTextureFactory';
import { BaseLedDisplay, type ILedDestinationDisplay } from './shared/ledMatrixPainter';

export type ISeria81DestBoard = ILedDestinationDisplay;
export const ANALOG_DIAL_SWEEP_RAD = (240 * Math.PI) / 180;

export function normalizedValueToNeedleZ(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return (0.5 - clamped) * ANALOG_DIAL_SWEEP_RAD;
}

class Seria81DestBoard extends BaseLedDisplay {
  public constructor(maxAnisotropy: number) {
    super(
      {
        width: 512,
        height: 128,
        backgroundHex: '#d8e1eb',
        borderHex: '#0f172a',
        textColorHex: '#020617',
        textGlowHex: null,
        gridDotColor: null,
        gridLineColor: null,
        resolveBadgeColors: (lineId) => ({
          bg: lineId === 'M2' ? '#b91c1c' : lineId === 'M1' ? '#1d4ed8' : '#059669',
          fg: '#ffffff',
        }),
      },
      maxAnisotropy,
    );
  }
}

export function createSeria81DestBoard(maxAnisotropy: number): ISeria81DestBoard {
  return new Seria81DestBoard(maxAnisotropy);
}

export function createAnalogSpeedometerDialTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const { ctx, texture } = createCanvasTextureSurface({ width: 512, height: 512, maxAnisotropy });
  const cx = 256;
  const cy = 256;
  const r = 236;
  drawDialBackdrop(ctx, cx, cy, r);
  drawColoredArc(ctx, cx, cy, r - 24, 0.8, 1.0, '#dc2626', 14);
  drawDialTicks(ctx, cx, cy, r - 18, 20, 2, (idx) => String(idx * 5));
  drawDialFooter(ctx, cx, cy, 'km/h', 'PRĘDKOŚĆ · 81-717', '#e5e7eb');
  texture.needsUpdate = true;
  return texture;
}

export function createAnalogManometerDialTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const { ctx, texture } = createCanvasTextureSurface({ width: 512, height: 512, maxAnisotropy });
  const cx = 256;
  const cy = 256;
  const r = 236;
  drawDialBackdrop(ctx, cx, cy, r);
  drawColoredArc(ctx, cx, cy, r - 24, 0.0, 0.375, '#dc2626', 14);
  drawColoredArc(ctx, cx, cy, r - 24, 0.375, 0.6, '#d97706', 14);
  drawColoredArc(ctx, cx, cy, r - 24, 0.6, 0.72, '#16a34a', 14);
  drawDialTicks(ctx, cx, cy, r - 18, 16, 2, (idx) => String(idx * 0.5));
  drawDialFooter(ctx, cx, cy, 'BAR', 'PRZEWÓD HAMULCOWY', '#fef08a');
  texture.needsUpdate = true;
  return texture;
}

function drawDialFooter(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  unit: string,
  subtitle: string,
  unitColor: string,
): void {
  ctx.fillStyle = unitColor;
  ctx.font = 'bold 26px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(unit, cx, cy + 92);
  ctx.fillStyle = '#9ca3af';
  ctx.font = '600 17px "JetBrains Mono", monospace';
  ctx.fillText(subtitle, cx, cy + 128);
}

function drawDialBackdrop(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.fillStyle = '#0c1012';
  ctx.fillRect(0, 0, 512, 512);
  const grad = ctx.createRadialGradient(cx, cy, 30, cx, cy, r);
  grad.addColorStop(0, '#1e2624');
  grad.addColorStop(0.85, '#121817');
  grad.addColorStop(1, '#090c0c');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4b5563';
  ctx.lineWidth = 8;
  ctx.stroke();
}

function drawColoredArc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  tStart: number,
  tEnd: number,
  color: string,
  lineWidth: number,
): void {
  const a0 = -Math.PI / 2 + (tStart - 0.5) * ANALOG_DIAL_SWEEP_RAD;
  const a1 = -Math.PI / 2 + (tEnd - 0.5) * ANALOG_DIAL_SWEEP_RAD;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(cx, cy, r, a0, a1);
  ctx.stroke();
}

function drawDialTicks(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number,
  steps: number, majorEvery: number, labelForStep: (stepIndex: number) => string,
): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= steps; i += 1) {
    const angle = -Math.PI / 2 + (i / steps - 0.5) * ANALOG_DIAL_SWEEP_RAD;
    drawSingleDialTick(ctx, cx, cy, outerR, angle, i % majorEvery === 0, i % majorEvery === 0 ? labelForStep(i) : null);
  }
}

function drawSingleDialTick(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number, angle: number, isMajor: boolean, label: string | null,
): void {
  const innerR = isMajor ? outerR - 30 : outerR - 16;
  ctx.strokeStyle = isMajor ? '#fef3c7' : '#9ca3af';
  ctx.lineWidth = isMajor ? 5 : 2.5;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
  ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
  ctx.stroke();
  if (label !== null) {
    const textR = outerR - 58;
    ctx.fillStyle = '#fef9c3';
    ctx.font = 'bold 28px "JetBrains Mono", monospace';
    ctx.fillText(label, cx + Math.cos(angle) * textR, cy + Math.sin(angle) * textR);
  }
}
