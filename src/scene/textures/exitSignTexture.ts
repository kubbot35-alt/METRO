import * as THREE from 'three';
import { createTextureCanvas, finalizeClampedTexture } from './textureCanvasUtils';

export function createExitSignTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = createTextureCanvas(512, 128);
  ctx.fillStyle = '#064e3b';
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = '#059669';
  ctx.fillRect(8, 8, 496, 112);
  ctx.strokeStyle = '#a7f3d0';
  ctx.lineWidth = 5;
  ctx.strokeRect(10, 10, 492, 108);
  drawExitArrowIcon(ctx, 56, 64);
  drawExitArrowIcon(ctx, 456, 64);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WYJŚCIE / EXIT', 256, 66);
  return finalizeClampedTexture(canvas, maxAnisotropy);
}

function drawExitArrowIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.fillStyle = '#ecfdf5';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 26);
  ctx.lineTo(cx + 22, cy + 2);
  ctx.lineTo(cx + 9, cy + 2);
  ctx.lineTo(cx + 9, cy + 26);
  ctx.lineTo(cx - 9, cy + 26);
  ctx.lineTo(cx - 9, cy + 2);
  ctx.lineTo(cx - 22, cy + 2);
  ctx.closePath();
  ctx.fill();
}
