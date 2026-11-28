import * as THREE from 'three';
import type { TrackAlignment } from '../domain/trackAlignment';
import type { GraphicsQualityId, ISimulationSnapshot } from '../domain/types';
import { createHeadlightConeEffect } from './effects/headlightConeEffect';
import { createThirdRailSparkEffect } from './effects/thirdRailSparkEffect';

export interface ITunnelEffectsRig {
  setQuality(quality: GraphicsQualityId): void;
  update(snapshot: ISimulationSnapshot, alignment: TrackAlignment, dtSec: number): void;
  dispose(): void;
}

export function buildTunnelEffectsRig(scene: THREE.Scene): ITunnelEffectsRig {
  const cones = createHeadlightConeEffect(scene);
  const sparks = createThirdRailSparkEffect(scene);
  let quality: GraphicsQualityId = 'high';

  return {
    setQuality: (nextQuality) => {
      quality = nextQuality;
      sparks.setQuality(nextQuality);
    },
    update: (snapshot, alignment, dtSec) => {
      cones.update(snapshot, alignment, quality);
      sparks.update(snapshot, alignment, dtSec);
    },
    dispose: () => {
      cones.dispose(scene);
      sparks.dispose(scene);
    },
  };
}
