import * as THREE from 'three';
import type { ISimulationSnapshot } from '../domain/types';
import {
  createAnalogManometerDialTexture,
  createAnalogSpeedometerDialTexture,
  normalizedValueToNeedleZ,
} from './seria81Textures';

import { addSeria81CabWingMirrors, type ICabMirrorHardware } from './cabMirrorAttachments';

export interface ISeria81CabInterior {
  readonly group: THREE.Group;
  readonly leverPivot: THREE.Group;
  readonly wiperPivot: THREE.Group;
  readonly mirrorHardware: ICabMirrorHardware;
  update(snapshot: ISimulationSnapshot, dtSec: number): void;
  dispose(): void;
}

interface IRetroLamps {
  readonly doorMat: THREE.MeshStandardMaterial;
  readonly warnMat: THREE.MeshStandardMaterial;
  readonly headlightMat: THREE.MeshStandardMaterial;
  readonly czuwakMat: THREE.MeshStandardMaterial;
}

export function buildSeria81CabInterior(maxAnisotropy: number): ISeria81CabInterior {
  const disposables: Array<{ dispose(): void }> = [];
  const group = new THREE.Group();
  group.name = 'Seria81RetroCabInterior';

  const cabGreenMat = new THREE.MeshStandardMaterial({ color: 0x2c4239, roughness: 0.62, metalness: 0.36 });
  const deskGreyMat = new THREE.MeshStandardMaterial({ color: 0x242c30, roughness: 0.72, metalness: 0.32 });
  const steelTrimMat = new THREE.MeshStandardMaterial({ color: 0x9aa7b4, roughness: 0.28, metalness: 0.84 });
  const gasketMat = new THREE.MeshStandardMaterial({ color: 0x0a0d10, roughness: 0.92, metalness: 0.08 });
  const lamps = createRetroLampMaterials();
  const speedDialTex = createAnalogSpeedometerDialTexture(maxAnisotropy);
  const pressDialTex = createAnalogManometerDialTexture(maxAnisotropy);

  disposables.push(
    cabGreenMat,
    deskGreyMat,
    steelTrimMat,
    gasketMat,
    speedDialTex,
    pressDialTex,
    lamps.doorMat,
    lamps.warnMat,
    lamps.headlightMat,
    lamps.czuwakMat,
  );

  addSplitWindshieldFrame(group, cabGreenMat, gasketMat, steelTrimMat, disposables);
  const { speedNeedle, pressureNeedle } = addRetroConsoleAndGauges(
    group,
    cabGreenMat,
    deskGreyMat,
    steelTrimMat,
    speedDialTex,
    pressDialTex,
    lamps,
    disposables,
  );
  addToggleSwitchBanks(group, deskGreyMat, steelTrimMat, disposables);
  const leverPivot = addHeavyMetalController(group, deskGreyMat, steelTrimMat, disposables);
  const { pivotL: wiperLeftPivot, pivotR: wiperPivot } = addDualRetroWipers(group, gasketMat, disposables);
  const mirrorHardware = addSeria81CabWingMirrors(group, steelTrimMat, gasketMat, disposables);
  addWarmGaugeLighting(group);

  let smoothedSpeed = 0;
  let smoothedPressureBar = 5.2;

  return {
    group,
    leverPivot,
    wiperPivot,
    mirrorHardware,
    update: (snapshot: ISimulationSnapshot, dtSec: number): void => {
      const safeDt = Math.max(dtSec, 0.016);
      smoothedSpeed = THREE.MathUtils.damp(smoothedSpeed, snapshot.kinematics.speedKmh, 9, safeDt);
      speedNeedle.rotation.z = normalizedValueToNeedleZ(smoothedSpeed / 100);

      const targetPressureBar = snapshot.kinematics.emergencyBrake
        ? 0.4
        : 5.2 - snapshot.kinematics.serviceBrake * 2.4;
      smoothedPressureBar = THREE.MathUtils.damp(smoothedPressureBar, targetPressureBar, 6, safeDt);
      pressureNeedle.rotation.z = normalizedValueToNeedleZ(smoothedPressureBar / 8);

      lamps.doorMat.emissiveIntensity = snapshot.doorState === 'open' ? 3.2 : 0.03;
      const warnOn =
        snapshot.isOverspeeding || snapshot.kinematics.emergencyBrake || snapshot.atpActive;
      lamps.warnMat.emissiveIntensity = warnOn ? 3.8 : 0.03;
      lamps.headlightMat.emissiveIntensity = snapshot.headlightsOn ? 2.4 : 0.03;
      lamps.czuwakMat.emissiveIntensity = snapshot.czuwak.active ? 4.2 : 0.03;
      // Dual retro 81-717 wipers sweeping left & right split windshield panes
      const wPhase = snapshot.weather.wiperPhaseRad;
      wiperLeftPivot.rotation.z = THREE.MathUtils.lerp(-1.26, 0.84, wPhase);
      wiperPivot.rotation.z = THREE.MathUtils.lerp(1.26, -0.84, wPhase);
    },
    dispose: (): void => disposables.forEach((d) => d.dispose()),
  };
}

function createRetroLampMaterials(): IRetroLamps {
  return {
    doorMat: makeLampMat(0x064e3b, 0x10b981, 0.03),
    warnMat: makeLampMat(0x450a0a, 0xef4444, 0.03),
    headlightMat: makeLampMat(0x713f12, 0xfde047, 2.4),
    czuwakMat: makeLampMat(0x431407, 0xf97316, 0.03),
  };
}

function makeLampMat(color: number, emissive: number, intensity: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, roughness: 0.25 });
}

function addSplitWindshieldFrame(
  group: THREE.Group,
  cabGreenMat: THREE.MeshStandardMaterial,
  gasketMat: THREE.MeshStandardMaterial,
  steelTrimMat: THREE.MeshStandardMaterial,
  disposables: Array<{ dispose(): void }>,
): void {
  const pillarGeo = new THREE.BoxGeometry(0.14, 1.5, 0.18);
  const leftPillar = new THREE.Mesh(pillarGeo, cabGreenMat);
  leftPillar.position.set(-0.98, 0.06, -0.98);
  leftPillar.rotation.z = -0.05;
  const rightPillar = new THREE.Mesh(pillarGeo, cabGreenMat);
  rightPillar.position.set(0.98, 0.06, -0.98);
  rightPillar.rotation.z = 0.05;

  // Signature 81-717 split center mullion (slim enough to keep track clear)
  const mullionGeo = new THREE.BoxGeometry(0.026, 1.05, 0.05);
  const mullion = new THREE.Mesh(mullionGeo, gasketMat);
  mullion.position.set(0, 0.26, -1.03);

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

  group.add(leftPillar, rightPillar, mullion, header, visor, grab);
  disposables.push(pillarGeo, mullionGeo, headerGeo, visorGeo, grabGeo);
}

function addRetroConsoleAndGauges(
  group: THREE.Group,
  cabGreenMat: THREE.MeshStandardMaterial,
  deskGreyMat: THREE.MeshStandardMaterial,
  steelTrimMat: THREE.MeshStandardMaterial,
  speedTex: THREE.CanvasTexture,
  pressTex: THREE.CanvasTexture,
  lamps: IRetroLamps,
  disposables: Array<{ dispose(): void }>,
): { speedNeedle: THREE.Group; pressureNeedle: THREE.Group } {
  // Massive angular 81-717 desk base
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

  const speedGauge = buildAnalogGaugeUnit(speedTex, steelTrimMat, 0xef4444, -0.21, -0.33, -0.895, disposables);
  const pressGauge = buildAnalogGaugeUnit(pressTex, steelTrimMat, 0xfacc15, 0.21, -0.33, -0.895, disposables);
  group.add(speedGauge.unit, pressGauge.unit);

  // Round glowing control lamps with chrome bezels across upper instrument rail
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

  return { speedNeedle: speedGauge.needlePivot, pressureNeedle: pressGauge.needlePivot };
}

function buildAnalogGaugeUnit(
  dialTex: THREE.CanvasTexture,
  steelTrimMat: THREE.MeshStandardMaterial,
  needleHex: number,
  x: number,
  y: number,
  z: number,
  disposables: Array<{ dispose(): void }>,
): { unit: THREE.Group; needlePivot: THREE.Group } {
  const unit = new THREE.Group();
  unit.position.set(x, y, z);
  unit.rotation.x = -0.28;

  const rimGeo = new THREE.CylinderGeometry(0.118, 0.124, 0.036, 24);
  rimGeo.rotateX(Math.PI / 2);
  const rim = new THREE.Mesh(rimGeo, steelTrimMat);

  const faceGeo = new THREE.CircleGeometry(0.106, 24);
  const faceMat = new THREE.MeshStandardMaterial({
    map: dialTex,
    emissiveMap: dialTex,
    emissive: 0xfff3d1,
    emissiveIntensity: 0.72,
    roughness: 0.85,
    metalness: 0.0,
  });
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.position.set(0, 0, 0.019);

  const needlePivot = new THREE.Group();
  needlePivot.position.set(0, 0, 0.025);
  const needleGeo = new THREE.BoxGeometry(0.008, 0.086, 0.004);
  const needleMat = new THREE.MeshStandardMaterial({
    color: needleHex,
    emissive: needleHex,
    emissiveIntensity: 0.65,
    roughness: 0.3,
  });
  const needle = new THREE.Mesh(needleGeo, needleMat);
  needle.position.set(0, 0.034, 0);

  const capGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.01, 12);
  capGeo.rotateX(Math.PI / 2);
  const cap = new THREE.Mesh(capGeo, steelTrimMat);
  needlePivot.add(needle, cap);

  unit.add(rim, face, needlePivot);
  disposables.push(rimGeo, faceGeo, faceMat, needleGeo, needleMat, capGeo);
  return { unit, needlePivot };
}

function addToggleSwitchBanks(
  group: THREE.Group,
  deskGreyMat: THREE.MeshStandardMaterial,
  steelTrimMat: THREE.MeshStandardMaterial,
  disposables: Array<{ dispose(): void }>,
): void {
  const plateGeo = new THREE.BoxGeometry(0.32, 0.14, 0.04);
  const nutGeo = new THREE.CylinderGeometry(0.009, 0.011, 0.014, 6);
  nutGeo.rotateX(Math.PI / 2);
  const batGeo = new THREE.CylinderGeometry(0.0035, 0.0055, 0.034, 8);

  const rightBank = new THREE.Group();
  rightBank.position.set(0.64, -0.35, -0.89);
  rightBank.rotation.set(-0.35, -0.22, 0);
  rightBank.add(new THREE.Mesh(plateGeo, deskGreyMat));

  // Two rows of 5 metallic toggle switches (przełączniki hebelkowe)
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      const sx = -0.11 + col * 0.055;
      const sy = row === 0 ? 0.028 : -0.028;
      const nut = new THREE.Mesh(nutGeo, steelTrimMat);
      nut.position.set(sx, sy, 0.024);
      const bat = new THREE.Mesh(batGeo, steelTrimMat);
      bat.position.set(sx, sy, 0.04);
      bat.rotation.x = (col + row) % 2 === 0 ? 0.55 : -0.55;
      rightBank.add(nut, bat);
    }
  }

  group.add(rightBank);
  disposables.push(plateGeo, nutGeo, batGeo);
}

function addHeavyMetalController(
  group: THREE.Group,
  deskGreyMat: THREE.MeshStandardMaterial,
  steelTrimMat: THREE.MeshStandardMaterial,
  disposables: Array<{ dispose(): void }>,
): THREE.Group {
  const baseX = -0.6;
  const baseY = -0.39;
  const baseZ = -0.83;

  const boxGeo = new THREE.BoxGeometry(0.19, 0.11, 0.32);
  const box = new THREE.Mesh(boxGeo, deskGreyMat);
  box.position.set(baseX, baseY - 0.035, baseZ);

  const quadrantGeo = new THREE.BoxGeometry(0.06, 0.024, 0.25);
  const quadrant = new THREE.Mesh(quadrantGeo, steelTrimMat);
  quadrant.position.set(baseX, baseY + 0.018, baseZ);

  const pivot = new THREE.Group();
  pivot.name = 'Seria81HeavyControllerPivot';
  pivot.position.set(baseX, baseY, baseZ);

  const shaftGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.2, 10);
  const shaft = new THREE.Mesh(shaftGeo, steelTrimMat);
  shaft.position.set(0, 0.1, 0);

  const handleMat = new THREE.MeshStandardMaterial({ color: 0x16191e, roughness: 0.65, metalness: 0.35 });
  const gripGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.15, 12);
  gripGeo.rotateZ(Math.PI / 2);
  const grip = new THREE.Mesh(gripGeo, handleMat);
  grip.position.set(0, 0.2, 0);

  const collarGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.018, 12);
  collarGeo.rotateZ(Math.PI / 2);
  const capL = new THREE.Mesh(collarGeo, steelTrimMat);
  capL.position.set(-0.072, 0.2, 0);
  const capR = new THREE.Mesh(collarGeo, steelTrimMat);
  capR.position.set(0.072, 0.2, 0);

  pivot.add(shaft, grip, capL, capR);
  group.add(box, quadrant, pivot);
  disposables.push(boxGeo, quadrantGeo, shaftGeo, handleMat, gripGeo, collarGeo);
  return pivot;
}

function addDualRetroWipers(
  group: THREE.Group,
  gasketMat: THREE.MeshStandardMaterial,
  disposables: Array<{ dispose(): void }>,
): { pivotL: THREE.Group; pivotR: THREE.Group } {
  const armGeo = new THREE.BoxGeometry(0.017, 0.44, 0.015);
  const bladeGeo = new THREE.BoxGeometry(0.022, 0.34, 0.016);
  const pivotL = new THREE.Group();
  pivotL.position.set(-0.46, -0.22, -1.0);
  const armL = new THREE.Mesh(armGeo, gasketMat);
  armL.position.set(0, 0.22, 0);
  const bladeL = new THREE.Mesh(bladeGeo, gasketMat);
  bladeL.position.set(0, 0.42, -0.006);
  pivotL.add(armL, bladeL);
  pivotL.rotation.z = -1.26;

  const pivotR = new THREE.Group();
  pivotR.position.set(0.46, -0.22, -1.0);
  const armR = new THREE.Mesh(armGeo, gasketMat);
  armR.position.set(0, 0.22, 0);
  const bladeR = new THREE.Mesh(bladeGeo, gasketMat);
  bladeR.position.set(0, 0.42, -0.006);
  pivotR.add(armR, bladeR);
  pivotR.rotation.z = 1.26;

  group.add(pivotL, pivotR);
  disposables.push(armGeo, bladeGeo);
  return { pivotL, pivotR };
}

function addWarmGaugeLighting(group: THREE.Group): void {
  const gaugeGlow = new THREE.PointLight(0xffdca8, 0.65, 1.5, 2.0);
  gaugeGlow.position.set(0, -0.18, -0.66);
  group.add(gaugeGlow);
}
