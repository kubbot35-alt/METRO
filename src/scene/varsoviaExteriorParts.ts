import * as THREE from 'three';

export interface IVarsoviaMaterials {
  readonly whiteBody: THREE.MeshStandardMaterial;
  readonly roofGray: THREE.MeshStandardMaterial;
  readonly glossyBlackMask: THREE.MeshStandardMaterial;
  readonly panoramicGlass: THREE.MeshStandardMaterial;
  readonly warsawRed: THREE.MeshStandardMaterial;
  readonly warsawYellow: THREE.MeshStandardMaterial;
  readonly darkSteel: THREE.MeshStandardMaterial;
  readonly wheelSteel: THREE.MeshStandardMaterial;
  readonly bellowsMat: THREE.MeshStandardMaterial;
  readonly smileLedFrontMat: THREE.MeshStandardMaterial;
  readonly smileLedRearMat: THREE.MeshStandardMaterial;
  readonly ledDisplayMat: THREE.MeshStandardMaterial;
  readonly cabinGlowMat: THREE.MeshStandardMaterial;
}

export interface IVarsoviaGeometries {
  readonly carShell: THREE.ExtrudeGeometry;
  readonly noseShell: THREE.ExtrudeGeometry;
  readonly noseRedLower: THREE.ExtrudeGeometry;
  readonly noseYellowAccent: THREE.ExtrudeGeometry;
  readonly roofHvacPod: THREE.ExtrudeGeometry;
  readonly bogieFrame: THREE.BoxGeometry;
  readonly axle: THREE.CylinderGeometry;
  readonly wheel: THREE.CylinderGeometry;
  readonly bellowFold: THREE.ExtrudeGeometry;
  readonly doorLeaf: THREE.BoxGeometry;
  readonly doorWindow: THREE.BoxGeometry;
  readonly doorYellowFrame: THREE.BoxGeometry;
  readonly windowPane: THREE.BoxGeometry;
  readonly blackRibbonSide: THREE.BoxGeometry;
  readonly redStripeSide: THREE.BoxGeometry;
  readonly yellowDoorStripe: THREE.BoxGeometry;
  readonly panoramicMask: THREE.BoxGeometry;
  readonly panoramicWindshield: THREE.BoxGeometry;
  readonly ledDisplayPlane: THREE.PlaneGeometry;
  readonly smileCenterBar: THREE.BoxGeometry;
  readonly smileWingBar: THREE.BoxGeometry;
  readonly smileSidePod: THREE.BoxGeometry;
  readonly wiperArm: THREE.BoxGeometry;
  readonly coupler: THREE.BoxGeometry;
}

export const VARSOVIA_CAR_LENGTH = 16.2;
export const VARSOVIA_CAR_GAP = 0.85;
export const VARSOVIA_CAR_WIDTH = 2.72;

export function createVarsoviaMaterials(ledTexture: THREE.CanvasTexture): IVarsoviaMaterials {
  return {
    whiteBody: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.24, metalness: 0.26 }),
    roofGray: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.42, metalness: 0.34 }),
    glossyBlackMask: new THREE.MeshStandardMaterial({ color: 0x070a10, roughness: 0.12, metalness: 0.72 }),
    panoramicGlass: new THREE.MeshStandardMaterial({ color: 0x0c1424, roughness: 0.08, metalness: 0.88 }),
    warsawRed: new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.28, metalness: 0.18 }),
    warsawYellow: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.28, metalness: 0.16 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x161b24, roughness: 0.76, metalness: 0.56 }),
    wheelSteel: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.34, metalness: 0.88 }),
    bellowsMat: new THREE.MeshStandardMaterial({ color: 0x12161e, roughness: 0.88, metalness: 0.12 }),
    smileLedFrontMat: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xe0f7ff,
      emissiveIntensity: 5.2,
      roughness: 0.08,
    }),
    smileLedRearMat: new THREE.MeshStandardMaterial({
      color: 0xff2a2a,
      emissive: 0xef4444,
      emissiveIntensity: 3.8,
      roughness: 0.12,
    }),
    ledDisplayMat: new THREE.MeshStandardMaterial({
      map: ledTexture,
      emissiveMap: ledTexture,
      emissive: 0xffffff,
      emissiveIntensity: 1.65,
      roughness: 0.7,
      metalness: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
    cabinGlowMat: new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0xe0f2fe,
      emissiveIntensity: 0.9,
      roughness: 0.14,
    }),
  };
}

export function createVarsoviaGeometries(): IVarsoviaGeometries {
  const wheel = new THREE.CylinderGeometry(0.41, 0.41, 0.14, 16);
  wheel.rotateZ(Math.PI / 2);
  const axle = new THREE.CylinderGeometry(0.08, 0.08, 1.82, 10);
  axle.rotateZ(Math.PI / 2);

  const ledDisplayPlane = new THREE.PlaneGeometry(1.56, 0.27);
  ledDisplayPlane.rotateY(Math.PI);

  return {
    carShell: createVarsoviaCrossSection(VARSOVIA_CAR_LENGTH - 0.14),
    noseShell: createVarsoviaNoseGeometry(),
    noseRedLower: createNoseBandGeometry(0.66, 1.18, 0.62),
    noseYellowAccent: createNoseBandGeometry(1.16, 1.38, 0.58),
    roofHvacPod: createAerodynamicHvacPod(),
    bogieFrame: new THREE.BoxGeometry(2.0, 0.32, 2.3),
    axle,
    wheel,
    bellowFold: createWideBellowFoldGeometry(),
    doorLeaf: new THREE.BoxGeometry(0.068, 2.04, 0.63),
    doorWindow: new THREE.BoxGeometry(0.088, 1.02, 0.48),
    doorYellowFrame: new THREE.BoxGeometry(0.072, 2.06, 0.09),
    windowPane: new THREE.BoxGeometry(VARSOVIA_CAR_WIDTH + 0.135, 0.92, 1.98),
    blackRibbonSide: new THREE.BoxGeometry(VARSOVIA_CAR_WIDTH + 0.115, 1.16, VARSOVIA_CAR_LENGTH - 0.14),
    redStripeSide: new THREE.BoxGeometry(VARSOVIA_CAR_WIDTH + 0.115, 0.48, VARSOVIA_CAR_LENGTH - 0.12),
    yellowDoorStripe: new THREE.BoxGeometry(0.076, 0.16, 0.63),
    panoramicMask: new THREE.BoxGeometry(2.48, 1.86, 0.12),
    panoramicWindshield: new THREE.BoxGeometry(2.26, 1.36, 0.09),
    ledDisplayPlane,
    smileCenterBar: new THREE.BoxGeometry(1.18, 0.085, 0.12),
    smileWingBar: new THREE.BoxGeometry(0.68, 0.085, 0.12),
    smileSidePod: new THREE.BoxGeometry(0.28, 0.14, 0.16),
    wiperArm: new THREE.BoxGeometry(0.028, 0.84, 0.028),
    coupler: new THREE.BoxGeometry(0.46, 0.26, 0.52),
  };
}

function createVarsoviaCrossSection(lengthM: number): THREE.ExtrudeGeometry {
  const hw = VARSOVIA_CAR_WIDTH * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-hw + 0.14, 0.66);
  shape.lineTo(hw - 0.14, 0.66);
  shape.quadraticCurveTo(hw, 0.74, hw, 1.02);
  shape.lineTo(hw, 3.16);
  shape.quadraticCurveTo(hw - 0.08, 3.62, hw - 0.42, 3.78);
  shape.quadraticCurveTo(0, 3.92, -hw + 0.42, 3.78);
  shape.quadraticCurveTo(-hw + 0.08, 3.62, -hw, 3.16);
  shape.lineTo(-hw, 1.02);
  shape.quadraticCurveTo(-hw, 0.74, -hw + 0.14, 0.66);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: lengthM,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.04,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.translate(0, 0, -lengthM * 0.5);
  return geo;
}

function createVarsoviaNoseGeometry(): THREE.ExtrudeGeometry {
  const profile = new THREE.Shape();
  profile.moveTo(0, 0.66);
  profile.lineTo(1.34, 0.72);
  profile.quadraticCurveTo(1.78, 0.96, 1.68, 1.54);
  profile.lineTo(1.22, 3.12);
  profile.quadraticCurveTo(0.96, 3.72, 0.22, 3.82);
  profile.lineTo(0, 3.84);
  profile.lineTo(0, 0.66);

  const width = VARSOVIA_CAR_WIDTH - 0.16;
  const geo = new THREE.ExtrudeGeometry(profile, {
    depth: width,
    bevelEnabled: true,
    bevelThickness: 0.13,
    bevelSize: 0.1,
    bevelSegments: 4,
    curveSegments: 10,
  });
  geo.translate(0, 0, -width * 0.5);
  geo.rotateY(Math.PI / 2);
  return geo;
}

function createNoseBandGeometry(yBottom: number, yTop: number, depthForward: number): THREE.ExtrudeGeometry {
  const profile = new THREE.Shape();
  profile.moveTo(0.42, yBottom);
  profile.lineTo(1.44 + depthForward * 0.56, yBottom + 0.02);
  profile.quadraticCurveTo(1.58 + depthForward * 0.58, (yBottom + yTop) * 0.5, 1.48 + depthForward * 0.4, yTop);
  profile.lineTo(0.42, yTop);
  profile.lineTo(0.42, yBottom);

  const width = VARSOVIA_CAR_WIDTH - 0.06;
  const geo = new THREE.ExtrudeGeometry(profile, {
    depth: width,
    bevelEnabled: true,
    bevelThickness: 0.11,
    bevelSize: 0.045,
    bevelSegments: 2,
    curveSegments: 6,
  });
  geo.translate(0, 0, -width * 0.5);
  geo.rotateY(Math.PI / 2);
  return geo;
}

function createAerodynamicHvacPod(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.84, 0);
  shape.lineTo(0.84, 0);
  shape.lineTo(0.66, 0.2);
  shape.lineTo(-0.66, 0.2);
  shape.lineTo(-0.84, 0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 3.4,
    bevelEnabled: true,
    bevelThickness: 0.14,
    bevelSize: 0.05,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -1.7);
  return geo;
}

function createWideBellowFoldGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-1.14, 0.84);
  shape.lineTo(1.14, 0.84);
  shape.lineTo(1.14, 3.16);
  shape.quadraticCurveTo(0, 3.62, -1.14, 3.16);
  shape.lineTo(-1.14, 0.84);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.07);
  return geo;
}
