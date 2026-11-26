import * as THREE from 'three';

export interface IInspiroMaterials {
  readonly silverBody: THREE.MeshStandardMaterial;
  readonly roofSilver: THREE.MeshStandardMaterial;
  readonly blackRibbon: THREE.MeshStandardMaterial;
  readonly glassTint: THREE.MeshStandardMaterial;
  readonly warsawRed: THREE.MeshStandardMaterial;
  readonly warsawYellow: THREE.MeshStandardMaterial;
  readonly darkSteel: THREE.MeshStandardMaterial;
  readonly wheelSteel: THREE.MeshStandardMaterial;
  readonly bellowsMat: THREE.MeshStandardMaterial;
  readonly headlightMat: THREE.MeshStandardMaterial;
  readonly taillightMat: THREE.MeshStandardMaterial;
  readonly ledDisplayMat: THREE.MeshStandardMaterial;
  readonly cabinGlowMat: THREE.MeshStandardMaterial;
}

export interface IInspiroGeometries {
  readonly carShell: THREE.ExtrudeGeometry;
  readonly noseShell: THREE.ExtrudeGeometry;
  readonly noseYellowApron: THREE.ExtrudeGeometry;
  readonly noseRedSkirt: THREE.ExtrudeGeometry;
  readonly roofHvacPod: THREE.ExtrudeGeometry;
  readonly bogieFrame: THREE.BoxGeometry;
  readonly axle: THREE.CylinderGeometry;
  readonly wheel: THREE.CylinderGeometry;
  readonly springCoil: THREE.CylinderGeometry;
  readonly bellowFold: THREE.ExtrudeGeometry;
  readonly doorLeaf: THREE.BoxGeometry;
  readonly doorWindow: THREE.BoxGeometry;
  readonly doorYellowTrim: THREE.BoxGeometry;
  readonly windowPane: THREE.BoxGeometry;
  readonly blackRibbonSide: THREE.BoxGeometry;
  readonly redStripeSide: THREE.BoxGeometry;
  readonly windshield: THREE.BoxGeometry;
  readonly windshieldFrame: THREE.BoxGeometry;
  readonly ledDisplayPlane: THREE.PlaneGeometry;
  readonly angledLamp: THREE.BoxGeometry;
  readonly wiperArm: THREE.BoxGeometry;
  readonly coupler: THREE.BoxGeometry;
}

export const INSPIRO_CAR_LENGTH = 16.2;
export const INSPIRO_CAR_GAP = 0.85;
export const INSPIRO_CAR_WIDTH = 2.72;

export function createInspiroMaterials(ledTexture: THREE.CanvasTexture): IInspiroMaterials {
  return {
    silverBody: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.3, metalness: 0.58 }),
    roofSilver: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.44, metalness: 0.45 }),
    blackRibbon: new THREE.MeshStandardMaterial({ color: 0x0b0f17, roughness: 0.16, metalness: 0.65 }),
    glassTint: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.85 }),
    warsawRed: new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.34, metalness: 0.22 }),
    warsawYellow: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.32, metalness: 0.18 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x181c24, roughness: 0.78, metalness: 0.55 }),
    wheelSteel: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.35, metalness: 0.88 }),
    bellowsMat: new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.9, metalness: 0.1 }),
    headlightMat: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xf8fafc,
      emissiveIntensity: 4.5,
      roughness: 0.12,
    }),
    taillightMat: new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 3.4,
      roughness: 0.18,
    }),
    ledDisplayMat: new THREE.MeshStandardMaterial({
      map: ledTexture,
      emissiveMap: ledTexture,
      emissive: 0xffffff,
      emissiveIntensity: 1.55,
      roughness: 0.75,
      metalness: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
    cabinGlowMat: new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      emissive: 0xfef3c7,
      emissiveIntensity: 0.85,
      roughness: 0.18,
    }),
  };
}

export function createInspiroGeometries(): IInspiroGeometries {
  const wheel = new THREE.CylinderGeometry(0.41, 0.41, 0.14, 16);
  wheel.rotateZ(Math.PI / 2);
  const axle = new THREE.CylinderGeometry(0.08, 0.08, 1.82, 10);
  axle.rotateZ(Math.PI / 2);

  const ledDisplayPlane = new THREE.PlaneGeometry(1.42, 0.26);
  ledDisplayPlane.rotateY(Math.PI);

  return {
    carShell: createCarCrossSectionGeometry(INSPIRO_CAR_LENGTH - 0.14),
    noseShell: createAerodynamicNoseGeometry(),
    noseYellowApron: createNoseAccentGeometry(1.04, 1.56, 0.52),
    noseRedSkirt: createNoseAccentGeometry(0.64, 1.08, 0.56),
    roofHvacPod: createHvacPodGeometry(),
    bogieFrame: new THREE.BoxGeometry(2.02, 0.34, 2.35),
    axle,
    wheel,
    springCoil: new THREE.CylinderGeometry(0.11, 0.11, 0.28, 8),
    bellowFold: createBellowFoldGeometry(),
    doorLeaf: new THREE.BoxGeometry(0.07, 2.02, 0.62),
    doorWindow: new THREE.BoxGeometry(0.088, 0.94, 0.44),
    doorYellowTrim: new THREE.BoxGeometry(0.07, 2.04, 0.085),
    windowPane: new THREE.BoxGeometry(INSPIRO_CAR_WIDTH + 0.13, 0.84, 1.85),
    blackRibbonSide: new THREE.BoxGeometry(INSPIRO_CAR_WIDTH + 0.11, 1.06, INSPIRO_CAR_LENGTH - 0.14),
    redStripeSide: new THREE.BoxGeometry(INSPIRO_CAR_WIDTH + 0.11, 0.44, INSPIRO_CAR_LENGTH - 0.12),
    windshield: new THREE.BoxGeometry(2.14, 1.24, 0.08),
    windshieldFrame: new THREE.BoxGeometry(2.38, 1.48, 0.1),
    ledDisplayPlane,
    angledLamp: new THREE.BoxGeometry(0.42, 0.13, 0.14),
    wiperArm: new THREE.BoxGeometry(0.03, 0.78, 0.03),
    coupler: new THREE.BoxGeometry(0.46, 0.28, 0.55),
  };
}

function createCarCrossSectionGeometry(lengthM: number): THREE.ExtrudeGeometry {
  const hw = INSPIRO_CAR_WIDTH * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-hw + 0.16, 0.66);
  shape.lineTo(hw - 0.16, 0.66);
  shape.quadraticCurveTo(hw, 0.72, hw, 1.05);
  shape.lineTo(hw, 3.08);
  shape.quadraticCurveTo(hw - 0.05, 3.56, hw - 0.46, 3.74);
  shape.quadraticCurveTo(0, 3.92, -hw + 0.46, 3.74);
  shape.quadraticCurveTo(-hw + 0.05, 3.56, -hw, 3.08);
  shape.lineTo(-hw, 1.05);
  shape.quadraticCurveTo(-hw, 0.72, -hw + 0.16, 0.66);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: lengthM,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.04,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.translate(0, 0, -lengthM * 0.5);
  return geo;
}

function createAerodynamicNoseGeometry(): THREE.ExtrudeGeometry {
  const profile = new THREE.Shape();
  profile.moveTo(0, 0.68);
  profile.lineTo(1.22, 0.74);
  profile.quadraticCurveTo(1.62, 0.92, 1.56, 1.48);
  profile.lineTo(1.18, 2.98);
  profile.quadraticCurveTo(0.96, 3.66, 0.25, 3.8);
  profile.lineTo(0, 3.82);
  profile.lineTo(0, 0.68);

  const width = INSPIRO_CAR_WIDTH - 0.18;
  const geo = new THREE.ExtrudeGeometry(profile, {
    depth: width,
    bevelEnabled: true,
    bevelThickness: 0.13,
    bevelSize: 0.11,
    bevelSegments: 4,
    curveSegments: 10,
  });
  geo.translate(0, 0, -width * 0.5);
  geo.rotateY(Math.PI / 2);
  return geo;
}

function createNoseAccentGeometry(yBottom: number, yTop: number, depthForward: number): THREE.ExtrudeGeometry {
  const profile = new THREE.Shape();
  profile.moveTo(0.45, yBottom);
  profile.lineTo(1.38 + depthForward * 0.52, yBottom + 0.03);
  profile.quadraticCurveTo(1.5 + depthForward * 0.55, (yBottom + yTop) * 0.5, 1.44 + depthForward * 0.36, yTop);
  profile.lineTo(0.45, yTop);
  profile.lineTo(0.45, yBottom);

  const width = INSPIRO_CAR_WIDTH - 0.08;
  const geo = new THREE.ExtrudeGeometry(profile, {
    depth: width,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.05,
    bevelSegments: 2,
    curveSegments: 6,
  });
  geo.translate(0, 0, -width * 0.5);
  geo.rotateY(Math.PI / 2);
  return geo;
}

function createHvacPodGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.78, 0);
  shape.lineTo(0.78, 0);
  shape.lineTo(0.62, 0.24);
  shape.lineTo(-0.62, 0.24);
  shape.lineTo(-0.78, 0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 3.1,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.06,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -1.55);
  return geo;
}

function createBellowFoldGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-1.05, 0.85);
  shape.lineTo(1.05, 0.85);
  shape.lineTo(1.05, 3.1);
  shape.quadraticCurveTo(0, 3.55, -1.05, 3.1);
  shape.lineTo(-1.05, 0.85);
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
