import * as THREE from 'three';

export const MIRROR_RT_WIDTH = 256;
export const MIRROR_RT_HEIGHT = 160;

export function buildSrgbGammaLut(): Uint8Array {
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) {
    const lin = i / 255;
    const lifted = Math.min(1, Math.pow(lin, 1 / 2.15) * 1.12);
    lut[i] = Math.min(255, Math.round(lifted * 255));
  }
  return lut;
}

export function createStaticMirrorFallbackTexture(label: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = MIRROR_RT_WIDTH;
  canvas.height = MIRROR_RT_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (ctx) drawFallbackMirrorGraphic(ctx, label);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function drawFallbackMirrorGraphic(ctx: CanvasRenderingContext2D, label: string): void {
  const grad = ctx.createLinearGradient(0, 0, MIRROR_RT_WIDTH, MIRROR_RT_HEIGHT);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(0.5, '#1e293b');
  grad.addColorStop(1, '#090d16');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, MIRROR_RT_WIDTH, MIRROR_RT_HEIGHT);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
  ctx.lineWidth = 1;
  for (let y = 16; y < MIRROR_RT_HEIGHT; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(MIRROR_RT_WIDTH, y);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(148, 163, 184, 0.72)';
  ctx.font = 'bold 14px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, MIRROR_RT_WIDTH * 0.5, MIRROR_RT_HEIGHT * 0.48);
  ctx.fillStyle = 'rgba(100, 116, 139, 0.72)';
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.fillText('STANDBY / LOW FPS MODE', MIRROR_RT_WIDTH * 0.5, MIRROR_RT_HEIGHT * 0.62);
}

export function blitRenderTargetToCanvas(
  renderer: THREE.WebGLRenderer,
  target: THREE.WebGLRenderTarget,
  canvas: HTMLCanvasElement,
  mirrorHorizontal: boolean,
  pixelBuf: Uint8Array,
  gammaLut: Uint8Array,
  existingImageData: ImageData | null,
): ImageData | null {
  const ctx2d = canvas.getContext('2d');
  if (!ctx2d) return existingImageData;
  let imageData = existingImageData;
  if (canvas.width !== MIRROR_RT_WIDTH || canvas.height !== MIRROR_RT_HEIGHT) {
    canvas.width = MIRROR_RT_WIDTH;
    canvas.height = MIRROR_RT_HEIGHT;
    imageData = null;
  }
  renderer.readRenderTargetPixels(target, 0, 0, MIRROR_RT_WIDTH, MIRROR_RT_HEIGHT, pixelBuf);
  if (!imageData) imageData = ctx2d.createImageData(MIRROR_RT_WIDTH, MIRROR_RT_HEIGHT);
  copyGammaPixels(imageData.data, pixelBuf, gammaLut, mirrorHorizontal);
  ctx2d.putImageData(imageData, 0, 0);
  return imageData;
}

function copyGammaPixels(dst: Uint8ClampedArray, src: Uint8Array, lut: Uint8Array, mirrorHorizontal: boolean): void {
  for (let y = 0; y < MIRROR_RT_HEIGHT; y += 1) {
    const srcRow = (MIRROR_RT_HEIGHT - 1 - y) * MIRROR_RT_WIDTH;
    const dstRow = y * MIRROR_RT_WIDTH;
    for (let x = 0; x < MIRROR_RT_WIDTH; x += 1) {
      const srcX = mirrorHorizontal ? MIRROR_RT_WIDTH - 1 - x : x;
      const si = (srcRow + srcX) * 4;
      const di = (dstRow + x) * 4;
      dst[di] = lut[src[si]];
      dst[di + 1] = lut[src[si + 1]];
      dst[di + 2] = lut[src[si + 2]];
      dst[di + 3] = 255;
    }
  }
}
