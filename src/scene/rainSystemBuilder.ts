import * as THREE from 'three';
import type { ISimulationSnapshot } from '../domain/types';
import { createRainParticlePass } from './weather/rainParticlePass';
import { createSnowParticlePass } from './weather/snowParticlePass';

export interface IRainSystemRig {
  setDensity(densityRatio: number): void;
  update(snapshot: ISimulationSnapshot, cameraPos: THREE.Vector3, dtSec: number): void;
  dispose(): void;
}

class RainSystemRig implements IRainSystemRig {
  private readonly rainPass: ReturnType<typeof createRainParticlePass>;
  private readonly snowPass: ReturnType<typeof createSnowParticlePass>;

  public constructor(private readonly scene: THREE.Scene) {
    this.rainPass = createRainParticlePass(scene);
    this.snowPass = createSnowParticlePass(scene);
  }

  public setDensity(densityRatio: number): void {
    const clamped = Math.max(0.15, Math.min(1, densityRatio));
    this.rainPass.setDensity(clamped);
    this.snowPass.setDensity(clamped);
  }

  public update(snapshot: ISimulationSnapshot, cameraPos: THREE.Vector3, dtSec: number): void {
    const safeDt = Math.max(0.004, Math.min(dtSec, 0.05));
    const rainIntensity = snapshot.weather.rainIntensity;
    const snowIntensity = snapshot.weather.snowIntensity ?? 0;
    if (rainIntensity > 0.02) {
      this.snowPass.hide();
      this.rainPass.update(rainIntensity, snapshot.kinematics.speedMs, cameraPos, safeDt);
      return;
    }
    this.rainPass.hide();
    if (snowIntensity > 0.02) this.snowPass.update(snowIntensity, snapshot.kinematics.speedMs, cameraPos, safeDt);
    else this.snowPass.hide();
  }

  public dispose(): void {
    this.rainPass.dispose(this.scene);
    this.snowPass.dispose(this.scene);
  }
}

export function buildRainSystem(scene: THREE.Scene): IRainSystemRig {
  return new RainSystemRig(scene);
}
