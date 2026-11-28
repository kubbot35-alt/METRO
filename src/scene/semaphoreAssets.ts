import * as THREE from 'three';
import type { SignalAspect } from '../domain/types';

export const SEMAPHORE_OFF_INTENSITY = 0.04;
export const SEMAPHORE_ON_INTENSITY = 5.0;
export const SEMAPHORE_LENS_Y: Record<SignalAspect, number> = { red: 3.18, yellow: 2.75, green: 2.32 };

export interface ISemaphoreSharedAssets {
  readonly geos: {
    postGeo: THREE.CylinderGeometry;
    baseGeo: THREE.BoxGeometry;
    headGeo: THREE.BoxGeometry;
    visorGeo: THREE.CylinderGeometry;
    lensGeo: THREE.CircleGeometry;
    haloGeo: THREE.PlaneGeometry;
  };
  readonly mats: {
    postMat: THREE.MeshStandardMaterial;
    headMat: THREE.MeshStandardMaterial;
    glowTex: THREE.CanvasTexture;
  };
  readonly disposables: Array<{ dispose(): void }>;
}

export function createSemaphoreAssets(): ISemaphoreSharedAssets {
  const glowTex = createGlowTexture();
  const geos = {
    postGeo: new THREE.CylinderGeometry(0.06, 0.08, 2.9, 8),
    baseGeo: new THREE.BoxGeometry(0.36, 0.12, 0.36),
    headGeo: new THREE.BoxGeometry(0.54, 1.44, 0.3),
    visorGeo: new THREE.CylinderGeometry(0.19, 0.19, 0.22, 12, 1, true, -Math.PI * 0.55, Math.PI * 1.1),
    lensGeo: new THREE.CircleGeometry(0.165, 16),
    haloGeo: new THREE.PlaneGeometry(1.15, 1.15),
  };
  const mats = {
    postMat: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55, metalness: 0.7 }),
    headMat: new THREE.MeshStandardMaterial({ color: 0x090c12, roughness: 0.85, metalness: 0.2 }),
    glowTex,
  };
  const disposables: Array<{ dispose(): void }> = [
    glowTex, geos.postGeo, geos.baseGeo, geos.headGeo, geos.visorGeo, geos.lensGeo, geos.haloGeo, mats.postMat, mats.headMat,
  ];
  return { geos, mats, disposables };
}

export function createSemaphoreLensMaterial(hex: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: hex, emissive: hex, emissiveIntensity: SEMAPHORE_OFF_INTENSITY, roughness: 0.15, metalness: 0.05, fog: false,
  });
}

export function getSemaphoreAspectColor(aspect: SignalAspect): number {
  if (aspect === 'red') return 0xff3b3b;
  if (aspect === 'yellow') return 0xffb020;
  return 0x10f59d;
}

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
