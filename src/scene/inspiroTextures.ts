import * as THREE from 'three';
import type { ISimulationSnapshot, MetroLineId } from '../domain/types';
import { formatClockTime } from '../domain/scheduleSystem';

export interface IInspiroLedDisplay {
  readonly texture: THREE.CanvasTexture;
  setLine(lineId: MetroLineId, destinationLed: string): void;
  dispose(): void;
}

export interface IInspiroCabScreens {
  readonly leftLcdTexture: THREE.CanvasTexture;
  readonly rightLcdTexture: THREE.CanvasTexture;
  readonly mirrorMonitorTexture: THREE.CanvasTexture;
  update(snapshot: ISimulationSnapshot, dtSec: number): void;
  dispose(): void;
}

interface ICanvasSurface {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly texture: THREE.CanvasTexture;
}

function createSurface(width: number, height: number, maxAnisotropy: number): ICanvasSurface {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Cannot initialize 2D context for Inspiro screen.');
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return { canvas, ctx, texture };
}

function drawInspiroLedCanvas(
  ctx: CanvasRenderingContext2D,
  lineId: MetroLineId,
  destinationLed: string,
): void {
  ctx.fillStyle = '#07080b';
  ctx.fillRect(0, 0, 512, 96);
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 508, 92);
  drawLedMatrixGrid(ctx);
  ctx.fillStyle = lineId === 'M2' ? '#dc2626' : lineId === 'M1' ? '#f59e0b' : '#10b981';
  ctx.fillRect(18, 16, 78, 64);
  ctx.fillStyle = lineId === 'M1' ? '#090b10' : '#ffffff';
  ctx.font = `bold ${lineId.length > 2 ? 32 : 42}px "Chakra Petch", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(lineId, 57, 50);
  ctx.fillStyle = '#fbbf24';
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 10;
  ctx.font = `bold ${destinationLed.length > 12 ? 34 : 46}px "JetBrains Mono", monospace`;
  ctx.fillText(destinationLed, 300, 52);
  ctx.shadowBlur = 0;
}

export function createInspiroLedDisplay(maxAnisotropy: number): IInspiroLedDisplay {
  const { ctx, texture } = createSurface(512, 96, maxAnisotropy);
  drawInspiroLedCanvas(ctx, 'M1', 'MŁOCINY');
  texture.needsUpdate = true;
  return {
    texture,
    setLine: (lineId: MetroLineId, destinationLed: string): void => {
      drawInspiroLedCanvas(ctx, lineId, destinationLed);
      texture.needsUpdate = true;
    },
    dispose: (): void => texture.dispose(),
  };
}

export function createInspiroLedDisplayTexture(maxAnisotropy: number): THREE.CanvasTexture {
  return createInspiroLedDisplay(maxAnisotropy).texture;
}

function drawLedMatrixGrid(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgba(251, 191, 36, 0.06)';
  for (let y = 8; y < 88; y += 6) {
    for (let x = 106; x < 498; x += 6) {
      ctx.fillRect(x, y, 2, 2);
    }
  }
}

export function createInspiroCabScreens(maxAnisotropy: number): IInspiroCabScreens {
  const left = createSurface(512, 320, maxAnisotropy);
  const right = createSurface(512, 320, maxAnisotropy);
  const monitor = createSurface(256, 160, maxAnisotropy);
  let elapsed = 1;
  let lastDoorState = '';

  drawMonitorScreen(monitor.ctx, false);
  monitor.texture.needsUpdate = true;

  return {
    leftLcdTexture: left.texture,
    rightLcdTexture: right.texture,
    mirrorMonitorTexture: monitor.texture,
    update: (snapshot: ISimulationSnapshot, dtSec: number): void => {
      elapsed += dtSec;
      const doorsOpen = snapshot.doorState === 'open';
      if (snapshot.doorState !== lastDoorState) {
        lastDoorState = snapshot.doorState;
        drawMonitorScreen(monitor.ctx, doorsOpen);
        monitor.texture.needsUpdate = true;
      }
      if (elapsed < 0.14) {
        return;
      }
      elapsed = 0;
      drawLeftLcd(left.ctx, snapshot);
      left.texture.needsUpdate = true;
      drawRightLcd(right.ctx, snapshot);
      right.texture.needsUpdate = true;
    },
    dispose: (): void => {
      left.texture.dispose();
      right.texture.dispose();
      monitor.texture.dispose();
    },
  };
}

function drawLeftLcd(ctx: CanvasRenderingContext2D, snapshot: ISimulationSnapshot): void {
  ctx.fillStyle = '#07101d';
  ctx.fillRect(0, 0, 512, 320);
  ctx.strokeStyle = '#1e3a5f';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 504, 312);

  drawSpeedArc(ctx, snapshot.kinematics.speedKmh, snapshot.speedLimitKmh);
  drawLeftLcdBadges(ctx, snapshot);
  drawTractionStrip(ctx, snapshot.kinematics.throttle, snapshot.kinematics.serviceBrake, snapshot.kinematics.emergencyBrake);
}

function drawSpeedArc(ctx: CanvasRenderingContext2D, speedKmh: number, limitKmh: number): void {
  const cx = 165;
  const cy = 168;
  const r = 108;
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 0.78, Math.PI * 2.22);
  ctx.stroke();

  const ratio = Math.min(1, speedKmh / 100);
  const overspeed = speedKmh > limitKmh + 1;
  ctx.strokeStyle = overspeed ? '#ef4444' : '#38bdf8';
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 0.78, Math.PI * (0.78 + ratio * 1.44));
  ctx.stroke();

  ctx.fillStyle = overspeed ? '#fca5a5' : '#f8fafc';
  ctx.font = 'bold 74px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(Math.round(speedKmh)), cx, cy - 6);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 20px "JetBrains Mono", monospace';
  ctx.fillText('km/h', cx, cy + 42);
}

function drawLeftLcdBadges(ctx: CanvasRenderingContext2D, snapshot: ISimulationSnapshot): void {
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 18px "JetBrains Mono", monospace';
  ctx.fillText('LIMIT VMAX', 312, 52);
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 42px "JetBrains Mono", monospace';
  ctx.fillText(`${snapshot.speedLimitKmh}`, 312, 92);

  const aspect = snapshot.nextSignal?.signal.aspect ?? 'green';
  const sigColor = aspect === 'red' ? '#ef4444' : aspect === 'yellow' ? '#f59e0b' : '#10b981';
  const sigLabel = aspect === 'red' ? 'STÓJ (ATP)' : aspect === 'yellow' ? 'UWAGA 30' : 'WOLNA DROGA';
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(308, 128, 184, 68);
  ctx.fillStyle = sigColor;
  ctx.beginPath();
  ctx.arc(330, 162, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 19px "JetBrains Mono", monospace';
  ctx.fillText(sigLabel, 352, 164);
}

function drawTractionStrip(
  ctx: CanvasRenderingContext2D,
  throttle: number,
  brake: number,
  emergency: boolean,
): void {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(24, 266, 464, 30);
  const mid = 256;
  if (emergency || brake > 0.02) {
    const w = (emergency ? 1 : brake) * 224;
    ctx.fillStyle = emergency ? '#ef4444' : '#f59e0b';
    ctx.fillRect(mid - w, 270, w, 22);
  }
  if (throttle > 0.02) {
    ctx.fillStyle = '#10b981';
    ctx.fillRect(mid, 270, throttle * 224, 22);
  }
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(mid - 2, 266, 4, 30);
}

function drawRightLcd(ctx: CanvasRenderingContext2D, snapshot: ISimulationSnapshot): void {
  ctx.fillStyle = '#07101d';
  ctx.fillRect(0, 0, 512, 320);
  ctx.strokeStyle = '#1e3a5f';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 504, 312);

  const lineBadge = snapshot.line.badgeCode ?? snapshot.line.id;
  ctx.fillStyle = snapshot.line.id === 'M1' ? '#38bdf8' : snapshot.line.cssColor;
  ctx.font = 'bold 20px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`INSPIRO DIAG · ${lineBadge}`, 22, 34);
  ctx.fillStyle = '#cbd5e1';
  ctx.textAlign = 'right';
  ctx.fillText(formatClockTime(snapshot.schedule.currentClockSec), 488, 34);

  drawVoltageCard(ctx, snapshot.kinematics.throttle, snapshot.kinematics.serviceBrake);
  drawDoorSchematic(ctx, snapshot.doorState === 'open', snapshot.doorFault.phase !== 'none');
  drawStationFooter(ctx, snapshot);
}

function drawVoltageCard(ctx: CanvasRenderingContext2D, throttle: number, brake: number): void {
  const voltage = Math.round(750 - throttle * 22 + brake * 12);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(22, 54, 220, 88);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 16px "JetBrains Mono", monospace';
  ctx.fillText('ZASILANIE 3. SZYNA', 34, 78);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 42px "JetBrains Mono", monospace';
  ctx.fillText(`${voltage} V`, 34, 122);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(256, 54, 234, 88);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 16px "JetBrains Mono", monospace';
  ctx.fillText('FALOWNIK IGBT', 268, 78);
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 26px "JetBrains Mono", monospace';
  ctx.fillText('OK · AKTYWNY', 268, 118);
}

function drawDoorSchematic(ctx: CanvasRenderingContext2D, doorsOpen: boolean, fault: boolean): void {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(22, 156, 468, 86);
  ctx.textAlign = 'left';
  ctx.fillStyle = fault ? '#f59e0b' : doorsOpen ? '#10b981' : '#94a3b8';
  ctx.font = 'bold 17px "JetBrains Mono", monospace';
  ctx.fillText(fault ? 'DRZWI: AWARIA OBWODU' : doorsOpen ? 'DRZWI: OTWARTE (PERON)' : 'DRZWI: ZAMKNIĘTE · RYGIEL OK', 34, 180);

  for (let car = 0; car < 4; car += 1) {
    const x = 36 + car * 112;
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, 194, 102, 34);
    ctx.fillStyle = fault ? '#f59e0b' : doorsOpen ? '#22c55e' : '#334155';
    for (let d = 0; d < 4; d += 1) {
      ctx.fillRect(x + 8 + d * 23, 200, 15, 22);
    }
  }
}

function drawStationFooter(ctx: CanvasRenderingContext2D, snapshot: ISimulationSnapshot): void {
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 24px "Chakra Petch", sans-serif';
  ctx.fillText(snapshot.currentStation.station.name.toUpperCase(), 24, 286);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 22px "JetBrains Mono", monospace';
  ctx.fillText(`${Math.max(0, Math.round(snapshot.currentStation.distanceToTargetM))} m`, 488, 286);
}

function drawMonitorScreen(ctx: CanvasRenderingContext2D, doorsOpen: boolean): void {
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, 256, 160);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(10, 28, 120, 118);
  ctx.fillStyle = '#334155';
  ctx.fillRect(136, 28, 110, 118);
  ctx.fillStyle = '#eab308';
  ctx.fillRect(134, 28, 4, 118);
  ctx.fillStyle = doorsOpen ? '#10b981' : '#38bdf8';
  ctx.font = 'bold 14px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(doorsOpen ? 'CCTV PERON · DRZWI OTW.' : 'CCTV PERON · ZAMKN.', 12, 20);
}
