import * as THREE from 'three';
import { DEFAULT_SCENE_CULL_RANGE_M, isWithinCullingRange } from '../domain/routeVariant';
import type { TrackAlignment } from '../domain/trackAlignment';
import type { ISemaphoreState, SignalAspect } from '../domain/types';
import {
  createSemaphoreAssets,
  createSemaphoreLensMaterial,
  getSemaphoreAspectColor,
  SEMAPHORE_LENS_Y,
  SEMAPHORE_OFF_INTENSITY,
  SEMAPHORE_ON_INTENSITY,
  type ISemaphoreSharedAssets,
} from './semaphoreAssets';

export interface ISemaphoreRig {
  sync(signals: readonly ISemaphoreState[], playerPosM?: number): void;
  dispose(): void;
}

interface ISemaphoreVisual {
  readonly id: number;
  readonly distanceM: number;
  readonly group: THREE.Group;
  readonly redMat: THREE.MeshStandardMaterial;
  readonly yellowMat: THREE.MeshStandardMaterial;
  readonly greenMat: THREE.MeshStandardMaterial;
  readonly haloMesh: THREE.Mesh;
  readonly haloMat: THREE.MeshBasicMaterial;
  lastAspect: SignalAspect | null;
  visible: boolean;
}

export function buildTunnelSemaphores(scene: THREE.Scene, alignment: TrackAlignment, initialSignals: readonly ISemaphoreState[]): ISemaphoreRig {
  const root = new THREE.Group();
  root.name = 'TunnelSemaphoresGroup';
  scene.add(root);
  const assets = createSemaphoreAssets();
  const visuals = initialSignals.map((sig) => createSingleSemaphore(root, alignment, sig, assets));
  const rig: ISemaphoreRig = {
    sync: (signals, playerPosM) => syncSemaphoreVisuals(visuals, signals, playerPosM),
    dispose: () => { scene.remove(root); assets.disposables.forEach((d) => d.dispose()); },
  };
  rig.sync(initialSignals, 0);
  return rig;
}

function createSingleSemaphore(root: THREE.Group, alignment: TrackAlignment, sig: ISemaphoreState, assets: ISemaphoreSharedAssets): ISemaphoreVisual {
  const group = new THREE.Group();
  const frame = alignment.sample(sig.distanceM);
  const pt = alignment.toWorldPoint(sig.distanceM, 2.02, 0, false);
  group.position.set(pt.x, pt.y, pt.z);
  group.rotation.set(0, frame.yaw, 0);
  const { base, post, head } = buildSemaphorePostHead(assets);
  const lensMats = { red: createSemaphoreLensMaterial(0xff3b3b), yellow: createSemaphoreLensMaterial(0xffb020), green: createSemaphoreLensMaterial(0x10f59d) };
  const haloMat = new THREE.MeshBasicMaterial({ map: assets.mats.glowTex, color: 0x10f59d, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  assets.disposables.push(lensMats.red, lensMats.yellow, lensMats.green, haloMat);
  attachLensesToGroup(group, assets, lensMats);
  const haloMesh = new THREE.Mesh(assets.geos.haloGeo, haloMat);
  haloMesh.position.set(0, SEMAPHORE_LENS_Y.green, 0.28);
  group.add(base, post, head, haloMesh);
  root.add(group);
  return { id: sig.id, distanceM: sig.distanceM, group, redMat: lensMats.red, yellowMat: lensMats.yellow, greenMat: lensMats.green, haloMesh, haloMat, lastAspect: null, visible: true };
}

function buildSemaphorePostHead(assets: ISemaphoreSharedAssets) {
  const base = new THREE.Mesh(assets.geos.baseGeo, assets.mats.postMat);
  base.position.y = 0.06;
  const post = new THREE.Mesh(assets.geos.postGeo, assets.mats.postMat);
  post.position.y = 1.48;
  const head = new THREE.Mesh(assets.geos.headGeo, assets.mats.headMat);
  head.position.set(0, 2.75, 0);
  return { base, post, head };
}

function attachLensesToGroup(
  group: THREE.Group,
  assets: ISemaphoreSharedAssets,
  mats: { red: THREE.MeshStandardMaterial; yellow: THREE.MeshStandardMaterial; green: THREE.MeshStandardMaterial },
): void {
  const specs: ReadonlyArray<{ y: number; mat: THREE.MeshStandardMaterial }> = [
    { y: SEMAPHORE_LENS_Y.red, mat: mats.red },
    { y: SEMAPHORE_LENS_Y.yellow, mat: mats.yellow },
    { y: SEMAPHORE_LENS_Y.green, mat: mats.green },
  ];
  specs.forEach(({ y, mat }) => {
    const lens = new THREE.Mesh(assets.geos.lensGeo, mat);
    lens.position.set(0, y, 0.16);
    const visor = new THREE.Mesh(assets.geos.visorGeo, assets.mats.headMat);
    visor.rotation.x = Math.PI / 2;
    visor.position.set(0, y + 0.02, 0.24);
    group.add(lens, visor);
  });
}

function syncSemaphoreVisuals(visuals: readonly ISemaphoreVisual[], signals: readonly ISemaphoreState[], playerPosM?: number): void {
  for (let i = 0; i < visuals.length; i += 1) {
    const vis = visuals[i];
    if (playerPosM !== undefined && !updateVisualVisibility(vis, playerPosM)) continue;
    const sig = signals[i];
    if (!sig || vis.lastAspect === sig.aspect) continue;
    vis.lastAspect = sig.aspect;
    vis.redMat.emissiveIntensity = sig.aspect === 'red' ? SEMAPHORE_ON_INTENSITY : SEMAPHORE_OFF_INTENSITY;
    vis.yellowMat.emissiveIntensity = sig.aspect === 'yellow' ? SEMAPHORE_ON_INTENSITY : SEMAPHORE_OFF_INTENSITY;
    vis.greenMat.emissiveIntensity = sig.aspect === 'green' ? SEMAPHORE_ON_INTENSITY : SEMAPHORE_OFF_INTENSITY;
    vis.haloMesh.position.y = SEMAPHORE_LENS_Y[sig.aspect];
    vis.haloMat.color.setHex(getSemaphoreAspectColor(sig.aspect));
  }
}

function updateVisualVisibility(vis: ISemaphoreVisual, playerPosM: number): boolean {
  const nextVis = isWithinCullingRange(vis.distanceM, playerPosM, DEFAULT_SCENE_CULL_RANGE_M);
  if (vis.visible !== nextVis) {
    vis.visible = nextVis;
    vis.group.visible = nextVis;
  }
  return nextVis;
}
