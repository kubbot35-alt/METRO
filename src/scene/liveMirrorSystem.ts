import * as THREE from 'three';
import {
  getMirrorUpdateInterval,
  resolveCctvChannel,
  type ResolvedCctvChannel,
} from '../domain/mirrorCctvSystem';
import { getStationPlatformSide } from '../domain/trackGeometry';
import type { TrackAlignment } from '../domain/trackAlignment';
import type {
  CctvPreviewChannel,
  GraphicsQualityId,
  ISimulationSnapshot,
} from '../domain/types';

export const MIRROR_RT_WIDTH = 256;
export const MIRROR_RT_HEIGHT = 160;

export interface IMirrorRenderContext {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly snapshot: ISimulationSnapshot | null;
  readonly alignment: TrackAlignment;
  readonly cabGroup: THREE.Group;
  readonly playerTrainGroup: THREE.Group;
  readonly passengerInteriorGroup: THREE.Group | null;
  readonly updatePassengerInterior?: (snapshot: ISimulationSnapshot, dtSec: number) => void;
  readonly cabFillLight: THREE.PointLight | null;
  readonly quality: GraphicsQualityId;
  readonly liveMirrorsEnabled: boolean;
  readonly pipOpen: boolean;
  readonly pipChannel: CctvPreviewChannel;
  readonly pipCanvas: HTMLCanvasElement | null;
  readonly dtSec: number;
}

export interface ILiveMirrorSystem {
  readonly leftLiveTexture: THREE.Texture;
  readonly rightLiveTexture: THREE.Texture;
  readonly leftFallbackTexture: THREE.CanvasTexture;
  readonly rightFallbackTexture: THREE.CanvasTexture;
  markDirty(): void;
  renderIfDue(ctx: IMirrorRenderContext): boolean;
  dispose(): void;
}

function buildSrgbGammaLut(): Uint8Array {
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) {
    const lin = i / 255;
    const lifted = Math.min(1, Math.pow(lin, 1 / 2.15) * 1.12);
    lut[i] = Math.min(255, Math.round(lifted * 255));
  }
  return lut;
}

function createStaticMirrorFallbackTexture(label: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = MIRROR_RT_WIDTH;
  canvas.height = MIRROR_RT_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (ctx) {
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
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export class LiveMirrorSystem implements ILiveMirrorSystem {
  public readonly leftLiveTexture: THREE.Texture;
  public readonly rightLiveTexture: THREE.Texture;
  public readonly leftFallbackTexture: THREE.CanvasTexture;
  public readonly rightFallbackTexture: THREE.CanvasTexture;

  private readonly leftRT: THREE.WebGLRenderTarget;
  private readonly rightRT: THREE.WebGLRenderTarget;
  private readonly interiorTarget: THREE.WebGLRenderTarget;
  private readonly leftCctvCamera: THREE.PerspectiveCamera;
  private readonly rightCctvCamera: THREE.PerspectiveCamera;
  private readonly interiorCamera: THREE.PerspectiveCamera;
  private readonly pixelBuf = new Uint8Array(MIRROR_RT_WIDTH * MIRROR_RT_HEIGHT * 4);
  private readonly gammaLut = buildSrgbGammaLut();
  private pipImageData: ImageData | null = null;

  public constructor() {
    const rtOpts: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
    };
    this.leftRT = new THREE.WebGLRenderTarget(MIRROR_RT_WIDTH, MIRROR_RT_HEIGHT, rtOpts);
    this.rightRT = new THREE.WebGLRenderTarget(MIRROR_RT_WIDTH, MIRROR_RT_HEIGHT, rtOpts);
    this.interiorTarget = new THREE.WebGLRenderTarget(MIRROR_RT_WIDTH, MIRROR_RT_HEIGHT, rtOpts);
    this.leftRT.texture.colorSpace = THREE.SRGBColorSpace;
    this.rightRT.texture.colorSpace = THREE.SRGBColorSpace;
    this.interiorTarget.texture.colorSpace = THREE.SRGBColorSpace;
    this.leftLiveTexture = this.leftRT.texture;
    this.rightLiveTexture = this.rightRT.texture;
    this.leftFallbackTexture = createStaticMirrorFallbackTexture('CAM L');
    this.rightFallbackTexture = createStaticMirrorFallbackTexture('CAM P');
    this.leftCctvCamera = new THREE.PerspectiveCamera(58, MIRROR_RT_WIDTH / MIRROR_RT_HEIGHT, 0.15, 160);
    this.rightCctvCamera = new THREE.PerspectiveCamera(58, MIRROR_RT_WIDTH / MIRROR_RT_HEIGHT, 0.15, 160);
    this.interiorCamera = new THREE.PerspectiveCamera(68, MIRROR_RT_WIDTH / MIRROR_RT_HEIGHT, 0.12, 42);
  }

  public markDirty(): void {
    // Kept for interface compatibility; live cameras render every frame when enabled
  }

  public renderIfDue(ctx: IMirrorRenderContext): boolean {
    const interval = getMirrorUpdateInterval(ctx.quality, ctx.liveMirrorsEnabled);
    if (interval <= 0) {
      return false;
    }
    this.executeRenderPasses(ctx);
    return true;
  }

  public dispose(): void {
    this.leftRT.dispose();
    this.rightRT.dispose();
    this.interiorTarget.dispose();
    this.leftFallbackTexture.dispose();
    this.rightFallbackTexture.dispose();
  }

  private executeRenderPasses(ctx: IMirrorRenderContext): void {
    const { renderer, scene, snapshot, alignment } = ctx;
    const prevCabVis = ctx.cabGroup.visible;
    const prevTrainVis = ctx.playerTrainGroup.visible;
    const prevIntVis = ctx.passengerInteriorGroup?.visible ?? false;
    const prevFillIntensity = ctx.cabFillLight?.intensity ?? 0;
    const prevFillDist = ctx.cabFillLight?.distance ?? 2;

    const posM = snapshot?.kinematics.positionM ?? 0;
    const platformSide = snapshot
      ? getStationPlatformSide(snapshot.currentStation.station)
      : 'left';
    const resolvedPip: ResolvedCctvChannel = resolveCctvChannel(ctx.pipChannel, platformSide);

    // Temporarily hide cab interior & passenger interior, show exterior train consist
    ctx.cabGroup.visible = false;
    if (ctx.passengerInteriorGroup) {
      ctx.passengerInteriorGroup.visible = false;
    }
    ctx.playerTrainGroup.visible = true;
    if (ctx.cabFillLight) {
      ctx.cabFillLight.intensity = 18;
      ctx.cabFillLight.distance = 28;
    }

    // Position left and right CCTV cameras outside the train body at x = ±1.85 aimed backward along the platform
    this.updateSideCctvCameraPose(this.leftCctvCamera, alignment, posM, -1);
    this.updateSideCctvCameraPose(this.rightCctvCamera, alignment, posM, 1);

    renderer.setRenderTarget(this.leftRT);
    renderer.clear();
    renderer.render(scene, this.leftCctvCamera);

    renderer.setRenderTarget(this.rightRT);
    renderer.clear();
    renderer.render(scene, this.rightCctvCamera);

    if (ctx.pipOpen && resolvedPip === 'interior' && ctx.passengerInteriorGroup && snapshot) {
      ctx.playerTrainGroup.visible = false;
      ctx.passengerInteriorGroup.visible = true;
      ctx.updatePassengerInterior?.(snapshot, ctx.dtSec);
      this.renderInteriorCamera(renderer, scene, alignment, posM);
    }

    if (ctx.pipOpen && ctx.pipCanvas) {
      const targetToRead =
        resolvedPip === 'left'
          ? this.leftRT
          : resolvedPip === 'right'
            ? this.rightRT
            : this.interiorTarget;
      this.blitRenderTargetToCanvas(renderer, targetToRead, ctx.pipCanvas, resolvedPip !== 'interior');
    }

    renderer.setRenderTarget(null);
    ctx.cabGroup.visible = prevCabVis;
    ctx.playerTrainGroup.visible = prevTrainVis;
    if (ctx.passengerInteriorGroup) {
      ctx.passengerInteriorGroup.visible = prevIntVis;
    }
    if (ctx.cabFillLight) {
      ctx.cabFillLight.intensity = prevFillIntensity;
      ctx.cabFillLight.distance = prevFillDist;
    }
  }

  private updateSideCctvCameraPose(
    camera: THREE.PerspectiveCamera,
    alignment: TrackAlignment,
    posM: number,
    sideSign: -1 | 1,
  ): void {
    const camPt = alignment.toWorldPoint(posM + 0.35, sideSign * 1.85, 2.42, false);
    const lookPt = alignment.toWorldPoint(posM - 24.0, sideSign * 2.52, 1.62, false);
    camera.position.set(camPt.x, camPt.y, camPt.z);
    camera.lookAt(lookPt.x, lookPt.y, lookPt.z);
  }

  private renderInteriorCamera(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    alignment: TrackAlignment,
    posM: number,
  ): void {
    const eyePt = alignment.toWorldPoint(posM - 3.2, -0.92, 2.86, true);
    const lookPt = alignment.toWorldPoint(posM - 16.0, 0.32, 1.48, true);
    this.interiorCamera.position.set(eyePt.x, eyePt.y, eyePt.z);
    this.interiorCamera.lookAt(lookPt.x, lookPt.y, lookPt.z);
    renderer.setRenderTarget(this.interiorTarget);
    renderer.clear();
    renderer.render(scene, this.interiorCamera);
  }

  private blitRenderTargetToCanvas(
    renderer: THREE.WebGLRenderer,
    target: THREE.WebGLRenderTarget,
    canvas: HTMLCanvasElement,
    mirrorHorizontal: boolean,
  ): void {
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) {
      return;
    }
    if (canvas.width !== MIRROR_RT_WIDTH || canvas.height !== MIRROR_RT_HEIGHT) {
      canvas.width = MIRROR_RT_WIDTH;
      canvas.height = MIRROR_RT_HEIGHT;
      this.pipImageData = null;
    }
    renderer.readRenderTargetPixels(
      target,
      0,
      0,
      MIRROR_RT_WIDTH,
      MIRROR_RT_HEIGHT,
      this.pixelBuf,
    );
    if (!this.pipImageData) {
      this.pipImageData = ctx2d.createImageData(MIRROR_RT_WIDTH, MIRROR_RT_HEIGHT);
    }
    const dst = this.pipImageData.data;
    const src = this.pixelBuf;
    const lut = this.gammaLut;
    for (let y = 0; y < MIRROR_RT_HEIGHT; y += 1) {
      const srcY = MIRROR_RT_HEIGHT - 1 - y;
      const srcRow = srcY * MIRROR_RT_WIDTH;
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
    ctx2d.putImageData(this.pipImageData, 0, 0);
  }
}
