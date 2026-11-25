import * as THREE from 'three';
import type { ISemaphoreState, SignalAspect } from '../domain/types';

export interface ISemaphoreRig {
  sync(signals: readonly ISemaphoreState[]): void;
  dispose(): void;
}

interface ISemaphoreVisual {
  readonly id: number;
  readonly redMat: THREE.MeshStandardMaterial;
  readonly yellowMat: THREE.MeshStandardMaterial;
  readonly greenMat: THREE.MeshStandardMaterial;
  readonly haloMesh: THREE.Mesh;
  readonly haloMat: THREE.MeshBasicMaterial;
  lastAspect: SignalAspect | null;
}

const OFF_INTENSITY = 0.04;
const ON_INTENSITY = 5.0;
const LENS_Y: Record<SignalAspect, number> = {
  red: 3.18,
  yellow: 2.75,
  green: 2.32,
};

function createGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function aspectColor(aspect: SignalAspect): number {
  if (aspect === 'red') {
    return 0xff3b3b;
  }
  if (aspect === 'yellow') {
    return 0xffb020;
  }
  return 0x10f59d;
}

export function buildTunnelSemaphores(
  scene: THREE.Scene,
  initialSignals: readonly ISemaphoreState[],
): ISemaphoreRig {
  const disposables: Array<{ dispose(): void }> = [];
  const root = new THREE.Group();
  root.name = 'TunnelSemaphoresGroup';
  scene.add(root);

  const glowTex = createGlowTexture();
  const postGeo = new THREE.CylinderGeometry(0.06, 0.08, 2.9, 8);
  const baseGeo = new THREE.BoxGeometry(0.36, 0.12, 0.36);
  const headGeo = new THREE.BoxGeometry(0.54, 1.44, 0.3);
  const visorGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.22, 12, 1, true, -Math.PI * 0.55, Math.PI * 1.1);
  const lensGeo = new THREE.CircleGeometry(0.165, 16);
  const haloGeo = new THREE.PlaneGeometry(1.15, 1.15);

  const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55, metalness: 0.7 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0x090c12, roughness: 0.85, metalness: 0.2 });
  disposables.push(glowTex, postGeo, baseGeo, headGeo, visorGeo, lensGeo, haloGeo, postMat, headMat);

  const visuals: ISemaphoreVisual[] = initialSignals.map((sig) =>
    createSingleSemaphore(
      root,
      sig,
      { postGeo, baseGeo, headGeo, visorGeo, lensGeo, haloGeo },
      { postMat, headMat, glowTex },
      disposables,
    ),
  );

  const rig: ISemaphoreRig = {
    sync: (signals: readonly ISemaphoreState[]): void => syncSemaphoreVisuals(visuals, signals),
    dispose: (): void => {
      scene.remove(root);
      disposables.forEach((d) => d.dispose());
    },
  };
  rig.sync(initialSignals);
  return rig;
}

interface ISemaphoreGeos {
  postGeo: THREE.CylinderGeometry;
  baseGeo: THREE.BoxGeometry;
  headGeo: THREE.BoxGeometry;
  visorGeo: THREE.CylinderGeometry;
  lensGeo: THREE.CircleGeometry;
  haloGeo: THREE.PlaneGeometry;
}

interface ISemaphoreBaseMats {
  postMat: THREE.MeshStandardMaterial;
  headMat: THREE.MeshStandardMaterial;
  glowTex: THREE.CanvasTexture;
}

function createSingleSemaphore(
  root: THREE.Group,
  sig: ISemaphoreState,
  geos: ISemaphoreGeos,
  mats: ISemaphoreBaseMats,
  disposables: Array<{ dispose(): void }>,
): ISemaphoreVisual {
  const group = new THREE.Group();
  group.position.set(2.02, 0, -sig.distanceM);

  const base = new THREE.Mesh(geos.baseGeo, mats.postMat);
  base.position.y = 0.06;
  const post = new THREE.Mesh(geos.postGeo, mats.postMat);
  post.position.y = 1.48;
  const head = new THREE.Mesh(geos.headGeo, mats.headMat);
  head.position.set(0, 2.75, 0);

  const redMat = createLensMaterial(0xff3b3b);
  const yellowMat = createLensMaterial(0xffb020);
  const greenMat = createLensMaterial(0x10f59d);
  const haloMat = new THREE.MeshBasicMaterial({
    map: mats.glowTex,
    color: 0x10f59d,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  disposables.push(redMat, yellowMat, greenMat, haloMat);

  const lensSpecs: ReadonlyArray<{ y: number; mat: THREE.MeshStandardMaterial }> = [
    { y: LENS_Y.red, mat: redMat },
    { y: LENS_Y.yellow, mat: yellowMat },
    { y: LENS_Y.green, mat: greenMat },
  ];
  lensSpecs.forEach(({ y, mat }) => {
    const lens = new THREE.Mesh(geos.lensGeo, mat);
    lens.position.set(0, y, 0.16);
    const visor = new THREE.Mesh(geos.visorGeo, mats.headMat);
    visor.rotation.x = Math.PI / 2;
    visor.position.set(0, y + 0.02, 0.24);
    group.add(lens, visor);
  });

  const haloMesh = new THREE.Mesh(geos.haloGeo, haloMat);
  haloMesh.position.set(0, LENS_Y.green, 0.28);
  group.add(base, post, head, haloMesh);
  root.add(group);
  return { id: sig.id, redMat, yellowMat, greenMat, haloMesh, haloMat, lastAspect: null };
}

function createLensMaterial(hex: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: hex,
    emissive: hex,
    emissiveIntensity: OFF_INTENSITY,
    roughness: 0.15,
    metalness: 0.05,
    fog: false,
  });
}

function syncSemaphoreVisuals(
  visuals: readonly ISemaphoreVisual[],
  signals: readonly ISemaphoreState[],
): void {
  for (let i = 0; i < visuals.length; i += 1) {
    const vis = visuals[i];
    const sig = signals[i];
    if (!sig || vis.lastAspect === sig.aspect) {
      continue;
    }
    vis.lastAspect = sig.aspect;
    vis.redMat.emissiveIntensity = sig.aspect === 'red' ? ON_INTENSITY : OFF_INTENSITY;
    vis.yellowMat.emissiveIntensity = sig.aspect === 'yellow' ? ON_INTENSITY : OFF_INTENSITY;
    vis.greenMat.emissiveIntensity = sig.aspect === 'green' ? ON_INTENSITY : OFF_INTENSITY;
    vis.haloMesh.position.y = LENS_Y[sig.aspect];
    vis.haloMat.color.setHex(aspectColor(sig.aspect));
  }
}
