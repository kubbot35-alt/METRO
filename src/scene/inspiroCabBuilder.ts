import * as THREE from 'three';
import type { ISimulationSnapshot } from '../domain/types';
import type { ICabMirrorHardware } from './cabMirrorAttachments';
import {
  addInspiroDesk,
  addInspiroMasterLever,
  addInspiroWindshieldFrame,
  type IInspiroButtonLamps,
} from './inspiroCabAssembly';
import { createInspiroCabScreens, type IInspiroCabScreens } from './inspiroTextures';
import { BaseCabInterior, type ICabInterior } from './shared/baseCabInterior';
import { addSingleCabWiper } from './shared/cabDeskHelpers';
import { createGlowMaterial } from './shared/canvasTextureFactory';

export class InspiroCabInterior extends BaseCabInterior {
  public readonly leverPivot: THREE.Group;
  public readonly wiperPivot: THREE.Group;
  public readonly mirrorHardware: ICabMirrorHardware;
  private readonly screens: IInspiroCabScreens;
  private readonly lamps: IInspiroButtonLamps;

  public constructor(maxAnisotropy: number) {
    super('SiemensInspiroCabInterior', { parkRad: 1.34, sweepRad: -1.08 });
    this.screens = createInspiroCabScreens(maxAnisotropy);
    this.lamps = createButtonLamps();
    const mats = this.createCabMaterials();
    const deskCctvBinding = addInspiroDesk(
      this.group, mats.deskTopMat, mats.darkPanelMat, mats.bezelMat,
      this.screens.leftLcdTexture, this.screens.rightLcdTexture, this.screens.mirrorMonitorTexture,
      this.lamps, this.disposables,
    );
    this.mirrorHardware = addInspiroWindshieldFrame(
      this.group, mats.darkPanelMat, mats.aluminumMat, mats.bezelMat, this.disposables, deskCctvBinding,
    );
    this.leverPivot = addInspiroMasterLever(this.group, mats.darkPanelMat, mats.aluminumMat, this.disposables);
    this.wiperPivot = addSingleCabWiper(this.group, {
      name: 'InspiroWindshieldWiperPivot',
      x: 0.28, y: -0.22, z: -1.0, parkRad: 1.34,
      armWidth: 0.018, armLength: 0.56, bladeWidth: 0.024, bladeLength: 0.44, armColor: 0x0c1017,
    }, this.disposables);
    this.addAmbientLight();
  }

  protected updateCabDetails(snapshot: ISimulationSnapshot, dtSec: number): void {
    this.screens.update(snapshot, dtSec);
    this.lamps.doorMat.emissiveIntensity = snapshot.doorState === 'open' ? 2.8 : 0.45;
    this.lamps.warnMat.emissiveIntensity = this.isWarningActive(snapshot) ? 3.4 : 0.2;
    this.lamps.headlightMat.emissiveIntensity = snapshot.headlightsOn ? 2.6 : 0.12;
    this.lamps.czuwakMat.emissiveIntensity = snapshot.czuwak.active ? 4.2 : 0.16;
  }

  private createCabMaterials(): {
    darkPanelMat: THREE.MeshStandardMaterial;
    deskTopMat: THREE.MeshStandardMaterial;
    aluminumMat: THREE.MeshStandardMaterial;
    bezelMat: THREE.MeshStandardMaterial;
  } {
    const darkPanelMat = new THREE.MeshStandardMaterial({ color: 0x1d232d, roughness: 0.56, metalness: 0.36 });
    const deskTopMat = new THREE.MeshStandardMaterial({ color: 0x121720, roughness: 0.74, metalness: 0.22 });
    const aluminumMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.26, metalness: 0.82 });
    const bezelMat = new THREE.MeshStandardMaterial({ color: 0x090d14, roughness: 0.32, metalness: 0.52 });
    this.registerDisposables(
      this.screens, darkPanelMat, deskTopMat, aluminumMat, bezelMat,
      this.lamps.doorMat, this.lamps.warnMat, this.lamps.headlightMat, this.lamps.czuwakMat,
    );
    return { darkPanelMat, deskTopMat, aluminumMat, bezelMat };
  }

  private addAmbientLight(): void {
    const screenGlow = new THREE.PointLight(0x38bdf8, 0.65, 1.45, 2.0);
    screenGlow.position.set(0, -0.2, -0.66);
    this.group.add(screenGlow);
  }
}

function createButtonLamps(): IInspiroButtonLamps {
  return {
    doorMat: createGlowMaterial(0x059669, 0x10b981, 0.45),
    warnMat: createGlowMaterial(0xb91c1c, 0xef4444, 0.2),
    headlightMat: createGlowMaterial(0x0284c7, 0x38bdf8, 2.6),
    czuwakMat: createGlowMaterial(0xd97706, 0xf59e0b, 0.16),
  };
}

export function buildInspiroCabInterior(maxAnisotropy: number): ICabInterior {
  return new InspiroCabInterior(maxAnisotropy);
}
