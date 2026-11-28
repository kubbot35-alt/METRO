import * as THREE from 'three';
import type { CabControlId, ICabHoverTooltip } from '../domain/cabControlsCatalog';
import { getGraphicsQualityPreset } from '../domain/settingsService';
import type { CctvPreviewChannel, DoorSide, IGameSettings, IPhotoCameraState, ISimulationSnapshot, PhotoFilterId } from '../domain/types';
import { MetroCabMotionController, type ICabMotionController } from './cabMotionController';
import { CabDeskRaycaster, type ICabDeskRaycaster } from './renderer/cabDeskRaycaster';
import { PointerFreeLookController, type IFreeLookController } from './renderer/freeLookController';
import { createRendererContext, disposeAllRendererResources, type ISceneRendererContext } from './renderer/rendererContext';
import { SceneAtmosphereController, type ISceneAtmosphereController } from './renderer/sceneAtmosphereController';
import { SceneCameraController, type ISceneCameraController } from './renderer/sceneCameraController';
import { syncTrainAndWorldRigs } from './renderer/sceneRigSync';
import { captureFilteredScreenshotPng, pickCctvMonitorAtPointer } from './renderer/sceneScreenshotAndCctv';
import { SceneWorldBuilder, type ISceneWorldBuilder } from './renderer/sceneWorldBuilder';
import { attachCanvasResizeObserver, createMetroScene, createMetroWebGlRenderer, detectSoftwareWebGl, scheduleSoftwareGlFrame, setupSceneEnvironment } from './renderer/webGlLifecycle';
import type { IMetroSceneRenderer, IPhotoAnchorPose } from './types';

export class MetroSceneRenderer implements IMetroSceneRenderer {
  private readonly ctx: ISceneRendererContext;
  private readonly motion: ICabMotionController;
  private readonly atmosphere: ISceneAtmosphereController;
  private readonly cameras: ISceneCameraController;
  private readonly world: ISceneWorldBuilder;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerNdc = new THREE.Vector2();
  private readonly cabRaycaster: ICabDeskRaycaster;
  private readonly freeLook: IFreeLookController;

  public constructor(
    motion: ICabMotionController = new MetroCabMotionController(),
    atmosphere: ISceneAtmosphereController = new SceneAtmosphereController(),
    cameras: ISceneCameraController = new SceneCameraController(),
    world: ISceneWorldBuilder = new SceneWorldBuilder(),
    cabRaycaster: ICabDeskRaycaster = new CabDeskRaycaster(),
    freeLook: IFreeLookController = new PointerFreeLookController(),
  ) {
    this.ctx = createRendererContext(detectSoftwareWebGl());
    this.motion = motion;
    this.atmosphere = atmosphere;
    this.cameras = cameras;
    this.world = world;
    this.cabRaycaster = cabRaycaster;
    this.freeLook = freeLook;
  }

  public mount(container: HTMLElement): void {
    this.ctx.container = container;
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    this.ctx.scene = createMetroScene();
    this.ctx.camera = new THREE.PerspectiveCamera(this.ctx.settings.cabFovDeg, width / height, 0.1, 420);
    this.ctx.camera.rotation.order = 'YXZ';
    const startFrame = this.ctx.alignment.sample(0);
    this.ctx.camera.position.set(startFrame.x, startFrame.y + 2.15, startFrame.z);
    this.ctx.camera.rotation.set(startFrame.pitch - 0.035, startFrame.yaw, 0);
    this.ctx.renderer = createMetroWebGlRenderer(width, height, this.ctx.isSoftwareGl);
    container.appendChild(this.ctx.renderer.domElement);
    this.ctx.renderer.domElement.addEventListener('pointerdown', this.handleCanvasPointerDown);
    this.ctx.renderer.domElement.addEventListener('pointermove', this.handleCanvasPointerMove);
    this.ctx.renderer.domElement.addEventListener('pointerleave', this.handleCanvasPointerLeave);
    this.freeLook.attach(this.ctx.renderer.domElement);
    setupSceneEnvironment(this.ctx, this.ctx.renderer, this.ctx.scene);
    this.world.setupLights(this.ctx, this.ctx.scene, this.atmosphere);
    this.world.setupWorldAndCab(this.ctx, this.ctx.renderer, this.ctx.scene, this.ctx.camera);
    this.applySettings(this.ctx.settings);
    this.atmosphere.applyAtmosphere(this.ctx, 1, 'rush', 'clear', 0.8, 0.0098);
    this.ctx.surfaceDepotRig?.sync(1, 'rush', 'clear', this.ctx.camera.position);
    attachCanvasResizeObserver(this.ctx, container);
    this.ctx.scene.updateMatrixWorld(true);
    this.render();
  }

  public applySettings(settings: IGameSettings): void {
    this.ctx.settings = settings;
    const preset = getGraphicsQualityPreset(settings.graphicsQuality);
    this.ctx.passengerDensity = preset.passengerDensity;
    this.ctx.fogDensityScale = preset.id === 'low' ? 1.38 : preset.id === 'medium' ? 1.12 : 1.0;
    this.ctx.rainRig?.setDensity(preset.rainDensity);
    this.ctx.tunnelEffectsRig?.setQuality(settings.graphicsQuality);
    this.ctx.nightCrewRig?.setQuality(settings.graphicsQuality);
    this.world.syncMirrorTextureBinding(this.ctx);
    this.ctx.liveMirrorSystem?.markDirty();
    if (this.ctx.camera) { this.ctx.camera.far = preset.drawDistanceM; this.ctx.camera.updateProjectionMatrix(); }
    if (this.ctx.renderer) {
      this.ctx.renderer.setPixelRatio(this.ctx.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, preset.pixelRatioCap));
      this.ctx.renderer.shadowMap.enabled = !this.ctx.isSoftwareGl && preset.enableShadows;
    }
  }

  public setCctvPreviewState(open: boolean, channel: CctvPreviewChannel, canvas: HTMLCanvasElement | null): void {
    const changed = this.ctx.pipOpen !== open || this.ctx.pipChannel !== channel || this.ctx.pipCanvas !== canvas;
    this.ctx.pipOpen = open;
    this.ctx.pipChannel = channel;
    this.ctx.pipCanvas = canvas;
    if (changed) this.ctx.liveMirrorSystem?.markDirty();
  }

  public setOnCctvMonitorClick(callback: ((side: DoorSide) => void) | null): void { this.ctx.onCctvMonitorClick = callback; }
  public setOnCabControlHover(callback: ((tooltip: ICabHoverTooltip | null) => void) | null): void { this.ctx.onCabControlHover = callback; }
  public setOnCabControlClick(callback: ((controlId: CabControlId) => void) | null): void { this.ctx.onCabControlClick = callback; }

  public update(snapshot: ISimulationSnapshot, dtSec: number): void {
    if (!this.ctx.camera || !this.ctx.cabRig) return;
    this.ctx.lastSnapshot = snapshot;
    this.ctx.lastDtSec = dtSec;
    this.syncFreeLookState(snapshot, dtSec);
    const posM = snapshot.kinematics.positionM;
    const state = this.motion.step(snapshot, dtSec);
    this.world.syncMetroLine(this.ctx, snapshot, this.atmosphere);
    this.world.syncTrainThemes(this.ctx, snapshot);
    this.atmosphere.syncTimeOfDayLighting(this.ctx, snapshot);
    const frame = this.ctx.alignment.sample(posM);
    this.cameras.updateCameraView(this.ctx, snapshot, posM, frame, state, dtSec);
    this.atmosphere.applyAtmosphere(this.ctx, snapshot.trackProfile.outdoorBlend, snapshot.timeOfDay.id, snapshot.weather.mode, snapshot.timeOfDay.ambientLightIntensity, snapshot.timeOfDay.fogDensity);
    this.ctx.surfaceDepotRig?.sync(snapshot.trackProfile.outdoorBlend, snapshot.timeOfDay.id, snapshot.weather.mode, this.ctx.camera.position);
    this.ctx.rainRig?.update(snapshot, this.ctx.camera.position, dtSec);
    this.atmosphere.updateHeadlightPose(this.ctx, snapshot, state);
    syncTrainAndWorldRigs(this.ctx, this.atmosphere, snapshot, frame, state.rollRad, state.leverAngleRad, dtSec);
  }

  public getPhotoAnchorPose(snapshot: ISimulationSnapshot): IPhotoAnchorPose | null {
    return this.cameras.getPhotoAnchorPose(this.ctx, snapshot);
  }

  public setPhotoModePose(pose: IPhotoCameraState | null, snapshot: ISimulationSnapshot, keepInteriorVisible = false): void {
    this.cameras.setPhotoModePose(this.ctx, pose, snapshot, keepInteriorVisible);
  }

  public captureScreenshotPng(filterId: PhotoFilterId): string | null {
    return captureFilteredScreenshotPng(this.ctx, filterId, () => this.render());
  }

  public render(): void {
    if (!this.ctx.renderer || !this.ctx.scene || !this.ctx.camera) return;
    if (this.ctx.liveMirrorSystem && this.ctx.cabRig && this.ctx.playerTrainRig) {
      this.ctx.liveMirrorSystem.renderIfDue({
        renderer: this.ctx.renderer, scene: this.ctx.scene, snapshot: this.ctx.lastSnapshot, alignment: this.ctx.alignment,
        cabGroup: this.ctx.cabRig.group, playerTrainGroup: this.ctx.playerTrainRig.group,
        passengerInteriorGroup: this.ctx.passengerInteriorRig?.group ?? null,
        updatePassengerInterior: this.ctx.passengerInteriorRig ? (snap, dt) => this.ctx.passengerInteriorRig?.update(snap, dt) : undefined,
        cabFillLight: this.ctx.cabFillLight, quality: this.ctx.settings.graphicsQuality,
        liveMirrorsEnabled: this.ctx.settings.liveMirrorsEnabled, pipOpen: this.ctx.pipOpen,
        pipChannel: this.ctx.pipChannel, pipCanvas: this.ctx.pipCanvas, dtSec: this.ctx.lastDtSec,
      });
    }
    this.ctx.renderer.render(this.ctx.scene, this.ctx.camera);
  }

  public isSoftwareRenderer(): boolean { return this.ctx.isSoftwareGl; }

  public scheduleNextFrame(callback: () => void): number {
    return !this.ctx.isSoftwareGl || !this.ctx.renderer ? window.requestAnimationFrame(callback) : scheduleSoftwareGlFrame(this.ctx.renderer, callback);
  }

  public cancelScheduledFrame(handle: number): void { window.cancelAnimationFrame(handle); window.clearTimeout(handle); }

  public dispose(): void {
    const dom = this.ctx.renderer?.domElement;
    dom?.removeEventListener('pointerdown', this.handleCanvasPointerDown);
    dom?.removeEventListener('pointermove', this.handleCanvasPointerMove);
    dom?.removeEventListener('pointerleave', this.handleCanvasPointerLeave);
    this.freeLook.detach();
    this.ctx.resizeObserver?.disconnect();
    disposeAllRendererResources(this.ctx);
    if (this.ctx.renderer && this.ctx.container && this.ctx.renderer.domElement.parentElement === this.ctx.container) {
      this.ctx.container.removeChild(this.ctx.renderer.domElement);
    }
    this.ctx.renderer?.dispose();
    this.ctx.renderer = null;
  }

  private syncFreeLookState(snapshot: ISimulationSnapshot, dtSec: number): void {
    const canLook = snapshot.phase === 'playing' && (snapshot.cameraMode === 'interior' || snapshot.gameMode === 'trainspotting');
    this.freeLook.setEnabled(canLook);
    const sig = `${snapshot.gameMode}|${snapshot.passengerView.seatId}|${snapshot.trainspotting.spotId}`;
    if (this.ctx.lastSeatSpotSig !== sig) {
      this.ctx.lastSeatSpotSig = sig;
      this.freeLook.reset();
    }
    const angles = this.freeLook.step(dtSec);
    this.ctx.freeLookYawRad = canLook ? angles.yawRad : 0;
    this.ctx.freeLookPitchRad = canLook ? angles.pitchRad : 0;
  }

  private readonly handleCanvasPointerDown = (event: PointerEvent): void => {
    if (this.cabRaycaster.handlePointerDown(this.ctx, event)) return;
    pickCctvMonitorAtPointer(this.ctx, event, this.raycaster, this.pointerNdc);
  };

  private readonly handleCanvasPointerMove = (event: PointerEvent): void => {
    this.cabRaycaster.handlePointerMove(this.ctx, event);
  };

  private readonly handleCanvasPointerLeave = (): void => {
    this.cabRaycaster.clearHover(this.ctx);
  };
}
