import * as THREE from 'three';

export interface ICanvasTextureSurface {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly texture: THREE.CanvasTexture;
}

export interface ICanvasTextureOptions {
  readonly width: number;
  readonly height: number;
  readonly maxAnisotropy?: number;
  readonly colorSpace?: THREE.ColorSpace;
  readonly wrapRepeat?: boolean;
}

export function createCanvasTextureSurface(options: ICanvasTextureOptions): ICanvasTextureSurface {
  const canvas = document.createElement('canvas');
  canvas.width = options.width;
  canvas.height = options.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Cannot initialize 2D canvas context for procedural texture.');
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = options.colorSpace ?? THREE.SRGBColorSpace;
  if (options.maxAnisotropy !== undefined) {
    texture.anisotropy = options.maxAnisotropy;
  }
  if (options.wrapRepeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  }
  return { canvas, ctx, texture };
}

export function createGlowMaterial(
  color: number,
  emissive: number,
  intensity: number,
  roughness = 0.22,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: intensity,
    roughness,
  });
}
