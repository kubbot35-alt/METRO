import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LINE_M1_SPEED_ZONES, LINE_M1_STATIONS } from '../domain/routeData';
import { SEMAPHORE_DISTANCES_M } from '../domain/signalSystem';
import type { ISimulationSnapshot, SignalAspect } from '../domain/types';
import { buildMetroCabRig, type ICabRig } from './cabBuilder';
import { buildTunnelSemaphores, type ISemaphoreRig } from './semaphoreBuilder';
import { buildMetroStations } from './stationBuilder';
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
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private headlight: THREE.SpotLight | null = null;
  private headlightTarget: THREE.Object3D | null = null;
  private stationLightA: THREE.PointLight | null = null;
  private stationLightB: THREE.PointLight | null = null;
  private signalLight: THREE.PointLight | null = null;
  private cabRig: ICabRig | null = null;
  private semaphoreRig: ISemaphoreRig | null = null;
  private worldResources: ISceneResources[] = [];
  private envTexture: THREE.Texture | null = null;
  private container: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private bobPhase = 0;

  public constructor() {
    this.isSoftwareGl = detectSoftwareWebGl();
  }

  public mount(container: HTMLElement): void {
    this.container = container;
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);

    this.scene = this.createScene();
    this.camera = new THREE.PerspectiveCamera(64, width / height, 0.1, 300);
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
    const speedRatio = Math.min(1, snapshot.kinematics.speedKmh / 85);
    this.bobPhase += dtSec * (1.8 + speedRatio * 14);
    const bobY = Math.sin(this.bobPhase) * (0.004 + speedRatio * 0.014);
    const swayX = Math.cos(this.bobPhase * 0.5) * (0.003 + speedRatio * 0.012);

    this.camera.position.set(swayX, 2.15 + bobY, z);
    const targetFov = 64 + speedRatio * 7.5;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 5, dtSec);
      this.camera.updateProjectionMatrix();
    }
    this.camera.rotation.set(-0.035 - snapshot.kinematics.netAccelerationMs2 * 0.004, 0, -swayX * 0.35);

    this.headlight.position.set(0, 1.48, z - 1.45);
    this.headlightTarget.position.set(0, 0.65, z - 52);
    this.headlightTarget.updateMatrixWorld();

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
    scene.fog = new THREE.FogExp2(0x06080d, 0.0105);
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
    scene.environmentIntensity = 0.32;
    pmrem.dispose();
  }

  private setupLights(scene: THREE.Scene): void {
    const hemi = new THREE.HemisphereLight(0x6c88ab, 0x1e1812, 0.78);
    scene.add(hemi);

    this.headlightTarget = new THREE.Object3D();
    this.headlightTarget.position.set(0, 0.65, -52);
    scene.add(this.headlightTarget);
    this.headlight = new THREE.SpotLight(0xfff1d6, 130, 125, Math.PI / 3.8, 0.55, 1.3);
    this.headlight.position.set(0, 1.48, -1.45);
    this.headlight.target = this.headlightTarget;
    scene.add(this.headlight);

    this.stationLightA = new THREE.PointLight(0xe0f2fe, 65, 90, 1.25);
    this.stationLightB = new THREE.PointLight(0xd1fae5, 45, 60, 1.35);
    this.signalLight = new THREE.PointLight(0x10b981, 14, 24, 1.6);
    this.signalLight.position.set(2.1, 2.8, -(SEMAPHORE_DISTANCES_M[0] ?? 250) + 0.6);
    this.updateStationLights(LINE_M1_STATIONS[0].distanceM);
    scene.add(this.stationLightA, this.stationLightB, this.signalLight);
  }

  private setupWorldAndCab(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
  ): void {
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    this.worldResources.push(buildMetroTunnel(scene, LINE_M1_STATIONS, LINE_M1_SPEED_ZONES, maxAniso));
    this.worldResources.push(buildMetroStations(scene, LINE_M1_STATIONS, maxAniso));
    const initialSignals = SEMAPHORE_DISTANCES_M.map((distanceM, idx) => ({
      id: idx + 1,
      distanceM,
      aspect: 'green' as const,
      violated: false,
      waitRemainingSec: null,
    }));
    this.semaphoreRig = buildTunnelSemaphores(scene, initialSignals);
    this.cabRig = buildMetroCabRig();
    camera.add(this.cabRig.group);
    scene.add(camera);
    if (!this.isSoftwareGl) {
      renderer.compile(scene, camera);
    }
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
  }
}
