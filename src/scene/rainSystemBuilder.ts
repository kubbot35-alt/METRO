import * as THREE from 'three';
import type { ISimulationSnapshot } from '../domain/types';

export interface IRainSystemRig {
  setDensity(densityRatio: number): void;
  update(snapshot: ISimulationSnapshot, cameraPos: THREE.Vector3, dtSec: number): void;
  dispose(): void;
}

const MAX_RAIN_DROPS = 1100;
const BOX_HALF_X = 16;
const BOX_HEIGHT_Y = 14;
const BOX_HALF_Z = 22;

export function buildRainSystem(scene: THREE.Scene): IRainSystemRig {
  const positions = new Float32Array(MAX_RAIN_DROPS * 6);
  const offsets = new Float32Array(MAX_RAIN_DROPS * 3);
  const speeds = new Float32Array(MAX_RAIN_DROPS);

  for (let i = 0; i < MAX_RAIN_DROPS; i += 1) {
    offsets[i * 3] = (Math.random() * 2 - 1) * BOX_HALF_X;
    offsets[i * 3 + 1] = Math.random() * BOX_HEIGHT_Y - 2;
    offsets[i * 3 + 2] = (Math.random() * 2 - 1) * BOX_HALF_Z;
    speeds[i] = 17 + Math.random() * 7;
  }

  const geometry = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', posAttr);
  geometry.setDrawRange(0, MAX_RAIN_DROPS * 2);

  const material = new THREE.LineBasicMaterial({
    color: 0xcbd8e8,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });

  const lines = new THREE.LineSegments(geometry, material);
  lines.name = 'SurfaceRainStreaks';
  lines.frustumCulled = false;
  lines.visible = false;
  scene.add(lines);

  let activeCount = MAX_RAIN_DROPS;

  return {
    setDensity: (densityRatio: number): void => {
      const clamped = Math.max(0.15, Math.min(1, densityRatio));
      activeCount = Math.max(120, Math.round(MAX_RAIN_DROPS * clamped));
      geometry.setDrawRange(0, activeCount * 2);
    },
    update: (snapshot: ISimulationSnapshot, cameraPos: THREE.Vector3, dtSec: number): void => {
      const intensity = snapshot.weather.rainIntensity;
      if (intensity <= 0.02) {
        lines.visible = false;
        return;
      }
      lines.visible = true;
      material.opacity = Math.min(0.54, 0.16 + intensity * 0.36);

      const safeDt = Math.max(0.004, Math.min(dtSec, 0.05));
      const trainSpeedMs = snapshot.kinematics.speedMs;
      const streakLen = 0.68 + Math.min(0.55, trainSpeedMs * 0.025);
      const windX = -1.6;
      const windZ = Math.min(10, trainSpeedMs * 0.42);

      for (let i = 0; i < activeCount; i += 1) {
        const oi = i * 3;
        let ox = offsets[oi] + windX * safeDt;
        let oy = offsets[oi + 1] - speeds[i] * safeDt;
        let oz = offsets[oi + 2] + windZ * safeDt;

        if (oy < -2.4) {
          oy += BOX_HEIGHT_Y;
        }
        if (ox < -BOX_HALF_X) {
          ox += BOX_HALF_X * 2;
        } else if (ox > BOX_HALF_X) {
          ox -= BOX_HALF_X * 2;
        }
        if (oz < -BOX_HALF_Z) {
          oz += BOX_HALF_Z * 2;
        } else if (oz > BOX_HALF_Z) {
          oz -= BOX_HALF_Z * 2;
        }

        offsets[oi] = ox;
        offsets[oi + 1] = oy;
        offsets[oi + 2] = oz;

        const wx = cameraPos.x + ox;
        const wy = cameraPos.y + oy;
        const wz = cameraPos.z + oz;

        const pi = i * 6;
        positions[pi] = wx;
        positions[pi + 1] = wy;
        positions[pi + 2] = wz;
        positions[pi + 3] = wx - windX * 0.045;
        positions[pi + 4] = wy + streakLen;
        positions[pi + 5] = wz - windZ * 0.045;
      }
      posAttr.needsUpdate = true;
    },
    dispose: (): void => {
      scene.remove(lines);
      geometry.dispose();
      material.dispose();
    },
  };
}
