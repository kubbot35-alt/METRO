import * as THREE from 'three';
import type { DoorSide, ISimulationSnapshot } from '../domain/types';
import { drawInspiroLeftLcd, drawInspiroRightLcd } from './inspiroLcdPainter';
import { createCanvasTextureSurface } from './shared/canvasTextureFactory';
import { drawCctvDualCameraOverlay } from './shared/cctvOverlayPainter';
import { BaseLedDisplay, type ILedDestinationDisplay } from './shared/ledMatrixPainter';

export type IInspiroLedDisplay = ILedDestinationDisplay;

export interface IInspiroCabScreens {
  readonly leftLcdTexture: THREE.CanvasTexture;
  readonly rightLcdTexture: THREE.CanvasTexture;
  readonly mirrorMonitorTexture: THREE.CanvasTexture;
  update(snapshot: ISimulationSnapshot, dtSec: number): void;
  dispose(): void;
}

class InspiroLedDisplay extends BaseLedDisplay {
  public constructor(maxAnisotropy: number) {
    super(
      {
        width: 512,
        height: 96,
        backgroundHex: '#07080b',
        borderHex: '#1f2937',
        textColorHex: '#fbbf24',
        textGlowHex: '#f59e0b',
        gridDotColor: 'rgba(251, 191, 36, 0.06)',
        gridLineColor: null,
        resolveBadgeColors: (lineId) => ({
          bg: lineId === 'M2' ? '#dc2626' : lineId === 'M1' ? '#f59e0b' : '#10b981',
          fg: lineId === 'M1' ? '#090b10' : '#ffffff',
        }),
      },
      maxAnisotropy,
    );
  }
}

export function createInspiroLedDisplay(maxAnisotropy: number): IInspiroLedDisplay {
  return new InspiroLedDisplay(maxAnisotropy);
}

export function createInspiroLedDisplayTexture(maxAnisotropy: number): THREE.CanvasTexture {
  return createInspiroLedDisplay(maxAnisotropy).texture;
}

class InspiroCabScreens implements IInspiroCabScreens {
  private readonly left: ReturnType<typeof createCanvasTextureSurface>;
  private readonly right: ReturnType<typeof createCanvasTextureSurface>;
  private readonly monitor: ReturnType<typeof createCanvasTextureSurface>;
  public readonly leftLcdTexture: THREE.CanvasTexture;
  public readonly rightLcdTexture: THREE.CanvasTexture;
  public readonly mirrorMonitorTexture: THREE.CanvasTexture;
  private elapsed = 1;
  private lastOpenDoorSide: DoorSide | null | undefined = undefined;

  public constructor(maxAnisotropy: number) {
    this.left = createCanvasTextureSurface({ width: 512, height: 320, maxAnisotropy });
    this.right = createCanvasTextureSurface({ width: 512, height: 320, maxAnisotropy });
    this.monitor = createCanvasTextureSurface({ width: 512, height: 300, maxAnisotropy });
    this.leftLcdTexture = this.left.texture;
    this.rightLcdTexture = this.right.texture;
    this.mirrorMonitorTexture = this.monitor.texture;
    drawCctvDualCameraOverlay(this.monitor.ctx, null);
    this.monitor.texture.needsUpdate = true;
  }

  public update(snapshot: ISimulationSnapshot, dtSec: number): void {
    this.elapsed += dtSec;
    if (snapshot.openDoorSide !== this.lastOpenDoorSide) {
      this.lastOpenDoorSide = snapshot.openDoorSide;
      drawCctvDualCameraOverlay(this.monitor.ctx, snapshot.openDoorSide);
      this.monitor.texture.needsUpdate = true;
    }
    if (this.elapsed < 0.14) return;
    this.elapsed = 0;
    drawInspiroLeftLcd(this.left.ctx, snapshot);
    drawInspiroRightLcd(this.right.ctx, snapshot);
    this.left.texture.needsUpdate = true;
    this.right.texture.needsUpdate = true;
  }

  public dispose(): void {
    this.left.texture.dispose();
    this.right.texture.dispose();
    this.monitor.texture.dispose();
  }
}

export function createInspiroCabScreens(maxAnisotropy: number): IInspiroCabScreens {
  return new InspiroCabScreens(maxAnisotropy);
}
