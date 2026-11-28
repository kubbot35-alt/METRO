import * as THREE from 'three';
import type { MetroLineId } from '../../domain/types';
import { createCanvasTextureSurface } from './canvasTextureFactory';

export interface ILedDestinationDisplay {
  readonly texture: THREE.CanvasTexture;
  setLine(lineId: MetroLineId, destinationLed: string): void;
  dispose(): void;
}

export interface ILedPainterStyle {
  readonly width: number;
  readonly height: number;
  readonly backgroundHex: string;
  readonly borderHex: string | null;
  readonly textColorHex: string;
  readonly textGlowHex: string | null;
  readonly gridDotColor: string | null;
  readonly gridLineColor: string | null;
  readonly resolveBadgeColors: (lineId: MetroLineId) => { readonly bg: string; readonly fg: string };
}

export abstract class BaseLedDisplay implements ILedDestinationDisplay {
  public readonly texture: THREE.CanvasTexture;
  protected readonly ctx: CanvasRenderingContext2D;
  private readonly style: ILedPainterStyle;

  public constructor(style: ILedPainterStyle, maxAnisotropy: number, initialDest = 'MŁOCINY') {
    const surface = createCanvasTextureSurface({
      width: style.width,
      height: style.height,
      maxAnisotropy,
    });
    this.ctx = surface.ctx;
    this.texture = surface.texture;
    this.style = style;
    this.setLine('M1', initialDest);
  }

  public setLine(lineId: MetroLineId, destinationLed: string): void {
    this.paintBackdrop();
    this.paintBadge(lineId);
    this.paintDestination(destinationLed);
    this.paintMatrixOverlay();
    this.texture.needsUpdate = true;
  }

  public dispose(): void {
    this.texture.dispose();
  }

  private paintBackdrop(): void {
    const { width, height, backgroundHex, borderHex } = this.style;
    this.ctx.fillStyle = backgroundHex;
    this.ctx.fillRect(0, 0, width, height);
    if (!borderHex) {
      return;
    }
    this.ctx.strokeStyle = borderHex;
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(2, 2, width - 4, height - 4);
  }

  private paintBadge(lineId: MetroLineId): void {
    const { bg, fg } = this.style.resolveBadgeColors(lineId);
    const code = lineId.trim().toUpperCase().slice(0, 3) || 'M1';
    this.ctx.fillStyle = bg;
    this.ctx.fillRect(14, 14, 82, this.style.height - 28);
    this.ctx.fillStyle = fg;
    this.ctx.font = `bold ${code.length > 2 ? 32 : 40}px "JetBrains Mono", monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(code, 55, this.style.height * 0.5 + 2);
  }

  private paintDestination(destinationLed: string): void {
    const label = destinationLed.trim().toUpperCase().slice(0, 18);
    this.ctx.fillStyle = this.style.textColorHex;
    this.ctx.shadowColor = this.style.textGlowHex ?? 'transparent';
    this.ctx.shadowBlur = this.style.textGlowHex ? 10 : 0;
    this.ctx.font = `bold ${label.length > 12 ? 33 : 42}px "JetBrains Mono", monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(label, 304, this.style.height * 0.5 + 2);
    this.ctx.shadowBlur = 0;
  }

  private paintMatrixOverlay(): void {
    const { width, height, gridDotColor, gridLineColor } = this.style;
    if (gridDotColor) {
      this.ctx.fillStyle = gridDotColor;
      for (let y = 8; y < height - 8; y += 6) {
        for (let x = 106; x < width - 14; x += 6) {
          this.ctx.fillRect(x, y, 2, 2);
        }
      }
    }
    if (gridLineColor) {
      this.ctx.fillStyle = gridLineColor;
      for (let y = 0; y < height; y += 4) {
        this.ctx.fillRect(0, y, width, 1);
      }
    }
  }
}
