import * as THREE from 'three';
import type { ISop2State } from '../domain/types';
import type { IDisposableResource } from './shared/baseTrainConsist';
import { createCanvasTextureSurface } from './shared/canvasTextureFactory';

export interface IRetroSop2Display {
  update(sop2: ISop2State): void;
}

export function attachSeria81Sop2Display(
  group: THREE.Group,
  deskGreyMat: THREE.MeshStandardMaterial,
  steelTrimMat: THREE.MeshStandardMaterial,
  maxAnisotropy: number,
  disposables: IDisposableResource[],
): IRetroSop2Display {
  const surface = createCanvasTextureSurface({ width: 256, height: 128, maxAnisotropy });
  const boxGeo = new THREE.BoxGeometry(0.24, 0.125, 0.06);
  const trimGeo = new THREE.BoxGeometry(0.255, 0.14, 0.015);
  const faceGeo = new THREE.PlaneGeometry(0.215, 0.105);
  const faceMat = new THREE.MeshStandardMaterial({
    map: surface.texture, emissiveMap: surface.texture, emissive: 0xffffff, emissiveIntensity: 1.05, roughness: 0.4,
  });
  const unit = new THREE.Group();
  unit.position.set(0.58, -0.26, -0.89);
  unit.rotation.set(-0.24, -0.22, 0);
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.position.set(0, 0, 0.032);
  const trim = new THREE.Mesh(trimGeo, steelTrimMat);
  trim.position.set(0, 0, 0.025);
  unit.add(new THREE.Mesh(boxGeo, deskGreyMat), trim, face);
  group.add(unit);
  disposables.push(boxGeo, trimGeo, faceGeo, faceMat, surface.texture);
  return createRetroSop2Updater(surface.ctx, surface.texture);
}

function createRetroSop2Updater(ctx: CanvasRenderingContext2D, texture: THREE.CanvasTexture): IRetroSop2Display {
  let lastKey = '';
  return {
    update(sop2: ISop2State): void {
      const key = `${sop2.currentLimitKmh}:${sop2.targetLimitKmh ?? '-'}:${sop2.targetDistanceM ?? '-'}:${sop2.status}`;
      if (key === lastKey) return;
      lastKey = key;
      paintRetroSop2Screen(ctx, sop2);
      texture.needsUpdate = true;
    },
  };
}

function paintRetroSop2Screen(ctx: CanvasRenderingContext2D, sop2: ISop2State): void {
  const bg = sop2.status === 'intervention' ? '#3b0909' : sop2.status === 'warning' ? '#381606' : '#08120e';
  const accent = sop2.status === 'intervention' ? '#ef4444' : sop2.status === 'warning' ? '#f97316' : '#34d399';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 5;
  ctx.strokeRect(4, 4, 248, 120);
  ctx.fillStyle = accent;
  ctx.font = 'bold 19px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(sop2.interventionActive ? 'SOP-2 HAM!' : 'SOP-2 ATP', 16, 28);
  ctx.fillStyle = '#fef3c7';
  ctx.font = 'bold 56px "JetBrains Mono", monospace';
  ctx.fillText(String(sop2.currentLimitKmh), 16, 86);
  ctx.fillStyle = sop2.targetLimitKmh !== null ? '#fbbf24' : '#64748b';
  ctx.font = 'bold 20px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  const targetStr = sop2.targetLimitKmh !== null ? `→${sop2.targetLimitKmh}` : '→—';
  ctx.fillText(targetStr, 240, 72);
  ctx.font = '600 15px "JetBrains Mono", monospace';
  ctx.fillText(sop2.targetDistanceM !== null ? `${sop2.targetDistanceM}m` : 'OK', 240, 102);
}
