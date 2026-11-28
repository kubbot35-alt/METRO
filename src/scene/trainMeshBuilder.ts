import * as THREE from 'three';
import type { DoorSide, ITrainVisualProfile, MetroLineId, TrainVisualTheme } from '../domain/types';
import { buildInspiroConsist } from './inspiroTrainBuilder';
import { buildSeria81Consist } from './seria81TrainBuilder';
import type { ITrainConsist } from './shared/baseTrainConsist';
import { buildVarsoviaConsist } from './varsoviaTrainBuilder';

export interface ITrainConsistRig {
  readonly group: THREE.Group;
  setTheme(visual: ITrainVisualProfile): void;
  setDoorsOpen(openSide: DoorSide | null, dtSec: number): void;
  setHeadlights(on: boolean): void;
  setLine?(lineId: MetroLineId, destinationLed: string): void;
  updateMotion?(speedMs: number, dtSec: number): void;
  dispose(): void;
}

class MetroConsistRig implements ITrainConsistRig {
  public readonly group = new THREE.Group();
  private readonly scene: THREE.Scene;
  private readonly consists: ReadonlyMap<TrainVisualTheme, ITrainConsist>;
  private activeTheme: TrainVisualTheme;

  public constructor(
    scene: THREE.Scene,
    visual: ITrainVisualProfile,
    maxAnisotropy: number,
    isOncoming: boolean,
  ) {
    this.scene = scene;
    this.group.name = 'MetroTrainConsist';
    this.consists = new Map<TrainVisualTheme, ITrainConsist>([
      ['retro', buildSeria81Consist(maxAnisotropy)],
      ['modern', buildInspiroConsist(maxAnisotropy)],
      ['varsovia', buildVarsoviaConsist(maxAnisotropy, !isOncoming)],
    ]);
    this.activeTheme = visual.theme;
    this.consists.forEach((consist) => this.group.add(consist.group));
    this.setTheme(visual);
    this.scene.add(this.group);
  }

  public setTheme(visual: ITrainVisualProfile): void {
    this.activeTheme = visual.theme;
    this.consists.forEach((consist, theme) => {
      consist.group.visible = theme === visual.theme;
    });
    this.consists.get(visual.theme)?.setVisualProfile(visual);
  }

  public setDoorsOpen(openSide: DoorSide | null, dtSec: number): void {
    this.consists.forEach((consist) => consist.setDoorsOpen(openSide, dtSec));
  }

  public setHeadlights(on: boolean): void {
    this.consists.forEach((consist) => consist.setHeadlights(on));
  }

  public setLine(lineId: MetroLineId, destinationLed: string): void {
    this.consists.forEach((consist) => consist.setLine(lineId, destinationLed));
  }

  public updateMotion(speedMs: number, dtSec: number): void {
    this.consists.get(this.activeTheme)?.updateMotion(speedMs, dtSec);
  }

  public dispose(): void {
    this.scene.remove(this.group);
    this.consists.forEach((consist) => consist.dispose());
  }
}

export function buildMetroConsist(
  scene: THREE.Scene,
  visual: ITrainVisualProfile,
  maxAnisotropy = 4,
  isOncoming = false,
): ITrainConsistRig {
  return new MetroConsistRig(scene, visual, maxAnisotropy, isOncoming);
}
