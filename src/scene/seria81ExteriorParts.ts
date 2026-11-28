import * as THREE from 'three';

export const SERIA81_CAR_LENGTH = 16.0;
export const SERIA81_CAR_GAP = 0.72;
export const SERIA81_CAR_WIDTH = 2.66;

export interface ISeria81Materials {
  readonly upperBody: THREE.MeshStandardMaterial;
  readonly roofNavy: THREE.MeshStandardMaterial;
  readonly warsawRed: THREE.MeshStandardMaterial;
  readonly warsawYellow: THREE.MeshStandardMaterial;
  readonly chevronWhite: THREE.MeshStandardMaterial;
  readonly corrugatedRed: THREE.MeshStandardMaterial;
  readonly rubberBlack: THREE.MeshStandardMaterial;
  readonly chromeSteel: THREE.MeshStandardMaterial;
  readonly darkSteel: THREE.MeshStandardMaterial;
  readonly wheelSteel: THREE.MeshStandardMaterial;
  readonly sideGlass: THREE.MeshStandardMaterial;
  readonly windshieldGlass: THREE.MeshStandardMaterial;
  readonly warmHeadlamp: THREE.MeshStandardMaterial;
  readonly redTaillamp: THREE.MeshStandardMaterial;
  readonly destBoardMat: THREE.MeshStandardMaterial;
}

export interface ISeria81Geometries {
  readonly carShell: THREE.BufferGeometry;
  readonly redSkirt: THREE.BoxGeometry;
  readonly yellowWaist: THREE.BoxGeometry;
  readonly fluteRib: THREE.BoxGeometry;
  readonly roofVent: THREE.BoxGeometry;
  readonly sideWindow: THREE.BoxGeometry;
  readonly sideWindowFrame: THREE.BoxGeometry;
  readonly doorLeaf: THREE.BoxGeometry;
  readonly doorGlass: THREE.BoxGeometry;
  readonly gangway: THREE.BoxGeometry;
  readonly frontPlate: THREE.BoxGeometry;
  readonly frontWindshieldPane: THREE.BoxGeometry;
  readonly frontGasketFrame: THREE.BoxGeometry;
  readonly frontCenterPillar: THREE.BoxGeometry;
  readonly chevronBar: THREE.BoxGeometry;
  readonly headlampBezel: THREE.CylinderGeometry;
  readonly headlampLens: THREE.CylinderGeometry;
  readonly wiperArm: THREE.BoxGeometry;
  readonly destBoardPlane: THREE.PlaneGeometry;
  readonly coupler: THREE.BoxGeometry;
  readonly bogieFrame: THREE.BoxGeometry;
  readonly axle: THREE.CylinderGeometry;
  readonly wheel: THREE.CylinderGeometry;
}

export function createSeria81Materials(destBoardTex: THREE.CanvasTexture): ISeria81Materials {
  return { ...createSeria81BodyMaterials(), ...createSeria81GlassAndLightMaterials(destBoardTex) };
}

function createSeria81BodyMaterials(): Pick<
  ISeria81Materials,
  'upperBody' | 'roofNavy' | 'warsawRed' | 'warsawYellow' | 'chevronWhite' | 'corrugatedRed' | 'rubberBlack' | 'chromeSteel' | 'darkSteel' | 'wheelSteel'
> {
  return {
    upperBody: new THREE.MeshStandardMaterial({ color: 0x526173, roughness: 0.44, metalness: 0.32 }),
    roofNavy: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.56, metalness: 0.28 }),
    warsawRed: new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.36, metalness: 0.2 }),
    warsawYellow: new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.34, metalness: 0.16 }),
    chevronWhite: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.1 }),
    corrugatedRed: new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.24, metalness: 0.65 }),
    rubberBlack: new THREE.MeshStandardMaterial({ color: 0x0b0e12, roughness: 0.9, metalness: 0.08 }),
    chromeSteel: new THREE.MeshStandardMaterial({ color: 0xdbe2ea, roughness: 0.22, metalness: 0.85 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x1b2029, roughness: 0.78, metalness: 0.52 }),
    wheelSteel: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.32, metalness: 0.85 }),
  };
}

function createSeria81GlassAndLightMaterials(
  destBoardTex: THREE.CanvasTexture,
): Pick<ISeria81Materials, 'sideGlass' | 'windshieldGlass' | 'warmHeadlamp' | 'redTaillamp' | 'destBoardMat'> {
  return {
    sideGlass: new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xfde68a, emissiveIntensity: 0.88, roughness: 0.18, metalness: 0.22 }),
    windshieldGlass: new THREE.MeshStandardMaterial({ color: 0x0d1726, roughness: 0.12, metalness: 0.76 }),
    warmHeadlamp: new THREE.MeshStandardMaterial({ color: 0xfff8dc, emissive: 0xffd57a, emissiveIntensity: 4.4, roughness: 0.14 }),
    redTaillamp: new THREE.MeshStandardMaterial({ color: 0xfca5a5, emissive: 0xef4444, emissiveIntensity: 3.1, roughness: 0.18 }),
    destBoardMat: new THREE.MeshStandardMaterial({
      map: destBoardTex, emissiveMap: destBoardTex, emissive: 0xffffff, emissiveIntensity: 0.34, roughness: 0.68, polygonOffset: true, polygonOffsetFactor: -1,
    }),
  };
}

export function createSeria81Geometries(): ISeria81Geometries {
  return {
    carShell: createChamfered81ShellGeometry(),
    redSkirt: new THREE.BoxGeometry(SERIA81_CAR_WIDTH + 0.06, 0.82, SERIA81_CAR_LENGTH - 0.1),
    yellowWaist: new THREE.BoxGeometry(SERIA81_CAR_WIDTH + 0.075, 0.24, SERIA81_CAR_LENGTH - 0.1),
    fluteRib: new THREE.BoxGeometry(SERIA81_CAR_WIDTH + 0.125, 0.042, SERIA81_CAR_LENGTH - 0.32),
    roofVent: new THREE.BoxGeometry(1.42, 0.16, 1.55),
    sideWindowFrame: new THREE.BoxGeometry(SERIA81_CAR_WIDTH + 0.085, 0.96, 1.88),
    sideWindow: new THREE.BoxGeometry(SERIA81_CAR_WIDTH + 0.105, 0.82, 1.72),
    doorLeaf: new THREE.BoxGeometry(0.06, 1.98, 0.56),
    doorGlass: new THREE.BoxGeometry(0.072, 0.72, 0.36),
    gangway: new THREE.BoxGeometry(2.08, 2.52, SERIA81_CAR_GAP + 0.14),
    ...createSeria81FrontAndBogieGeos(),
  };
}

function createSeria81FrontAndBogieGeos(): Pick<
  ISeria81Geometries,
  | 'frontPlate' | 'frontGasketFrame' | 'frontWindshieldPane' | 'frontCenterPillar'
  | 'chevronBar' | 'headlampBezel' | 'headlampLens' | 'wiperArm' | 'destBoardPlane'
  | 'coupler' | 'bogieFrame' | 'axle' | 'wheel'
> {
  const wheel = new THREE.CylinderGeometry(0.41, 0.41, 0.14, 14); wheel.rotateZ(Math.PI / 2);
  const axle = new THREE.CylinderGeometry(0.085, 0.085, 1.65, 8); axle.rotateZ(Math.PI / 2);
  const headlampBezel = new THREE.CylinderGeometry(0.135, 0.145, 0.12, 16); headlampBezel.rotateX(Math.PI / 2);
  const headlampLens = new THREE.CylinderGeometry(0.11, 0.11, 0.135, 16); headlampLens.rotateX(Math.PI / 2);
  return {
    frontPlate: new THREE.BoxGeometry(SERIA81_CAR_WIDTH + 0.04, 2.74, 0.24),
    frontGasketFrame: new THREE.BoxGeometry(1.06, 0.98, 0.08),
    frontWindshieldPane: new THREE.BoxGeometry(0.92, 0.84, 0.095),
    frontCenterPillar: new THREE.BoxGeometry(0.14, 1.02, 0.11),
    chevronBar: new THREE.BoxGeometry(1.48, 0.16, 0.05),
    headlampBezel, headlampLens,
    wiperArm: new THREE.BoxGeometry(0.032, 0.52, 0.032),
    destBoardPlane: new THREE.PlaneGeometry(0.84, 0.21),
    coupler: new THREE.BoxGeometry(0.46, 0.28, 0.68),
    bogieFrame: new THREE.BoxGeometry(1.94, 0.32, 2.55),
    axle, wheel,
  };
}

function createChamfered81ShellGeometry(): THREE.BufferGeometry {
  const hw = SERIA81_CAR_WIDTH * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-hw + 0.08, 0.68);
  shape.lineTo(hw - 0.08, 0.68);
  shape.lineTo(hw, 0.82);
  shape.lineTo(hw, 3.12);
  shape.lineTo(hw - 0.34, 3.54);
  shape.lineTo(-hw + 0.34, 3.54);
  shape.lineTo(-hw, 3.12);
  shape.lineTo(-hw, 0.82);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: SERIA81_CAR_LENGTH,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.025,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -SERIA81_CAR_LENGTH * 0.5);
  return geo;
}
