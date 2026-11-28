import * as THREE from 'three';
import { formatClockTime } from '../../domain/scheduleSystem';
import { createTextureCanvas, finalizeClampedTexture } from './textureCanvasUtils';

export interface ILivePlatformClock {
  readonly texture: THREE.CanvasTexture;
  update(clockSec: number): void;
  dispose(): void;
}

export class LivePlatformClockDisplay implements ILivePlatformClock {
  public readonly texture: THREE.CanvasTexture;
  private readonly ctx: CanvasRenderingContext2D;
  private lastFormatted = '';

  public constructor(maxAnisotropy: number) {
    const [canvas, ctx] = createTextureCanvas(256, 96);
    this.ctx = ctx;
    this.texture = finalizeClampedTexture(canvas, maxAnisotropy);
    this.paint('08:00:00');
  }

  public update(clockSec: number): void {
    const formatted = formatClockTime(clockSec);
    if (formatted === this.lastFormatted) return;
    this.paint(formatted);
  }

  public dispose(): void {
    this.texture.dispose();
  }

  private paint(formatted: string): void {
    this.lastFormatted = formatted;
    const ctx = this.ctx;
    ctx.fillStyle = '#070b12';
    ctx.fillRect(0, 0, 256, 96);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 5;
    ctx.strokeRect(3, 3, 250, 90);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(10, 10, 236, 76);
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('METRO WARSZAWA · CZAS', 128, 22);
    ctx.fillStyle = '#fb923c';
    ctx.font = 'bold 42px "JetBrains Mono", monospace';
    ctx.fillText(formatted, 128, 60);
    this.texture.needsUpdate = true;
  }
}
