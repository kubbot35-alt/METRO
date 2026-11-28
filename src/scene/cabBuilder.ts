import * as THREE from 'three';
import type { ISimulationSnapshot, TrainVisualTheme } from '../domain/types';
import { buildInspiroCabInterior } from './inspiroCabBuilder';
import { buildSeria81CabInterior } from './seria81CabBuilder';
import type { ICabInterior } from './shared/baseCabInterior';
import { buildVarsoviaCabInterior } from './varsoviaCabBuilder';
import { buildWindshieldRainOverlay, type IWindshieldRainOverlay } from './windshieldRainOverlay';

export interface ICabRig {
  readonly group: THREE.Group;
  setTheme(theme: TrainVisualTheme): void;
  setLeverAngle(angleRad: number): void;
  setMirrorTextures(leftTex: THREE.Texture, rightTex: THREE.Texture): void;
  getActiveInteractiveMonitorMeshes(): readonly THREE.Mesh[];
  update(snapshot: ISimulationSnapshot, dtSec: number): void;
  dispose(): void;
}

class MetroCabRig implements ICabRig {
  public readonly group = new THREE.Group();
  private readonly cabs: ReadonlyMap<TrainVisualTheme, ICabInterior>;
  private readonly windshieldRain: IWindshieldRainOverlay;
  private activeTheme: TrainVisualTheme = 'modern';

  public constructor(maxAnisotropy: number) {
    this.group.name = 'MetroCabRig';
    this.cabs = new Map<TrainVisualTheme, ICabInterior>([
      ['retro', buildSeria81CabInterior(maxAnisotropy)],
      ['modern', buildInspiroCabInterior(maxAnisotropy)],
      ['varsovia', buildVarsoviaCabInterior(maxAnisotropy)],
    ]);
    this.windshieldRain = buildWindshieldRainOverlay();
    this.cabs.forEach((cab) => this.group.add(cab.group));
    this.group.add(this.windshieldRain.mesh);
    this.setTheme('modern');
  }

  public setTheme(theme: TrainVisualTheme): void {
    this.activeTheme = theme;
    this.cabs.forEach((cab, cabTheme) => {
      cab.group.visible = cabTheme === theme;
    });
  }

  public setLeverAngle(angleRad: number): void {
    this.cabs.forEach((cab) => {
      cab.leverPivot.rotation.x = angleRad;
    });
  }

  public setMirrorTextures(leftTex: THREE.Texture, rightTex: THREE.Texture): void {
    this.cabs.forEach((cab) => {
      cab.mirrorHardware.setMirrorTextures(leftTex, rightTex);
    });
  }

  public getActiveInteractiveMonitorMeshes(): readonly THREE.Mesh[] {
    return this.cabs.get(this.activeTheme)?.mirrorHardware.interactiveMeshes ?? [];
  }

  public update(snapshot: ISimulationSnapshot, dtSec: number): void {
    this.cabs.get(this.activeTheme)?.update(snapshot, dtSec);
    this.windshieldRain.update(snapshot, dtSec);
  }

  public dispose(): void {
    this.cabs.forEach((cab) => cab.dispose());
    this.windshieldRain.dispose();
  }
}

export function buildMetroCabRig(maxAnisotropy = 4): ICabRig {
  return new MetroCabRig(maxAnisotropy);
}
