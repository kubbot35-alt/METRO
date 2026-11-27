import * as THREE from 'three';
import type { ISimulationSnapshot } from '../domain/types';

export interface IRainSystemRig {
  setDensity(densityRatio: number): void;
  update(snapshot: ISimulationSnapshot, cameraPos: THREE.Vector3, dtSec: number): void;
  dispose(): void;
}

const MAX_RAIN_DROPS = 1100;
const MAX_SNOW_FLAKES = 950;
const BOX_HALF_X = 16;
const BOX_HEIGHT_Y = 14;
const BOX_HALF_Z = 22;

function createSnowflakeSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.55, 'rgba(241, 245, 249, 0.85)');
  grad.addColorStop(1, 'rgba(241, 245, 249, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

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

  // 3D Snow particle system (slowly falling and drifting snowflakes on STP Kabaty surface)
  const snowPositions = new Float32Array(MAX_SNOW_FLAKES * 3);
  const snowOffsets = new Float32Array(MAX_SNOW_FLAKES * 3);
  const snowSpeeds = new Float32Array(MAX_SNOW_FLAKES);
  const snowPhases = new Float32Array(MAX_SNOW_FLAKES);

  for (let i = 0; i < MAX_SNOW_FLAKES; i += 1) {
    snowOffsets[i * 3] = (Math.random() * 2 - 1) * BOX_HALF_X;
    snowOffsets[i * 3 + 1] = Math.random() * BOX_HEIGHT_Y - 2;
    snowOffsets[i * 3 + 2] = (Math.random() * 2 - 1) * BOX_HALF_Z;
    snowSpeeds[i] = 1.8 + Math.random() * 1.9;
    snowPhases[i] = Math.random() * Math.PI * 2;
  }

  const snowGeometry = new THREE.BufferGeometry();
  const snowPosAttr = new THREE.BufferAttribute(snowPositions, 3);
  snowPosAttr.setUsage(THREE.DynamicDrawUsage);
  snowGeometry.setAttribute('position', snowPosAttr);
  snowGeometry.setDrawRange(0, MAX_SNOW_FLAKES);

  const snowTex = createSnowflakeSpriteTexture();
  const snowMaterial = new THREE.PointsMaterial({
    color: 0xf8fafc,
    map: snowTex,
    size: 0.22,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });

  const snowPoints = new THREE.Points(snowGeometry, snowMaterial);
  snowPoints.name = 'SurfaceSnowFlakes';
  snowPoints.frustumCulled = false;
  snowPoints.visible = false;
  scene.add(snowPoints);

  let activeCount = MAX_RAIN_DROPS;
  let activeSnowCount = MAX_SNOW_FLAKES;
  let swirlTimeSec = 0;

  return {
    setDensity: (densityRatio: number): void => {
      const clamped = Math.max(0.15, Math.min(1, densityRatio));
      activeCount = Math.max(120, Math.round(MAX_RAIN_DROPS * clamped));
      activeSnowCount = Math.max(120, Math.round(MAX_SNOW_FLAKES * clamped));
      geometry.setDrawRange(0, activeCount * 2);
      snowGeometry.setDrawRange(0, activeSnowCount);
    },
    update: (snapshot: ISimulationSnapshot, cameraPos: THREE.Vector3, dtSec: number): void => {
      const safeDt = Math.max(0.004, Math.min(dtSec, 0.05));
      const rainIntensity = snapshot.weather.rainIntensity;
      const snowIntensity = snapshot.weather.snowIntensity ?? 0;

      if (rainIntensity > 0.02) {
        lines.visible = true;
        snowPoints.visible = false;
        material.opacity = Math.min(0.54, 0.16 + rainIntensity * 0.36);

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
        return;
      }

      lines.visible = false;
      if (snowIntensity <= 0.02) {
        snowPoints.visible = false;
        return;
      }

      snowPoints.visible = true;
      snowMaterial.opacity = Math.min(0.92, 0.35 + snowIntensity * 0.56);
      swirlTimeSec += safeDt;
      const trainSpeedMs = snapshot.kinematics.speedMs;
      const windZ = Math.min(8, trainSpeedMs * 0.34);

      for (let i = 0; i < activeSnowCount; i += 1) {
        const oi = i * 3;
        const swayX = Math.sin(swirlTimeSec * 1.4 + snowPhases[i]) * 0.85;
        const swayZ = Math.cos(swirlTimeSec * 1.1 + snowPhases[i]) * 0.55;
        let ox = snowOffsets[oi] + swayX * safeDt;
        let oy = snowOffsets[oi + 1] - snowSpeeds[i] * safeDt;
        let oz = snowOffsets[oi + 2] + (windZ + swayZ) * safeDt;

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

        snowOffsets[oi] = ox;
        snowOffsets[oi + 1] = oy;
        snowOffsets[oi + 2] = oz;

        snowPositions[oi] = cameraPos.x + ox;
        snowPositions[oi + 1] = cameraPos.y + oy;
        snowPositions[oi + 2] = cameraPos.z + oz;
      }
      snowPosAttr.needsUpdate = true;
    },
    dispose: (): void => {
      scene.remove(lines);
      scene.remove(snowPoints);
      geometry.dispose();
      material.dispose();
      snowGeometry.dispose();
      snowMaterial.dispose();
      snowTex.dispose();
    },
  };
}
