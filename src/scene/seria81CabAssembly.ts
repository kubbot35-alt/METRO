import * as THREE from 'three';
import type { IDisposableResource } from './shared/baseTrainConsist';
import { createGlowMaterial } from './shared/canvasTextureFactory';
export { addDualRetroWipers, addHeavyMetalController, addToggleSwitchBanks } from './seria81ControlsAssembly';

export interface IRetroLamps {
  readonly doorMat: THREE.MeshStandardMaterial;
  readonly warnMat: THREE.MeshStandardMaterial;
  readonly headlightMat: THREE.MeshStandardMaterial;
  readonly czuwakMat: THREE.MeshStandardMaterial;
}

export function addSplitWindshieldFrame(
  group: THREE.Group, cabGreenMat: THREE.MeshStandardMaterial, gasketMat: THREE.MeshStandardMaterial,
  steelTrimMat: THREE.MeshStandardMaterial, disposables: IDisposableResource[],
): void {
  const pillarGeo = new THREE.BoxGeometry(0.14, 1.5, 0.18);
  ([-1, 1] as const).forEach((s) => {
    const pillar = new THREE.Mesh(pillarGeo, cabGreenMat);
    pillar.position.set(s * 0.98, 0.06, -0.98);
    pillar.rotation.z = s * 0.05;
    group.add(pillar);
  });
  const mullionGeo = new THREE.BoxGeometry(0.026, 1.05, 0.05);
  const mullion = new THREE.Mesh(mullionGeo, gasketMat);
  mullion.position.set(0, 0.26, -1.03);
  group.add(mullion);
  disposables.push(pillarGeo, mullionGeo);
  addWindshieldHeaderAndGrab(group, cabGreenMat, gasketMat, steelTrimMat, disposables);
}

function addWindshieldHeaderAndGrab(
  group: THREE.Group, cabGreenMat: THREE.MeshStandardMaterial, gasketMat: THREE.MeshStandardMaterial,
  steelTrimMat: THREE.MeshStandardMaterial, disposables: IDisposableResource[],
): void {
  const headerGeo = new THREE.BoxGeometry(2.3, 0.16, 0.28);
  const header = new THREE.Mesh(headerGeo, cabGreenMat);
  header.position.set(0, 0.64, -0.95);
  const visorGeo = new THREE.BoxGeometry(1.45, 0.036, 0.12);
  const visor = new THREE.Mesh(visorGeo, gasketMat);
  visor.position.set(0, 0.55, -0.89);
  const grabGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.42, 8);
  const grab = new THREE.Mesh(grabGeo, steelTrimMat);
  grab.rotation.z = Math.PI / 2;
  grab.position.set(-0.56, 0.54, -0.86);
  group.add(header, visor, grab);
  disposables.push(headerGeo, visorGeo, grabGeo);
}

export function addRetroConsoleAndGauges(
  group: THREE.Group,
  cabGreenMat: THREE.MeshStandardMaterial,
  deskGreyMat: THREE.MeshStandardMaterial,
  steelTrimMat: THREE.MeshStandardMaterial,
  speedTex: THREE.CanvasTexture,
  pressTex: THREE.CanvasTexture,
  lamps: IRetroLamps,
  disposables: IDisposableResource[],
): { speedNeedle: THREE.Group; pressureNeedle: THREE.Group } {
  addRetroDeskBox(group, cabGreenMat, deskGreyMat, disposables);
  const speedGauge = buildAnalogGaugeUnit(speedTex, steelTrimMat, 0xef4444, -0.21, -0.33, -0.895, disposables);
  const pressGauge = buildAnalogGaugeUnit(pressTex, steelTrimMat, 0xfacc15, 0.21, -0.33, -0.895, disposables);
  group.add(speedGauge.unit, pressGauge.unit);
  addRetroIndicatorBulbs(group, steelTrimMat, lamps, disposables);
  return { speedNeedle: speedGauge.needlePivot, pressureNeedle: pressGauge.needlePivot };
}

function addRetroDeskBox(
  group: THREE.Group,
  cabGreenMat: THREE.MeshStandardMaterial,
  deskGreyMat: THREE.MeshStandardMaterial,
  disposables: IDisposableResource[],
): void {
  const deskBaseGeo = new THREE.BoxGeometry(2.15, 0.28, 0.58);
  const deskBase = new THREE.Mesh(deskBaseGeo, cabGreenMat);
  deskBase.position.set(0, -0.52, -0.94);
  deskBase.rotation.x = 0.12;
  const gaugeBoxGeo = new THREE.BoxGeometry(0.92, 0.28, 0.18);
  const gaugeBox = new THREE.Mesh(gaugeBoxGeo, deskGreyMat);
  gaugeBox.position.set(0, -0.34, -0.99);
  gaugeBox.rotation.x = -0.28;
  const hoodGeo = new THREE.BoxGeometry(0.96, 0.028, 0.16);
  const hood = new THREE.Mesh(hoodGeo, cabGreenMat);
  hood.position.set(0, -0.195, -0.96);
  group.add(deskBase, gaugeBox, hood);
  disposables.push(deskBaseGeo, gaugeBoxGeo, hoodGeo);
}

function addRetroIndicatorBulbs(
  group: THREE.Group,
  steelTrimMat: THREE.MeshStandardMaterial,
  lamps: IRetroLamps,
  disposables: IDisposableResource[],
): void {
  const ringGeo = new THREE.CylinderGeometry(0.022, 0.025, 0.018, 14);
  ringGeo.rotateX(Math.PI / 2);
  const bulbGeo = new THREE.SphereGeometry(0.016, 12, 10);
  const lampSpecs: ReadonlyArray<{ x: number; mat: THREE.MeshStandardMaterial }> = [
    { x: -0.37, mat: lamps.warnMat },
    { x: -0.04, mat: lamps.czuwakMat },
    { x: 0.04, mat: lamps.headlightMat },
    { x: 0.37, mat: lamps.doorMat },
  ];
  lampSpecs.forEach((spec) => {
    const ring = new THREE.Mesh(ringGeo, steelTrimMat);
    ring.position.set(spec.x, -0.23, -0.89);
    const bulb = new THREE.Mesh(bulbGeo, spec.mat);
    bulb.position.set(spec.x, -0.23, -0.882);
    group.add(ring, bulb);
  });
  disposables.push(ringGeo, bulbGeo);
}

function buildAnalogGaugeUnit(
  dialTex: THREE.CanvasTexture,
  steelTrimMat: THREE.MeshStandardMaterial,
  needleHex: number,
  x: number,
  y: number,
  z: number,
  disposables: IDisposableResource[],
): { unit: THREE.Group; needlePivot: THREE.Group } {
  const unit = new THREE.Group();
  unit.position.set(x, y, z);
  unit.rotation.x = -0.28;
  const rimGeo = new THREE.CylinderGeometry(0.118, 0.124, 0.036, 24);
  rimGeo.rotateX(Math.PI / 2);
  const faceGeo = new THREE.CircleGeometry(0.106, 24);
  const faceMat = new THREE.MeshStandardMaterial({
    map: dialTex, emissiveMap: dialTex, emissive: 0xfff3d1, emissiveIntensity: 0.72, roughness: 0.85, metalness: 0,
  });
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.position.set(0, 0, 0.019);
  const needlePivot = createGaugeNeedlePivot(needleHex, steelTrimMat, disposables);
  unit.add(new THREE.Mesh(rimGeo, steelTrimMat), face, needlePivot);
  disposables.push(rimGeo, faceGeo, faceMat);
  return { unit, needlePivot };
}

function createGaugeNeedlePivot(
  needleHex: number,
  steelTrimMat: THREE.MeshStandardMaterial,
  disposables: IDisposableResource[],
): THREE.Group {
  const needlePivot = new THREE.Group();
  needlePivot.position.set(0, 0, 0.025);
  const needleGeo = new THREE.BoxGeometry(0.008, 0.086, 0.004);
  const needleMat = createGlowMaterial(needleHex, needleHex, 0.65, 0.3);
  const needle = new THREE.Mesh(needleGeo, needleMat);
  needle.position.set(0, 0.034, 0);
  const capGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.01, 12);
  capGeo.rotateX(Math.PI / 2);
  needlePivot.add(needle, new THREE.Mesh(capGeo, steelTrimMat));
  disposables.push(needleGeo, needleMat, capGeo);
  return needlePivot;
}
