import * as THREE from 'three';
import type { TrainVisualTheme } from '../../domain/types';

export const WINDSHIELD_CANVAS_W = 512;
export const WINDSHIELD_CANVAS_H = 256;

export interface IGlassDrop {
  x: number;
  y: number;
  r: number;
  alpha: number;
  streak: number;
  dripSpeed: number;
  isSnowflake: boolean;
  alive: boolean;
}

export function spawnGlassDrop(target: IGlassDrop, preSeed: boolean, isSnowflake: boolean): void {
  target.x = 18 + Math.random() * (WINDSHIELD_CANVAS_W - 36);
  target.y = preSeed ? Math.random() * (WINDSHIELD_CANVAS_H - 16) : Math.random() * (WINDSHIELD_CANVAS_H * 0.85);
  target.r = isSnowflake ? 2.0 + Math.random() * 2.8 : 2.6 + Math.random() * 4.2;
  target.alpha = 0.6 + Math.random() * 0.36;
  target.streak = !isSnowflake && preSeed ? Math.random() * 14 : 0;
  target.dripSpeed = isSnowflake ? 3 + Math.random() * 6 : 6 + Math.random() * 16;
  target.isSnowflake = isSnowflake;
  target.alive = true;
}

export function clearDropsAlongSweep(drops: IGlassDrop[], theme: TrainVisualTheme, phaseA: number, phaseB: number): void {
  const minP = Math.min(phaseA, phaseB);
  const maxP = Math.max(phaseA, phaseB);
  if (maxP - minP < 0.002) return;
  if (theme !== 'retro') {
    const angMin = THREE.MathUtils.lerp(1.28, -1.12, maxP);
    const angMax = THREE.MathUtils.lerp(1.28, -1.12, minP);
    wipeSector(drops, WINDSHIELD_CANVAS_W * 0.56, WINDSHIELD_CANVAS_H * 1.02, WINDSHIELD_CANVAS_H * 0.84, angMin - 0.09, angMax + 0.09);
    return;
  }
  const maxRad = WINDSHIELD_CANVAS_H * 0.88;
  const py = WINDSHIELD_CANVAS_H;
  wipeSector(drops, WINDSHIELD_CANVAS_W * 0.25, py, maxRad, THREE.MathUtils.lerp(-1.22, 0.88, minP) - 0.1, THREE.MathUtils.lerp(-1.22, 0.88, maxP) + 0.1);
  wipeSector(drops, WINDSHIELD_CANVAS_W * 0.75, py, maxRad, THREE.MathUtils.lerp(1.22, -0.88, maxP) - 0.1, THREE.MathUtils.lerp(1.22, -0.88, minP) + 0.1);
}

function wipeSector(drops: IGlassDrop[], pivotX: number, pivotY: number, maxRadius: number, minAngRad: number, maxAngRad: number): void {
  const maxR2 = maxRadius * maxRadius;
  for (let i = 0; i < drops.length; i += 1) {
    const d = drops[i];
    if (!d.alive) continue;
    const dx = d.x - pivotX;
    const dy = pivotY - d.y;
    if (dx * dx + dy * dy > maxR2 || dy < 0) continue;
    const ang = Math.atan2(dx, dy);
    if (ang >= minAngRad && ang <= maxAngRad) d.alive = false;
  }
}

export function paintWindshieldOverlayCanvas(
  ctx: CanvasRenderingContext2D,
  drops: readonly IGlassDrop[],
  mistAlpha: number,
  frost: number,
  isSnowMode: boolean,
): void {
  ctx.clearRect(0, 0, WINDSHIELD_CANVAS_W, WINDSHIELD_CANVAS_H);
  if (mistAlpha > 0.01) {
    ctx.fillStyle = isSnowMode
      ? `rgba(219, 234, 254, ${(mistAlpha * 0.75).toFixed(3)})`
      : `rgba(182, 204, 224, ${mistAlpha.toFixed(3)})`;
    ctx.fillRect(0, 0, WINDSHIELD_CANVAS_W, WINDSHIELD_CANVAS_H);
  }
  if (frost > 0.02) paintFrostVignette(ctx, frost);
  for (let i = 0; i < drops.length; i += 1) {
    if (drops[i].alive) paintSingleDrop(ctx, drops[i]);
  }
}

function paintFrostVignette(ctx: CanvasRenderingContext2D, frost: number): void {
  const frostAlpha = Math.min(0.65, frost * 0.72);
  const grad = ctx.createRadialGradient(
    WINDSHIELD_CANVAS_W * 0.5, WINDSHIELD_CANVAS_H * 0.54, WINDSHIELD_CANVAS_H * 0.34,
    WINDSHIELD_CANVAS_W * 0.5, WINDSHIELD_CANVAS_H * 0.5, WINDSHIELD_CANVAS_W * 0.58,
  );
  grad.addColorStop(0, 'rgba(241, 245, 249, 0)');
  grad.addColorStop(0.68, `rgba(226, 238, 252, ${(frostAlpha * 0.25).toFixed(3)})`);
  grad.addColorStop(1, `rgba(241, 248, 255, ${frostAlpha.toFixed(3)})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WINDSHIELD_CANVAS_W, WINDSHIELD_CANVAS_H);
}

function paintSingleDrop(ctx: CanvasRenderingContext2D, d: IGlassDrop): void {
  if (d.isSnowflake) { paintSnowflakeDrop(ctx, d); return; }
  paintWaterDrop(ctx, d);
}

function paintSnowflakeDrop(ctx: CanvasRenderingContext2D, d: IGlassDrop): void {
  ctx.fillStyle = `rgba(248, 250, 252, ${(d.alpha * 0.9).toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(224, 242, 254, ${(d.alpha * 0.75).toFixed(3)})`;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(d.x - d.r * 1.45, d.y);
  ctx.lineTo(d.x + d.r * 1.45, d.y);
  ctx.moveTo(d.x, d.y - d.r * 1.45);
  ctx.lineTo(d.x, d.y + d.r * 1.45);
  ctx.stroke();
}

function paintWaterDrop(ctx: CanvasRenderingContext2D, d: IGlassDrop): void {
  if (d.streak > 3) {
    ctx.strokeStyle = `rgba(205, 226, 245, ${(d.alpha * 0.34).toFixed(3)})`;
    ctx.lineWidth = Math.max(1.2, d.r * 0.65);
    ctx.beginPath();
    ctx.moveTo(d.x, d.y - d.streak);
    ctx.lineTo(d.x, d.y);
    ctx.stroke();
  }
  ctx.fillStyle = `rgba(218, 236, 252, ${(d.alpha * 0.56).toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(d.x, d.y, d.r * 0.85, d.r * 1.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(248, 252, 255, ${(d.alpha * 0.72).toFixed(3)})`;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.fillStyle = `rgba(255, 255, 255, ${(d.alpha * 0.85).toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(d.x - d.r * 0.25, d.y - d.r * 0.3, Math.max(0.8, d.r * 0.28), 0, Math.PI * 2);
  ctx.fill();
}
