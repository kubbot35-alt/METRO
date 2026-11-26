import * as THREE from 'three';
import type { MetroLineId } from '../domain/types';

export interface ISeria81DestBoard {
  readonly texture: THREE.CanvasTexture;
  setLine(lineId: MetroLineId, destinationLed: string): void;
  dispose(): void;
}

export const ANALOG_DIAL_SWEEP_RAD = (240 * Math.PI) / 180;

export function normalizedValueToNeedleZ(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return (0.5 - clamped) * ANALOG_DIAL_SWEEP_RAD;
}

function createCanvasTexture(
  width: number,
  height: number,
  maxAnisotropy: number,
): { ctx: CanvasRenderingContext2D; texture: THREE.CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Cannot create 2D context for Seria 81 textures.');
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return { ctx, texture };
}

function drawDestBoardCanvas(
  ctx: CanvasRenderingContext2D,
  lineId: MetroLineId,
  destinationLed: string,
): void {
  ctx.fillStyle = '#d8e1eb';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 502, 118);

  ctx.fillStyle = lineId === 'M2' ? '#b91c1c' : '#1d4ed8';
  ctx.fillRect(16, 18, 102, 92);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 58px "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(lineId, 67, 66);

  ctx.fillStyle = '#020617';
  ctx.font = 'bold 60px "Chakra Petch", sans-serif';
  ctx.fillText(destinationLed, 314, 66);
}

export function createSeria81DestBoard(maxAnisotropy: number): ISeria81DestBoard {
  const { ctx, texture } = createCanvasTexture(512, 128, maxAnisotropy);
  drawDestBoardCanvas(ctx, 'M1', 'MŁOCINY');
  texture.needsUpdate = true;
  return {
    texture,
    setLine: (lineId: MetroLineId, destinationLed: string): void => {
      drawDestBoardCanvas(ctx, lineId, destinationLed);
      texture.needsUpdate = true;
    },
    dispose: (): void => texture.dispose(),
  };
}

export function createAnalogSpeedometerDialTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const { ctx, texture } = createCanvasTexture(512, 512, maxAnisotropy);
  const cx = 256;
  const cy = 256;
  const r = 236;

  drawDialBackdrop(ctx, cx, cy, r);
  drawColoredArc(ctx, cx, cy, r - 24, 0.8, 1.0, '#dc2626', 14);
  drawDialTicks(ctx, cx, cy, r - 18, 20, 2, (idx) => String(idx * 5));

  ctx.fillStyle = '#e5e7eb';
  ctx.font = 'bold 28px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('km/h', cx, cy + 92);
  ctx.fillStyle = '#9ca3af';
  ctx.font = '600 18px "JetBrains Mono", monospace';
  ctx.fillText('PRĘDKOŚĆ · 81-717', cx, cy + 128);

  texture.needsUpdate = true;
  return texture;
}

export function createAnalogManometerDialTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const { ctx, texture } = createCanvasTexture(512, 512, maxAnisotropy);
  const cx = 256;
  const cy = 256;
  const r = 236;

  drawDialBackdrop(ctx, cx, cy, r);
  drawColoredArc(ctx, cx, cy, r - 24, 0.0, 0.375, '#dc2626', 14);
  drawColoredArc(ctx, cx, cy, r - 24, 0.375, 0.6, '#d97706', 14);
  drawColoredArc(ctx, cx, cy, r - 24, 0.6, 0.72, '#16a34a', 14);
  drawDialTicks(ctx, cx, cy, r - 18, 16, 2, (idx) => String(idx * 0.5));

  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 26px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('BAR', cx, cy + 90);
  ctx.fillStyle = '#9ca3af';
  ctx.font = '600 17px "JetBrains Mono", monospace';
  ctx.fillText('PRZEWÓD HAMULCOWY', cx, cy + 126);

  texture.needsUpdate = true;
  return texture;
}

function drawDialBackdrop(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
): void {
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
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  steps: number,
  majorEvery: number,
  labelForStep: (stepIndex: number) => string,
): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const angle = -Math.PI / 2 + (t - 0.5) * ANALOG_DIAL_SWEEP_RAD;
    const isMajor = i % majorEvery === 0;
    const innerR = isMajor ? outerR - 30 : outerR - 16;

    ctx.strokeStyle = isMajor ? '#fef3c7' : '#9ca3af';
    ctx.lineWidth = isMajor ? 5 : 2.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
    ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
    ctx.stroke();

    if (isMajor) {
      const textR = outerR - 58;
      ctx.fillStyle = '#fef9c3';
      ctx.font = 'bold 28px "JetBrains Mono", monospace';
      ctx.fillText(
        labelForStep(i),
        cx + Math.cos(angle) * textR,
        cy + Math.sin(angle) * textR,
      );
    }
  }
}
