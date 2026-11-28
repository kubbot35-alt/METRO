import * as THREE from 'three';
import { createTextureCanvas, finalizeClampedTexture, finalizeRepeatTexture } from './textureCanvasUtils';

export function createTunnelConcreteTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = createTextureCanvas(256, 256);
  ctx.fillStyle = '#252a32';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i += 1) {
    const shade = 28 + Math.floor((i * 37) % 24);
    ctx.fillStyle = `rgb(${shade}, ${shade + 3}, ${shade + 8})`;
    ctx.fillRect((i * 53) % 256, (i * 97) % 256, 6, 4);
  }
  ctx.strokeStyle = 'rgba(10, 12, 16, 0.7)';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 124);
  ctx.strokeRect(2, 130, 252, 124);
  return finalizeRepeatTexture(canvas, 1, 1, maxAnisotropy, true);
}

export function createBallastTexture(maxAnisotropy: number, repeatY = 920): THREE.CanvasTexture {
  const [canvas, ctx] = createTextureCanvas(256, 256);
  ctx.fillStyle = '#1b1d22';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i += 1) {
    const v = 22 + ((i * 29) % 30);
    ctx.fillStyle = `rgb(${v + 4}, ${v + 2}, ${v})`;
    ctx.fillRect((i * 71) % 256, (i * 43) % 256, 4, 4);
  }
  return finalizeRepeatTexture(canvas, 2, repeatY, maxAnisotropy, true);
}

export function createPlatformTileTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = createTextureCanvas(256, 256);
  ctx.fillStyle = '#8b939e';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 650; i += 1) {
    const shade = 126 + ((i * 19) % 24);
    ctx.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 10})`;
    ctx.fillRect((i * 47) % 256, (i * 83) % 256, 5, 5);
  }
  ctx.strokeStyle = '#5c6470';
  ctx.lineWidth = 2;
  for (let step = 0; step <= 256; step += 64) {
    ctx.beginPath();
    ctx.moveTo(step, 0);
    ctx.lineTo(step, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, step);
    ctx.lineTo(256, step);
    ctx.stroke();
  }
  return finalizeRepeatTexture(canvas, 2, 24, maxAnisotropy, true);
}

export function createStationWallTexture(accentHex: number, maxAnisotropy: number, wallBaseHex?: number): THREE.CanvasTexture {
  const [canvas, ctx] = createTextureCanvas(256, 256);
  ctx.fillStyle = wallBaseHex !== undefined ? `#${wallBaseHex.toString(16).padStart(6, '0')}` : '#cfd6de';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
  ctx.fillRect(0, 0, 256, 36);
  ctx.fillStyle = `#${accentHex.toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 102, 256, 44);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.fillRect(0, 102, 256, 4);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 224, 256, 32);
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.2)';
  ctx.lineWidth = 3;
  for (let x = 0; x <= 256; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke(); }
  return finalizeRepeatTexture(canvas, 16, 1, maxAnisotropy, true);
}

export function createStationSignTexture(stationName: string, code: string, accentHex: number, maxAnisotropy: number, lineId = 'M1'): THREE.CanvasTexture {
  const [canvas, ctx] = createTextureCanvas(512, 128);
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = `#${accentHex.toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 0, 512, 18);
  ctx.fillRect(0, 110, 512, 18);
  ctx.fillStyle = '#f8fafc';
  ctx.font = `bold ${stationName.length > 18 ? 30 : 38}px "Chakra Petch", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(stationName.toUpperCase(), 256, 56);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 18px "JetBrains Mono", monospace';
  ctx.fillText(`LINIA ${lineId} · ${code}`, 256, 93);
  return finalizeClampedTexture(canvas, maxAnisotropy);
}

export function createPlatformClockTexture(lineId: string, destinationLed: string, lineCssColor: string, maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = createTextureCanvas(512, 144);
  ctx.fillStyle = '#070a10';
  ctx.fillRect(0, 0, 512, 144);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 506, 138);
  ctx.fillStyle = lineCssColor;
  ctx.fillRect(18, 18, 72, 48);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${lineId.length > 2 ? 24 : 30}px "Chakra Petch", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(lineId, 54, 44);
  drawClockDestinationRows(ctx, destinationLed);
  return finalizeClampedTexture(canvas, maxAnisotropy);
}

function drawClockDestinationRows(ctx: CanvasRenderingContext2D, destinationLed: string): void {
  ctx.fillStyle = '#fbbf24';
  ctx.font = `bold ${destinationLed.length > 13 ? 21 : 28}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'left';
  ctx.fillText(destinationLed, 108, 44);
  ctx.fillStyle = '#34d399';
  ctx.textAlign = 'right';
  ctx.font = 'bold 28px "JetBrains Mono", monospace';
  ctx.fillText('TERAZ', 490, 44);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(18, 80, 476, 46);
  ctx.fillStyle = '#f59e0b';
  ctx.textAlign = 'left';
  ctx.font = '600 22px "JetBrains Mono", monospace';
  ctx.fillText(`NAST. POCIĄG: ${destinationLed}`, 30, 104);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fef3c7';
  ctx.fillText('2 min', 480, 104);
}
