import * as THREE from 'three';
import type { TrackAlignment } from '../../domain/trackAlignment';
import type { GraphicsQualityId, ISimulationSnapshot } from '../../domain/types';

export interface IThirdRailSparkEffect {
  setQuality(quality: GraphicsQualityId): void;
  update(snapshot: ISimulationSnapshot, alignment: TrackAlignment, dtSec: number): void;
  dispose(scene: THREE.Scene): void;
}

const MAX_SPARK_PARTICLES = 48;

interface ISparkBuffers {
  readonly pos: Float32Array;
  readonly vel: Float32Array;
  readonly col: Float32Array;
  readonly life: Float32Array;
  readonly maxLife: Float32Array;
  readonly posAttr: THREE.BufferAttribute;
  readonly colAttr: THREE.BufferAttribute;
  readonly points: THREE.Points;
  readonly mat: THREE.PointsMaterial;
  readonly light: THREE.PointLight;
  readonly arcCore: THREE.Mesh;
  readonly arcCoreMat: THREE.MeshBasicMaterial;
}

class ThirdRailSparkEffect implements IThirdRailSparkEffect {
  private readonly disposables: Array<{ dispose(): void }> = [];
  private readonly buf: ISparkBuffers;
  private quality: GraphicsQualityId = 'high';
  private lastSparkEventId = 0;
  private budget = MAX_SPARK_PARTICLES;
  private cursor = 0;
  private flashClock = 0;

  public constructor(scene: THREE.Scene) {
    this.buf = initSparkBuffers(scene, this.disposables);
  }

  public setQuality(nextQuality: GraphicsQualityId): void {
    this.quality = nextQuality;
    this.budget = nextQuality === 'low' ? 16 : nextQuality === 'medium' ? 32 : MAX_SPARK_PARTICLES;
    this.buf.mat.size = nextQuality === 'low' ? 0.2 : 0.25;
  }

  public update(snapshot: ISimulationSnapshot, alignment: TrackAlignment, dtSec: number): void {
    const dt = Math.max(0, Math.min(dtSec, 0.08));
    if (snapshot.lightingEffects.sparkEventId !== this.lastSparkEventId) {
      this.lastSparkEventId = snapshot.lightingEffects.sparkEventId;
      if (this.lastSparkEventId > 0) {
        this.cursor = spawnSparkBurst(this.buf, snapshot, alignment, this.quality, this.budget, this.cursor);
        this.flashClock = 0.14;
      }
    }
    this.flashClock = Math.max(0, this.flashClock - dt);
    updateFlashLight(this.buf, snapshot, alignment, this.flashClock);
    advanceSparkParticles(this.buf, dt);
  }

  public dispose(targetScene: THREE.Scene): void {
    targetScene.remove(this.buf.light, this.buf.arcCore, this.buf.points);
    this.disposables.forEach((d) => d.dispose());
  }
}

export function createThirdRailSparkEffect(scene: THREE.Scene): IThirdRailSparkEffect {
  return new ThirdRailSparkEffect(scene);
}

function initSparkBuffers(scene: THREE.Scene, disposables: Array<{ dispose(): void }>): ISparkBuffers {
  const light = new THREE.PointLight(0x93d5ff, 0, 34, 1.45);
  const arcCoreGeo = new THREE.SphereGeometry(0.18, 8, 8);
  const arcCoreMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const arcCore = new THREE.Mesh(arcCoreGeo, arcCoreMat);
  arcCore.visible = false;
  scene.add(light, arcCore);
  const [pos, vel, col, life, maxLife] = [
    new Float32Array(MAX_SPARK_PARTICLES * 3), new Float32Array(MAX_SPARK_PARTICLES * 3),
    new Float32Array(MAX_SPARK_PARTICLES * 3), new Float32Array(MAX_SPARK_PARTICLES), new Float32Array(MAX_SPARK_PARTICLES),
  ];
  for (let i = 0; i < MAX_SPARK_PARTICLES; i += 1) { pos[i * 3 + 1] = -999; maxLife[i] = 0.4; }
  const geo = new THREE.BufferGeometry();
  const [posAttr, colAttr] = [new THREE.BufferAttribute(pos, 3), new THREE.BufferAttribute(col, 3)];
  geo.setAttribute('position', posAttr);
  geo.setAttribute('color', colAttr);
  const tex = createSparkDotTexture();
  const mat = new THREE.PointsMaterial({ size: 0.24, map: tex, transparent: true, opacity: 0.95, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 4;
  scene.add(points);
  disposables.push(arcCoreGeo, arcCoreMat, geo, tex, mat);
  return { pos, vel, col, life, maxLife, posAttr, colAttr, points, mat, light, arcCore, arcCoreMat };
}

function spawnSparkBurst(
  buf: ISparkBuffers, snapshot: ISimulationSnapshot, alignment: TrackAlignment, quality: GraphicsQualityId, budget: number, cursor: number,
): number {
  const posM = snapshot.kinematics.positionM;
  const sideSign = snapshot.lightingEffects.sparkSide === 'left' ? -1 : 1;
  const origin = alignment.toWorldPoint(posM + (snapshot.cameraMode === 'interior' ? -10.5 : -2.6), sideSign * 1.42, 0.52, false);
  const frame = alignment.sample(posM);
  const backDirX = Math.sin(frame.yaw);
  const backDirZ = Math.cos(frame.yaw);
  const sideDirX = Math.cos(frame.yaw) * sideSign;
  const sideDirZ = -Math.sin(frame.yaw) * sideSign;
  const speedBack = Math.max(2.5, snapshot.kinematics.speedMs * 0.42);
  const count = quality === 'low' ? 10 : quality === 'medium' ? 20 : 30;
  let nextCursor = cursor;
  for (let i = 0; i < count; i += 1) {
    const idx = nextCursor % budget;
    nextCursor += 1;
    seedSingleSpark(buf, idx, origin, sideDirX, sideDirZ, backDirX, backDirZ, speedBack);
  }
  return nextCursor;
}

function seedSingleSpark(
  buf: ISparkBuffers, idx: number, origin: { x: number; y: number; z: number },
  sideDirX: number, sideDirZ: number, backDirX: number, backDirZ: number, speedBack: number,
): void {
  const i3 = idx * 3;
  const spread = (Math.random() - 0.5) * 0.55;
  buf.pos[i3] = origin.x + sideDirX * 0.1 + backDirX * spread;
  buf.pos[i3 + 1] = origin.y + (Math.random() - 0.3) * 0.16;
  buf.pos[i3 + 2] = origin.z + sideDirZ * 0.1 + backDirZ * spread;
  const outVel = 1.4 + Math.random() * 3.8;
  const backVel = speedBack * (0.45 + Math.random() * 0.75);
  buf.vel[i3] = sideDirX * outVel + backDirX * backVel + (Math.random() - 0.5) * 0.9;
  buf.vel[i3 + 1] = 0.8 + Math.random() * 3.1;
  buf.vel[i3 + 2] = sideDirZ * outVel + backDirZ * backVel + (Math.random() - 0.5) * 0.9;
  const hotWhite = Math.random() < 0.45;
  buf.col[i3] = hotWhite ? 1.0 : 0.62;
  buf.col[i3 + 1] = hotWhite ? 0.97 : 0.88;
  buf.col[i3 + 2] = 1.0;
  const life = 0.22 + Math.random() * 0.34;
  buf.life[idx] = life;
  buf.maxLife[idx] = life;
}

function updateFlashLight(buf: ISparkBuffers, snapshot: ISimulationSnapshot, alignment: TrackAlignment, flashClock: number): void {
  const fx = snapshot.lightingEffects;
  const flicker = 0.72 + Math.sin(performance.now() * 0.09) * 0.28;
  const strength = Math.max(fx.sparkIntensity, flashClock > 0 ? 0.85 : 0);
  if (strength <= 0.04) { buf.light.intensity = 0; buf.arcCore.visible = false; return; }
  const sideSign = fx.sparkSide === 'left' ? -1 : 1;
  const pt = alignment.toWorldPoint(snapshot.kinematics.positionM + (snapshot.cameraMode === 'cab' ? 2.4 : -2.6), sideSign * 1.48, 0.72, false);
  buf.light.position.set(pt.x, pt.y, pt.z);
  buf.light.intensity = strength * 64 * flicker;
  buf.arcCore.position.set(pt.x, pt.y - 0.16, pt.z);
  buf.arcCore.scale.setScalar(0.75 + strength * 1.15);
  buf.arcCoreMat.opacity = Math.min(0.95, strength * flicker);
  buf.arcCore.visible = snapshot.cameraMode !== 'cab';
}

function advanceSparkParticles(buf: ISparkBuffers, dt: number): void {
  let anyAlive = false;
  for (let i = 0; i < MAX_SPARK_PARTICLES; i += 1) {
    if (buf.life[i] <= 0) continue;
    buf.life[i] -= dt;
    const i3 = i * 3;
    if (buf.life[i] <= 0) { buf.pos[i3 + 1] = -999; continue; }
    anyAlive = true;
    buf.vel[i3 + 1] -= 9.4 * dt;
    buf.pos[i3] += buf.vel[i3] * dt;
    buf.pos[i3 + 1] = Math.max(0.06, buf.pos[i3 + 1] + buf.vel[i3 + 1] * dt);
    buf.pos[i3 + 2] += buf.vel[i3 + 2] * dt;
    const fade = Math.max(0, buf.life[i] / Math.max(0.05, buf.maxLife[i]));
    buf.col[i3] *= 0.99;
    buf.col[i3 + 1] = Math.min(1, 0.55 + fade * 0.45);
    buf.col[i3 + 2] = Math.min(1, 0.72 + fade * 0.28);
  }
  buf.points.visible = anyAlive;
  if (anyAlive) { buf.posAttr.needsUpdate = true; buf.colAttr.needsUpdate = true; }
}

function createSparkDotTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0.0, 'rgba(255,255,255,1.0)');
    grad.addColorStop(0.3, 'rgba(186,230,253,0.95)');
    grad.addColorStop(0.65, 'rgba(56,189,248,0.45)');
    grad.addColorStop(1.0, 'rgba(14,165,233,0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
