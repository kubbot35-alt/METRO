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

export function createAdTexturePool(
  maxAniso: number,
  initialLang: LanguageId = 'pl',
): IAdTexturePool {
  const landscapeEntries = METRO_AD_CAMPAIGNS.map((ad) =>
    createCanvasEntry(512, 256, ad, maxAniso, initialLang, paintLandscapeAdCanvas),
  );
  const portraitEntries = METRO_AD_CAMPAIGNS.map((ad) =>
    createCanvasEntry(256, 384, ad, maxAniso, initialLang, paintPortraitCitylightCanvas),
  );
  const interiorEntries = METRO_AD_CAMPAIGNS.map((ad) =>
    createCanvasEntry(512, 128, ad, maxAniso, initialLang, paintInteriorStripAdCanvas),
  );

  const bannerMaterials = landscapeEntries.map((e) => createBacklitMaterial(e.texture, 0.65, 0.25));
  const citylightMaterials = portraitEntries.map((e) => createBacklitMaterial(e.texture, 0.72, 0.2));
  const interiorMaterials = interiorEntries.map((e) => createBacklitMaterial(e.texture, 0.36, 0.35));

  const doohSlideIndices = Array.from({ length: DOOH_SLOT_COUNT }, (_, slot) =>
    getDoohSlideIndex(0, slot, landscapeEntries.length),
  );
  const doohMaterials = doohSlideIndices.map((idx) =>
    createBacklitMaterial(landscapeEntries[idx].texture, 0.92, 0.14),
  );

  let currentLang: LanguageId = initialLang;
  let isNightOff = false;

  const applyLanguage = (lang: LanguageId): void => {
    currentLang = lang;
    redrawEntries(landscapeEntries, lang, paintLandscapeAdCanvas);
    redrawEntries(portraitEntries, lang, paintPortraitCitylightCanvas);
    redrawEntries(interiorEntries, lang, paintInteriorStripAdCanvas);
  };

  const applyNightMode = (nightActive: boolean): void => {
    isNightOff = nightActive;
    setMaterialGroupNightState(bannerMaterials, nightActive, 0.65, 0x242b38);
    setMaterialGroupNightState(citylightMaterials, nightActive, 0.72, 0x1e2530);
    setMaterialGroupNightState(doohMaterials, nightActive, 0.92, 0x090c12);
  };

  const rotateDoohSlots = (elapsedSec: number): void => {
    for (let slot = 0; slot < DOOH_SLOT_COUNT; slot += 1) {
      const nextIdx = getDoohSlideIndex(elapsedSec, slot, landscapeEntries.length);
      if (doohSlideIndices[slot] !== nextIdx) {
        doohSlideIndices[slot] = nextIdx;
        const tex = landscapeEntries[nextIdx].texture;
        doohMaterials[slot].map = tex;
        doohMaterials[slot].emissiveMap = tex;
        doohMaterials[slot].needsUpdate = true;
      }
    }
  };

  return {
    campaignCount: METRO_AD_CAMPAIGNS.length,
    getBannerMaterial: (idx: number) =>
      bannerMaterials[Math.abs(idx) % bannerMaterials.length],
    getCitylightMaterial: (idx: number) =>
      citylightMaterials[Math.abs(idx) % citylightMaterials.length],
    getDoohMaterial: (slot: number) =>
      doohMaterials[Math.abs(slot) % doohMaterials.length],
    getInteriorPosterMaterial: (idx: number) =>
      interiorMaterials[Math.abs(idx) % interiorMaterials.length],
    update: (elapsedSec: number, nightServiceActive: boolean, lang: LanguageId): void => {
      if (lang !== currentLang) {
        applyLanguage(lang);
      }
      if (nightServiceActive !== isNightOff) {
        applyNightMode(nightServiceActive);
      }
      if (!nightServiceActive) {
        rotateDoohSlots(elapsedSec);
      }
    },
    dispose: (): void => {
      landscapeEntries.forEach((e) => e.texture.dispose());
      portraitEntries.forEach((e) => e.texture.dispose());
      interiorEntries.forEach((e) => e.texture.dispose());
      bannerMaterials.forEach((m) => m.dispose());
      citylightMaterials.forEach((m) => m.dispose());
      interiorMaterials.forEach((m) => m.dispose());
      doohMaterials.forEach((m) => m.dispose());
    },
  };
}

function createCanvasEntry(
  w: number,
  h: number,
  campaign: IAdCampaignSpec,
  maxAniso: number,
  lang: LanguageId,
  painter: (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    ad: IAdCampaignSpec,
    language: LanguageId,
  ) => void,
): ICanvasTexEntry {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    painter(ctx, w, h, campaign, lang);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, Math.max(1, maxAniso));
  return { canvas, texture, campaign };
}

function redrawEntries(
  entries: readonly ICanvasTexEntry[],
  lang: LanguageId,
  painter: (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    ad: IAdCampaignSpec,
    language: LanguageId,
  ) => void,
): void {
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
