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

export function createBallastTexture(maxAnisotropy: number, repeatY = 920): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256, 256);
  ctx.fillStyle = '#1b1d22';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i += 1) {
    const v = 22 + ((i * 29) % 30);
    ctx.fillStyle = `rgb(${v + 4}, ${v + 2}, ${v})`;
    ctx.fillRect((i * 71) % 256, (i * 43) % 256, 4, 4);
  }
  return finalizeTexture(canvas, 2, repeatY, maxAnisotropy, true);
}

export function createPlatformTileTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256, 256);
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
  return finalizeTexture(canvas, 2, 24, maxAnisotropy, true);
}

export function createStationWallTexture(
  accentHex: number,
  maxAnisotropy: number,
  wallBaseHex?: number,
): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256, 256);
  const accent = `#${accentHex.toString(16).padStart(6, '0')}`;
  const baseColor = wallBaseHex !== undefined ? `#${wallBaseHex.toString(16).padStart(6, '0')}` : '#cfd6de';
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
  ctx.fillRect(0, 0, 256, 36);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 102, 256, 44);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.fillRect(0, 102, 256, 4);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 224, 256, 32);
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.2)';
  ctx.lineWidth = 3;
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
  lineId = 'M1',
): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(512, 128);
  const accent = `#${accentHex.toString(16).padStart(6, '0')}`;
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 512, 18);
  ctx.fillRect(0, 110, 512, 18);
  ctx.fillStyle = '#f8fafc';
  const fontSize = stationName.length > 18 ? 30 : 38;
  ctx.font = `bold ${fontSize}px "Chakra Petch", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(stationName.toUpperCase(), 256, 56);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 18px "JetBrains Mono", monospace';
  ctx.fillText(`LINIA ${lineId} · ${code}`, 256, 93);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createPlatformClockTexture(
  lineId: string,
  destinationLed: string,
  lineCssColor: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(512, 144);
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

  ctx.fillStyle = '#fbbf24';
  const destSize = destinationLed.length > 13 ? 21 : 28;
  ctx.font = `bold ${destSize}px "JetBrains Mono", monospace`;
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

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createMeterMarkerTexture(meters: number, maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(160, 80);
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

export function createCurveLimitSignTexture(
  limitKmh: number,
  direction: 'left' | 'right',
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256, 256);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 18;
  ctx.strokeRect(10, 10, 236, 236);

  // Curved directional arrow at top
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (direction === 'left') {
    ctx.moveTo(156, 118);
    ctx.quadraticCurveTo(156, 62, 92, 62);
  } else {
    ctx.moveTo(100, 118);
    ctx.quadraticCurveTo(100, 62, 164, 62);
  }
  ctx.stroke();

  // Arrowhead
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  if (direction === 'left') {
    ctx.moveTo(74, 62);
    ctx.lineTo(108, 40);
    ctx.lineTo(108, 84);
  } else {
    ctx.moveTo(182, 62);
    ctx.lineTo(148, 40);
    ctx.lineTo(148, 84);
  }
  ctx.closePath();
  ctx.fill();

  // Bold curve speed limit value
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 92px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(limitKmh), 128, 178);
  ctx.font = 'bold 24px "Chakra Petch", sans-serif';
  ctx.fillText('ŁUK · KM/H', 128, 224);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createDepotPortalSignTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(512, 112);
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
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createDepotBuildingTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(512, 256);
  ctx.fillStyle = '#334e68';
  ctx.fillRect(0, 0, 512, 256);
  // Corrugated steel vertical ribs (tiles cleanly with no clipped text)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
  for (let x = 0; x < 512; x += 16) {
    ctx.fillRect(x, 0, 5, 256);
  }
  ctx.fillStyle = 'rgba(226, 232, 240, 0.08)';
  for (let x = 5; x < 512; x += 16) {
    ctx.fillRect(x, 0, 2, 256);
  }
  // Yellow & red Warsaw Metro depot stripe
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 148, 512, 18);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 166, 512, 22);
  // Dark concrete plinth at bottom
  ctx.fillStyle = '#475569';
  ctx.fillRect(0, 210, 512, 46);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(6, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createDepotSignboardTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(1024, 144);
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

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}


