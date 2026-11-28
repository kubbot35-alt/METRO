import * as THREE from 'three';
import type { DoorSide } from '../domain/types';

export interface ICabMirrorHardware {
  readonly interactiveMeshes: readonly THREE.Mesh[];
  setMirrorTextures(leftTex: THREE.Texture, rightTex: THREE.Texture): void;
  setActivePlatformSide(side: DoorSide, highlighted: boolean): void;
}

export interface IDeskCctvMonitorBinding {
  readonly unit: THREE.Group;
  readonly interactiveMeshes: readonly THREE.Mesh[];
  setMirrorTextures(leftTex: THREE.Texture, rightTex: THREE.Texture): void;
}

export function createMirroredPlaneGeometry(width: number, height: number): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(width, height);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i += 1) uv.setX(i, 1 - uv.getX(i));
  uv.needsUpdate = true;
  return geo;
}

export function createMirrorGlassMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
}

export interface IModernCctvPlacement {
  readonly offsetX: number;
  readonly posY: number;
  readonly posZ: number;
  readonly pitchRad: number;
  readonly yawRad: number;
  readonly width: number;
  readonly height: number;
}

interface ICctvGeos {
  readonly bodyGeo: THREE.BoxGeometry;
  readonly rimGeo: THREE.BoxGeometry;
  readonly screenGeo: THREE.PlaneGeometry;
  readonly headerGeo: THREE.PlaneGeometry;
}

function createMonitorGeos(width: number, height: number): ICctvGeos {
  return {
    bodyGeo: new THREE.BoxGeometry(width + 0.028, height + 0.036, 0.034),
    rimGeo: new THREE.BoxGeometry(width + 0.036, height + 0.044, 0.022),
    screenGeo: createMirroredPlaneGeometry(width, height - 0.018),
    headerGeo: new THREE.PlaneGeometry(width, 0.022),
  };
}

function createSideMonitorResources(label: string): {
  screenMat: THREE.MeshBasicMaterial;
  rimMat: THREE.MeshStandardMaterial;
  headerTex: THREE.CanvasTexture;
  headerMat: THREE.MeshBasicMaterial;
} {
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x10b981, emissiveIntensity: 0.15, roughness: 0.25 });
  const headerTex = createMonitorHeaderTexture(label);
  const headerMat = new THREE.MeshBasicMaterial({ map: headerTex, toneMapped: false });
  return { screenMat: createMirrorGlassMaterial(), rimMat, headerTex, headerMat };
}

export function addModernCabCctvMonitors(
  group: THREE.Group,
  bezelMat: THREE.MeshStandardMaterial,
  placement: IModernCctvPlacement,
  disposables: Array<{ dispose(): void }>,
  deskCctvBinding?: IDeskCctvMonitorBinding,
): ICabMirrorHardware {
  const geos = createMonitorGeos(placement.width, placement.height);
  const left = createSideMonitorResources('CAM L');
  const right = createSideMonitorResources('CAM P');
  const leftScreen = attachMonitorSide(group, -1, placement, bezelMat, geos, left.rimMat, left.headerMat, left.screenMat);
  const rightScreen = attachMonitorSide(group, 1, placement, bezelMat, geos, right.rimMat, right.headerMat, right.screenMat);
  const interactiveMeshes = [...(deskCctvBinding?.interactiveMeshes ?? []), leftScreen, rightScreen];
  disposables.push(
    geos.bodyGeo, geos.rimGeo, geos.screenGeo, geos.headerGeo,
    left.screenMat, right.screenMat, left.rimMat, right.rimMat, left.headerTex, right.headerTex, left.headerMat, right.headerMat,
  );
  return new ModernCabCctvHardware(interactiveMeshes, left.screenMat, right.screenMat, left.rimMat, right.rimMat, deskCctvBinding);
}

function attachMonitorSide(
  group: THREE.Group, side: -1 | 1, placement: IModernCctvPlacement, bezelMat: THREE.MeshStandardMaterial,
  geos: ICctvGeos, rimMat: THREE.MeshStandardMaterial, headerMat: THREE.MeshBasicMaterial, screenMat: THREE.MeshBasicMaterial,
): THREE.Mesh {
  const channel: DoorSide = side === -1 ? 'left' : 'right';
  const monGroup = new THREE.Group();
  monGroup.name = `CabCctvMonitor_${channel}`;
  monGroup.position.set(side * placement.offsetX, placement.posY, placement.posZ);
  monGroup.rotation.set(placement.pitchRad, -side * placement.yawRad, 0);
  const rim = new THREE.Mesh(geos.rimGeo, rimMat);
  rim.position.set(0, 0, -0.004);
  const header = new THREE.Mesh(geos.headerGeo, headerMat);
  header.position.set(0, placement.height * 0.5 - 0.005, 0.019);
  const screen = new THREE.Mesh(geos.screenGeo, screenMat);
  screen.position.set(0, -0.009, 0.019);
  screen.userData.cctvChannel = channel;
  monGroup.add(rim, new THREE.Mesh(geos.bodyGeo, bezelMat), header, screen);
  group.add(monGroup);
  return screen;
}

class ModernCabCctvHardware implements ICabMirrorHardware {
  public constructor(
    public readonly interactiveMeshes: readonly THREE.Mesh[],
    private readonly leftScreenMat: THREE.MeshBasicMaterial,
    private readonly rightScreenMat: THREE.MeshBasicMaterial,
    private readonly leftRimMat: THREE.MeshStandardMaterial,
    private readonly rightRimMat: THREE.MeshStandardMaterial,
    private readonly deskCctvBinding?: IDeskCctvMonitorBinding,
  ) {}

  public setMirrorTextures(leftTex: THREE.Texture, rightTex: THREE.Texture): void {
    this.leftScreenMat.map = leftTex;
    this.leftScreenMat.needsUpdate = true;
    this.rightScreenMat.map = rightTex;
    this.rightScreenMat.needsUpdate = true;
    this.deskCctvBinding?.setMirrorTextures(leftTex, rightTex);
  }

  public setActivePlatformSide(side: DoorSide, highlighted: boolean): void {
    const leftActive = side === 'left';
    this.leftRimMat.emissive.setHex(leftActive ? 0x10b981 : 0x38bdf8);
    this.leftRimMat.emissiveIntensity = leftActive ? (highlighted ? 2.8 : 1.35) : 0.14;
    this.rightRimMat.emissive.setHex(!leftActive ? 0x10b981 : 0x38bdf8);
    this.rightRimMat.emissiveIntensity = !leftActive ? (highlighted ? 2.8 : 1.35) : 0.14;
  }
}

function createMonitorHeaderTexture(label: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 24;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, 160, 24);
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(12, 12, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText(label, 22, 16);
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('CCTV LIVE', 152, 16);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
