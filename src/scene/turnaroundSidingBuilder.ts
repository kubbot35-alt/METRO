import * as THREE from 'three';
import type { TrackAlignment } from '../domain/trackAlignment';
import {
  TURNAROUND_BUFFER_OFFSET_M,
  TURNAROUND_SPEED_LIMIT_KMH,
  TURNAROUND_STOP_MIN_OFFSET_M,
} from '../domain/turnaroundSystem';
import type { IStationSpec } from '../domain/types';
import { createSpeedSignTexture } from './proceduralTextures';
import type { ISceneResources } from './types';

export interface ITurnaroundSidingRig extends ISceneResources {
  update(timeSec: number, active: boolean): void;
}

function createChevronBufferTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = '#f8fafc';
  for (let x = -128; x < 640; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 128);
    ctx.lineTo(x + 32, 128);
    ctx.lineTo(x + 68, 0);
    ctx.lineTo(x + 36, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 504, 120);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  return tex;
}

function createTurnaroundBannerTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 116);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 34px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('TOR ODSTAWCZY · STOP', 256, 56);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 26px "JetBrains Mono", monospace';
  ctx.fillText('ZMIANA KABINY [T]', 256, 98);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  return tex;
}

function addBufferStopAssembly(
  root: THREE.Group,
  alignment: TrackAlignment,
  bufferDistM: number,
  maxAnisotropy: number,
  disposables: Array<{ dispose(): void }>,
): { readonly beaconMat: THREE.MeshStandardMaterial; readonly redLight: THREE.PointLight } {
  const frame = alignment.sample(bufferDistM);
  const group = new THREE.Group();
  group.position.set(frame.x, frame.y, frame.z);
  group.rotation.order = 'YXZ';
  group.rotation.set(frame.pitch, frame.yaw, 0);

  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, metalness: 0.08 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.72 });
  const chevronTex = createChevronBufferTexture(maxAnisotropy);
  const chevronMat = new THREE.MeshStandardMaterial({
    map: chevronTex,
    emissiveMap: chevronTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.35,
    roughness: 0.35,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xff3b3b,
    emissive: 0xef4444,
    emissiveIntensity: 4.0,
    roughness: 0.15,
  });

  const plinthGeo = new THREE.BoxGeometry(2.8, 0.55, 1.9);
  const plinth = new THREE.Mesh(plinthGeo, concreteMat);
  plinth.position.set(0, 0.275, -0.45);

  const legGeo = new THREE.BoxGeometry(0.18, 1.38, 0.22);
  const strutGeo = new THREE.BoxGeometry(0.16, 1.65, 0.2);
  const beamGeo = new THREE.BoxGeometry(2.55, 0.52, 0.28);
  const padGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.24, 14);
  const beaconGeo = new THREE.BoxGeometry(0.28, 0.28, 0.18);

  const beam = new THREE.Mesh(beamGeo, chevronMat);
  beam.position.set(0, 1.15, 0.38);

  const leftPad = new THREE.Mesh(padGeo, steelMat);
  leftPad.rotation.x = Math.PI / 2;
  leftPad.position.set(-0.78, 1.15, 0.58);
  const rightPad = new THREE.Mesh(padGeo, steelMat);
  rightPad.rotation.x = Math.PI / 2;
  rightPad.position.set(0.78, 1.15, 0.58);

  for (const side of [-0.88, 0.88]) {
    const leg = new THREE.Mesh(legGeo, steelMat);
    leg.position.set(side, 0.9, 0.22);
    leg.rotation.x = -0.25;
    const strut = new THREE.Mesh(strutGeo, steelMat);
    strut.position.set(side, 0.88, -0.58);
    strut.rotation.x = 0.62;
    group.add(leg, strut);
  }

  const leftBeacon = new THREE.Mesh(beaconGeo, beaconMat);
  leftBeacon.position.set(-0.92, 1.66, 0.34);
  const rightBeacon = new THREE.Mesh(beaconGeo, beaconMat);
  rightBeacon.position.set(0.92, 1.66, 0.34);

  const redLight = new THREE.PointLight(0xef4444, 24, 38, 1.4);
  redLight.position.set(0, 2.0, 2.2);

  const bulkheadGeo = new THREE.BoxGeometry(12.2, 5.4, 0.8);
  const bulkhead = new THREE.Mesh(bulkheadGeo, concreteMat);
  bulkhead.position.set(-1.6, 2.7, -8.2);

  group.add(plinth, beam, leftPad, rightPad, leftBeacon, rightBeacon, redLight, bulkhead);
  root.add(group);
  disposables.push(
    concreteMat,
    steelMat,
    chevronTex,
    chevronMat,
    beaconMat,
    plinthGeo,
    legGeo,
    strutGeo,
    beamGeo,
    padGeo,
    beaconGeo,
    bulkheadGeo,
  );
  return { beaconMat, redLight };
}

function addSidingGuidanceSigns(
  root: THREE.Group,
  alignment: TrackAlignment,
  sidingStartM: number,
  maxAnisotropy: number,
  disposables: Array<{ dispose(): void }>,
): void {
  const postGeo = new THREE.CylinderGeometry(0.045, 0.045, 2.3, 8);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.7 });
  const signTex = createSpeedSignTexture(TURNAROUND_SPEED_LIMIT_KMH, maxAnisotropy);
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex,
    emissiveMap: signTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.65,
    roughness: 0.3,
  });
  const signGeo = new THREE.PlaneGeometry(0.76, 0.76);
  const limitDistM = sidingStartM + 32;
  const limFrame = alignment.sample(limitDistM);
  const limPt = alignment.toWorldPoint(limitDistM, 1.98, 0, false);
  const limitGroup = new THREE.Group();
  limitGroup.position.set(limPt.x, limPt.y, limPt.z);
  limitGroup.rotation.set(0, limFrame.yaw, 0);
  const post = new THREE.Mesh(postGeo, postMat);
  post.position.set(0, 1.15, 0);
  const signMesh = new THREE.Mesh(signGeo, signMat);
  signMesh.position.set(0, 2.2, 0.06);
  limitGroup.add(post, signMesh);
  root.add(limitGroup);

  const bannerTex = createTurnaroundBannerTexture(maxAnisotropy);
  const bannerMat = new THREE.MeshStandardMaterial({
    map: bannerTex,
    emissiveMap: bannerTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.78,
    roughness: 0.25,
  });
  const bannerGeo = new THREE.PlaneGeometry(2.8, 0.7);
  const stopDistM = sidingStartM + TURNAROUND_STOP_MIN_OFFSET_M + 26;
  const stopFrame = alignment.sample(stopDistM);
  const stopPt = alignment.toWorldPoint(stopDistM, 0, 3.85, false);
  const banner = new THREE.Mesh(bannerGeo, bannerMat);
  banner.position.set(stopPt.x, stopPt.y, stopPt.z);
  banner.rotation.set(0, stopFrame.yaw, 0);
  root.add(banner);

  disposables.push(postGeo, postMat, signTex, signMat, signGeo, bannerTex, bannerMat, bannerGeo);
}

export function buildTurnaroundSidingRig(
  scene: THREE.Scene,
  alignment: TrackAlignment,
  stations: readonly IStationSpec[],
  maxAnisotropy: number,
): ITurnaroundSidingRig {
  const disposables: Array<{ dispose(): void }> = [];
  const root = new THREE.Group();
  root.name = 'TurnaroundSidingGroup';
  scene.add(root);

  const sidingStartM = stations[stations.length - 1]?.distanceM ?? 3000;
  const bufferDistM = sidingStartM + TURNAROUND_BUFFER_OFFSET_M;
  const { beaconMat, redLight } = addBufferStopAssembly(
    root,
    alignment,
    bufferDistM,
    maxAnisotropy,
    disposables,
  );
  addSidingGuidanceSigns(root, alignment, sidingStartM, maxAnisotropy, disposables);

  return {
    update: (timeSec, active) => {
      const pulse = 0.72 + 0.28 * Math.sin(timeSec * (active ? 6.2 : 2.6));
      beaconMat.emissiveIntensity = (active ? 5.2 : 3.2) * pulse;
      redLight.intensity = (active ? 30 : 18) * pulse;
    },
    dispose: () => {
      scene.remove(root);
      disposables.forEach((item) => item.dispose());
    },
  };
}
