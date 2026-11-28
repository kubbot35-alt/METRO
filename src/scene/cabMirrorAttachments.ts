import * as THREE from 'three';
import type { DoorSide } from '../domain/types';
import {
  addModernCabCctvMonitors,
  createMirroredPlaneGeometry,
  createMirrorGlassMaterial,
  type ICabMirrorHardware,
  type IDeskCctvMonitorBinding,
  type IModernCctvPlacement,
} from './modernCabCctvMonitors';

export { addModernCabCctvMonitors, type ICabMirrorHardware, type IDeskCctvMonitorBinding, type IModernCctvPlacement };

export interface IDeskCctvUnitOptions {
  readonly screenWidth: number;
  readonly screenHeight: number;
  readonly bezelGeo: THREE.BoxGeometry;
  readonly bezelMat: THREE.MeshStandardMaterial;
  readonly overlayTex: THREE.CanvasTexture;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly pitchRad: number;
  readonly yawRad: number;
}

function createDeskOverlayMesh(
  options: IDeskCctvUnitOptions, overlayZ: number, disposables: Array<{ dispose(): void }>,
): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(options.screenWidth, options.screenHeight);
  const mat = new THREE.MeshBasicMaterial({ map: options.overlayTex, transparent: true, depthWrite: false, toneMapped: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'DeskCctvTransparentOverlay';
  mesh.position.set(0, 0, overlayZ);
  mesh.renderOrder = 2;
  disposables.push(geo, mat);
  return mesh;
}

export function createDeskCctvMonitorUnit(
  options: IDeskCctvUnitOptions, disposables: Array<{ dispose(): void }>,
): IDeskCctvMonitorBinding {
  const unit = new THREE.Group();
  unit.name = 'DeskSideCctvMonitorUnit';
  unit.position.set(options.x, options.y, options.z);
  unit.rotation.set(options.pitchRad, options.yawRad, 0);
  const bezel = new THREE.Mesh(options.bezelGeo, options.bezelMat);
  bezel.position.set(0, 0, -0.002);
  const overlayZ = 0.017;
  const feeds = buildDeskCctvFeedMeshes(options.screenWidth, options.screenHeight, overlayZ, disposables);
  unit.add(bezel, feeds.camLMesh, feeds.camPMesh, createDeskOverlayMesh(options, overlayZ, disposables));
  return {
    unit,
    interactiveMeshes: [feeds.camLMesh, feeds.camPMesh],
    setMirrorTextures: (leftTex, rightTex) => {
      feeds.camLMat.map = leftTex;
      feeds.camLMat.needsUpdate = true;
      feeds.camPMat.map = rightTex;
      feeds.camPMat.needsUpdate = true;
    },
  };
}

function createFeedMesh(
  name: string, channel: DoorSide, x: number, y: number, z: number,
  w: number, h: number, disposables: Array<{ dispose(): void }>,
) {
  const geo = createMirroredPlaneGeometry(w, h);
  const mat = createMirrorGlassMaterial();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.renderOrder = 1;
  mesh.userData.cctvChannel = channel;
  disposables.push(geo, mat);
  return { mesh, mat };
}

function buildDeskCctvFeedMeshes(
  screenWidth: number, screenHeight: number, overlayZ: number, disposables: Array<{ dispose(): void }>,
) {
  const feedW = (236 / 512) * screenWidth;
  const feedH = (236 / 300) * screenHeight;
  const offX = (124 / 512) * screenWidth;
  const offY = -(16 / 300) * screenHeight;
  const left = createFeedMesh('DeskCctvFeed_CAM_L', 'left', -offX, offY, overlayZ - 0.003, feedW, feedH, disposables);
  const right = createFeedMesh('DeskCctvFeed_CAM_P', 'right', offX, offY, overlayZ - 0.003, feedW, feedH, disposables);
  return { camLMesh: left.mesh, camPMesh: right.mesh, camLMat: left.mat, camPMat: right.mat };
}

function createWingMirrorGeometries() {
  const outArmGeo = new THREE.CylinderGeometry(0.01, 0.011, 0.24, 8);
  outArmGeo.rotateZ(Math.PI / 2);
  const rearArmGeo = new THREE.CylinderGeometry(0.01, 0.011, 0.3, 8);
  rearArmGeo.rotateX(Math.PI / 2);
  return {
    outArmGeo, rearArmGeo,
    strutGeo: new THREE.CylinderGeometry(0.009, 0.009, 0.34, 8),
    casingGeo: new THREE.BoxGeometry(0.185, 0.285, 0.036),
    glassGeo: createMirroredPlaneGeometry(0.162, 0.26),
  };
}

export function addSeria81CabWingMirrors(
  group: THREE.Group, steelMat: THREE.MeshStandardMaterial,
  housingMat: THREE.MeshStandardMaterial, disposables: Array<{ dispose(): void }>,
): ICabMirrorHardware {
  const geos = createWingMirrorGeometries();
  const leftGlassMat = createMirrorGlassMaterial();
  const rightGlassMat = createMirrorGlassMaterial();
  const interactiveMeshes = ([-1, 1] as const).map((side) =>
    attachWingMirrorSide(group, side, steelMat, housingMat, geos, side === -1 ? leftGlassMat : rightGlassMat),
  );
  disposables.push(geos.outArmGeo, geos.rearArmGeo, geos.strutGeo, geos.casingGeo, geos.glassGeo, leftGlassMat, rightGlassMat);
  return {
    interactiveMeshes,
    setMirrorTextures: (leftTex, rightTex) => {
      leftGlassMat.map = leftTex;
      leftGlassMat.needsUpdate = true;
      rightGlassMat.map = rightTex;
      rightGlassMat.needsUpdate = true;
    },
    setActivePlatformSide: () => {},
  };
}

function addMirrorBracketArms(
  mount: THREE.Group, side: -1 | 1, steelMat: THREE.MeshStandardMaterial,
  geos: ReturnType<typeof createWingMirrorGeometries>,
): void {
  for (const y of [0.162, -0.162] as const) {
    const outArm = new THREE.Mesh(geos.outArmGeo, steelMat);
    outArm.position.set(side * 0.11, y, -0.022);
    const rearArm = new THREE.Mesh(geos.rearArmGeo, steelMat);
    rearArm.position.set(side * 0.22, y, 0.12);
    mount.add(outArm, rearArm);
  }
  const vertPost = new THREE.Mesh(geos.strutGeo, steelMat);
  vertPost.position.set(0, 0, -0.026);
  mount.add(vertPost);
}

function attachWingMirrorSide(
  group: THREE.Group, side: -1 | 1, steelMat: THREE.MeshStandardMaterial, housingMat: THREE.MeshStandardMaterial,
  geos: ReturnType<typeof createWingMirrorGeometries>, glassMat: THREE.MeshBasicMaterial,
): THREE.Mesh {
  const channel: DoorSide = side === -1 ? 'left' : 'right';
  const mount = new THREE.Group();
  mount.name = `Seria81WingMirror_${channel}`;
  mount.position.set(side * 1.04, 0.12, -1.36);
  addMirrorBracketArms(mount, side, steelMat, geos);
  const mirrorHead = new THREE.Group();
  mirrorHead.rotation.set(0.04, -side * 0.38, 0);
  const glass = new THREE.Mesh(geos.glassGeo, glassMat);
  glass.position.set(0, 0, 0.02);
  glass.userData.cctvChannel = channel;
  mirrorHead.add(new THREE.Mesh(geos.casingGeo, housingMat), glass);
  mount.add(mirrorHead);
  group.add(mount);
  return glass;
}
