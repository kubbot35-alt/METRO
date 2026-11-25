import * as THREE from 'three';

function createCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not acquire 2D canvas context for procedural texture.');
  }
  return [canvas, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  maxAnisotropy: number,
  isColor = true,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  return tex;
}

export function createTunnelConcreteTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256, 256);
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
  return finalizeTexture(canvas, 1, 1, maxAnisotropy, true);
}

export function createBallastTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256, 256);
  ctx.fillStyle = '#1b1d22';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i += 1) {
    const v = 22 + ((i * 29) % 30);
    ctx.fillStyle = `rgb(${v + 4}, ${v + 2}, ${v})`;
    ctx.fillRect((i * 71) % 256, (i * 43) % 256, 4, 4);
  }
  return finalizeTexture(canvas, 2, 420, maxAnisotropy, true);
}

export function createPlatformTileTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256, 256);
  ctx.fillStyle = '#8b939e';
  ctx.fillRect(0, 0, 256, 256);
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
  ctx.fillStyle = '#eab308';
  ctx.fillRect(0, 0, 22, 256);
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(22, 0, 6, 256);
  return finalizeTexture(canvas, 1, 24, maxAnisotropy, true);
}

export function createStationWallTexture(accentHex: number, maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256, 256);
  const accent = `#${accentHex.toString(16).padStart(6, '0')}`;
  ctx.fillStyle = '#cfd6de';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 108, 256, 36);
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 224, 256, 32);
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.14)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= 256; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  return finalizeTexture(canvas, 16, 1, maxAnisotropy, true);
}

export function createStationSignTexture(
  stationName: string,
  code: string,
  accentHex: number,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(512, 128);
  const accent = `#${accentHex.toString(16).padStart(6, '0')}`;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 512, 18);
  ctx.fillRect(0, 110, 512, 18);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 42px "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(stationName.toUpperCase(), 256, 58);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 20px "JetBrains Mono", monospace';
  ctx.fillText(`LINIA M1 · ${code}`, 256, 94);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createStopMarkerTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256, 128);
  ctx.fillStyle = '#064e3b';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 240, 112);
  ctx.fillStyle = '#ecfdf5';
  ctx.font = 'bold 46px "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('STOP', 128, 52);
  ctx.fillStyle = '#6ee7b7';
  ctx.font = '600 18px "JetBrains Mono", monospace';
  ctx.fillText('CZOŁO POCIĄGU', 128, 92);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createSpeedSignTexture(limitKmh: number, maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(128, 128);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 128, 128);
  ctx.beginPath();
  ctx.arc(64, 64, 54, 0, Math.PI * 2);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  ctx.lineWidth = 11;
  ctx.strokeStyle = '#dc2626';
  ctx.stroke();
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 48px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(limitKmh), 64, 66);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}
