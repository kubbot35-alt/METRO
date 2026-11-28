import * as THREE from 'three';
import type { ITrainVisualProfile, MetroLineId } from '../domain/types';
import { addArticulatedBellows, addInspiroCar, type IInspiroCarBuildContext } from './inspiroCarAssembly';
import {
  INSPIRO_CAR_GAP,
  INSPIRO_CAR_LENGTH,
  createInspiroGeometries,
  createInspiroMaterials,
  type IInspiroGeometries,
  type IInspiroMaterials,
} from './inspiroExteriorParts';
import { createInspiroLedDisplay } from './inspiroTextures';
import { BaseTrainConsist, type ITrainConsist } from './shared/baseTrainConsist';
import type { ILedDestinationDisplay } from './shared/ledMatrixPainter';

const CAR_COUNT = 4;

export class InspiroTrainConsist extends BaseTrainConsist {
  private readonly ledDisplay: ILedDestinationDisplay;
  private readonly mats: IInspiroMaterials;
  private readonly geos: IInspiroGeometries;

  public constructor(maxAnisotropy: number) {
    super('SiemensInspiroConsist', { dampRate: 7, slideTravelM: 0.56, leafBaseOffsetZ: 0.32 }, 0.41);
    this.ledDisplay = createInspiroLedDisplay(maxAnisotropy);
    this.mats = createInspiroMaterials(this.ledDisplay.texture);
    this.geos = createInspiroGeometries();
    this.registerDisposables(this.ledDisplay, ...Object.values(this.mats), ...Object.values(this.geos));
    this.assembleCars();
  }

  public setVisualProfile(visual: ITrainVisualProfile): void {
    this.mats.silverBody.color.setHex(visual.bodyHex);
    this.mats.roofSilver.color.setHex(visual.roofHex);
    this.mats.warsawRed.color.setHex(visual.stripeHex);
    this.mats.warsawYellow.color.setHex(visual.noseHex);
  }

  public setHeadlights(on: boolean): void {
    this.mats.headlightMat.emissiveIntensity = on ? 4.5 : 0.15;
  }

  public setLine(lineId: MetroLineId, destinationLed: string): void {
    this.ledDisplay.setLine(lineId, destinationLed);
  }

  private assembleCars(): void {
    const camPodGeo = new THREE.BoxGeometry(0.11, 0.075, 0.22);
    const camLensGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.02, 10);
    camLensGeo.rotateX(Math.PI / 2);
    this.registerDisposables(camPodGeo, camLensGeo);

    const ctx: IInspiroCarBuildContext = {
      mats: this.mats,
      geos: this.geos,
      doorPairs: this.doorPairs,
      axles: this.axles,
      camPodGeo,
      camLensGeo,
    };
    for (let i = 0; i < CAR_COUNT; i += 1) {
      const carZ = i * (INSPIRO_CAR_LENGTH + INSPIRO_CAR_GAP) + INSPIRO_CAR_LENGTH * 0.5;
      addInspiroCar(this.group, carZ, i === 0, i === CAR_COUNT - 1, ctx);
      if (i < CAR_COUNT - 1) {
        addArticulatedBellows(this.group, carZ + INSPIRO_CAR_LENGTH * 0.5 + INSPIRO_CAR_GAP * 0.5, this.mats, this.geos);
      }
    }
  }
}

export function buildInspiroConsist(maxAnisotropy: number): ITrainConsist {
  return new InspiroTrainConsist(maxAnisotropy);
}
