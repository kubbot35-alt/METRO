import * as THREE from 'three';
import {
  VARSOVIA_DIMENSIONS,
  type ISkodaCabLightRef,
  type ISkodaVarsoviaMaterials,
} from './skodaVarsoviaTypes';

function trackBox(
  w: number,
  h: number,
  d: number,
  extraGeos: THREE.BufferGeometry[],
): THREE.BoxGeometry {
  const geo = new THREE.BoxGeometry(w, h, d);
  extraGeos.push(geo);
  return geo;
}

function addCabSidePillars(
  cab: THREE.Group,
  m: ISkodaVarsoviaMaterials,
  extraGeos: THREE.BufferGeometry[],
): void {
  const { halfW } = VARSOVIA_DIMENSIONS;
  const sideGeo = trackBox(0.24, 2.38, 0.56, extraGeos);
  const topCornerGeo = trackBox(0.32, 0.28, 0.65, extraGeos);
  const bottomCornerGeo = trackBox(0.42, 0.24, 0.62, extraGeos);
  for (const s of [-1, 1] as const) {
    const cSide = new THREE.Mesh(sideGeo, m.whiteBody);
    cSide.position.set(s * (halfW - 0.12), 2.24, 0.16);
    cSide.rotation.x = -0.11;
    cSide.castShadow = true;
    const cTop = new THREE.Mesh(topCornerGeo, m.whiteBody);
    cTop.position.set(s * (halfW - 0.22), 3.42, 0.02);
    cTop.rotation.z = s * 0.45;
    const cBot = new THREE.Mesh(bottomCornerGeo, m.whiteBody);
    cBot.position.set(s * (halfW - 0.26), 1.06, 0.24);
    cab.add(cSide, cTop, cBot);
  }
}

function addCabGlazingAndDesk(
  cab: THREE.Group,
  m: ISkodaVarsoviaMaterials,
  extraGeos: THREE.BufferGeometry[],
): void {
  const brow = new THREE.Mesh(trackBox(2.26, 0.28, 0.68, extraGeos), m.blackBand);
  brow.position.set(0, 3.44, 0.02);
  brow.rotation.x = 0.22;
  const windshield = new THREE.Mesh(trackBox(2.24, 1.56, 0.06, extraGeos), m.windshieldGlass);
  windshield.position.set(0, 2.48, 0.34);
  windshield.rotation.x = -0.14;
  const wiper = new THREE.Mesh(trackBox(0.04, 0.72, 0.03, extraGeos), m.blackBand);
  wiper.position.set(0.18, 2.12, 0.42);
  wiper.rotation.set(-0.14, 0, 0.48);
  const desk = new THREE.Mesh(trackBox(1.95, 0.36, 0.65, extraGeos), m.underframe);
  desk.position.set(0, 1.72, -0.1);
  const ledGeo = new THREE.PlaneGeometry(1.66, 0.36);
  extraGeos.push(ledGeo);
  const ledMesh = new THREE.Mesh(ledGeo, m.ledBoard);
  ledMesh.position.set(0, 3.06, 0.28);
  ledMesh.rotation.x = -0.14;
  cab.add(brow, windshield, wiper, desk, ledMesh);
}

function addCabFrontMaskAndCoupler(
  cab: THREE.Group,
  m: ISkodaVarsoviaMaterials,
  extraGeos: THREE.BufferGeometry[],
): void {
  const lowerMask = new THREE.Mesh(trackBox(2.28, 0.66, 0.42, extraGeos), m.blackBand);
  lowerMask.position.set(0, 1.38, 0.32);
  lowerMask.rotation.x = 0.06;

  const frontRedAccent = new THREE.Mesh(trackBox(1.56, 0.12, 0.05, extraGeos), m.warsawRed);
  frontRedAccent.position.set(0, 1.32, 0.53);

  const deflector = new THREE.Mesh(trackBox(2.18, 0.42, 0.24, extraGeos), m.underframe);
  deflector.position.set(0, 0.72, 0.38);
  deflector.rotation.x = 0.25;

  const couplerShaft = new THREE.Mesh(trackBox(0.22, 0.16, 0.65, extraGeos), m.underframe);
  couplerShaft.position.set(0, 0.68, 0.62);

  const couplerHead = new THREE.Mesh(trackBox(0.36, 0.24, 0.22, extraGeos), m.steelWheel);
  couplerHead.position.set(0, 0.68, 0.96);
  cab.add(lowerMask, frontRedAccent, deflector, couplerShaft, couplerHead);
}

function createHeadlightSpot(
  cab: THREE.Group,
  isFront: boolean,
  enableSpotLights: boolean,
): THREE.SpotLight {
  const spotLight = new THREE.SpotLight(0xf0f7ff, 0, 55, Math.PI / 5.5, 0.6, 1.2);
  spotLight.position.set(0, 1.45, 0.55);
  const spotTarget = new THREE.Object3D();
  spotTarget.position.set(0, 0, 22);
  spotLight.target = spotTarget;
  if (enableSpotLights && isFront) cab.add(spotLight, spotTarget);
  return spotLight;
}

function createVolumetricBeams(
  m: ISkodaVarsoviaMaterials,
  extraGeos: THREE.BufferGeometry[],
): THREE.Group {
  const beamGroup = new THREE.Group();
  const coneGeo = new THREE.ConeGeometry(1.25, 11, 16, 1, true);
  coneGeo.translate(0, -5.5, 0);
  coneGeo.rotateX(-Math.PI / 2);
  extraGeos.push(coneGeo);
  for (const s of [-1, 1] as const) {
    const beam = new THREE.Mesh(coneGeo, m.lightBeam);
    beam.position.set(s * 0.88, 1.42, 0.58);
    beam.rotation.x = 0.06;
    beamGroup.add(beam);
  }
  return beamGroup;
}

function addCabLightClusters(
  cab: THREE.Group,
  isFront: boolean,
  m: ISkodaVarsoviaMaterials,
  extraGeos: THREE.BufferGeometry[],
  enableSpotLights: boolean,
): ISkodaCabLightRef {
  const headMat = isFront ? m.frontHeadlight : m.rearHeadlight;
  const markerMat = isFront ? m.frontMarker : m.rearMarker;
  const lightGeo = trackBox(0.36, 0.11, 0.06, extraGeos);
  for (const s of [-1, 1] as const) {
    const cluster = new THREE.Mesh(lightGeo, headMat);
    cluster.position.set(s * 0.9, 1.42, 0.52);
    cluster.rotation.z = s * 0.26;
    cab.add(cluster);
  }
  const topMarker = new THREE.Mesh(trackBox(0.24, 0.07, 0.05, extraGeos), markerMat);
  topMarker.position.set(0, 3.38, 0.34);
  const spotLight = createHeadlightSpot(cab, isFront, enableSpotLights);
  const beamGroup = createVolumetricBeams(m, extraGeos);
  cab.add(topMarker, beamGroup);
  return { headMat, markerMat, spotLight, beamGroup };
}

export function buildSkodaCabAssembly(
  dir: 1 | -1,
  materials: ISkodaVarsoviaMaterials,
  extraGeos: THREE.BufferGeometry[],
  enableSpotLights: boolean,
): { readonly cab: THREE.Group; readonly ref: ISkodaCabLightRef } {
  const cab = new THREE.Group();
  const isFront = dir > 0;
  if (!isFront) {
    cab.rotation.y = Math.PI;
  }
  addCabSidePillars(cab, materials, extraGeos);
  addCabGlazingAndDesk(cab, materials, extraGeos);
  addCabFrontMaskAndCoupler(cab, materials, extraGeos);
  const ref = addCabLightClusters(cab, isFront, materials, extraGeos, enableSpotLights);
  return { cab, ref };
}

export function applySkodaCabLightState(
  cabRef: ISkodaCabLightRef | null,
  state: 'white' | 'red' | 'off',
): void {
  if (!cabRef) return;
  const isWhite = state === 'white';
  const isRed = state === 'red';
  cabRef.headMat.color.setHex(isWhite ? 0xffffff : isRed ? 0xff1e27 : 0x1e2228);
  cabRef.headMat.emissive.setHex(isWhite ? 0xf4f9ff : isRed ? 0xff0d18 : 0x000000);
  cabRef.headMat.emissiveIntensity = isWhite ? 3.4 : isRed ? 2.8 : 0;
  cabRef.markerMat.color.setHex(isWhite ? 0xffffff : isRed ? 0x1f1f1f : 0x1e2228);
  cabRef.markerMat.emissive.setHex(isWhite ? 0xffffff : 0x000000);
  cabRef.markerMat.emissiveIntensity = isWhite ? 2.6 : 0;
  cabRef.spotLight.intensity = isWhite ? 42 : 0;
  cabRef.beamGroup.visible = isWhite;
}
