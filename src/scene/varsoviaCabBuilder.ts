import * as THREE from 'three';
import type { ISimulationSnapshot } from '../domain/types';
import { addModernCabCctvMonitors, type ICabMirrorHardware } from './cabMirrorAttachments';
import { BaseCabInterior, type ICabInterior } from './shared/baseCabInterior';
import { addSingleCabWiper } from './shared/cabDeskHelpers';
import { createGlowMaterial } from './shared/canvasTextureFactory';
import {
  addMinimalistThreeScreenDesk,
  addPanoramicWindshieldFrame,
  addPrecisionMasterLever,
  type IVarsoviaLamps,
} from './varsoviaCabAssembly';
import { createVarsoviaCabScreens, type IVarsoviaCabScreens } from './varsoviaTextures';

export class VarsoviaCabInterior extends BaseCabInterior {
  public readonly leverPivot: THREE.Group;
  public readonly wiperPivot: THREE.Group;
  public readonly mirrorHardware: ICabMirrorHardware;
  private readonly screens: IVarsoviaCabScreens;
  private readonly lamps: IVarsoviaLamps;

  public constructor(maxAnisotropy: number) {
    super('SkodaVarsoviaCabInterior', { parkRad: 1.48, sweepRad: -1.08 });
    this.screens = createVarsoviaCabScreens(maxAnisotropy);
    this.lamps = createVarsoviaLamps();
    const mats = this.createCabMaterials();
    addPanoramicWindshieldFrame(this.group, mats.matteGraphite, mats.glossyBezel, this.lamps.ambientLedMat, this.disposables);
    const deskCctv = addMinimalistThreeScreenDesk(
      this.group, mats.deskDeckMat, mats.matteGraphite, mats.glossyBezel, this.lamps,
      this.screens.leftScreenTexture, this.screens.centerScreenTexture, this.screens.rightScreenTexture, this.disposables,
    );
    this.leverPivot = addPrecisionMasterLever(this.group, mats.matteGraphite, mats.brushedSteel, this.lamps.ambientLedMat, this.disposables);
    this.wiperPivot = addSingleCabWiper(this.group, {
      name: 'VarsoviaWindshieldWiperPivot', x: 0.34, y: -0.25, z: -1.0, parkRad: 1.48,
      armWidth: 0.015, armLength: 0.56, bladeWidth: 0.02, bladeLength: 0.44, armColor: 0x090d14,
    }, this.disposables);
    this.mirrorHardware = addModernCabCctvMonitors(
      this.group, mats.glossyBezel,
      { offsetX: 0.74, posY: 0.37, posZ: -0.93, pitchRad: 0.14, yawRad: 0.28, width: 0.225, height: 0.142 },
      this.disposables, deskCctv,
    );
    this.addAmbientLight();
  }

  protected updateCabDetails(snapshot: ISimulationSnapshot, dtSec: number): void {
    this.screens.update(snapshot, dtSec);
    const warnActive = this.isWarningActive(snapshot);
    this.lamps.doorMat.emissiveIntensity = snapshot.doorState === 'open' ? 3.0 : 0.45;
    this.lamps.warnMat.emissiveIntensity = warnActive ? 3.8 : 0.18;
    this.lamps.headlightMat.emissiveIntensity = snapshot.headlightsOn ? 2.6 : 0.15;
    this.lamps.ambientLedMat.emissive.setHex(warnActive ? 0xef4444 : 0x22d3ee);
  }

  private createCabMaterials(): {
    matteGraphite: THREE.MeshStandardMaterial;
    deskDeckMat: THREE.MeshStandardMaterial;
    brushedSteel: THREE.MeshStandardMaterial;
    glossyBezel: THREE.MeshStandardMaterial;
  } {
    const matteGraphite = new THREE.MeshStandardMaterial({ color: 0x141922, roughness: 0.62, metalness: 0.28 });
    const deskDeckMat = new THREE.MeshStandardMaterial({ color: 0x0d121a, roughness: 0.72, metalness: 0.24 });
    const brushedSteel = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.24, metalness: 0.85 });
    const glossyBezel = new THREE.MeshStandardMaterial({ color: 0x05080f, roughness: 0.18, metalness: 0.6 });
    this.registerDisposables(
      this.screens, matteGraphite, deskDeckMat, brushedSteel, glossyBezel,
      this.lamps.doorMat, this.lamps.warnMat, this.lamps.headlightMat, this.lamps.ambientLedMat,
    );
    return { matteGraphite, deskDeckMat, brushedSteel, glossyBezel };
  }

  private addAmbientLight(): void {
    const cyanGlow = new THREE.PointLight(0x22d3ee, 0.85, 1.65, 2.0);
    cyanGlow.position.set(0, -0.18, -0.62);
    this.group.add(cyanGlow);
  }
}

function createVarsoviaLamps(): IVarsoviaLamps {
  return {
    doorMat: createGlowMaterial(0x059669, 0x10b981, 0.45, 0.2),
    warnMat: createGlowMaterial(0xb91c1c, 0xef4444, 0.18, 0.2),
    headlightMat: createGlowMaterial(0x0284c7, 0x38bdf8, 2.6, 0.2),
    ambientLedMat: createGlowMaterial(0x0891b2, 0x22d3ee, 2.4, 0.2),
  };
}

export function buildVarsoviaCabInterior(maxAnisotropy: number): ICabInterior {
  return new VarsoviaCabInterior(maxAnisotropy);
}
