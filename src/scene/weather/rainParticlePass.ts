import * as THREE from 'three';

export interface IWeatherParticlePass {
  setDensity(ratio: number): void;
  update(intensity: number, speedMs: number, cameraPos: THREE.Vector3, safeDt: number): void;
  hide(): void;
  dispose(scene: THREE.Scene): void;
}

export const WEATHER_BOX_HALF_X = 16;
export const WEATHER_BOX_HEIGHT_Y = 14;
export const WEATHER_BOX_HALF_Z = 22;

export function wrapParticleOffset(value: number, min: number, span: number): number {
  if (value < min) return value + span;
  if (value > min + span) return value - span;
  return value;
}

export function createRainParticlePass(scene: THREE.Scene): IWeatherParticlePass {
  const maxDrops = 1100;
  const positions = new Float32Array(maxDrops * 6);
  const offsets = new Float32Array(maxDrops * 3);
  const speeds = new Float32Array(maxDrops);
  seedOffsets(offsets, speeds, maxDrops, 17, 7);
  const geometry = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', posAttr);
  geometry.setDrawRange(0, maxDrops * 2);
  const material = new THREE.LineBasicMaterial({ color: 0xcbd8e8, transparent: true, opacity: 0.42, depthWrite: false });
  const lines = new THREE.LineSegments(geometry, material);
  lines.name = 'SurfaceRainStreaks';
  lines.frustumCulled = false;
  lines.visible = false;
  scene.add(lines);
  let activeCount = maxDrops;
  return {
    setDensity: (ratio: number) => { activeCount = Math.max(120, Math.round(maxDrops * ratio)); geometry.setDrawRange(0, activeCount * 2); },
    hide: () => { lines.visible = false; },
    update: (intensity, speedMs, cameraPos, dt) => updateRainBuffer(lines, material, posAttr, positions, offsets, speeds, activeCount, intensity, speedMs, cameraPos, dt),
    dispose: (targetScene) => { targetScene.remove(lines); geometry.dispose(); material.dispose(); },
  };
}

function seedOffsets(offsets: Float32Array, speeds: Float32Array, count: number, minSpeed: number, span: number): void {
  for (let i = 0; i < count; i += 1) {
    offsets[i * 3] = (Math.random() * 2 - 1) * WEATHER_BOX_HALF_X;
    offsets[i * 3 + 1] = Math.random() * WEATHER_BOX_HEIGHT_Y - 2;
    offsets[i * 3 + 2] = (Math.random() * 2 - 1) * WEATHER_BOX_HALF_Z;
    speeds[i] = minSpeed + Math.random() * span;
  }
}

function updateRainBuffer(
  lines: THREE.LineSegments, material: THREE.LineBasicMaterial, posAttr: THREE.BufferAttribute,
  positions: Float32Array, offsets: Float32Array, speeds: Float32Array, activeCount: number,
  intensity: number, speedMs: number, cameraPos: THREE.Vector3, safeDt: number,
): void {
  lines.visible = true;
  material.opacity = Math.min(0.54, 0.16 + intensity * 0.36);
  const streakLen = 0.68 + Math.min(0.55, speedMs * 0.025);
  const windX = -1.6;
  const windZ = Math.min(10, speedMs * 0.42);
  for (let i = 0; i < activeCount; i += 1) {
    stepRainStreak(i, positions, offsets, speeds[i], streakLen, windX, windZ, cameraPos, safeDt);
  }
  posAttr.needsUpdate = true;
}

function stepRainStreak(
  i: number, positions: Float32Array, offsets: Float32Array, speed: number,
  streakLen: number, windX: number, windZ: number, cameraPos: THREE.Vector3, safeDt: number,
): void {
  const oi = i * 3;
  const ox = wrapParticleOffset(offsets[oi] + windX * safeDt, -WEATHER_BOX_HALF_X, WEATHER_BOX_HALF_X * 2);
  const oy = wrapParticleOffset(offsets[oi + 1] - speed * safeDt, -2.4, WEATHER_BOX_HEIGHT_Y);
  const oz = wrapParticleOffset(offsets[oi + 2] + windZ * safeDt, -WEATHER_BOX_HALF_Z, WEATHER_BOX_HALF_Z * 2);
  offsets[oi] = ox; offsets[oi + 1] = oy; offsets[oi + 2] = oz;
  const pi = i * 6;
  positions[pi] = cameraPos.x + ox;
  positions[pi + 1] = cameraPos.y + oy;
  positions[pi + 2] = cameraPos.z + oz;
  positions[pi + 3] = positions[pi] - windX * 0.045;
  positions[pi + 4] = positions[pi + 1] + streakLen;
  positions[pi + 5] = positions[pi + 2] - windZ * 0.045;
}
