import * as THREE from 'three';
import { BaseLedDisplay, type ILedDestinationDisplay } from '../scene/shared/ledMatrixPainter';
import {
  VARSOVIA_DIMENSIONS,
  type ISkodaVarsoviaGeometries,
  type ISkodaVarsoviaMaterials,
} from './skodaVarsoviaTypes';

export class SkodaLedDisplay extends BaseLedDisplay {
  public constructor(maxAnisotropy = 4, initialDest = 'KABATY') {
    super(
      {
        width: 512,
        height: 128,
        backgroundHex: '#070707',
        borderHex: null,
        textColorHex: '#ff9814',
        textGlowHex: '#ff6a00',
        gridDotColor: '#141414',
        gridLineColor: 'rgba(0, 0, 0, 0.42)',
        resolveBadgeColors: () => ({ bg: '#161616', fg: '#ff9814' }),
      },
      maxAnisotropy,
      initialDest,
    );
  }
}

export function createSkodaLedDisplay(maxAnisotropy = 4): ILedDestinationDisplay {
  return new SkodaLedDisplay(maxAnisotropy);
}

function makeStandardMat(
  color: number,
  roughness: number,
  metalness: number,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function createSkodaLightAndGlassMaterials(ledTexture: THREE.CanvasTexture) {
  return {
    windowGlass: new THREE.MeshStandardMaterial({ color: 0x0b1118, roughness: 0.08, metalness: 0.7, transparent: true, opacity: 0.42, side: THREE.DoubleSide }),
    windshieldGlass: new THREE.MeshStandardMaterial({ color: 0x0a1017, roughness: 0.06, metalness: 0.75, transparent: true, opacity: 0.55 }),
    ceilingLed: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff6e5, emissiveIntensity: 1.8, roughness: 0.2 }),
    ledBoard: new THREE.MeshStandardMaterial({ map: ledTexture, emissiveMap: ledTexture, emissive: 0xffffff, emissiveIntensity: 1.5, roughness: 0.2, metalness: 0.1 }),
    frontHeadlight: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3.0, roughness: 0.1 }),
    frontMarker: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.5, roughness: 0.1 }),
    rearHeadlight: new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff1111, emissiveIntensity: 2.6, roughness: 0.1 }),
    rearMarker: new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x000000, emissiveIntensity: 0.0, roughness: 0.2 }),
    lightBeam: new THREE.MeshBasicMaterial({ color: 0xe6f2ff, transparent: true, opacity: 0.09, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
  };
}

export function createSkodaMaterials(ledTexture: THREE.CanvasTexture): ISkodaVarsoviaMaterials {
  return {
    whiteBody: makeStandardMat(0xf2f4f7, 0.28, 0.08),
    roofSilver: makeStandardMat(0xb5bcc4, 0.35, 0.45),
    blackBand: makeStandardMat(0x121417, 0.18, 0.25),
    warsawYellow: makeStandardMat(0xf5c71a, 0.32, 0.05),
    warsawRed: makeStandardMat(0xd61f2c, 0.32, 0.08),
    underframe: makeStandardMat(0x1d2024, 0.75, 0.35),
    steelWheel: makeStandardMat(0x5c646d, 0.4, 0.8),
    gangwayRubber: makeStandardMat(0x181a1e, 0.88, 0.05),
    interiorFloor: makeStandardMat(0x555960, 0.82, 0.05),
    interiorWall: makeStandardMat(0xe3e7ec, 0.55, 0.05),
    seatRed: makeStandardMat(0xc81e2b, 0.75, 0.02),
    handrailYellow: makeStandardMat(0xf5c71a, 0.25, 0.2),
    ...createSkodaLightAndGlassMaterials(ledTexture),
  };
}

function createDoorFrameGeometry(): THREE.ExtrudeGeometry {
  const [doorW, doorH, winW, winH, winY] = [0.65, 2.04, 0.44, 1.24, 0.2];
  const shape = new THREE.Shape();
  shape.moveTo(-doorW / 2, -doorH / 2);
  shape.lineTo(doorW / 2, -doorH / 2);
  shape.lineTo(doorW / 2, doorH / 2);
  shape.lineTo(-doorW / 2, doorH / 2);
  shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-winW / 2, winY - winH / 2);
  hole.lineTo(winW / 2, winY - winH / 2);
  hole.lineTo(winW / 2, winY + winH / 2);
  hole.lineTo(-winW / 2, winY + winH / 2);
  hole.closePath();
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.045, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, -0.0225);
  geo.rotateY(Math.PI / 2);
  return geo;
}

function createExteriorPierGeometries(d: typeof VARSOVIA_DIMENSIONS) {
  return {
    pierWhiteSkirt: new THREE.BoxGeometry(0.07, 0.14, 3.48),
    pierRed: new THREE.BoxGeometry(0.07, 0.5, 3.48),
    pierYellow: new THREE.BoxGeometry(0.07, 0.22, 3.48),
    pierBlackSill: new THREE.BoxGeometry(0.07, 0.1, 3.48),
    pierPillar: new THREE.BoxGeometry(0.07, 1.06, 0.44),
    pierGlass: new THREE.BoxGeometry(0.02, 1.04, 2.62),
    endWhiteSkirt: new THREE.BoxGeometry(0.07, 0.14, 1.74),
    endRed: new THREE.BoxGeometry(0.07, 0.5, 1.74),
    endYellow: new THREE.BoxGeometry(0.07, 0.22, 1.74),
    endBlackSill: new THREE.BoxGeometry(0.07, 0.1, 1.74),
    endBlackUpper: new THREE.BoxGeometry(0.07, 1.06, 1.74),
    upperBlackHeader: new THREE.BoxGeometry(0.07, 0.18, d.carLength),
    cantrailWhite: new THREE.BoxGeometry(0.12, 0.3, d.carLength),
  };
}

function createStructuralAndGangwayGeometries(d: typeof VARSOVIA_DIMENSIONS) {
  return {
    seatBase: new THREE.BoxGeometry(0.46, 0.12, 3.1),
    seatBack: new THREE.BoxGeometry(0.1, 0.52, 3.1),
    floorSlab: new THREE.BoxGeometry(d.carWidth - 0.08, 0.14, d.carLength),
    underSkirt: new THREE.BoxGeometry(d.carWidth - 0.16, 0.2, d.carLength - 0.2),
    roofCenter: new THREE.BoxGeometry(2.14, 0.14, d.carLength),
    hvacUnit: new THREE.BoxGeometry(1.65, 0.18, 3.2),
    ceilingSlab: new THREE.BoxGeometry(2.2, 0.05, d.carLength),
    ceilingLedStrip: new THREE.BoxGeometry(0.12, 0.03, d.carLength - 0.6),
    endFrameSide: new THREE.BoxGeometry(0.46, 2.4, 0.12),
    endFrameTop: new THREE.BoxGeometry(d.carWidth - 0.1, 0.42, 0.12),
    gangwaySide: new THREE.BoxGeometry(0.1, 2.38, d.gangwayGap + 0.16),
    gangwayTop: new THREE.BoxGeometry(2.1, 0.14, d.gangwayGap + 0.16),
    gangwayFloor: new THREE.BoxGeometry(2.1, 0.12, d.gangwayGap + 0.16),
  };
}

export function createSkodaGeometries(): ISkodaVarsoviaGeometries {
  const d = VARSOVIA_DIMENSIONS;
  const doorGlass = new THREE.BoxGeometry(0.015, 1.26, 0.46);
  doorGlass.translate(0, 0.2, 0);
  const wheel = new THREE.CylinderGeometry(0.42, 0.42, 0.14, 16);
  wheel.rotateZ(Math.PI / 2);
  const axle = new THREE.CylinderGeometry(0.075, 0.075, 1.56, 8);
  axle.rotateZ(Math.PI / 2);
  const horizRail = new THREE.CylinderGeometry(0.018, 0.018, 17.8, 8);
  horizRail.rotateX(Math.PI / 2);
  return {
    ...createExteriorPierGeometries(d),
    ...createStructuralAndGangwayGeometries(d),
    doorFrame: createDoorFrameGeometry(),
    doorGlass, wheel, axle, horizRail,
    verticalPole: new THREE.CylinderGeometry(0.02, 0.02, 2.28, 8),
  };
}
