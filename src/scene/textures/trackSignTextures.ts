import * as THREE from 'three';
import { createTextureCanvas, finalizeClampedTexture } from './textureCanvasUtils';

export function createMeterMarkerTexture(meters: number, maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = createTextureCanvas(160, 80);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 160, 80);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 152, 72);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 34px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${meters}m`, 80, 42);
  return finalizeClampedTexture(canvas, maxAnisotropy);
}

export function createStopMarkerTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = createTextureCanvas(256, 320);
  ctx.fillStyle = '#0b111c';
  ctx.fillRect(0, 0, 256, 320);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(14, 14, 228, 292);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 12;
  ctx.strokeRect(20, 20, 216, 280);
  drawW4StAndrewsCross(ctx);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(78, 252, 100, 38);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 26px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('W4', 128, 272);
  return finalizeClampedTexture(canvas, maxAnisotropy);
}

function drawW4StAndrewsCross(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = '#0b0f17';
  ctx.lineWidth = 34;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(34, 34);
  ctx.lineTo(222, 240);
  ctx.moveTo(222, 34);
  ctx.lineTo(34, 240);
  ctx.stroke();
}

export function createSpeedSignTexture(limitKmh: number, maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = createTextureCanvas(192, 192);
  ctx.fillStyle = '#0b1018';
  ctx.fillRect(0, 0, 192, 192);
  ctx.beginPath();
  ctx.arc(96, 96, 86, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 18;
  ctx.strokeStyle = '#dc2626';
  ctx.stroke();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(96, 96, 91, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#090d16';
  ctx.font = 'bold 76px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(limitKmh), 96, 100);
  return finalizeClampedTexture(canvas, maxAnisotropy);
}

export function createCurveLimitSignTexture(limitKmh: number, direction: 'left' | 'right', maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = createTextureCanvas(256, 256);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 18;
  ctx.strokeRect(10, 10, 236, 236);
  drawCurveArrow(ctx, direction);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 92px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(limitKmh), 128, 178);
  ctx.font = 'bold 24px "Chakra Petch", sans-serif';
  ctx.fillText('ŁUK · KM/H', 128, 224);
  return finalizeClampedTexture(canvas, maxAnisotropy);
}

function drawCurveArrow(ctx: CanvasRenderingContext2D, direction: 'left' | 'right'): void {
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (direction === 'left') { ctx.moveTo(156, 118); ctx.quadraticCurveTo(156, 62, 92, 62); }
  else { ctx.moveTo(100, 118); ctx.quadraticCurveTo(100, 62, 164, 62); }
  ctx.stroke();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  if (direction === 'left') { ctx.moveTo(74, 62); ctx.lineTo(108, 40); ctx.lineTo(108, 84); }
  else { ctx.moveTo(182, 62); ctx.lineTo(148, 40); ctx.lineTo(148, 84); }
  ctx.closePath();
  ctx.fill();
}

export function createDepotPortalSignTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = createTextureCanvas(512, 112);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 112);
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(0, 0, 512, 14);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 98, 512, 14);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 42px "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TUNEL M1 · KABATY', 256, 48);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 17px "JetBrains Mono", monospace';
  ctx.fillText('STP KABATY → STACJA A-1 KABATY', 256, 82);
  return finalizeClampedTexture(canvas, maxAnisotropy);
}

export function createDepotBuildingTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = createTextureCanvas(512, 256);
  ctx.fillStyle = '#334e68';
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
  for (let x = 0; x < 512; x += 16) ctx.fillRect(x, 0, 5, 256);
  ctx.fillStyle = 'rgba(226, 232, 240, 0.08)';
  for (let x = 5; x < 512; x += 16) ctx.fillRect(x, 0, 2, 256);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 148, 512, 18);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 166, 512, 22);
  ctx.fillStyle = '#475569';
  ctx.fillRect(0, 210, 512, 46);
  const tex = finalizeClampedTexture(canvas, maxAnisotropy);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(6, 1);
  return tex;
}

export function createDepotSignboardTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = createTextureCanvas(1024, 144);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 1024, 144);
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(0, 0, 1024, 14);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 132, 1024, 12);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 48px "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('METRO WARSZAWSKIE · STP KABATY', 512, 74);
  return finalizeClampedTexture(canvas, maxAnisotropy);
}
