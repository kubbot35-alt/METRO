import * as THREE from 'three';
import type { DoorSide, ITrainVisualProfile, MetroLineId } from '../domain/types';
import { buildInspiroConsist } from './inspiroTrainBuilder';
import { buildSeria81Consist } from './seria81TrainBuilder';
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

export function buildMetroConsist(
  scene: THREE.Scene,
  visual: ITrainVisualProfile,
  maxAnisotropy = 4,
): ITrainConsistRig {
  const group = new THREE.Group();
  group.name = 'MetroTrainConsist';

  const seria81 = buildSeria81Consist(maxAnisotropy);
  const inspiro = buildInspiroConsist(maxAnisotropy);
  const varsovia = buildVarsoviaConsist(maxAnisotropy);

  const applyThemeVisibility = (theme: ITrainVisualProfile['theme']): void => {
    seria81.group.visible = theme === 'retro';
    inspiro.group.visible = theme === 'modern';
    varsovia.group.visible = theme === 'varsovia';
  };

  applyThemeVisibility(visual.theme);
  group.add(seria81.group, inspiro.group, varsovia.group);
  scene.add(group);

  return {
    group,
    setTheme: (next: ITrainVisualProfile): void => {
      applyThemeVisibility(next.theme);
    },
    setDoorsOpen: (openSide: DoorSide | null, dtSec: number): void => {
      inspiro.setDoorsOpen(openSide, dtSec);
      seria81.setDoorsOpen(openSide, dtSec);
      varsovia.setDoorsOpen(openSide, dtSec);
    },
    setHeadlights: (on: boolean): void => {
      inspiro.setHeadlights(on);
      seria81.setHeadlights(on);
      varsovia.setHeadlights(on);
    },
    setLine: (lineId: MetroLineId, destinationLed: string): void => {
      inspiro.setLine(lineId, destinationLed);
      seria81.setLine(lineId, destinationLed);
      varsovia.setLine(lineId, destinationLed);
    },
    updateMotion: (speedMs: number, dtSec: number): void => {
      if (varsovia.group.visible) {
        varsovia.updateWheelSpin(speedMs, dtSec);
      } else if (inspiro.group.visible) {
        inspiro.updateWheelSpin(speedMs, dtSec);
      } else {
        seria81.updateWheelSpin(speedMs, dtSec);
      }
    },
    dispose: (): void => {
      scene.remove(group);
      inspiro.dispose();
      seria81.dispose();
      varsovia.dispose();
    },
  };
}
