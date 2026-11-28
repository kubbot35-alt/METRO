import * as THREE from 'three';
import { DEPOT_HALL_BAY_LATERAL_X_M, DEPOT_WASH_END_M, DEPOT_WASH_START_M } from '../../domain/depotHallSystem';
import { M1_SURFACE_ELEVATION_M } from '../../domain/trackAlignment';

export interface IDepotWashRig {
  update(dtSec: number, washSprayActive: boolean, depotVisible: boolean): void;
}

const MIST_PARTICLE_COUNT = 220;

function createWashSignTexture(maxAniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 768; c.height = 160;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0c4a6e'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#38bdf8'; ctx.fillRect(0, 0, c.width, 14); ctx.fillRect(0, c.height - 14, c.width, 14);
  ctx.fillStyle = '#f8fafc'; ctx.font = '700 40px "Inter", system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('MYJNIA AUTOMATYCZNA', c.width / 2, 74);
  ctx.fillStyle = '#fde047'; ctx.font = '700 32px "JetBrains Mono", monospace';
  ctx.fillText('MAX 10 km/h · TRAIN WASH', c.width / 2, 126);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, maxAniso);
  return tex;
}

function createMistSpriteTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, 'rgba(224,242,254,0.92)');
  grad.addColorStop(0.5, 'rgba(186,230,253,0.45)');
  grad.addColorStop(1, 'rgba(186,230,253,0)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildWashPortalFrame(
  root: THREE.Group, trackX: number, centerZ: number, surfY: number, maxAniso: number, disposables: Array<{ dispose(): void }>,
): THREE.MeshStandardMaterial {
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.38, metalness: 0.55 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.28, roughness: 0.2, metalness: 0.1 });
  const signTex = createWashSignTexture(maxAniso);
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, emissiveMap: signTex, emissive: 0xffffff, emissiveIntensity: 0.65 });
  const statusMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 2.2 });
  const colGeo = new THREE.BoxGeometry(0.32, 5.1, 0.32);
  const beamGeo = new THREE.BoxGeometry(5.2, 0.36, 0.36);
  const roofGeo = new THREE.BoxGeometry(5.3, 0.16, 18.6);
  const sideScreenGeo = new THREE.BoxGeometry(0.08, 3.8, 18.0);
  const signGeo = new THREE.PlaneGeometry(4.9, 1.05);
  const statusGeo = new THREE.SphereGeometry(0.16, 10, 10);
  disposables.push(frameMat, glassMat, signTex, signMat, statusMat, colGeo, beamGeo, roofGeo, sideScreenGeo, signGeo, statusGeo);

  const zList = [centerZ - 9, centerZ - 3, centerZ + 3, centerZ + 9];
  for (let i = 0; i < zList.length; i += 1) {
    const colL = new THREE.Mesh(colGeo, frameMat); colL.position.set(trackX - 2.45, surfY + 2.55, zList[i]);
    const colR = new THREE.Mesh(colGeo, frameMat); colR.position.set(trackX + 2.45, surfY + 2.55, zList[i]);
    const beam = new THREE.Mesh(beamGeo, frameMat); beam.position.set(trackX, surfY + 5.05, zList[i]);
    root.add(colL, colR, beam);
  }
  const roof = new THREE.Mesh(roofGeo, glassMat); roof.position.set(trackX, surfY + 5.2, centerZ);
  const scrL = new THREE.Mesh(sideScreenGeo, glassMat); scrL.position.set(trackX - 2.48, surfY + 2.4, centerZ);
  const scrR = new THREE.Mesh(sideScreenGeo, glassMat); scrR.position.set(trackX + 2.48, surfY + 2.4, centerZ);
  const signFront = new THREE.Mesh(signGeo, signMat); signFront.position.set(trackX, surfY + 5.65, centerZ + 9.2);
  const signRear = new THREE.Mesh(signGeo, signMat); signRear.position.set(trackX, surfY + 5.65, centerZ - 9.2); signRear.rotation.y = Math.PI;
  const lamp = new THREE.Mesh(statusGeo, statusMat); lamp.position.set(trackX + 2.1, surfY + 4.4, centerZ + 9.2);
  root.add(roof, scrL, scrR, signFront, signRear, lamp);
  return statusMat;
}

function buildRotatingBrushes(
  root: THREE.Group, trackX: number, centerZ: number, surfY: number, disposables: Array<{ dispose(): void }>,
): { readonly vertical: readonly THREE.Group[]; readonly roofBrush: THREE.Group } {
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.72, metalness: 0.12 });
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.68, metalness: 0.12 });
  const coreMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.3, metalness: 0.85 });
  const spindleGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.6, 10);
  const discGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.44, 12);
  const roofBrushGeo = new THREE.CylinderGeometry(0.36, 0.36, 2.8, 12);
  disposables.push(blueMat, yellowMat, coreMat, spindleGeo, discGeo, roofBrushGeo);

  const vertical: THREE.Group[] = [];
  const positions: ReadonlyArray<[number, number]> = [
    [trackX - 1.82, centerZ + 4.2], [trackX + 1.82, centerZ + 4.2],
    [trackX - 1.82, centerZ - 4.2], [trackX + 1.82, centerZ - 4.2],
  ];
  for (let i = 0; i < positions.length; i += 1) {
    const brush = new THREE.Group();
    brush.position.set(positions[i][0], surfY + 2.05, positions[i][1]);
    brush.add(new THREE.Mesh(spindleGeo, coreMat));
    for (let s = 0; s < 6; s += 1) {
      const disc = new THREE.Mesh(discGeo, s % 2 === 0 ? blueMat : yellowMat);
      disc.position.y = -1.25 + s * 0.5;
      brush.add(disc);
    }
    root.add(brush);
    vertical.push(brush);
  }
  const roofBrush = new THREE.Group();
  roofBrush.position.set(trackX, surfY + 4.05, centerZ);
  const cyl = new THREE.Mesh(roofBrushGeo, blueMat);
  cyl.rotation.z = Math.PI / 2;
  roofBrush.add(cyl);
  root.add(roofBrush);
  return { vertical, roofBrush };
}

function buildWaterMistSystem(
  root: THREE.Group, trackX: number, centerZ: number, surfY: number, disposables: Array<{ dispose(): void }>,
): { points: THREE.Points; positions: Float32Array; speeds: Float32Array; mat: THREE.PointsMaterial } {
  const positions = new Float32Array(MIST_PARTICLE_COUNT * 3);
  const speeds = new Float32Array(MIST_PARTICLE_COUNT);
  for (let i = 0; i < MIST_PARTICLE_COUNT; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    positions[i * 3] = trackX + side * (1.2 + (i % 7) * 0.18);
    positions[i * 3 + 1] = surfY + 0.5 + ((i * 37) % 34) * 0.1;
    positions[i * 3 + 2] = centerZ - 7.5 + ((i * 19) % 150) * 0.1;
    speeds[i] = 0.9 + (i % 5) * 0.32;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const spriteTex = createMistSpriteTexture();
  const mat = new THREE.PointsMaterial({
    map: spriteTex,
    color: 0xe0f2fe,
    size: 0.95,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  disposables.push(geo, spriteTex, mat);
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  root.add(points);
  return { points, positions, speeds, mat };
}

export function addAutomaticTrainWash(
  root: THREE.Group,
  maxAniso: number,
  disposables: Array<{ dispose(): void }>,
): IDepotWashRig {
  const surfY = M1_SURFACE_ELEVATION_M;
  const trackX = DEPOT_HALL_BAY_LATERAL_X_M;
  const centerZ = -((DEPOT_WASH_START_M + DEPOT_WASH_END_M) * 0.5);
  const statusMat = buildWashPortalFrame(root, trackX, centerZ, surfY, maxAniso, disposables);
  const brushes = buildRotatingBrushes(root, trackX, centerZ, surfY, disposables);
  const mist = buildWaterMistSystem(root, trackX, centerZ, surfY, disposables);

  return {
    update(dtSec: number, washSprayActive: boolean, depotVisible: boolean): void {
      if (!depotVisible) return;
      const dt = Math.min(dtSec, 0.05);
      const spinSpeed = washSprayActive ? 7.8 : 2.1;
      for (let i = 0; i < brushes.vertical.length; i += 1) {
        brushes.vertical[i].rotation.y += (i % 2 === 0 ? 1 : -1) * spinSpeed * dt;
      }
      brushes.roofBrush.rotation.x += spinSpeed * 0.85 * dt;
      statusMat.emissive.setHex(washSprayActive ? 0x38bdf8 : 0x22c55e);
      statusMat.emissiveIntensity = washSprayActive ? 3.2 : 1.8;
      const targetOpacity = washSprayActive ? 0.78 : 0.22;
      mist.mat.opacity += (targetOpacity - mist.mat.opacity) * Math.min(1, dt * 4.5);
      mist.mat.size = washSprayActive ? 1.35 : 0.85;
      const attr = mist.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < MIST_PARTICLE_COUNT; i += 1) {
        let y = mist.positions[i * 3 + 1] + mist.speeds[i] * (washSprayActive ? 1.8 : 0.6) * dt;
        if (y > surfY + 4.2) y = surfY + 0.45;
        mist.positions[i * 3 + 1] = y;
      }
      attr.needsUpdate = true;
    },
  };
}
