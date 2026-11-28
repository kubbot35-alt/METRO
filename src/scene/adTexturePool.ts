import * as THREE from 'three';
import {
  DOOH_SLOT_COUNT,
  getDoohSlideIndex,
  type IAdCampaignSpec,
  METRO_AD_CAMPAIGNS,
} from '../domain/metroAdsCatalog';
import type { LanguageId } from '../domain/types';
import {
  paintInteriorStripAdCanvas,
  paintLandscapeAdCanvas,
  paintPortraitCitylightCanvas,
} from './adCanvasPainter';

export interface IAdTexturePool {
  readonly campaignCount: number;
  getBannerMaterial(index: number): THREE.MeshStandardMaterial;
  getCitylightMaterial(index: number): THREE.MeshStandardMaterial;
  getDoohMaterial(slotIndex: number): THREE.MeshStandardMaterial;
  getInteriorPosterMaterial(index: number): THREE.MeshStandardMaterial;
  update(elapsedSec: number, nightServiceActive: boolean, lang: LanguageId): void;
  dispose(): void;
}

interface ICanvasTexEntry {
  readonly canvas: HTMLCanvasElement;
  readonly texture: THREE.CanvasTexture;
  readonly campaign: IAdCampaignSpec;
}

type AdCanvasPainter = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  ad: IAdCampaignSpec,
  language: LanguageId,
) => void;

class AdTexturePool implements IAdTexturePool {
  public readonly campaignCount = METRO_AD_CAMPAIGNS.length;
  private readonly landscapeEntries: ICanvasTexEntry[];
  private readonly portraitEntries: ICanvasTexEntry[];
  private readonly interiorEntries: ICanvasTexEntry[];
  private readonly bannerMaterials: THREE.MeshStandardMaterial[];
  private readonly citylightMaterials: THREE.MeshStandardMaterial[];
  private readonly interiorMaterials: THREE.MeshStandardMaterial[];
  private readonly doohSlideIndices: number[];
  private readonly doohMaterials: THREE.MeshStandardMaterial[];
  private currentLang: LanguageId;
  private isNightOff = false;

  public constructor(maxAniso: number, initialLang: LanguageId = 'pl') {
    this.currentLang = initialLang;
    this.landscapeEntries = METRO_AD_CAMPAIGNS.map((ad) => createCanvasEntry(512, 256, ad, maxAniso, initialLang, paintLandscapeAdCanvas));
    this.portraitEntries = METRO_AD_CAMPAIGNS.map((ad) => createCanvasEntry(256, 384, ad, maxAniso, initialLang, paintPortraitCitylightCanvas));
    this.interiorEntries = METRO_AD_CAMPAIGNS.map((ad) => createCanvasEntry(512, 128, ad, maxAniso, initialLang, paintInteriorStripAdCanvas));
    this.bannerMaterials = this.landscapeEntries.map((e) => createBacklitMaterial(e.texture, 0.65, 0.25));
    this.citylightMaterials = this.portraitEntries.map((e) => createBacklitMaterial(e.texture, 0.72, 0.2));
    this.interiorMaterials = this.interiorEntries.map((e) => createBacklitMaterial(e.texture, 0.36, 0.35));
    this.doohSlideIndices = Array.from({ length: DOOH_SLOT_COUNT }, (_, slot) => getDoohSlideIndex(0, slot, this.landscapeEntries.length));
    this.doohMaterials = this.doohSlideIndices.map((idx) => createBacklitMaterial(this.landscapeEntries[idx].texture, 0.92, 0.14));
  }

  public getBannerMaterial(idx: number): THREE.MeshStandardMaterial {
    return this.bannerMaterials[Math.abs(idx) % this.bannerMaterials.length];
  }

  public getCitylightMaterial(idx: number): THREE.MeshStandardMaterial {
    return this.citylightMaterials[Math.abs(idx) % this.citylightMaterials.length];
  }

  public getDoohMaterial(slot: number): THREE.MeshStandardMaterial {
    return this.doohMaterials[Math.abs(slot) % this.doohMaterials.length];
  }

  public getInteriorPosterMaterial(idx: number): THREE.MeshStandardMaterial {
    return this.interiorMaterials[Math.abs(idx) % this.interiorMaterials.length];
  }

  public update(elapsedSec: number, nightServiceActive: boolean, lang: LanguageId): void {
    if (lang !== this.currentLang) this.applyLanguage(lang);
    if (nightServiceActive !== this.isNightOff) this.applyNightMode(nightServiceActive);
    if (!nightServiceActive) this.rotateDoohSlots(elapsedSec);
  }

  public dispose(): void {
    [...this.landscapeEntries, ...this.portraitEntries, ...this.interiorEntries].forEach((e) => e.texture.dispose());
    [...this.bannerMaterials, ...this.citylightMaterials, ...this.interiorMaterials, ...this.doohMaterials].forEach((m) => m.dispose());
  }

  private applyLanguage(lang: LanguageId): void {
    this.currentLang = lang;
    redrawEntries(this.landscapeEntries, lang, paintLandscapeAdCanvas);
    redrawEntries(this.portraitEntries, lang, paintPortraitCitylightCanvas);
    redrawEntries(this.interiorEntries, lang, paintInteriorStripAdCanvas);
  }

  private applyNightMode(nightActive: boolean): void {
    this.isNightOff = nightActive;
    setMaterialGroupNightState(this.bannerMaterials, nightActive, 0.65, 0x242b38);
    setMaterialGroupNightState(this.citylightMaterials, nightActive, 0.72, 0x1e2530);
    setMaterialGroupNightState(this.doohMaterials, nightActive, 0.92, 0x090c12);
  }

  private rotateDoohSlots(elapsedSec: number): void {
    for (let slot = 0; slot < DOOH_SLOT_COUNT; slot += 1) {
      const nextIdx = getDoohSlideIndex(elapsedSec, slot, this.landscapeEntries.length);
      if (this.doohSlideIndices[slot] !== nextIdx) {
        this.doohSlideIndices[slot] = nextIdx;
        const tex = this.landscapeEntries[nextIdx].texture;
        this.doohMaterials[slot].map = tex;
        this.doohMaterials[slot].emissiveMap = tex;
        this.doohMaterials[slot].needsUpdate = true;
      }
    }
  }
}

export function createAdTexturePool(maxAniso: number, initialLang: LanguageId = 'pl'): IAdTexturePool {
  return new AdTexturePool(maxAniso, initialLang);
}

function createCanvasEntry(
  w: number, h: number, campaign: IAdCampaignSpec, maxAniso: number, lang: LanguageId, painter: AdCanvasPainter,
): ICanvasTexEntry {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) painter(ctx, w, h, campaign, lang);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, Math.max(1, maxAniso));
  return { canvas, texture, campaign };
}

function redrawEntries(entries: readonly ICanvasTexEntry[], lang: LanguageId, painter: AdCanvasPainter): void {
  for (const entry of entries) {
    const ctx = entry.canvas.getContext('2d');
    if (ctx) {
      painter(ctx, entry.canvas.width, entry.canvas.height, entry.campaign, lang);
      entry.texture.needsUpdate = true;
    }
  }
}

function createBacklitMaterial(
  texture: THREE.CanvasTexture,
  emissiveIntensity: number,
  roughness: number,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: texture,
    emissive: 0xffffff,
    emissiveMap: texture,
    emissiveIntensity,
    roughness,
    metalness: 0.08,
  });
}

function setMaterialGroupNightState(
  materials: readonly THREE.MeshStandardMaterial[],
  nightActive: boolean,
  dayEmissive: number,
  nightBaseHex: number,
): void {
  for (const mat of materials) {
    mat.emissiveIntensity = nightActive ? 0.0 : dayEmissive;
    mat.color.setHex(nightActive ? nightBaseHex : 0xffffff);
  }
}
