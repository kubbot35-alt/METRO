import * as THREE from 'three';
import { getMirrorUpdateInterval } from '../../domain/mirrorCctvSystem';
import { LINE_M1_SPEED_ZONES, LINE_M1_STATIONS, METRO_LINE_M1 } from '../../domain/routeData';
import { DEFAULT_SCENE_CULL_RANGE_M } from '../../domain/routeVariant';
import { SEMAPHORE_DISTANCES_M } from '../../domain/signalSystem';
import { getLineTrackAlignment } from '../../domain/trackAlignment';
import { getTrainModelSpec, SERIA_81_SPEC, SIEMENS_INSPIRO_SPEC } from '../../domain/trainCatalog';
import type { ISimulationSnapshot } from '../../domain/types';
import { createAdTexturePool } from '../adTexturePool';
import { buildMetroCabRig } from '../cabBuilder';
import { LiveMirrorSystem } from '../liveMirrorSystem';
import { buildNightCrewRig } from '../nightCrewBuilder';
import { buildPassengerInteriorRig } from '../passengerInteriorBuilder';
import { buildStationPassengers } from '../passengerManager';
import { buildRainSystem } from '../rainSystemBuilder';
import { buildTunnelSemaphores } from '../semaphoreBuilder';
import { buildMetroStations } from '../stationBuilder';
import { buildSurfaceDepot } from '../surfaceDepotBuilder';
import { buildTrackworkRig } from '../trackworkBuilder';
import { buildMetroConsist } from '../trainMeshBuilder';
import { buildMetroTunnel } from '../tunnelBuilder';
import { buildTunnelEffectsRig } from '../tunnelEffectsBuilder';
import { buildTurnaroundSidingRig } from '../turnaroundSidingBuilder';
import { disposeLineWorldRigs, type ISceneRendererContext } from './rendererContext';
import type { ISceneAtmosphereController } from './sceneAtmosphereController';

export interface ISceneWorldBuilder {
  setupLights(ctx: ISceneRendererContext, scene: THREE.Scene, atmosphere: ISceneAtmosphereController): void;
  setupWorldAndCab(ctx: ISceneRendererContext, renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera): void;
  syncMetroLine(ctx: ISceneRendererContext, snapshot: ISimulationSnapshot, atmosphere: ISceneAtmosphereController): void;
  syncTrainThemes(ctx: ISceneRendererContext, snapshot: ISimulationSnapshot): void;
  syncMirrorTextureBinding(ctx: ISceneRendererContext): void;
}

export class SceneWorldBuilder implements ISceneWorldBuilder {
  public setupLights(ctx: ISceneRendererContext, scene: THREE.Scene, atmosphere: ISceneAtmosphereController): void {
    ctx.hemiLight = new THREE.HemisphereLight(0x6c88ab, 0x1e1812, 0.8);
    ctx.sunLight = new THREE.DirectionalLight(0xfff1d6, 2.2);
    ctx.sunLight.position.set(60, 85, -140);
    ctx.headlightTarget = new THREE.Object3D();
    ctx.headlightTarget.position.set(0, 0.65, -52);
    ctx.headlight = new THREE.SpotLight(0xfff1d6, 130, 125, Math.PI / 3.8, 0.55, 1.3);
    ctx.headlight.position.set(0, 1.48, -1.45);
    ctx.headlight.target = ctx.headlightTarget;
    ctx.stationLightA = new THREE.PointLight(0xe0f2fe, 65, 95, 1.25);
    ctx.stationLightB = new THREE.PointLight(0xd1fae5, 45, 65, 1.35);
    ctx.signalLight = new THREE.PointLight(0x10b981, 14, 24, 1.6);
    ctx.oncomingLight = new THREE.PointLight(0xfff1d6, 0, 68, 1.35);
    atmosphere.updateStationLights(ctx, LINE_M1_STATIONS[0]);
    scene.add(ctx.hemiLight, ctx.sunLight, ctx.headlightTarget, ctx.headlight, ctx.stationLightA, ctx.stationLightB, ctx.signalLight, ctx.oncomingLight);
  }

  public setupWorldAndCab(
    ctx: ISceneRendererContext,
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
  ): void {
    ctx.maxAniso = renderer.capabilities.getMaxAnisotropy();
    ctx.appliedLineSignature = `${METRO_LINE_M1.id}|initial`;
    ctx.alignment = getLineTrackAlignment(METRO_LINE_M1.id, LINE_M1_STATIONS, {
      hasSurfaceStart: METRO_LINE_M1.hasSurfaceStart,
      tunnelPortalDistanceM: METRO_LINE_M1.tunnelPortalDistanceM,
      alignmentIntensity: METRO_LINE_M1.alignmentIntensity,
    });
    this.buildInitialTrackAndStations(ctx, scene);
    this.buildInitialTrainAndCabRigs(ctx, scene, camera);
    if (!ctx.isSoftwareGl) renderer.compile(scene, camera);
  }

  public syncMetroLine(
    ctx: ISceneRendererContext,
    snapshot: ISimulationSnapshot,
    atmosphere: ISceneAtmosphereController,
  ): void {
    const { line, stations } = snapshot;
    const hallFlag = snapshot.depotZone.depotHallStartEnabled ? 1 : 0;
    const sig = `${line.id}|${line.name}|${line.destinationLed}|${line.oppositeDestinationLed}|${line.direction ?? 'normal'}|${line.startStationIndex ?? 0}|${line.cssColor}|${line.hasSurfaceStart ? 1 : 0}|${hallFlag}|${line.alignmentIntensity ?? 'moderate'}|${stations.map((s) => `${s.name}@${s.distanceM}:${s.platformLayout ?? 'island'}:${s.accentHex}`).join(',')}`;
    if (ctx.appliedLineSignature === sig || !ctx.scene) return;
    ctx.appliedLineSignature = sig;
    ctx.alignment = getLineTrackAlignment(line.id, stations, {
      hasSurfaceStart: line.hasSurfaceStart,
      tunnelPortalDistanceM: line.tunnelPortalDistanceM,
      alignmentIntensity: line.alignmentIntensity,
      depotHallStart: snapshot.depotZone.depotHallStartEnabled,
    });
    disposeLineWorldRigs(ctx);
    this.rebuildLineWorldRigs(ctx, snapshot);
    const badge = line.badgeCode ?? line.id;
    ctx.playerTrainRig?.setLine?.(badge, line.destinationLed);
    ctx.oncomingTrainRig?.setLine?.(badge, line.oppositeDestinationLed);
    ctx.leadingTrainRig?.setLine?.(badge, line.destinationLed);
    atmosphere.updateStationLights(ctx, snapshot.currentStation.station);
  }

  public syncTrainThemes(ctx: ISceneRendererContext, snapshot: ISimulationSnapshot): void {
    const modelSig = `${snapshot.trainModel.id}|${snapshot.trainModel.visual.liveryId ?? 'default'}`;
    if (ctx.appliedModelSignature !== modelSig) {
      ctx.appliedModelSignature = modelSig;
      ctx.playerTrainRig?.setTheme(snapshot.trainModel.visual);
      ctx.cabRig?.setTheme(snapshot.trainModel.visual.theme);
      if (ctx.headlight) {
        ctx.headlight.color.setHex(snapshot.trainModel.id === 'seria81' ? 0xffe29a : snapshot.trainModel.id === 'varsovia' ? 0xe8f8ff : 0xf4f8ff);
      }
    }
    if (ctx.appliedOncomingModelId !== snapshot.oncomingTrain.modelId) {
      ctx.appliedOncomingModelId = snapshot.oncomingTrain.modelId;
      ctx.oncomingTrainRig?.setTheme(getTrainModelSpec(snapshot.oncomingTrain.modelId).visual);
    }
    if (ctx.appliedLeadingModelId !== snapshot.leadingTrain.modelId) {
      ctx.appliedLeadingModelId = snapshot.leadingTrain.modelId;
      ctx.leadingTrainRig?.setTheme(getTrainModelSpec(snapshot.leadingTrain.modelId).visual);
    }
  }

  public syncMirrorTextureBinding(ctx: ISceneRendererContext): void {
    if (!ctx.cabRig || !ctx.liveMirrorSystem) return;
    const shouldUseLive = getMirrorUpdateInterval(ctx.settings.graphicsQuality, ctx.settings.liveMirrorsEnabled) > 0;
    if (ctx.usingLiveMirrorTextures === shouldUseLive) return;
    ctx.cabRig.setMirrorTextures?.(
      shouldUseLive ? ctx.liveMirrorSystem.leftLiveTexture : ctx.liveMirrorSystem.leftFallbackTexture,
      shouldUseLive ? ctx.liveMirrorSystem.rightLiveTexture : ctx.liveMirrorSystem.rightFallbackTexture,
    );
    ctx.usingLiveMirrorTextures = shouldUseLive;
  }

  private buildInitialTrackAndStations(ctx: ISceneRendererContext, scene: THREE.Scene): void {
    ctx.adTexturePool = createAdTexturePool(ctx.maxAniso, ctx.settings.language);
    ctx.tunnelRig = buildMetroTunnel(scene, ctx.alignment, LINE_M1_STATIONS, LINE_M1_SPEED_ZONES, ctx.maxAniso);
    ctx.stationsRig = buildMetroStations(scene, ctx.alignment, LINE_M1_STATIONS, ctx.maxAniso, METRO_LINE_M1, ctx.adTexturePool);
    ctx.tunnelRig.updateCulling(0, DEFAULT_SCENE_CULL_RANGE_M);
    ctx.stationsRig.updateCulling(0, DEFAULT_SCENE_CULL_RANGE_M);
    ctx.surfaceDepotRig = buildSurfaceDepot(scene, ctx.alignment, ctx.maxAniso);
    ctx.rainRig = buildRainSystem(scene);
    ctx.tunnelEffectsRig = buildTunnelEffectsRig(scene);
    ctx.nightCrewRig = buildNightCrewRig(scene);
    ctx.turnaroundSidingRig = buildTurnaroundSidingRig(scene, ctx.alignment, LINE_M1_STATIONS, ctx.maxAniso);
    ctx.passengerRig = buildStationPassengers(scene, ctx.alignment, LINE_M1_STATIONS);
    ctx.trackworkRig = buildTrackworkRig(scene, ctx.maxAniso);
    const initialSignals = SEMAPHORE_DISTANCES_M.map((distanceM, idx) => ({ id: idx + 1, distanceM, aspect: 'green' as const, violated: false, waitRemainingSec: null }));
    ctx.semaphoreRig = buildTunnelSemaphores(scene, ctx.alignment, initialSignals);
  }

  private buildInitialTrainAndCabRigs(ctx: ISceneRendererContext, scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    ctx.playerTrainRig = buildMetroConsist(scene, SIEMENS_INSPIRO_SPEC.visual, ctx.maxAniso);
    ctx.playerTrainRig.group.visible = false;
    ctx.passengerInteriorRig = buildPassengerInteriorRig(scene, ctx.maxAniso, ctx.adTexturePool!);
    ctx.oncomingTrainRig = buildMetroConsist(scene, SERIA_81_SPEC.visual, ctx.maxAniso, true);
    ctx.oncomingTrainRig.setLine?.(METRO_LINE_M1.id, METRO_LINE_M1.oppositeDestinationLed);
    ctx.oncomingTrainRig.group.rotation.order = 'YXZ';
    ctx.oncomingTrainRig.group.rotation.y = Math.PI;
    ctx.oncomingTrainRig.group.visible = false;
    ctx.leadingTrainRig = buildMetroConsist(scene, SIEMENS_INSPIRO_SPEC.visual, ctx.maxAniso, true);
    ctx.leadingTrainRig.setLine?.(METRO_LINE_M1.id, METRO_LINE_M1.destinationLed);
    ctx.leadingTrainRig.group.rotation.order = 'YXZ';
    ctx.leadingTrainRig.group.visible = false;
    ctx.cabRig = buildMetroCabRig(ctx.maxAniso);
    ctx.liveMirrorSystem = new LiveMirrorSystem();
    ctx.usingLiveMirrorTextures = null;
    this.syncMirrorTextureBinding(ctx);
    ctx.cabFillLight = new THREE.PointLight(0xcbd5e1, 0.65, 2.0, 2);
    ctx.cabFillLight.position.set(-0.22, 0.12, -0.58);
    camera.add(ctx.cabRig.group, ctx.cabFillLight);
    scene.add(camera);
  }

  private rebuildLineWorldRigs(ctx: ISceneRendererContext, snapshot: ISimulationSnapshot): void {
    const { line, stations } = snapshot;
    const posM = snapshot.kinematics.positionM;
    ctx.tunnelRig = buildMetroTunnel(ctx.scene!, ctx.alignment, stations, line.speedZones, ctx.maxAniso);
    ctx.stationsRig = buildMetroStations(ctx.scene!, ctx.alignment, stations, ctx.maxAniso, line, ctx.adTexturePool ?? undefined);
    ctx.tunnelRig.updateCulling(posM, DEFAULT_SCENE_CULL_RANGE_M);
    ctx.stationsRig.updateCulling(posM, DEFAULT_SCENE_CULL_RANGE_M);
    ctx.surfaceDepotRig = buildSurfaceDepot(ctx.scene!, ctx.alignment, ctx.maxAniso);
    ctx.turnaroundSidingRig = buildTurnaroundSidingRig(ctx.scene!, ctx.alignment, stations, ctx.maxAniso);
    ctx.passengerRig = buildStationPassengers(ctx.scene!, ctx.alignment, stations);
    ctx.semaphoreRig = buildTunnelSemaphores(ctx.scene!, ctx.alignment, snapshot.signals);
  }
}
