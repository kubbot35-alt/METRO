import * as THREE from 'three';
import type { IAdTexturePool } from '../adTexturePool';
import { INTERIOR_CEIL_Y, INTERIOR_FLOOR_Y, INTERIOR_HALF_W } from './interiorMaterials';

export interface IOverheadLedDisplay {
  setWidescreenMode(wide: boolean): void;
  redraw(
    lineId: string,
    lineColor: string,
    statusText: string,
    clockStr: string,
    widescreen: boolean,
    adTicker?: string,
    adAccentHex?: string,
  ): void;
  dispose(): void;
}

export function buildInteriorAdFrames(
  root: THREE.Group,
  adPool: IAdTexturePool,
  disposables: Array<{ dispose(): void }>,
): void {
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.72 });
  const stripFrameGeo = new THREE.BoxGeometry(0.03, 0.36, 1.62);
  const stripPosterGeo = new THREE.PlaneGeometry(1.54, 0.3);
  const bulkFrameGeo = new THREE.BoxGeometry(0.54, 0.8, 0.03);
  const bulkPosterGeo = new THREE.PlaneGeometry(0.48, 0.72);
  disposables.push(frameMat, stripFrameGeo, stripPosterGeo, bulkFrameGeo, bulkPosterGeo);
  addCeilingStripAds(root, adPool, frameMat, stripFrameGeo, stripPosterGeo);
  addBulkheadCitylightAds(root, adPool, frameMat, bulkFrameGeo, bulkPosterGeo);
}

function addCeilingStripAds(
  root: THREE.Group,
  adPool: IAdTexturePool,
  frameMat: THREE.MeshStandardMaterial,
  stripFrameGeo: THREE.BoxGeometry,
  stripPosterGeo: THREE.PlaneGeometry,
): void {
  ([-1, 1] as const).forEach((sideSign, sideIdx) => {
    [3.9, 9.45, 14.2].forEach((zPos, i) => {
      const unit = new THREE.Group();
      unit.position.set(sideSign * (INTERIOR_HALF_W - 0.11), INTERIOR_CEIL_Y - 0.25, zPos);
      unit.rotation.z = sideSign * 0.38;
      const poster = new THREE.Mesh(stripPosterGeo, adPool.getInteriorPosterMaterial(i * 2 + sideIdx));
      poster.position.x = -sideSign * 0.018;
      poster.rotation.y = sideSign > 0 ? -Math.PI / 2 : Math.PI / 2;
      unit.add(new THREE.Mesh(stripFrameGeo, frameMat), poster);
      root.add(unit);
    });
  });
}

function addBulkheadCitylightAds(
  root: THREE.Group,
  adPool: IAdTexturePool,
  frameMat: THREE.MeshStandardMaterial,
  bulkFrameGeo: THREE.BoxGeometry,
  bulkPosterGeo: THREE.PlaneGeometry,
): void {
  ([-1, 1] as const).forEach((sideSign, idx) => {
    const bulkUnit = new THREE.Group();
    bulkUnit.position.set(sideSign * 0.86, INTERIOR_FLOOR_Y + 1.24, 2.1);
    const poster = new THREE.Mesh(bulkPosterGeo, adPool.getCitylightMaterial(idx + 2));
    poster.position.z = 0.018;
    bulkUnit.add(new THREE.Mesh(bulkFrameGeo, frameMat), poster);
    root.add(bulkUnit);
  });
}

class OverheadLedDisplay implements IOverheadLedDisplay {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly tex: THREE.CanvasTexture;
  private readonly frontGroup: THREE.Group;
  private readonly midGroup: THREE.Group;

  public constructor(root: THREE.Group, maxAnisotropy: number, disposables: Array<{ dispose(): void }>) {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 96;
    this.ctx = canvas.getContext('2d')!;
    this.tex = new THREE.CanvasTexture(canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = maxAnisotropy;
    const casingGeo = new THREE.BoxGeometry(1.54, 0.3, 0.1);
    const casingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.5 });
    const screenGeo = new THREE.PlaneGeometry(1.46, 0.24);
    const screenMat = new THREE.MeshBasicMaterial({ map: this.tex });
    disposables.push(casingGeo, casingMat, screenGeo, screenMat);
    this.frontGroup = mountDisplayAt(root, casingGeo, casingMat, screenGeo, screenMat, 2.28);
    this.midGroup = mountDisplayAt(root, casingGeo, casingMat, screenGeo, screenMat, 9.2);
  }

  public setWidescreenMode(wide: boolean): void {
    const sx = wide ? 1.32 : 1.0;
    const sy = wide ? 0.86 : 1.0;
    this.frontGroup.scale.set(sx, sy, 1);
    this.midGroup.scale.set(sx, sy, 1);
  }

  public redraw(
    lineId: string, lineColor: string, statusText: string, clockStr: string, widescreen: boolean, adTicker = '', adAccentHex = '#38bdf8',
  ): void {
    paintOverheadLedHeader(this.ctx, lineId, lineColor, statusText, clockStr, widescreen);
    paintOverheadLedTicker(this.ctx, clockStr, adTicker, adAccentHex);
    this.tex.needsUpdate = true;
  }

  public dispose(): void { this.tex.dispose(); }
}

export function createOverheadLedDisplay(
  root: THREE.Group, maxAnisotropy: number, disposables: Array<{ dispose(): void }>,
): IOverheadLedDisplay {
  return new OverheadLedDisplay(root, maxAnisotropy, disposables);
}

function mountDisplayAt(
  root: THREE.Group,
  casingGeo: THREE.BoxGeometry,
  casingMat: THREE.MeshStandardMaterial,
  screenGeo: THREE.PlaneGeometry,
  screenMat: THREE.MeshBasicMaterial,
  posZ: number,
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(0, INTERIOR_CEIL_Y - 0.26, posZ);
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.set(0, 0, 0.06);
  group.add(new THREE.Mesh(casingGeo, casingMat), screen);
  root.add(group);
  return group;
}

function paintOverheadLedHeader(
  ctx: CanvasRenderingContext2D, lineId: string, lineColor: string, statusText: string, clockStr: string, widescreen: boolean,
): void {
  ctx.fillStyle = widescreen ? '#09111f' : '#070b12';
  ctx.fillRect(0, 0, 640, 96);
  ctx.fillStyle = lineColor;
  ctx.fillRect(10, 14, 78, 68);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(lineId, 49, 50);
  ctx.fillStyle = widescreen ? '#f8fafc' : '#fbbf24';
  ctx.font = 'bold 24px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(statusText.slice(0, 24), 102, 36);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 17px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(clockStr, 624, 36);
}

function paintOverheadLedTicker(ctx: CanvasRenderingContext2D, clockStr: string, adTicker: string, adAccentHex: string): void {
  ctx.fillStyle = adAccentHex;
  ctx.fillRect(102, 54, 524, 2);
  ctx.font = '700 16px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(adTicker ? `★ ${adTicker.slice(0, 42)}` : `METRO WARSZAWSKIE · ${clockStr}`, 102, 74);
}
