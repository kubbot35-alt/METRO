import * as THREE from 'three';
import type { ISimulationSnapshot, TrainVisualTheme } from '../domain/types';
import { buildInspiroCabInterior } from './inspiroCabBuilder';
import { buildSeria81CabInterior } from './seria81CabBuilder';
import { buildVarsoviaCabInterior } from './varsoviaCabBuilder';
import { buildWindshieldRainOverlay } from './windshieldRainOverlay';

export interface ICabRig {
  readonly group: THREE.Group;
  readonly wiperPivot: THREE.Group;
  readonly leverPivot: THREE.Group;
  readonly doorLightMat: THREE.MeshStandardMaterial;
  readonly warningLightMat: THREE.MeshStandardMaterial;
  readonly headlightLampMat: THREE.MeshStandardMaterial;
  readonly czuwakLampMat: THREE.MeshStandardMaterial;
  setTheme(theme: TrainVisualTheme): void;
  setLeverAngle?(angleRad: number): void;
  update?(snapshot: ISimulationSnapshot, dtSec: number): void;
  dispose(): void;
}

function createUnusedLampPlaceholder(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: 0x111111 });
}

export function buildMetroCabRig(maxAnisotropy = 4): ICabRig {
  const group = new THREE.Group();
  group.name = 'MetroCabRig';

  const seria81Cab = buildSeria81CabInterior(maxAnisotropy);
  const inspiroCab = buildInspiroCabInterior(maxAnisotropy);
  const varsoviaCab = buildVarsoviaCabInterior(maxAnisotropy);
  const windshieldRain = buildWindshieldRainOverlay();
  seria81Cab.group.visible = false;
  inspiroCab.group.visible = true;
  varsoviaCab.group.visible = false;
  group.add(seria81Cab.group, inspiroCab.group, varsoviaCab.group, windshieldRain.mesh);

  const doorLightMat = createUnusedLampPlaceholder();
  const warningLightMat = createUnusedLampPlaceholder();
  const headlightLampMat = createUnusedLampPlaceholder();
  const czuwakLampMat = createUnusedLampPlaceholder();

  return {
    group,
    wiperPivot: seria81Cab.wiperPivot,
    leverPivot: seria81Cab.leverPivot,
    doorLightMat,
    warningLightMat,
    headlightLampMat,
    czuwakLampMat,
    setTheme: (theme: TrainVisualTheme): void => {
      seria81Cab.group.visible = theme === 'retro';
      inspiroCab.group.visible = theme === 'modern';
      varsoviaCab.group.visible = theme === 'varsovia';
    },
    setLeverAngle: (angleRad: number): void => {
      seria81Cab.leverPivot.rotation.x = angleRad;
      inspiroCab.leverPivot.rotation.x = angleRad;
      varsoviaCab.leverPivot.rotation.x = angleRad;
    },
    update: (snapshot: ISimulationSnapshot, dtSec: number): void => {
      if (varsoviaCab.group.visible) {
        varsoviaCab.update(snapshot, dtSec);
      } else if (inspiroCab.group.visible) {
        inspiroCab.update(snapshot, dtSec);
      } else {
        seria81Cab.update(snapshot, dtSec);
      }
      windshieldRain.update(snapshot, dtSec);
    },
    dispose: (): void => {
      seria81Cab.dispose();
      inspiroCab.dispose();
      varsoviaCab.dispose();
      windshieldRain.dispose();
      doorLightMat.dispose();
      warningLightMat.dispose();
      headlightLampMat.dispose();
      czuwakLampMat.dispose();
    },
  };
}
