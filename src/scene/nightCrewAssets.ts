import * as THREE from 'three';

export interface ICrewVisualUnit {
  readonly root: THREE.Group;
  readonly wandPivot: THREE.Group;
  readonly beaconMat: THREE.MeshStandardMaterial;
  readonly haloMat: THREE.MeshBasicMaterial;
  readonly haloMesh: THREE.Mesh;
}

export interface ISharedCrewAssets {
  readonly legsGeo: THREE.BoxGeometry;
  readonly torsoGeo: THREE.BoxGeometry;
  readonly vestBandGeo: THREE.BoxGeometry;
  readonly headGeo: THREE.SphereGeometry;
  readonly helmetGeo: THREE.SphereGeometry;
  readonly wandGeo: THREE.CylinderGeometry;
  readonly tripodGeo: THREE.CylinderGeometry;
  readonly barrierGeo: THREE.BoxGeometry;
  readonly beaconGeo: THREE.CylinderGeometry;
  readonly haloGeo: THREE.SphereGeometry;
  readonly pantsMat: THREE.MeshStandardMaterial;
  readonly vestMat: THREE.MeshStandardMaterial;
  readonly reflectiveMat: THREE.MeshStandardMaterial;
  readonly skinMat: THREE.MeshStandardMaterial;
  readonly helmetMat: THREE.MeshStandardMaterial;
  readonly wandMat: THREE.MeshStandardMaterial;
  readonly metalMat: THREE.MeshStandardMaterial;
  readonly barrierMat: THREE.MeshStandardMaterial;
}

export function createHazardStripeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f97316';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#f8fafc';
    for (let x = -64; x < 320; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 22, 0);
      ctx.lineTo(x - 10, 64);
      ctx.lineTo(x - 32, 64);
      ctx.closePath();
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createSharedCrewAssets(stripeTex: THREE.CanvasTexture, disposables: Array<{ dispose(): void }>): ISharedCrewAssets {
  const assets: ISharedCrewAssets = {
    legsGeo: new THREE.BoxGeometry(0.32, 0.78, 0.24),
    torsoGeo: new THREE.BoxGeometry(0.42, 0.66, 0.26),
    vestBandGeo: new THREE.BoxGeometry(0.445, 0.08, 0.285),
    headGeo: new THREE.SphereGeometry(0.145, 8, 8),
    helmetGeo: new THREE.SphereGeometry(0.175, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.58),
    wandGeo: new THREE.CylinderGeometry(0.025, 0.025, 0.52, 6),
    tripodGeo: new THREE.CylinderGeometry(0.04, 0.14, 1.15, 6),
    barrierGeo: new THREE.BoxGeometry(0.92, 0.24, 0.08),
    beaconGeo: new THREE.CylinderGeometry(0.12, 0.14, 0.24, 10),
    haloGeo: new THREE.SphereGeometry(0.42, 10, 10),
    pantsMat: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.08 }),
    vestMat: new THREE.MeshStandardMaterial({ color: 0xd9f99d, emissive: 0xa3e635, emissiveIntensity: 0.85, roughness: 0.45 }),
    reflectiveMat: new THREE.MeshStandardMaterial({ color: 0xf8fafc, emissive: 0xe2e8f0, emissiveIntensity: 1.9, roughness: 0.15, metalness: 0.4 }),
    skinMat: new THREE.MeshStandardMaterial({ color: 0xd6b89c, roughness: 0.8 }),
    helmetMat: new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 0.45, roughness: 0.35 }),
    wandMat: new THREE.MeshStandardMaterial({ color: 0xfb923c, emissive: 0xf97316, emissiveIntensity: 2.8, roughness: 0.2 }),
    metalMat: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.7 }),
    barrierMat: new THREE.MeshStandardMaterial({ map: stripeTex, emissiveMap: stripeTex, emissive: 0xffedd5, emissiveIntensity: 0.55, roughness: 0.45 }),
  };
  disposables.push(stripeTex, ...Object.values(assets));
  return assets;
}

export function createCrewVisualUnit(assets: ISharedCrewAssets, disposables: Array<{ dispose(): void }>): ICrewVisualUnit {
  const root = new THREE.Group();
  const workerA = buildWorkerMesh(assets, true);
  workerA.group.position.set(0, 0, 1.2);
  const workerB = buildWorkerMesh(assets, false);
  workerB.group.position.set(0.22, 0, -1.6);
  workerB.group.rotation.y = 0.45;
  const tripod = new THREE.Mesh(assets.tripodGeo, assets.metalMat);
  tripod.position.set(-0.18, 0.575, 4.6);
  const barrier = new THREE.Mesh(assets.barrierGeo, assets.barrierMat);
  barrier.position.set(-0.18, 0.72, 4.72);
  const beaconMat = new THREE.MeshStandardMaterial({ color: 0xfb923c, emissive: 0xf97316, emissiveIntensity: 3.4, roughness: 0.2 });
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  disposables.push(beaconMat, haloMat);
  const beaconDome = new THREE.Mesh(assets.beaconGeo, beaconMat);
  beaconDome.position.set(-0.18, 1.26, 4.6);
  const haloMesh = new THREE.Mesh(assets.haloGeo, haloMat);
  haloMesh.position.set(-0.18, 1.28, 4.6);
  const rearBeacon = new THREE.Mesh(assets.beaconGeo, beaconMat);
  rearBeacon.position.set(0.1, 0.14, -3.2);
  root.add(workerA.group, workerB.group, tripod, barrier, beaconDome, haloMesh, rearBeacon);
  return { root, wandPivot: workerA.wandPivot, beaconMat, haloMat, haloMesh };
}

function buildWorkerMesh(assets: ISharedCrewAssets, withWand: boolean) {
  const group = new THREE.Group();
  const legs = new THREE.Mesh(assets.legsGeo, assets.pantsMat);
  legs.position.y = 0.39;
  const torso = new THREE.Mesh(assets.torsoGeo, assets.vestMat);
  torso.position.y = 1.1;
  const bandA = new THREE.Mesh(assets.vestBandGeo, assets.reflectiveMat);
  bandA.position.y = 0.96;
  const bandB = new THREE.Mesh(assets.vestBandGeo, assets.reflectiveMat);
  bandB.position.y = 1.2;
  const head = new THREE.Mesh(assets.headGeo, assets.skinMat);
  head.position.y = 1.58;
  const helmet = new THREE.Mesh(assets.helmetGeo, assets.helmetMat);
  helmet.position.y = 1.62;
  group.add(legs, torso, bandA, bandB, head, helmet);
  const wandPivot = new THREE.Group();
  wandPivot.position.set(0.24, 1.32, 0.08);
  if (withWand) {
    const wand = new THREE.Mesh(assets.wandGeo, assets.wandMat);
    wand.position.y = 0.26;
    wandPivot.add(wand);
  }
  group.add(wandPivot);
  return { group, wandPivot };
}
