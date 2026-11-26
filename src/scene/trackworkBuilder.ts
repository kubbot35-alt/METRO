import * as THREE from 'three';
import type { ITrackworkZone } from '../domain/types';

export interface ITrackworkRig {
  sync(zones: readonly ITrackworkZone[], dtSec: number): void;
  dispose(): void;
}

interface ITrackworkSlot {
  readonly startGroup: THREE.Group;
  readonly endGroup: THREE.Group;
  readonly beaconMat: THREE.MeshStandardMaterial;
  readonly haloMat: THREE.MeshBasicMaterial;
}

const MAX_SLOTS = 3;

function createTrackworkSignTexture(label: string, sublabel: string, maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 0, 256, 192);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, 236, 172);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 68px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 128, 76);
    ctx.font = 'bold 26px "Chakra Petch", sans-serif';
    ctx.fillText(sublabel, 128, 144);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createBeaconHaloTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 220, 90, 0.95)');
    grad.addColorStop(0.4, 'rgba(245, 158, 11, 0.55)');
    grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildTrackworkRig(
  scene: THREE.Scene,
  maxAnisotropy: number,
): ITrackworkRig {
  const disposables: Array<{ dispose(): void }> = [];
  const root = new THREE.Group();
  root.name = 'TunnelTrackworkGroup';
  scene.add(root);

  const startTex = createTrackworkSignTexture('25', 'ROBOTY', maxAnisotropy);
  const endTex = createTrackworkSignTexture('KONIEC', 'ROBÓT', maxAnisotropy);
  const haloTex = createBeaconHaloTexture();
  const postGeo = new THREE.CylinderGeometry(0.045, 0.055, 2.35, 8);
  const signGeo = new THREE.PlaneGeometry(0.95, 0.72);
  const beaconGeo = new THREE.SphereGeometry(0.14, 10, 10);
  const haloGeo = new THREE.PlaneGeometry(1.25, 1.25);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.65 });
  const startSignMat = new THREE.MeshStandardMaterial({
    map: startTex,
    emissiveMap: startTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.65,
    roughness: 0.3,
  });
  const endSignMat = new THREE.MeshStandardMaterial({
    map: endTex,
    emissiveMap: endTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.45,
    roughness: 0.3,
  });
  disposables.push(
    startTex, endTex, haloTex, postGeo, signGeo, beaconGeo, haloGeo,
    postMat, startSignMat, endSignMat,
  );

  const slots: ITrackworkSlot[] = [];
  for (let i = 0; i < MAX_SLOTS; i += 1) {
    slots.push(
      createSlot(root, { postGeo, signGeo, beaconGeo, haloGeo }, { postMat, startSignMat, endSignMat, haloTex }, disposables),
    );
  }

  let flashClock = 0;
  return {
    sync: (zones, dtSec) => {
      flashClock += dtSec;
      const blinkOn = Math.sin(flashClock * 13) > 0;
      for (let i = 0; i < slots.length; i += 1) {
        const slot = slots[i];
        const zone = zones[i];
        if (!zone) {
          slot.startGroup.visible = false;
          slot.endGroup.visible = false;
          continue;
        }
        slot.startGroup.visible = true;
        slot.endGroup.visible = true;
        slot.startGroup.position.set(-2.05, 0, -(zone.startM - 12));
        slot.endGroup.position.set(-2.05, 0, -zone.endM);
        slot.beaconMat.emissiveIntensity = blinkOn ? 5.2 : 0.25;
        slot.haloMat.opacity = blinkOn ? 0.92 : 0.1;
      }
    },
    dispose: () => {
      scene.remove(root);
      disposables.forEach((d) => d.dispose());
    },
  };
}

function createSlot(
  root: THREE.Group,
  geos: {
    postGeo: THREE.CylinderGeometry;
    signGeo: THREE.PlaneGeometry;
    beaconGeo: THREE.SphereGeometry;
    haloGeo: THREE.PlaneGeometry;
  },
  mats: {
    postMat: THREE.MeshStandardMaterial;
    startSignMat: THREE.MeshStandardMaterial;
    endSignMat: THREE.MeshStandardMaterial;
    haloTex: THREE.CanvasTexture;
  },
  disposables: Array<{ dispose(): void }>,
): ITrackworkSlot {
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xffb020,
    emissiveIntensity: 3.5,
    roughness: 0.2,
    fog: false,
  });
  const haloMat = new THREE.MeshBasicMaterial({
    map: mats.haloTex,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  disposables.push(beaconMat, haloMat);

  const startGroup = new THREE.Group();
  const postA = new THREE.Mesh(geos.postGeo, mats.postMat);
  postA.position.y = 1.18;
  const signA = new THREE.Mesh(geos.signGeo, mats.startSignMat);
  signA.position.set(0, 2.02, 0.08);
  const beacon = new THREE.Mesh(geos.beaconGeo, beaconMat);
  beacon.position.set(0, 2.6, 0.08);
  const halo = new THREE.Mesh(geos.haloGeo, haloMat);
  halo.position.set(0, 2.6, 0.22);
  startGroup.add(postA, signA, beacon, halo);

  const endGroup = new THREE.Group();
  const postB = new THREE.Mesh(geos.postGeo, mats.postMat);
  postB.position.y = 1.18;
  const signB = new THREE.Mesh(geos.signGeo, mats.endSignMat);
  signB.position.set(0, 2.02, 0.08);
  endGroup.add(postB, signB);

  startGroup.visible = false;
  endGroup.visible = false;
  root.add(startGroup, endGroup);
  return { startGroup, endGroup, beaconMat, haloMat };
}
