import * as THREE from 'three';
import {
  WEATHER_BOX_HALF_X,
  WEATHER_BOX_HALF_Z,
  WEATHER_BOX_HEIGHT_Y,
  wrapParticleOffset,
  type IWeatherParticlePass,
} from './rainParticlePass';

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

class SnowParticlePass implements IWeatherParticlePass {
  private readonly maxFlakes = 950;
  private readonly positions = new Float32Array(this.maxFlakes * 3);
  private readonly offsets = new Float32Array(this.maxFlakes * 3);
  private readonly speeds = new Float32Array(this.maxFlakes);
  private readonly phases = new Float32Array(this.maxFlakes);
  private readonly geometry = new THREE.BufferGeometry();
  private readonly posAttr = new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage);
  private readonly snowTex = createSnowflakeSpriteTexture();
  private readonly material = new THREE.PointsMaterial({ color: 0xf8fafc, map: this.snowTex, size: 0.22, sizeAttenuation: true, transparent: true, opacity: 0.88, depthWrite: false });
  private readonly points = new THREE.Points(this.geometry, this.material);
  private activeCount = this.maxFlakes;
  private swirlTimeSec = 0;

  public constructor(scene: THREE.Scene) {
    seedSnow(this.offsets, this.speeds, this.phases, this.maxFlakes);
    this.geometry.setAttribute('position', this.posAttr);
    this.geometry.setDrawRange(0, this.maxFlakes);
    this.points.name = 'SurfaceSnowFlakes';
    this.points.frustumCulled = false;
    this.points.visible = false;
    scene.add(this.points);
  }

  public setDensity(ratio: number): void {
    this.activeCount = Math.max(120, Math.round(this.maxFlakes * ratio));
    this.geometry.setDrawRange(0, this.activeCount);
  }

  public hide(): void { this.points.visible = false; }

  public update(intensity: number, speedMs: number, cameraPos: THREE.Vector3, dt: number): void {
    this.swirlTimeSec += dt;
    this.points.visible = true;
    this.material.opacity = Math.min(0.92, 0.35 + intensity * 0.56);
    const windZ = Math.min(8, speedMs * 0.34);
    for (let i = 0; i < this.activeCount; i += 1) {
      stepSnowFlake(i, this.positions, this.offsets, this.speeds[i], this.phases[i], windZ, this.swirlTimeSec, cameraPos, dt);
    }
    this.posAttr.needsUpdate = true;
  }

  public dispose(targetScene: THREE.Scene): void {
    targetScene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
    this.snowTex.dispose();
  }
}

export function createSnowParticlePass(scene: THREE.Scene): IWeatherParticlePass {
  return new SnowParticlePass(scene);
}

function seedSnow(offsets: Float32Array, speeds: Float32Array, phases: Float32Array, count: number): void {
  for (let i = 0; i < count; i += 1) {
    offsets[i * 3] = (Math.random() * 2 - 1) * WEATHER_BOX_HALF_X;
    offsets[i * 3 + 1] = Math.random() * WEATHER_BOX_HEIGHT_Y - 2;
    offsets[i * 3 + 2] = (Math.random() * 2 - 1) * WEATHER_BOX_HALF_Z;
    speeds[i] = 1.8 + Math.random() * 1.9;
    phases[i] = Math.random() * Math.PI * 2;
  }
}

function stepSnowFlake(
  i: number, positions: Float32Array, offsets: Float32Array, speed: number,
  phase: number, windZ: number, swirlTimeSec: number, cameraPos: THREE.Vector3, safeDt: number,
): void {
  const oi = i * 3;
  const swayX = Math.sin(swirlTimeSec * 1.4 + phase) * 0.85;
  const swayZ = Math.cos(swirlTimeSec * 1.1 + phase) * 0.55;
  const ox = wrapParticleOffset(offsets[oi] + swayX * safeDt, -WEATHER_BOX_HALF_X, WEATHER_BOX_HALF_X * 2);
  const oy = wrapParticleOffset(offsets[oi + 1] - speed * safeDt, -2.4, WEATHER_BOX_HEIGHT_Y);
  const oz = wrapParticleOffset(offsets[oi + 2] + (windZ + swayZ) * safeDt, -WEATHER_BOX_HALF_Z, WEATHER_BOX_HALF_Z * 2);
  offsets[oi] = ox; offsets[oi + 1] = oy; offsets[oi + 2] = oz;
  positions[oi] = cameraPos.x + ox;
  positions[oi + 1] = cameraPos.y + oy;
  positions[oi + 2] = cameraPos.z + oz;
}
