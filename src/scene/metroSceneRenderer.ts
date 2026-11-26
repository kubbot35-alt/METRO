import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LINE_M1_SPEED_ZONES, LINE_M1_STATIONS } from '../domain/routeData';
import { SEMAPHORE_DISTANCES_M } from '../domain/signalSystem';
import { SERIA_81_SPEC, SIEMENS_INSPIRO_SPEC } from '../domain/trainCatalog';
import type {
  ISimulationSnapshot,
  SignalAspect,
  TimeOfDayId,
  TrainModelId,
} from '../domain/types';
import { buildMetroCabRig, type ICabRig } from './cabBuilder';
import { MetroCabMotionController, type ICabMotionController } from './cabMotionController';
import { buildStationPassengers, type IPassengerRig } from './passengerManager';
import { buildTunnelSemaphores, type ISemaphoreRig } from './semaphoreBuilder';
import { buildMetroStations } from './stationBuilder';
import { buildTrackworkRig, type ITrackworkRig } from './trackworkBuilder';
import { buildMetroConsist, type ITrainConsistRig } from './trainMeshBuilder';
import { buildMetroTunnel } from './tunnelBuilder';
import type { IMetroSceneRenderer, ISceneResources } from './types';

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
  private stationLightA: THREE.PointLight | null = null;
  private stationLightB: THREE.PointLight | null = null;
  private signalLight: THREE.PointLight | null = null;
  private oncomingLight: THREE.PointLight | null = null;
  private cabRig: ICabRig | null = null;
  private playerTrainRig: ITrainConsistRig | null = null;
  private oncomingTrainRig: ITrainConsistRig | null = null;
  private semaphoreRig: ISemaphoreRig | null = null;
  private passengerRig: IPassengerRig | null = null;
  private trackworkRig: ITrackworkRig | null = null;
  private worldResources: ISceneResources[] = [];
  private envTexture: THREE.Texture | null = null;
  private container: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
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
    this.camera = new THREE.PerspectiveCamera(64, width / height, 0.1, 320);
    this.camera.position.set(0, 2.15, 0);
    this.camera.rotation.set(-0.035, 0, 0);

    this.renderer = this.createRenderer(width, height);
    container.appendChild(this.renderer.domElement);
    this.setupEnvironment(this.renderer, this.scene);
    this.setupLights(this.scene);
    this.setupWorldAndCab(this.renderer, this.scene, this.camera);
    this.attachResizeObserver(container);
    this.scene.updateMatrixWorld(true);
    this.renderer.render(this.scene, this.camera);
  }

  public update(snapshot: ISimulationSnapshot, dtSec: number): void {
    if (!this.camera || !this.headlight || !this.headlightTarget || !this.cabRig) {
      return;
    }
    const z = -snapshot.kinematics.positionM;
    const state = this.motion.step(snapshot, dtSec);
    this.syncTrainThemes(snapshot);
    this.syncTimeOfDayLighting(snapshot);
    this.updateCameraView(snapshot, z, state, dtSec);

    this.headlight.intensity = state.headlightIntensity;
    this.headlight.position.set(0, 1.48, z - 1.45);
    this.headlightTarget.position.set(0, 0.65, z - 56);
    this.headlightTarget.updateMatrixWorld();

    this.playerTrainRig?.group.position.set(0, 0, z);
    this.playerTrainRig?.setDoorsOpen(snapshot.doorState === 'open', dtSec);
    this.playerTrainRig?.setHeadlights(snapshot.headlightsOn);
    this.updateOncomingTrain(snapshot);

    this.cabRig.leverPivot.rotation.x = state.leverAngleRad;
    this.passengerRig?.sync(snapshot, dtSec);
    this.trackworkRig?.sync(snapshot.trackworkZones, dtSec);
    this.updateStationLights(snapshot.currentStation.station.distanceM);
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
    this.playerTrainRig?.dispose();
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
    renderer.toneMappingExposure = 1.22;
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
    this.signalLight.position.set(2.1, 2.8, -(SEMAPHORE_DISTANCES_M[0] ?? 250) + 0.6);
    this.oncomingLight = new THREE.PointLight(0xfff1d6, 0, 68, 1.35);
    this.updateStationLights(LINE_M1_STATIONS[0].distanceM);
    scene.add(this.stationLightA, this.stationLightB, this.signalLight, this.oncomingLight);
  }

  private setupWorldAndCab(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
  ): void {
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    this.worldResources.push(buildMetroTunnel(scene, LINE_M1_STATIONS, LINE_M1_SPEED_ZONES, maxAniso));
    this.worldResources.push(buildMetroStations(scene, LINE_M1_STATIONS, maxAniso));
    this.passengerRig = buildStationPassengers(scene, LINE_M1_STATIONS);
    this.trackworkRig = buildTrackworkRig(scene, maxAniso);
    const initialSignals = SEMAPHORE_DISTANCES_M.map((distanceM, idx) => ({
      id: idx + 1,
      distanceM,
      aspect: 'green' as const,
      violated: false,
      waitRemainingSec: null,
    }));
    this.semaphoreRig = buildTunnelSemaphores(scene, initialSignals);
    this.playerTrainRig = buildMetroConsist(scene, SIEMENS_INSPIRO_SPEC.visual);
    this.playerTrainRig.group.visible = false;
    this.oncomingTrainRig = buildMetroConsist(scene, SERIA_81_SPEC.visual);
    this.oncomingTrainRig.group.rotation.y = Math.PI;
    this.oncomingTrainRig.group.visible = false;
    this.cabRig = buildMetroCabRig();
    const cabFillLight = new THREE.PointLight(0x94a3b8, 0.9, 2.2, 2);
    cabFillLight.position.set(-0.32, -0.1, -0.58);
    camera.add(this.cabRig.group, cabFillLight);
    scene.add(camera);
    if (!this.isSoftwareGl) {
      renderer.compile(scene, camera);
    }
  }

  private syncTrainThemes(snapshot: ISimulationSnapshot): void {
    if (this.appliedModelId === snapshot.trainModel.id) {
      return;
    }
    this.appliedModelId = snapshot.trainModel.id;
    this.playerTrainRig?.setTheme(snapshot.trainModel.visual);
    this.cabRig?.setTheme(snapshot.trainModel.visual.theme);
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
    if (this.hemiLight) {
      this.hemiLight.intensity = tod.ambientLightIntensity;
    }
    if (this.stationLightA) {
      this.stationLightA.intensity = tod.stationLightIntensityA;
      this.stationLightA.color.setHex(tod.stationLightColorHex);
    }
    if (this.stationLightB) {
      this.stationLightB.intensity = tod.stationLightIntensityB;
      this.stationLightB.color.setHex(tod.stationLightColorHex);
    }
    if (this.scene && this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.density = tod.fogDensity;
    }
    if (this.scene) {
      this.scene.environmentIntensity = tod.id === 'evening' ? 0.14 : 0.34;
    }
  }

  private updateCameraView(
    snapshot: ISimulationSnapshot,
    z: number,
    state: ReturnType<ICabMotionController['step']>,
    dtSec: number,
  ): void {
    if (!this.camera || !this.cabRig || !this.playerTrainRig) {
      return;
    }
    if (snapshot.cameraMode === 'cab') {
      this.cabRig.group.visible = true;
      this.playerTrainRig.group.visible = false;
      this.camera.position.set(state.offsetX, 2.15 + state.offsetY, z + state.offsetZ);
      this.camera.rotation.set(state.pitchRad, 0, state.rollRad);
      this.updateCameraFov(state.targetFov, dtSec);
      return;
    }
    this.cabRig.group.visible = false;
    this.playerTrainRig.group.visible = true;
    if (snapshot.cameraMode === 'mirror') {
      this.camera.position.set(1.78, 2.48, z - 0.8);
      this.camera.lookAt(1.95, 1.85, z + 26);
      this.updateCameraFov(64, dtSec);
      return;
    }
    this.camera.position.set(-0.85, 4.38, z + 73.5);
    this.camera.lookAt(-0.15, 2.15, z + 14);
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

  private updateOncomingTrain(snapshot: ISimulationSnapshot): void {
    if (!this.oncomingTrainRig || !this.oncomingLight) {
      return;
    }
    const oncoming = snapshot.oncomingTrain;
    this.oncomingTrainRig.group.visible = oncoming.active;
    if (!oncoming.active) {
      this.oncomingLight.intensity = 0;
      return;
    }
    const oncomingZ = -oncoming.positionM;
    this.oncomingTrainRig.group.position.set(-4.6, 0, oncomingZ);
    this.oncomingLight.intensity = 52;
    this.oncomingLight.position.set(-4.6, 1.65, oncomingZ + 1.8);
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

  private updateStationLights(stationDistanceM: number): void {
    if (!this.stationLightA || !this.stationLightB) {
      return;
    }
    this.stationLightA.position.set(2.8, 4.4, -(stationDistanceM - 42));
    this.stationLightB.position.set(2.2, 4.0, -stationDistanceM);
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
    this.signalLight.position.set(2.15, 2.85, -next.signal.distanceM + 0.7);
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
