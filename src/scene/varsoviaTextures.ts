import * as THREE from 'three';
import type { ISimulationSnapshot } from '../domain/types';
import { createCanvasTextureSurface } from './shared/canvasTextureFactory';
import { drawCctvDualCameraOverlay } from './shared/cctvOverlayPainter';
import { BaseLedDisplay, type ILedDestinationDisplay } from './shared/ledMatrixPainter';
import { drawVarsoviaCenterScreen, drawVarsoviaLeftScreen } from './varsoviaScreensPainter';

export type IVarsoviaLedDisplay = ILedDestinationDisplay;

export interface IVarsoviaCabScreens {
  readonly leftScreenTexture: THREE.CanvasTexture;
  readonly centerScreenTexture: THREE.CanvasTexture;
  readonly rightScreenTexture: THREE.CanvasTexture;
  update(snapshot: ISimulationSnapshot, dtSec: number): void;
  dispose(): void;
}

class VarsoviaLedDisplay extends BaseLedDisplay {
  public constructor(maxAnisotropy: number) {
    super(
      {
        width: 512,
        height: 96,
        backgroundHex: '#04070c',
        borderHex: null,
        textColorHex: '#f8fafc',
        textGlowHex: null,
        gridDotColor: null,
        gridLineColor: 'rgba(0,0,0,0.22)',
        resolveBadgeColors: (lineId) => ({
          bg: lineId === 'M2' ? '#dc2626' : lineId === 'M1' ? '#2563eb' : '#0891b2',
          fg: '#ffffff',
        }),
      },
      maxAnisotropy,
      'KABATY',
    );
  }
}

export function createVarsoviaLedDisplay(maxAnisotropy: number): IVarsoviaLedDisplay {
  return new VarsoviaLedDisplay(maxAnisotropy);
}

class VarsoviaCabScreens implements IVarsoviaCabScreens {
  public readonly leftScreenTexture: THREE.CanvasTexture;
  public readonly centerScreenTexture: THREE.CanvasTexture;
  public readonly rightScreenTexture: THREE.CanvasTexture;
  private readonly leftCtx: CanvasRenderingContext2D;
  private readonly centerCtx: CanvasRenderingContext2D;
  private readonly rightCtx: CanvasRenderingContext2D;
  private accumSec = 1;

  public constructor(maxAnisotropy: number) {
    const left = createCanvasTextureSurface({ width: 512, height: 300, maxAnisotropy });
    const center = createCanvasTextureSurface({ width: 512, height: 300, maxAnisotropy });
    const right = createCanvasTextureSurface({ width: 512, height: 300, maxAnisotropy });
    this.leftScreenTexture = left.texture; this.leftCtx = left.ctx;
    this.centerScreenTexture = center.texture; this.centerCtx = center.ctx;
    this.rightScreenTexture = right.texture; this.rightCtx = right.ctx;
    drawCctvDualCameraOverlay(this.rightCtx, null);
    this.rightScreenTexture.needsUpdate = true;
  }

  public update(snapshot: ISimulationSnapshot, dtSec: number): void {
    this.accumSec += Math.max(dtSec, 0.016);
    if (this.accumSec < 0.085) return;
    this.accumSec = 0;
    drawVarsoviaLeftScreen(this.leftCtx, snapshot);
    drawVarsoviaCenterScreen(this.centerCtx, snapshot);
    drawCctvDualCameraOverlay(this.rightCtx, snapshot.openDoorSide);
    this.leftScreenTexture.needsUpdate = true;
    this.centerScreenTexture.needsUpdate = true;
    this.rightScreenTexture.needsUpdate = true;
  }

  public dispose(): void {
    this.leftScreenTexture.dispose();
    this.centerScreenTexture.dispose();
    this.rightScreenTexture.dispose();
  }
}

export function createVarsoviaCabScreens(maxAnisotropy: number): IVarsoviaCabScreens {
  return new VarsoviaCabScreens(maxAnisotropy);
}
