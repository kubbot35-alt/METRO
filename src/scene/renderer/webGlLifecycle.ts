import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { ISceneRendererContext } from './rendererContext';

export function detectSoftwareWebGl(): boolean {
  const probe = document.createElement('canvas');
  const gl = probe.getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
}

export function createMetroScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06080d);
  scene.fog = new THREE.FogExp2(0x06080d, 0.0098);
  return scene;
}

export function createMetroWebGlRenderer(width: number, height: number, isSoftwareGl: boolean): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: !isSoftwareGl, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}

export function setupSceneEnvironment(
  ctx: ISceneRendererContext,
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
): void {
  const pmrem = new THREE.PMREMGenerator(renderer);
  ctx.envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = ctx.envTexture;
  scene.environmentIntensity = 0.34;
  pmrem.dispose();
}

export function attachCanvasResizeObserver(ctx: ISceneRendererContext, container: HTMLElement): void {
  ctx.resizeObserver = new ResizeObserver(() => {
    if (!ctx.renderer || !ctx.camera) return;
    const w = Math.max(container.clientWidth, 1);
    const h = Math.max(container.clientHeight, 1);
    ctx.camera.aspect = w / h;
    ctx.camera.updateProjectionMatrix();
    ctx.renderer.setSize(w, h);
  });
  ctx.resizeObserver.observe(container);
}

export function scheduleSoftwareGlFrame(renderer: THREE.WebGLRenderer, callback: () => void): number {
  const gl = renderer.getContext() as WebGL2RenderingContext;
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  gl.flush();
  let timerId = 0;
  const poll = (): void => {
    const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
    if (status === gl.UNSIGNALED) {
      timerId = window.setTimeout(poll, 5);
      return;
    }
    if (sync) gl.deleteSync(sync);
    timerId = window.setTimeout(callback, 80);
  };
  timerId = window.setTimeout(poll, 5);
  return timerId;
}
