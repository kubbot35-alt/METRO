import * as THREE from 'three';
import type { TrackAlignment } from '../domain/trackAlignment';
import { TURNAROUND_SPEED_LIMIT_KMH, TURNAROUND_STOP_MIN_OFFSET_M } from '../domain/turnaroundSystem';
import { createSpeedSignTexture } from './proceduralTextures';

export function createChevronBufferTexture(maxAnisotropy: number): THREE.CanvasTexture {
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

export function addSidingGuidanceSigns(
  root: THREE.Group,
  alignment: TrackAlignment,
  sidingStartM: number,
  maxAnisotropy: number,
  disposables: Array<{ dispose(): void }>,
): void {
  addSidingSpeedPost(root, alignment, sidingStartM + 32, maxAnisotropy, disposables);
  addSidingStopBanner(root, alignment, sidingStartM + TURNAROUND_STOP_MIN_OFFSET_M + 26, maxAnisotropy, disposables);
}

function addSidingSpeedPost(
  root: THREE.Group,
  alignment: TrackAlignment,
  limitDistM: number,
  maxAnisotropy: number,
  disposables: Array<{ dispose(): void }>,
): void {
  const postGeo = new THREE.CylinderGeometry(0.045, 0.045, 2.3, 8);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.7 });
  const signTex = createSpeedSignTexture(TURNAROUND_SPEED_LIMIT_KMH, maxAnisotropy);
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, emissiveMap: signTex, emissive: 0xffffff, emissiveIntensity: 0.65, roughness: 0.3 });
  const signGeo = new THREE.PlaneGeometry(0.76, 0.76);
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
  disposables.push(postGeo, postMat, signTex, signMat, signGeo);
}

function addSidingStopBanner(
  root: THREE.Group,
  alignment: TrackAlignment,
  stopDistM: number,
  maxAnisotropy: number,
  disposables: Array<{ dispose(): void }>,
): void {
  const bannerTex = createTurnaroundBannerTexture(maxAnisotropy);
  const bannerMat = new THREE.MeshStandardMaterial({ map: bannerTex, emissiveMap: bannerTex, emissive: 0xffffff, emissiveIntensity: 0.78, roughness: 0.25 });
  const bannerGeo = new THREE.PlaneGeometry(2.8, 0.7);
  const stopFrame = alignment.sample(stopDistM);
  const stopPt = alignment.toWorldPoint(stopDistM, 0, 3.85, false);
  const banner = new THREE.Mesh(bannerGeo, bannerMat);
  banner.position.set(stopPt.x, stopPt.y, stopPt.z);
  banner.rotation.set(0, stopFrame.yaw, 0);
  root.add(banner);
  disposables.push(bannerTex, bannerMat, bannerGeo);
}
