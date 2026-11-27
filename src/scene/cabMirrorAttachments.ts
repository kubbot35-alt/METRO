import * as THREE from 'three';
import type { DoorSide } from '../domain/types';

export interface ICabMirrorHardware {
  readonly interactiveMeshes: readonly THREE.Mesh[];
  setMirrorTextures(leftTex: THREE.Texture, rightTex: THREE.Texture): void;
  setActivePlatformSide(side: DoorSide, highlighted: boolean): void;
}

function createMirroredPlaneGeometry(width: number, height: number): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(width, height);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i += 1) {
    uv.setX(i, 1 - uv.getX(i));
  }
  uv.needsUpdate = true;
  return geo;
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

function createMirrorGlassMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
}

export interface IDeskCctvMonitorBinding {
  readonly unit: THREE.Group;
  readonly interactiveMeshes: readonly THREE.Mesh[];
  setMirrorTextures(leftTex: THREE.Texture, rightTex: THREE.Texture): void;
}

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

export function createDeskCctvMonitorUnit(
  options: IDeskCctvUnitOptions,
  disposables: Array<{ dispose(): void }>,
): IDeskCctvMonitorBinding {
  const {
    screenWidth,
    screenHeight,
    bezelGeo,
    bezelMat,
    overlayTex,
    x,
    y,
    z,
    pitchRad,
    yawRad,
  } = options;

  const unit = new THREE.Group();
  unit.name = 'DeskSideCctvMonitorUnit';
  unit.position.set(x, y, z);
  unit.rotation.set(pitchRad, yawRad, 0);

  const bezel = new THREE.Mesh(bezelGeo, bezelMat);
  bezel.position.set(0, 0, -0.002);

  const overlayZ = 0.017;
  const overlayGeo = new THREE.PlaneGeometry(screenWidth, screenHeight);
  const overlayMat = new THREE.MeshBasicMaterial({
    map: overlayTex,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const overlayMesh = new THREE.Mesh(overlayGeo, overlayMat);
  overlayMesh.name = 'DeskCctvTransparentOverlay';
  overlayMesh.position.set(0, 0, overlayZ);
  overlayMesh.renderOrder = 2;

  // Directly behind the transparent overlay (-0.003 in local Z): two separate PlaneGeometry meshes for CAM L and CAM P
  const feedWidth = (236 / 512) * screenWidth;
  const feedHeight = (236 / 300) * screenHeight;
  const feedOffsetX = (124 / 512) * screenWidth;
  const feedOffsetY = -(16 / 300) * screenHeight;
  const camLGeo = createMirroredPlaneGeometry(feedWidth, feedHeight);
  const camPGeo = createMirroredPlaneGeometry(feedWidth, feedHeight);

  const camLMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const camPMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });

  const camLMesh = new THREE.Mesh(camLGeo, camLMat);
  camLMesh.name = 'DeskCctvFeed_CAM_L';
  camLMesh.position.set(-feedOffsetX, feedOffsetY, overlayZ - 0.003);
  camLMesh.renderOrder = 1;
  camLMesh.userData.cctvChannel = 'left';

  const camPMesh = new THREE.Mesh(camPGeo, camPMat);
  camPMesh.name = 'DeskCctvFeed_CAM_P';
  camPMesh.position.set(feedOffsetX, feedOffsetY, overlayZ - 0.003);
  camPMesh.renderOrder = 1;
  camPMesh.userData.cctvChannel = 'right';

  unit.add(bezel, camLMesh, camPMesh, overlayMesh);
  disposables.push(overlayGeo, overlayMat, camLGeo, camPGeo, camLMat, camPMat);

  return {
    unit,
    interactiveMeshes: [camLMesh, camPMesh],
    setMirrorTextures: (leftTex: THREE.Texture, rightTex: THREE.Texture): void => {
      camLMat.map = leftTex;
      camLMat.needsUpdate = true;
      camPMat.map = rightTex;
      camPMat.needsUpdate = true;
    },
  };
}

export function addSeria81CabWingMirrors(
  group: THREE.Group,
  steelMat: THREE.MeshStandardMaterial,
  housingMat: THREE.MeshStandardMaterial,
  disposables: Array<{ dispose(): void }>,
): ICabMirrorHardware {
  const outArmGeo = new THREE.CylinderGeometry(0.01, 0.011, 0.24, 8);
  outArmGeo.rotateZ(Math.PI / 2);
  const rearArmGeo = new THREE.CylinderGeometry(0.01, 0.011, 0.3, 8);
  rearArmGeo.rotateX(Math.PI / 2);
  const strutGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.34, 8);
  const casingGeo = new THREE.BoxGeometry(0.185, 0.285, 0.036);
  const glassGeo = createMirroredPlaneGeometry(0.162, 0.26);
  const leftGlassMat = createMirrorGlassMaterial();
  const rightGlassMat = createMirrorGlassMaterial();
  const interactiveMeshes: THREE.Mesh[] = [];

  ([-1, 1] as const).forEach((side) => {
    const channel: DoorSide = side === -1 ? 'left' : 'right';
    const mount = new THREE.Group();
    mount.name = `Seria81WingMirror_${channel}`;
    // Projecting exterior wing mirrors ahead of the A-pillars, clearly visible at 64° FOV
    mount.position.set(side * 1.04, 0.12, -1.36);

    // Brackets sit above (+0.162), below (-0.162), and behind (-0.028) the casing — zero glass occlusion
    const upperOutArm = new THREE.Mesh(outArmGeo, steelMat);
    upperOutArm.position.set(side * 0.11, 0.162, -0.022);
    const lowerOutArm = new THREE.Mesh(outArmGeo, steelMat);
    lowerOutArm.position.set(side * 0.11, -0.162, -0.022);
    const upperRearArm = new THREE.Mesh(rearArmGeo, steelMat);
    upperRearArm.position.set(side * 0.22, 0.162, 0.12);
    const lowerRearArm = new THREE.Mesh(rearArmGeo, steelMat);
    lowerRearArm.position.set(side * 0.22, -0.162, 0.12);
    const vertPost = new THREE.Mesh(strutGeo, steelMat);
    vertPost.position.set(0, 0, -0.026);

    const mirrorHead = new THREE.Group();
    mirrorHead.rotation.set(0.04, -side * 0.38, 0);
    const casing = new THREE.Mesh(casingGeo, housingMat);
    const glass = new THREE.Mesh(glassGeo, side === -1 ? leftGlassMat : rightGlassMat);
    glass.position.set(0, 0, 0.02);
    glass.userData.cctvChannel = channel;
    interactiveMeshes.push(glass);

    mirrorHead.add(casing, glass);
    mount.add(upperOutArm, lowerOutArm, upperRearArm, lowerRearArm, vertPost, mirrorHead);
    group.add(mount);
  });

  disposables.push(
    outArmGeo, rearArmGeo, strutGeo, casingGeo, glassGeo, leftGlassMat, rightGlassMat,
  );
  return {
    interactiveMeshes,
    setMirrorTextures: (leftTex, rightTex): void => {
      leftGlassMat.map = leftTex;
      leftGlassMat.needsUpdate = true;
      rightGlassMat.map = rightTex;
      rightGlassMat.needsUpdate = true;
    },
    setActivePlatformSide: (): void => {
      // Classic mechanical mirrors have no electronic border highlight
    },
  };
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

export function addModernCabCctvMonitors(
  group: THREE.Group,
  bezelMat: THREE.MeshStandardMaterial,
  placement: IModernCctvPlacement,
  disposables: Array<{ dispose(): void }>,
  deskCctvBinding?: IDeskCctvMonitorBinding,
): ICabMirrorHardware {
  const { offsetX, posY, posZ, pitchRad, yawRad, width, height } = placement;
  const bodyGeo = new THREE.BoxGeometry(width + 0.028, height + 0.036, 0.034);
  const rimGeo = new THREE.BoxGeometry(width + 0.036, height + 0.044, 0.022);
  const screenGeo = createMirroredPlaneGeometry(width, height - 0.018);
  const headerGeo = new THREE.PlaneGeometry(width, 0.022);
  const leftScreenMat = createMirrorGlassMaterial();
  const rightScreenMat = createMirrorGlassMaterial();
  const rimOpts = { color: 0x0f172a, emissive: 0x10b981, emissiveIntensity: 0.15, roughness: 0.25 };
  const leftRimMat = new THREE.MeshStandardMaterial(rimOpts);
  const rightRimMat = new THREE.MeshStandardMaterial(rimOpts);

  const leftHeaderTex = createMonitorHeaderTexture('CAM L');
  const rightHeaderTex = createMonitorHeaderTexture('CAM P');
  const leftHeaderMat = new THREE.MeshBasicMaterial({ map: leftHeaderTex, toneMapped: false });
  const rightHeaderMat = new THREE.MeshBasicMaterial({ map: rightHeaderTex, toneMapped: false });
  const interactiveMeshes: THREE.Mesh[] = [
    ...(deskCctvBinding ? deskCctvBinding.interactiveMeshes : []),
  ];

  ([-1, 1] as const).forEach((side) => {
    const channel: DoorSide = side === -1 ? 'left' : 'right';
    const monGroup = new THREE.Group();
    monGroup.name = `CabCctvMonitor_${channel}`;
    monGroup.position.set(side * offsetX, posY, posZ);
    monGroup.rotation.set(pitchRad, -side * yawRad, 0);

    const rim = new THREE.Mesh(rimGeo, side === -1 ? leftRimMat : rightRimMat);
    rim.position.set(0, 0, -0.004);
    const housing = new THREE.Mesh(bodyGeo, bezelMat);
    const header = new THREE.Mesh(headerGeo, side === -1 ? leftHeaderMat : rightHeaderMat);
    header.position.set(0, height * 0.5 - 0.005, 0.019);

    const screen = new THREE.Mesh(screenGeo, side === -1 ? leftScreenMat : rightScreenMat);
    screen.position.set(0, -0.009, 0.019);
    screen.userData.cctvChannel = channel;
    interactiveMeshes.push(screen);

    monGroup.add(rim, housing, header, screen);
    group.add(monGroup);
  });

  disposables.push(
    bodyGeo, rimGeo, screenGeo, headerGeo, leftScreenMat, rightScreenMat,
    leftRimMat, rightRimMat, leftHeaderTex, rightHeaderTex, leftHeaderMat, rightHeaderMat,
  );

  return {
    interactiveMeshes,
    setMirrorTextures: (leftTex, rightTex): void => {
      leftScreenMat.map = leftTex;
      leftScreenMat.needsUpdate = true;
      rightScreenMat.map = rightTex;
      rightScreenMat.needsUpdate = true;
      deskCctvBinding?.setMirrorTextures(leftTex, rightTex);
    },
    setActivePlatformSide: (side, highlighted): void => {
      const leftActive = side === 'left';
      leftRimMat.emissive.setHex(leftActive ? 0x10b981 : 0x38bdf8);
      leftRimMat.emissiveIntensity = leftActive ? (highlighted ? 2.8 : 1.35) : 0.14;
      rightRimMat.emissive.setHex(!leftActive ? 0x10b981 : 0x38bdf8);
      rightRimMat.emissiveIntensity = !leftActive ? (highlighted ? 2.8 : 1.35) : 0.14;
    },
  };
}
