import * as THREE from 'three';
import type { ITrainVisualProfile, MetroLineId } from '../domain/types';
import {
  addSeria81Car,
  type IExteriorMirrorParts,
  type ISeria81CarBuildContext,
} from './seria81CarAssembly';
import {
  SERIA81_CAR_GAP,
  SERIA81_CAR_LENGTH,
  createSeria81Geometries,
  createSeria81Materials,
  type ISeria81Geometries,
  type ISeria81Materials,
} from './seria81ExteriorParts';
import { createSeria81DestBoard } from './seria81Textures';
import { BaseTrainConsist, type ITrainConsist } from './shared/baseTrainConsist';
import type { ILedDestinationDisplay } from './shared/ledMatrixPainter';

const CAR_COUNT = 4;

export class Seria81TrainConsist extends BaseTrainConsist {
  private readonly destBoard: ILedDestinationDisplay;
  private readonly mats: ISeria81Materials;
  private readonly geos: ISeria81Geometries;

  public constructor(maxAnisotropy: number) {
    super('Seria81WarsawConsist', { dampRate: 6.2, slideTravelM: 0.52, leafBaseOffsetZ: 0.3 }, 0.41);
    this.destBoard = createSeria81DestBoard(maxAnisotropy);
    this.mats = createSeria81Materials(this.destBoard.texture);
    this.geos = createSeria81Geometries();
    this.registerDisposables(this.destBoard, ...Object.values(this.mats), ...Object.values(this.geos));
    this.assembleCars();
  }

  public setVisualProfile(visual: ITrainVisualProfile): void {
    this.mats.upperBody.color.setHex(visual.bodyHex);
    this.mats.roofNavy.color.setHex(visual.roofHex);
    this.mats.warsawRed.color.setHex(visual.stripeHex);
    this.mats.warsawYellow.color.setHex(visual.noseHex);
  }

  public setHeadlights(on: boolean): void {
    this.mats.warmHeadlamp.emissiveIntensity = on ? 4.4 : 0.14;
  }

  public setLine(lineId: MetroLineId, destinationLed: string): void {
    this.destBoard.setLine(lineId, destinationLed);
  }

  private createMirrorParts(): IExteriorMirrorParts {
    const mirrorArmGeo = new THREE.BoxGeometry(0.24, 0.022, 0.022);
    const mirrorHousingGeo = new THREE.BoxGeometry(0.06, 0.28, 0.16);
    const mirrorGlassGeo = new THREE.PlaneGeometry(0.14, 0.24);
    const mirrorGlassMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.12,
      metalness: 0.92,
    });
    this.registerDisposables(mirrorArmGeo, mirrorHousingGeo, mirrorGlassGeo, mirrorGlassMat);
    return { mirrorArmGeo, mirrorHousingGeo, mirrorGlassGeo, mirrorGlassMat };
  }

  private assembleCars(): void {
    const ctx: ISeria81CarBuildContext = {
      mats: this.mats,
      geos: this.geos,
      doorPairs: this.doorPairs,
      axles: this.axles,
      mirrorParts: this.createMirrorParts(),
    };
    for (let i = 0; i < CAR_COUNT; i += 1) {
      const carZ = i * (SERIA81_CAR_LENGTH + SERIA81_CAR_GAP) + SERIA81_CAR_LENGTH * 0.5;
      addSeria81Car(this.group, carZ, i === 0, i === CAR_COUNT - 1, ctx);
      if (i < CAR_COUNT - 1) {
        const gangway = new THREE.Mesh(this.geos.gangway, this.mats.rubberBlack);
        gangway.position.set(0, 1.98, carZ + SERIA81_CAR_LENGTH * 0.5 + SERIA81_CAR_GAP * 0.5);
        this.group.add(gangway);
      }
    }
  }
}

export function buildSeria81Consist(maxAnisotropy: number): ITrainConsist {
  return new Seria81TrainConsist(maxAnisotropy);
}
