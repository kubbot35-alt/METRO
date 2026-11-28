import * as THREE from 'three';
import { getMirrorUpdateInterval, resolveCctvChannel, type ResolvedCctvChannel } from '../domain/mirrorCctvSystem';
import { getStationPlatformSide } from '../domain/trackGeometry';
import type { TrackAlignment } from '../domain/trackAlignment';
import type { CctvPreviewChannel, GraphicsQualityId, ISimulationSnapshot } from '../domain/types';
import {
  blitRenderTargetToCanvas,
  buildSrgbGammaLut,
  createStaticMirrorFallbackTexture,
  MIRROR_RT_HEIGHT,
  MIRROR_RT_WIDTH,
} from './liveMirrorBlit';

export { MIRROR_RT_WIDTH, MIRROR_RT_HEIGHT };

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

interface ISavedSceneVis {
  cabVis: boolean;
  trainVis: boolean;
  intVis: boolean;
  fillIntensity: number;
  fillDist: number;
}

export class LiveMirrorSystem implements ILiveMirrorSystem {
  public readonly leftLiveTexture: THREE.Texture;
  public readonly rightLiveTexture: THREE.Texture;
  public readonly leftFallbackTexture: THREE.CanvasTexture;
  public readonly rightFallbackTexture: THREE.CanvasTexture;
  private readonly leftRT: THREE.WebGLRenderTarget;
  private readonly rightRT: THREE.WebGLRenderTarget;
  private readonly interiorTarget: THREE.WebGLRenderTarget;
  private readonly leftCctvCamera = new THREE.PerspectiveCamera(58, MIRROR_RT_WIDTH / MIRROR_RT_HEIGHT, 0.15, 160);
  private readonly rightCctvCamera = new THREE.PerspectiveCamera(58, MIRROR_RT_WIDTH / MIRROR_RT_HEIGHT, 0.15, 160);
  private readonly interiorCamera = new THREE.PerspectiveCamera(68, MIRROR_RT_WIDTH / MIRROR_RT_HEIGHT, 0.12, 42);
  private readonly pixelBuf = new Uint8Array(MIRROR_RT_WIDTH * MIRROR_RT_HEIGHT * 4);
  private readonly gammaLut = buildSrgbGammaLut();
  private pipImageData: ImageData | null = null;

  public constructor() {
    const rtOpts: THREE.RenderTargetOptions = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true, stencilBuffer: false };
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
  }

  public markDirty(): void {}

  public renderIfDue(ctx: IMirrorRenderContext): boolean {
    if (getMirrorUpdateInterval(ctx.quality, ctx.liveMirrorsEnabled) <= 0) return false;
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
    const saved = this.prepareMirrorVisibility(ctx);
    const posM = ctx.snapshot?.kinematics.positionM ?? 0;
    const platformSide = ctx.snapshot ? getStationPlatformSide(ctx.snapshot.currentStation.station) : 'left';
    const resolvedPip = resolveCctvChannel(ctx.pipChannel, platformSide);
    this.renderSideMirrorCameras(ctx, posM);
    this.renderOptionalInteriorAndPip(ctx, resolvedPip, posM);
    ctx.renderer.setRenderTarget(null);
    this.restoreMirrorVisibility(ctx, saved);
  }

  private prepareMirrorVisibility(ctx: IMirrorRenderContext): ISavedSceneVis {
    const saved: ISavedSceneVis = {
      cabVis: ctx.cabGroup.visible,
      trainVis: ctx.playerTrainGroup.visible,
      intVis: ctx.passengerInteriorGroup?.visible ?? false,
      fillIntensity: ctx.cabFillLight?.intensity ?? 0,
      fillDist: ctx.cabFillLight?.distance ?? 2,
    };
    ctx.cabGroup.visible = false;
    if (ctx.passengerInteriorGroup) ctx.passengerInteriorGroup.visible = false;
    ctx.playerTrainGroup.visible = true;
    if (ctx.cabFillLight) { ctx.cabFillLight.intensity = 18; ctx.cabFillLight.distance = 28; }
    return saved;
  }

  private restoreMirrorVisibility(ctx: IMirrorRenderContext, saved: ISavedSceneVis): void {
    ctx.cabGroup.visible = saved.cabVis;
    ctx.playerTrainGroup.visible = saved.trainVis;
    if (ctx.passengerInteriorGroup) ctx.passengerInteriorGroup.visible = saved.intVis;
    if (ctx.cabFillLight) { ctx.cabFillLight.intensity = saved.fillIntensity; ctx.cabFillLight.distance = saved.fillDist; }
  }

  private renderSideMirrorCameras(ctx: IMirrorRenderContext, posM: number): void {
    this.updateSideCctvCameraPose(this.leftCctvCamera, ctx.alignment, posM, -1);
    this.updateSideCctvCameraPose(this.rightCctvCamera, ctx.alignment, posM, 1);
    ctx.renderer.setRenderTarget(this.leftRT);
    ctx.renderer.clear();
    ctx.renderer.render(ctx.scene, this.leftCctvCamera);
    ctx.renderer.setRenderTarget(this.rightRT);
    ctx.renderer.clear();
    ctx.renderer.render(ctx.scene, this.rightCctvCamera);
  }

  private renderOptionalInteriorAndPip(ctx: IMirrorRenderContext, resolvedPip: ResolvedCctvChannel, posM: number): void {
    if (ctx.pipOpen && resolvedPip === 'interior' && ctx.passengerInteriorGroup && ctx.snapshot) {
      ctx.playerTrainGroup.visible = false;
      ctx.passengerInteriorGroup.visible = true;
      ctx.updatePassengerInterior?.(ctx.snapshot, ctx.dtSec);
      this.renderInteriorCamera(ctx.renderer, ctx.scene, ctx.alignment, posM);
    }
    if (ctx.pipOpen && ctx.pipCanvas) {
      const target = resolvedPip === 'left' ? this.leftRT : resolvedPip === 'right' ? this.rightRT : this.interiorTarget;
      this.pipImageData = blitRenderTargetToCanvas(ctx.renderer, target, ctx.pipCanvas, resolvedPip !== 'interior', this.pixelBuf, this.gammaLut, this.pipImageData);
    }
  }

  private updateSideCctvCameraPose(camera: THREE.PerspectiveCamera, alignment: TrackAlignment, posM: number, sideSign: -1 | 1): void {
    const camPt = alignment.toWorldPoint(posM + 0.35, sideSign * 1.85, 2.42, false);
    const lookPt = alignment.toWorldPoint(posM - 24.0, sideSign * 2.52, 1.62, false);
    camera.position.set(camPt.x, camPt.y, camPt.z);
    camera.lookAt(lookPt.x, lookPt.y, lookPt.z);
  }

  private renderInteriorCamera(renderer: THREE.WebGLRenderer, scene: THREE.Scene, alignment: TrackAlignment, posM: number): void {
    const eyePt = alignment.toWorldPoint(posM - 3.2, -0.92, 2.86, true);
    const lookPt = alignment.toWorldPoint(posM - 16.0, 0.32, 1.48, true);
    this.interiorCamera.position.set(eyePt.x, eyePt.y, eyePt.z);
    this.interiorCamera.lookAt(lookPt.x, lookPt.y, lookPt.z);
    renderer.setRenderTarget(this.interiorTarget);
    renderer.clear();
    renderer.render(scene, this.interiorCamera);
  }
}
