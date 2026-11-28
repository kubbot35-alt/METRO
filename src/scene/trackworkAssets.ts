import * as THREE from 'three';

export interface ITrackworkSlot {
  readonly startGroup: THREE.Group;
  readonly endGroup: THREE.Group;
  readonly beaconMat: THREE.MeshStandardMaterial;
  readonly haloMat: THREE.MeshBasicMaterial;
}

export interface ITrackworkSharedAssets {
  readonly postGeo: THREE.CylinderGeometry;
  readonly signGeo: THREE.PlaneGeometry;
  readonly beaconGeo: THREE.SphereGeometry;
  readonly haloGeo: THREE.PlaneGeometry;
  readonly postMat: THREE.MeshStandardMaterial;
  readonly startSignMat: THREE.MeshStandardMaterial;
  readonly endSignMat: THREE.MeshStandardMaterial;
  readonly haloTex: THREE.CanvasTexture;
}

export function createTrackworkSignTexture(label: string, sublabel: string, maxAnisotropy: number): THREE.CanvasTexture {
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

export function createBeaconHaloTexture(): THREE.CanvasTexture {
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

export function createTrackworkSharedAssets(maxAnisotropy: number, disposables: Array<{ dispose(): void }>): ITrackworkSharedAssets {
  const startTex = createTrackworkSignTexture('25', 'ROBOTY', maxAnisotropy);
  const endTex = createTrackworkSignTexture('KONIEC', 'ROBÓT', maxAnisotropy);
  const haloTex = createBeaconHaloTexture();
  const postGeo = new THREE.CylinderGeometry(0.045, 0.055, 2.35, 8);
  const signGeo = new THREE.PlaneGeometry(0.95, 0.72);
  const beaconGeo = new THREE.SphereGeometry(0.14, 10, 10);
  const haloGeo = new THREE.PlaneGeometry(1.25, 1.25);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.65 });
  const startSignMat = new THREE.MeshStandardMaterial({ map: startTex, emissiveMap: startTex, emissive: 0xffffff, emissiveIntensity: 0.65, roughness: 0.3 });
  const endSignMat = new THREE.MeshStandardMaterial({ map: endTex, emissiveMap: endTex, emissive: 0xffffff, emissiveIntensity: 0.45, roughness: 0.3 });
  disposables.push(startTex, endTex, haloTex, postGeo, signGeo, beaconGeo, haloGeo, postMat, startSignMat, endSignMat);
  return { postGeo, signGeo, beaconGeo, haloGeo, postMat, startSignMat, endSignMat, haloTex };
}

export function createTrackworkSlot(
  root: THREE.Group, assets: ITrackworkSharedAssets, disposables: Array<{ dispose(): void }>,
): ITrackworkSlot {
  const beaconMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xffb020, emissiveIntensity: 3.5, roughness: 0.2, fog: false });
  const haloMat = new THREE.MeshBasicMaterial({ map: assets.haloTex, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  disposables.push(beaconMat, haloMat);
  const startGroup = createSignPostGroup(assets, assets.startSignMat, beaconMat, haloMat);
  const endGroup = createSignPostGroup(assets, assets.endSignMat);
  startGroup.visible = false;
  endGroup.visible = false;
  root.add(startGroup, endGroup);
  return { startGroup, endGroup, beaconMat, haloMat };
}

function createSignPostGroup(
  assets: ITrackworkSharedAssets, signMat: THREE.MeshStandardMaterial,
  beaconMat?: THREE.MeshStandardMaterial, haloMat?: THREE.MeshBasicMaterial,
): THREE.Group {
  const group = new THREE.Group();
  const post = new THREE.Mesh(assets.postGeo, assets.postMat); post.position.y = 1.18;
  const sign = new THREE.Mesh(assets.signGeo, signMat); sign.position.set(0, 2.02, 0.08);
  group.add(post, sign);
  if (beaconMat && haloMat) {
    const beacon = new THREE.Mesh(assets.beaconGeo, beaconMat); beacon.position.set(0, 2.6, 0.08);
    const halo = new THREE.Mesh(assets.haloGeo, haloMat); halo.position.set(0, 2.6, 0.22);
    group.add(beacon, halo);
  }
  return group;
}
