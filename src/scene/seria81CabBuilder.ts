import * as THREE from 'three';
import type { ISimulationSnapshot } from '../domain/types';
import { addSeria81CabWingMirrors, type ICabMirrorHardware } from './cabMirrorAttachments';
import {
  addDualRetroWipers,
  addHeavyMetalController,
  addRetroConsoleAndGauges,
  addSplitWindshieldFrame,
  addToggleSwitchBanks,
  type IRetroLamps,
} from './seria81CabAssembly';
import {
  createAnalogManometerDialTexture,
  createAnalogSpeedometerDialTexture,
  normalizedValueToNeedleZ,
} from './seria81Textures';
import { attachSeria81Sop2Display, type IRetroSop2Display } from './seria81Sop2Module';
import { BaseCabInterior, type ICabInterior } from './shared/baseCabInterior';
import { createGlowMaterial } from './shared/canvasTextureFactory';

export class Seria81CabInterior extends BaseCabInterior {
  public readonly leverPivot: THREE.Group;
  public readonly wiperPivot: THREE.Group;
  public readonly mirrorHardware: ICabMirrorHardware;
  private readonly wiperLeftPivot: THREE.Group;
  private readonly speedNeedle: THREE.Group;
  private readonly pressureNeedle: THREE.Group;
  private readonly lamps: IRetroLamps;
  private readonly sop2Display: IRetroSop2Display;
  private smoothedSpeed = 0;
  private smoothedPressureBar = 5.2;

  public constructor(maxAnisotropy: number) {
    super('Seria81RetroCabInterior', { parkRad: 1.26, sweepRad: -0.84 });
    this.lamps = createRetroLampMaterials();
    const mats = this.createCabMaterials(maxAnisotropy);
    addSplitWindshieldFrame(this.group, mats.cabGreenMat, mats.gasketMat, mats.steelTrimMat, this.disposables);
    const gauges = addRetroConsoleAndGauges(
      this.group, mats.cabGreenMat, mats.deskGreyMat, mats.steelTrimMat,
      mats.speedDialTex, mats.pressDialTex, this.lamps, this.disposables,
    );
    this.speedNeedle = gauges.speedNeedle;
    this.pressureNeedle = gauges.pressureNeedle;
    addToggleSwitchBanks(this.group, mats.deskGreyMat, mats.steelTrimMat, this.disposables);
    this.leverPivot = addHeavyMetalController(this.group, mats.deskGreyMat, mats.steelTrimMat, this.disposables);
    const wipers = addDualRetroWipers(this.group, mats.gasketMat, this.disposables);
    this.wiperLeftPivot = wipers.pivotL;
    this.wiperPivot = wipers.pivotR;
    this.mirrorHardware = addSeria81CabWingMirrors(this.group, mats.steelTrimMat, mats.gasketMat, this.disposables);
    this.sop2Display = attachSeria81Sop2Display(this.group, mats.deskGreyMat, mats.steelTrimMat, maxAnisotropy, this.disposables);
    this.addWarmGaugeLighting();
  }

  protected updateCabDetails(snapshot: ISimulationSnapshot, dtSec: number): void {
    const safeDt = Math.max(dtSec, 0.016);
    this.smoothedSpeed = THREE.MathUtils.damp(this.smoothedSpeed, snapshot.kinematics.speedKmh, 9, safeDt);
    this.speedNeedle.rotation.z = normalizedValueToNeedleZ(this.smoothedSpeed / 100);
    const targetBar = snapshot.kinematics.emergencyBrake ? 0.4 : 5.2 - snapshot.kinematics.serviceBrake * 2.4;
    this.smoothedPressureBar = THREE.MathUtils.damp(this.smoothedPressureBar, targetBar, 6, safeDt);
    this.pressureNeedle.rotation.z = normalizedValueToNeedleZ(this.smoothedPressureBar / 8);
    this.lamps.doorMat.emissiveIntensity = snapshot.doorState === 'open' ? 3.2 : 0.03;
    this.lamps.warnMat.emissiveIntensity = this.isWarningActive(snapshot) ? 3.8 : 0.03;
    this.lamps.headlightMat.emissiveIntensity = snapshot.headlightsOn ? 2.4 : 0.03;
    this.lamps.czuwakMat.emissiveIntensity = snapshot.czuwak.active ? 4.2 : 0.03;
    this.wiperLeftPivot.rotation.z = THREE.MathUtils.lerp(-1.26, 0.84, snapshot.weather.wiperPhaseRad);
    this.sop2Display.update(snapshot.sop2);
  }

  private createCabMaterials(maxAnisotropy: number): {
    cabGreenMat: THREE.MeshStandardMaterial;
    deskGreyMat: THREE.MeshStandardMaterial;
    steelTrimMat: THREE.MeshStandardMaterial;
    gasketMat: THREE.MeshStandardMaterial;
    speedDialTex: THREE.CanvasTexture;
    pressDialTex: THREE.CanvasTexture;
  } {
    const cabGreenMat = new THREE.MeshStandardMaterial({ color: 0x2c4239, roughness: 0.62, metalness: 0.36 });
    const deskGreyMat = new THREE.MeshStandardMaterial({ color: 0x242c30, roughness: 0.72, metalness: 0.32 });
    const steelTrimMat = new THREE.MeshStandardMaterial({ color: 0x9aa7b4, roughness: 0.28, metalness: 0.84 });
    const gasketMat = new THREE.MeshStandardMaterial({ color: 0x0a0d10, roughness: 0.92, metalness: 0.08 });
    const speedDialTex = createAnalogSpeedometerDialTexture(maxAnisotropy);
    const pressDialTex = createAnalogManometerDialTexture(maxAnisotropy);
    this.registerDisposables(
      cabGreenMat, deskGreyMat, steelTrimMat, gasketMat, speedDialTex, pressDialTex,
      this.lamps.doorMat, this.lamps.warnMat, this.lamps.headlightMat, this.lamps.czuwakMat,
    );
    return { cabGreenMat, deskGreyMat, steelTrimMat, gasketMat, speedDialTex, pressDialTex };
  }

  private addWarmGaugeLighting(): void {
    const gaugeGlow = new THREE.PointLight(0xffdca8, 0.65, 1.5, 2.0);
    gaugeGlow.position.set(0, -0.18, -0.66);
    this.group.add(gaugeGlow);
  }
}

function createRetroLampMaterials(): IRetroLamps {
  return {
    doorMat: createGlowMaterial(0x064e3b, 0x10b981, 0.03, 0.25),
    warnMat: createGlowMaterial(0x450a0a, 0xef4444, 0.03, 0.25),
    headlightMat: createGlowMaterial(0x713f12, 0xfde047, 2.4, 0.25),
    czuwakMat: createGlowMaterial(0x431407, 0xf97316, 0.03, 0.25),
  };
}

export function buildSeria81CabInterior(maxAnisotropy: number): ICabInterior {
  return new Seria81CabInterior(maxAnisotropy);
}
