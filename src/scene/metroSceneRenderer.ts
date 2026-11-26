import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LINE_M1_SPEED_ZONES, LINE_M1_STATIONS, METRO_LINE_M1 } from '../domain/routeData';
import { SEMAPHORE_DISTANCES_M } from '../domain/signalSystem';
import { getLineTrackAlignment, type TrackAlignment } from '../domain/trackAlignment';
import {
  getOppositeTrackX,
  getOppositeTrackYaw,
  getStationPlatformLayout,
  getStationPlatformSide,
} from '../domain/trackGeometry';
import { SERIA_81_SPEC, SIEMENS_INSPIRO_SPEC } from '../domain/trainCatalog';
import type {
  ISimulationSnapshot,
  IStationSpec,
  MetroLineId,
  SignalAspect,
  TimeOfDayId,
  TrainModelId,
} from '../domain/types';
import { buildMetroCabRig, type ICabRig } from './cabBuilder';
import { MetroCabMotionController, type ICabMotionController } from './cabMotionController';
import {
  buildPassengerInteriorRig,
  type IPassengerInteriorRig,
} from './passengerInteriorBuilder';
import { buildStationPassengers, type IPassengerRig } from './passengerManager';
import { buildTunnelSemaphores, type ISemaphoreRig } from './semaphoreBuilder';
import { buildMetroStations } from './stationBuilder';
import { buildSurfaceDepot, type ISurfaceDepotRig } from './surfaceDepotBuilder';
import { buildTrackworkRig, type ITrackworkRig } from './trackworkBuilder';
import { buildMetroConsist, type ITrainConsistRig } from './trainMeshBuilder';
import { buildMetroTunnel } from './tunnelBuilder';
import type { IMetroSceneRenderer, ISceneResources } from './types';

const _bgColor = new THREE.Color();
const _tunnelBgColor = new THREE.Color(0x06080d);
const _daySkyFogColor = new THREE.Color(0xc5ddf5);
const _nightSkyFogColor = new THREE.Color(0x111d38);
const _hemiTunnelSky = new THREE.Color(0x6c88ab);
const _hemiDaySky = new THREE.Color(0xcde6ff);
const _hemiNightSky = new THREE.Color(0x3a5284);
const _hemiTunnelGround = new THREE.Color(0x1e1812);
const _hemiDayGround = new THREE.Color(0x4a5a44);
const _hemiNightGround = new THREE.Color(0x141b2b);

function detectSoftwareWebGl(): boolean {
  const probe = document.createElement('canvas');
  const gl = probe.getContext('webgl2');
  if (!gl) {
    return true;
  }
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
}

function getAspectHex(aspect: SignalAspect): number {
  if (aspect === 'red') {
    return 0xef4444;
  }
  if (aspect === 'yellow') {
    return 0xf59e0b;
  }
  return 0x10b981;
}

export class MetroSceneRenderer implements IMetroSceneRenderer {
  private readonly isSoftwareGl: boolean;
  private readonly motion: ICabMotionController;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private headlight: THREE.SpotLight | null = null;
  private headlightTarget: THREE.Object3D | null = null;
  private hemiLight: THREE.HemisphereLight | null = null;
  private sunLight: THREE.DirectionalLight | null = null;
  private stationLightA: THREE.PointLight | null = null;
  private stationLightB: THREE.PointLight | null = null;
  private signalLight: THREE.PointLight | null = null;
  private oncomingLight: THREE.PointLight | null = null;
  private cabFillLight: THREE.PointLight | null = null;
  private cabRig: ICabRig | null = null;
  private playerTrainRig: ITrainConsistRig | null = null;
  private passengerInteriorRig: IPassengerInteriorRig | null = null;
  private oncomingTrainRig: ITrainConsistRig | null = null;
  private semaphoreRig: ISemaphoreRig | null = null;
  private passengerRig: IPassengerRig | null = null;
  private interiorSideBlend = 1;
  private trackworkRig: ITrackworkRig | null = null;
  private surfaceDepotRig: ISurfaceDepotRig | null = null;
  private alignment: TrackAlignment = getLineTrackAlignment(METRO_LINE_M1.id, LINE_M1_STATIONS);
  private worldResources: ISceneResources[] = [];
  private envTexture: THREE.Texture | null = null;
  private container: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private maxAniso = 4;
  private appliedLineId: MetroLineId | null = null;
  private appliedModelId: TrainModelId | null = null;
  private appliedTimeOfDayId: TimeOfDayId | null = null;

  public constructor(motion: ICabMotionController = new MetroCabMotionController()) {
    this.isSoftwareGl = detectSoftwareWebGl();
    this.motion = motion;
  }

  public mount(container: HTMLElement): void {
    this.container = container;
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);

    this.scene = this.createScene();
    this.camera = new THREE.PerspectiveCamera(64, width / height, 0.1, 360);
    this.camera.rotation.order = 'YXZ';
    const startFrame = this.alignment.sample(0);
    this.camera.position.set(startFrame.x, startFrame.y + 2.15, startFrame.z);
    this.camera.rotation.set(startFrame.pitch - 0.035, startFrame.yaw, 0);

    this.renderer = this.createRenderer(width, height);
    container.appendChild(this.renderer.domElement);
    this.setupEnvironment(this.renderer, this.scene);
    this.setupLights(this.scene);
    this.setupWorldAndCab(this.renderer, this.scene, this.camera);
    this.applyAtmosphere(1, 'rush', 0.8, 0.0098);
    this.surfaceDepotRig?.sync(1, 'rush', this.camera.position);
    this.attachResizeObserver(container);
    this.scene.updateMatrixWorld(true);
    this.renderer.render(this.scene, this.camera);
  }

  public update(snapshot: ISimulationSnapshot, dtSec: number): void {
    if (!this.camera || !this.headlight || !this.headlightTarget || !this.cabRig) {
      return;
    }
    const posM = snapshot.kinematics.positionM;
    const state = this.motion.step(snapshot, dtSec);
    this.syncMetroLine(snapshot);
    this.syncTrainThemes(snapshot);
    this.syncTimeOfDayLighting(snapshot);

    const frame = this.alignment.sample(posM);
    this.updateCameraView(snapshot, posM, frame, state, dtSec);
    this.applyAtmosphere(
      snapshot.trackProfile.outdoorBlend,
      snapshot.timeOfDay.id,
      snapshot.timeOfDay.ambientLightIntensity,
      snapshot.timeOfDay.fogDensity,
    );
    this.surfaceDepotRig?.sync(
      snapshot.trackProfile.outdoorBlend,
      snapshot.timeOfDay.id,
      this.camera.position,
    );

    const headPos = this.alignment.toWorldPoint(posM + 1.45, 0, 1.48, false);
    const headTgt = this.alignment.toWorldPoint(posM + 56, 0, 0.65, false);
    this.headlight.intensity = state.headlightIntensity;
    this.headlight.position.set(headPos.x, headPos.y, headPos.z);
    this.headlightTarget.position.set(headTgt.x, headTgt.y, headTgt.z);
    this.headlightTarget.updateMatrixWorld();

    if (this.playerTrainRig) {
      this.playerTrainRig.group.rotation.order = 'YXZ';
      this.playerTrainRig.group.position.set(frame.x, frame.y, frame.z);
      this.playerTrainRig.group.rotation.set(frame.pitch, frame.yaw, state.rollRad * 0.85);
      this.playerTrainRig.setDoorsOpen(snapshot.openDoorSide, dtSec);
      this.playerTrainRig.setHeadlights(snapshot.headlightsOn);
      this.playerTrainRig.updateMotion?.(snapshot.kinematics.speedMs, dtSec);
    }
    if (this.passengerInteriorRig) {
      this.passengerInteriorRig.group.position.set(frame.x, frame.y, frame.z);
      this.passengerInteriorRig.group.rotation.set(frame.pitch, frame.yaw, state.rollRad * 0.85);
      if (snapshot.cameraMode === 'interior') {
        this.passengerInteriorRig.update(snapshot, dtSec);
      }
    }
    this.updateOncomingTrain(snapshot, dtSec);

    if (this.cabRig.setLeverAngle) {
      this.cabRig.setLeverAngle(state.leverAngleRad);
    } else {
      this.cabRig.leverPivot.rotation.x = state.leverAngleRad;
    }
    this.cabRig.update?.(snapshot, dtSec);
    this.passengerRig?.sync(snapshot, dtSec);
    this.trackworkRig?.sync(snapshot.trackworkZones, this.alignment, dtSec);
    this.updateStationLights(snapshot.currentStation.station);
    this.updateSemaphoreVisuals(snapshot);
    this.updateCabIndicators(snapshot);
  }

  public render(): void {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  public isSoftwareRenderer(): boolean {
    return this.isSoftwareGl;
  }

  public scheduleNextFrame(callback: () => void): number {
    if (!this.isSoftwareGl || !this.renderer) {
      return window.requestAnimationFrame(callback);
    }
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    let timerId = 0;
    const poll = (): void => {
      const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (status === gl.UNSIGNALED) {
        timerId = window.setTimeout(poll, 5);
        return;
      }
      if (sync) {
        gl.deleteSync(sync);
      }
      timerId = window.setTimeout(callback, 80);
    };
    timerId = window.setTimeout(poll, 5);
    return timerId;
  }

  public cancelScheduledFrame(handle: number): void {
    window.cancelAnimationFrame(handle);
    window.clearTimeout(handle);
  }

  public dispose(): void {
    this.resizeObserver?.disconnect();
    this.worldResources.forEach((res) => res.dispose());
    this.surfaceDepotRig?.dispose();
    this.playerTrainRig?.dispose();
    this.passengerInteriorRig?.dispose();
    this.oncomingTrainRig?.dispose();
    this.passengerRig?.dispose();
    this.trackworkRig?.dispose();
    this.semaphoreRig?.dispose();
    this.cabRig?.dispose();
    this.envTexture?.dispose();
    if (this.renderer && this.container && this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.renderer?.dispose();
    this.renderer = null;
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06080d);
    scene.fog = new THREE.FogExp2(0x06080d, 0.0098);
    return scene;
  }

  private createRenderer(width: number, height: number): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !this.isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    return renderer;
  }

  private setupEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    const pmrem = new THREE.PMREMGenerator(renderer);
    this.envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = this.envTexture;
    scene.environmentIntensity = 0.34;
    pmrem.dispose();
  }

  private setupLights(scene: THREE.Scene): void {
    this.hemiLight = new THREE.HemisphereLight(0x6c88ab, 0x1e1812, 0.8);
    scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 2.2);
    this.sunLight.position.set(60, 85, -140);
    scene.add(this.sunLight);

    this.headlightTarget = new THREE.Object3D();
    this.headlightTarget.position.set(0, 0.65, -52);
    scene.add(this.headlightTarget);
    this.headlight = new THREE.SpotLight(0xfff1d6, 130, 125, Math.PI / 3.8, 0.55, 1.3);
    this.headlight.position.set(0, 1.48, -1.45);
    this.headlight.target = this.headlightTarget;
    scene.add(this.headlight);

    this.stationLightA = new THREE.PointLight(0xe0f2fe, 65, 95, 1.25);
    this.stationLightB = new THREE.PointLight(0xd1fae5, 45, 65, 1.35);
    this.signalLight = new THREE.PointLight(0x10b981, 14, 24, 1.6);
    this.oncomingLight = new THREE.PointLight(0xfff1d6, 0, 68, 1.35);
    this.updateStationLights(LINE_M1_STATIONS[0]);
    scene.add(this.stationLightA, this.stationLightB, this.signalLight, this.oncomingLight);
  }

  private setupWorldAndCab(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
  ): void {
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    this.maxAniso = maxAniso;
    this.appliedLineId = METRO_LINE_M1.id;
    this.alignment = getLineTrackAlignment(METRO_LINE_M1.id, LINE_M1_STATIONS);
    this.worldResources.push(
      buildMetroTunnel(scene, this.alignment, LINE_M1_STATIONS, LINE_M1_SPEED_ZONES, maxAniso),
    );
    this.worldResources.push(
      buildMetroStations(scene, this.alignment, LINE_M1_STATIONS, maxAniso, METRO_LINE_M1),
    );
    this.surfaceDepotRig = buildSurfaceDepot(scene, this.alignment, maxAniso);
    this.passengerRig = buildStationPassengers(scene, this.alignment, LINE_M1_STATIONS);
    this.trackworkRig = buildTrackworkRig(scene, maxAniso);
    const initialSignals = SEMAPHORE_DISTANCES_M.map((distanceM, idx) => ({
      id: idx + 1,
      distanceM,
      aspect: 'green' as const,
      violated: false,
      waitRemainingSec: null,
    }));
    this.semaphoreRig = buildTunnelSemaphores(scene, this.alignment, initialSignals);
    this.playerTrainRig = buildMetroConsist(scene, SIEMENS_INSPIRO_SPEC.visual, maxAniso);
    this.playerTrainRig.group.visible = false;
    this.passengerInteriorRig = buildPassengerInteriorRig(scene, maxAniso);
    this.oncomingTrainRig = buildMetroConsist(scene, SERIA_81_SPEC.visual, maxAniso);
    this.oncomingTrainRig.setLine?.(METRO_LINE_M1.id, METRO_LINE_M1.oppositeDestinationLed);
    this.oncomingTrainRig.group.rotation.order = 'YXZ';
    this.oncomingTrainRig.group.rotation.y = Math.PI;
    this.oncomingTrainRig.group.visible = false;
    this.cabRig = buildMetroCabRig(maxAniso);
    this.cabFillLight = new THREE.PointLight(0xcbd5e1, 0.65, 2.0, 2);
    this.cabFillLight.position.set(-0.22, 0.12, -0.58);
    camera.add(this.cabRig.group, this.cabFillLight);
    scene.add(camera);
    if (!this.isSoftwareGl) {
      renderer.compile(scene, camera);
    }
  }

  private syncMetroLine(snapshot: ISimulationSnapshot): void {
    if (this.appliedLineId === snapshot.line.id || !this.scene) {
      return;
    }
    this.appliedLineId = snapshot.line.id;
    this.alignment = getLineTrackAlignment(snapshot.line.id, snapshot.stations);
    this.worldResources.forEach((res) => res.dispose());
    this.worldResources = [];
    this.surfaceDepotRig?.dispose();
    this.passengerRig?.dispose();
    this.semaphoreRig?.dispose();

    this.worldResources.push(
      buildMetroTunnel(this.scene, this.alignment, snapshot.stations, snapshot.line.speedZones, this.maxAniso),
    );
    this.worldResources.push(
      buildMetroStations(this.scene, this.alignment, snapshot.stations, this.maxAniso, snapshot.line),
    );
    this.surfaceDepotRig = buildSurfaceDepot(this.scene, this.alignment, this.maxAniso);
    this.passengerRig = buildStationPassengers(this.scene, this.alignment, snapshot.stations);
    this.semaphoreRig = buildTunnelSemaphores(this.scene, this.alignment, snapshot.signals);
    this.playerTrainRig?.setLine?.(snapshot.line.id, snapshot.line.destinationLed);
    this.oncomingTrainRig?.setLine?.(snapshot.line.id, snapshot.line.oppositeDestinationLed);
    this.updateStationLights(snapshot.currentStation.station);
  }

  private syncTrainThemes(snapshot: ISimulationSnapshot): void {
    if (this.appliedModelId === snapshot.trainModel.id) {
      return;
    }
    this.appliedModelId = snapshot.trainModel.id;
    this.playerTrainRig?.setTheme(snapshot.trainModel.visual);
    this.cabRig?.setTheme(snapshot.trainModel.visual.theme);
    if (this.headlight) {
      this.headlight.color.setHex(snapshot.trainModel.id === 'seria81' ? 0xffe29a : 0xf4f8ff);
    }
    const oppositeVisual =
      snapshot.trainModel.id === 'seria81' ? SIEMENS_INSPIRO_SPEC.visual : SERIA_81_SPEC.visual;
    this.oncomingTrainRig?.setTheme(oppositeVisual);
  }

  private syncTimeOfDayLighting(snapshot: ISimulationSnapshot): void {
    if (this.appliedTimeOfDayId === snapshot.timeOfDay.id) {
      return;
    }
    this.appliedTimeOfDayId = snapshot.timeOfDay.id;
    const tod = snapshot.timeOfDay;
    if (this.stationLightA) {
      this.stationLightA.intensity = tod.stationLightIntensityA;
      this.stationLightA.color.setHex(tod.stationLightColorHex);
    }
    if (this.stationLightB) {
      this.stationLightB.intensity = tod.stationLightIntensityB;
      this.stationLightB.color.setHex(tod.stationLightColorHex);
    }
  }

  private applyAtmosphere(
    outdoorBlend: number,
    timeOfDayId: TimeOfDayId,
    tunnelAmbientIntensity: number,
    tunnelFogDensity: number,
  ): void {
    if (!this.scene || !this.hemiLight || !this.sunLight) {
      return;
    }
    const b = Math.max(0, Math.min(1, outdoorBlend));
    const isEvening = timeOfDayId === 'evening';

    const targetOutdoorBg = isEvening ? _nightSkyFogColor : _daySkyFogColor;
    _bgColor.copy(_tunnelBgColor).lerp(targetOutdoorBg, b);
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(_bgColor);
    }
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(_bgColor);
      const outdoorFog = isEvening ? 0.0024 : 0.0016;
      this.scene.fog.density = THREE.MathUtils.lerp(tunnelFogDensity, outdoorFog, b);
    }

    const outdoorHemiSky = isEvening ? _hemiNightSky : _hemiDaySky;
    const outdoorHemiGround = isEvening ? _hemiNightGround : _hemiDayGround;
    this.hemiLight.color.copy(_hemiTunnelSky).lerp(outdoorHemiSky, b);
    this.hemiLight.groundColor.copy(_hemiTunnelGround).lerp(outdoorHemiGround, b);
    const outdoorAmbient = isEvening ? 0.62 : 1.45;
    this.hemiLight.intensity = THREE.MathUtils.lerp(tunnelAmbientIntensity, outdoorAmbient, b);

    const sunTarget = isEvening ? 0.42 : 2.35;
    this.sunLight.intensity = sunTarget * b;
    this.sunLight.color.setHex(isEvening ? 0x93c5fd : 0xfff0d1);

    const baseEnv = isEvening ? 0.16 : 0.34;
    const outdoorEnv = isEvening ? 0.24 : 0.65;
    this.scene.environmentIntensity = THREE.MathUtils.lerp(baseEnv, outdoorEnv, b);
  }

  private updateCameraView(
    snapshot: ISimulationSnapshot,
    posM: number,
    frame: ReturnType<TrackAlignment['sample']>,
    state: ReturnType<ICabMotionController['step']>,
    dtSec: number,
  ): void {
    if (!this.camera || !this.cabRig || !this.playerTrainRig) {
      return;
    }
    if (snapshot.cameraMode === 'cab') {
      this.cabRig.group.visible = true;
      this.playerTrainRig.group.visible = false;
      if (this.passengerInteriorRig) {
        this.passengerInteriorRig.group.visible = false;
      }
      if (this.cabFillLight) {
        this.cabFillLight.intensity = 0.55;
        this.cabFillLight.distance = 2.0;
      }
      const camPt = this.alignment.toWorldPoint(
        posM - state.offsetZ,
        state.offsetX,
        2.15 + state.offsetY,
        true,
      );
      this.camera.rotation.order = 'YXZ';
      this.camera.position.set(camPt.x, camPt.y, camPt.z);
      this.camera.rotation.set(frame.pitch + state.pitchRad, frame.yaw, state.rollRad);
      this.updateCameraFov(state.targetFov, dtSec);
      return;
    }
    this.cabRig.group.visible = false;
    if (snapshot.cameraMode === 'interior') {
      this.playerTrainRig.group.visible = false;
      if (this.passengerInteriorRig) {
        this.passengerInteriorRig.group.visible = true;
      }
      if (this.cabFillLight) {
        this.cabFillLight.intensity = 0;
      }
      const targetSide = getStationPlatformSide(snapshot.currentStation.station) === 'right' ? -1 : 1;
      const sideStep = Math.min(1, dtSec * 2.4);
      this.interiorSideBlend += (targetSide - this.interiorSideBlend) * sideStep;
      // Camera inside Car 1 behind cab, looking diagonally forward across aisle, handrails, LED sign & out side windows/doors
      const eyePt = this.alignment.toWorldPoint(
        posM - 15.2,
        this.interiorSideBlend * 0.64 + state.offsetX * 0.45,
        2.28 + state.offsetY * 0.5,
        true,
      );
      const lookPt = this.alignment.toWorldPoint(
        posM - 3.6,
        -this.interiorSideBlend * 0.52,
        2.06,
        true,
      );
      this.camera.position.set(eyePt.x, eyePt.y, eyePt.z);
      this.camera.lookAt(lookPt.x, lookPt.y, lookPt.z);
      this.updateCameraFov(68, dtSec);
      return;
    }

    if (this.passengerInteriorRig) {
      this.passengerInteriorRig.group.visible = false;
    }
    this.playerTrainRig.group.visible = true;
    if (this.cabFillLight) {
      this.cabFillLight.intensity = 28;
      this.cabFillLight.distance = 32;
    }
    if (snapshot.cameraMode === 'mirror') {
      const sideSign = getStationPlatformSide(snapshot.currentStation.station) === 'left' ? -1 : 1;
      const eyePt = this.alignment.toWorldPoint(posM + 0.9, sideSign * 1.92, 2.48, false);
      const lookPt = this.alignment.toWorldPoint(posM - 26, sideSign * 1.82, 1.85, false);
      this.camera.position.set(eyePt.x, eyePt.y, eyePt.z);
      this.camera.lookAt(lookPt.x, lookPt.y, lookPt.z);
      this.updateCameraFov(64, dtSec);
      return;
    }
    const extEye = this.alignment.toWorldPoint(posM - 78.0, -1.58, 3.45, false);
    const extLook = this.alignment.toWorldPoint(posM - 61.0, 0, 1.75, false);
    this.camera.position.set(extEye.x, extEye.y, extEye.z);
    this.camera.lookAt(extLook.x, extLook.y, extLook.z);
    this.updateCameraFov(62, dtSec);
  }

  private updateCameraFov(targetFov: number, dtSec: number): void {
    if (!this.camera) {
      return;
    }
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 5, Math.max(dtSec, 0.016));
      this.camera.updateProjectionMatrix();
    }
  }

  private updateOncomingTrain(snapshot: ISimulationSnapshot, dtSec: number): void {
    if (!this.oncomingTrainRig || !this.oncomingLight) {
      return;
    }
    const oncoming = snapshot.oncomingTrain;
    this.oncomingTrainRig.group.visible = oncoming.active;
    if (!oncoming.active) {
      this.oncomingLight.intensity = 0;
      return;
    }
    const oppFrame = this.alignment.sample(oncoming.positionM);
    const oncomingX = getOppositeTrackX(oncoming.positionM, snapshot.stations);
    const oncomingYaw = getOppositeTrackYaw(oncoming.positionM, snapshot.stations);
    const oppPos = this.alignment.toWorldPoint(oncoming.positionM, oncomingX, 0, false);
    this.oncomingTrainRig.group.rotation.order = 'YXZ';
    this.oncomingTrainRig.group.position.set(oppPos.x, oppPos.y, oppPos.z);
    this.oncomingTrainRig.group.rotation.set(
      -oppFrame.pitch,
      oppFrame.yaw + Math.PI + oncomingYaw,
      -oppFrame.cantRollRad * 0.7,
    );
    this.oncomingTrainRig.setDoorsOpen(oncoming.doorsOpen ? oncoming.doorSide : null, dtSec);
    this.oncomingTrainRig.setHeadlights(oncoming.headlightsOn);
    this.oncomingTrainRig.updateMotion?.(oncoming.speedMs, dtSec);
    this.oncomingLight.intensity = oncoming.headlightsOn ? 56 : 10;
    const lampPt = this.alignment.toWorldPoint(oncoming.positionM - 1.8, oncomingX, 1.65, false);
    this.oncomingLight.position.set(lampPt.x, lampPt.y, lampPt.z);
  }

  private attachResizeObserver(container: HTMLElement): void {
    this.resizeObserver = new ResizeObserver(() => {
      if (!this.renderer || !this.camera) {
        return;
      }
      const w = Math.max(container.clientWidth, 1);
      const h = Math.max(container.clientHeight, 1);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
    this.resizeObserver.observe(container);
  }

  private updateStationLights(station: IStationSpec): void {
    if (!this.stationLightA || !this.stationLightB) {
      return;
    }
    const isIsland = getStationPlatformLayout(station) === 'island';
    const centerX = isIsland ? -4.4 : -1.6;
    const posA = this.alignment.toWorldPoint(station.distanceM - 48, centerX, 4.5, false);
    const posB = this.alignment.toWorldPoint(station.distanceM - 8, centerX, 4.2, false);
    this.stationLightA.position.set(posA.x, posA.y, posA.z);
    this.stationLightB.position.set(posB.x, posB.y, posB.z);
  }

  private updateSemaphoreVisuals(snapshot: ISimulationSnapshot): void {
    this.semaphoreRig?.sync(snapshot.signals);
    if (!this.signalLight) {
      return;
    }
    const next = snapshot.nextSignal;
    if (!next) {
      this.signalLight.intensity = 0;
      return;
    }
    this.signalLight.intensity = 16;
    this.signalLight.color.setHex(getAspectHex(next.signal.aspect));
    const sigPt = this.alignment.toWorldPoint(next.signal.distanceM - 0.7, 2.15, 2.85, false);
    this.signalLight.position.set(sigPt.x, sigPt.y, sigPt.z);
  }

  private updateCabIndicators(snapshot: ISimulationSnapshot): void {
    if (!this.cabRig) {
      return;
    }
    this.cabRig.doorLightMat.emissiveIntensity = snapshot.doorState === 'open' ? 2.4 : 0.35;
    const warnActive = snapshot.isOverspeeding || snapshot.kinematics.emergencyBrake || snapshot.atpActive;
    this.cabRig.warningLightMat.emissiveIntensity = warnActive ? 2.6 : 0.08;
    this.cabRig.headlightLampMat.emissiveIntensity = snapshot.headlightsOn ? 2.4 : 0.08;
    this.cabRig.czuwakLampMat.emissiveIntensity = snapshot.czuwak.active ? 3.8 : 0.06;
  }
}
