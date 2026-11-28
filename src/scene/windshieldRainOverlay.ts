import * as THREE from 'three';
import type { ISimulationSnapshot } from '../domain/types';
import {
  clearDropsAlongSweep,
  paintWindshieldOverlayCanvas,
  spawnGlassDrop,
  WINDSHIELD_CANVAS_H,
  WINDSHIELD_CANVAS_W,
  type IGlassDrop,
} from './weather/windshieldDropPainter';

export interface IWindshieldRainOverlay {
  readonly mesh: THREE.Mesh;
  update(snapshot: ISimulationSnapshot, dtSec: number): void;
  dispose(): void;
}

const MAX_GLASS_DROPS = 165;

export function buildWindshieldRainOverlay(): IWindshieldRainOverlay {
  const canvas = document.createElement('canvas');
  canvas.width = WINDSHIELD_CANVAS_W;
  canvas.height = WINDSHIELD_CANVAS_H;
  const ctx = canvas.getContext('2d')!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.PlaneGeometry(1.88, 0.92);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.95, depthWrite: false, depthTest: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'WindshieldRaindropsOverlay';
  mesh.position.set(0, 0.14, -1.015);
  mesh.renderOrder = 2;
  mesh.visible = false;
  const state = createOverlayState();

  return {
    mesh,
    update: (snapshot, dtSec) => updateWindshieldState(state, snapshot, dtSec, mesh, ctx, tex),
    dispose: () => { geo.dispose(); mat.dispose(); tex.dispose(); },
  };
}

interface IOverlayState {
  readonly drops: IGlassDrop[];
  prevWiperPhase: number;
  redrawAccumSec: number;
  mistAlpha: number;
  initializedForMode: 'clear' | 'rain' | 'snow';
}

function createOverlayState(): IOverlayState {
  return {
    drops: Array.from({ length: MAX_GLASS_DROPS }, () => ({ x: 0, y: 0, r: 3, alpha: 0, streak: 0, dripSpeed: 10, isSnowflake: false, alive: false })),
    prevWiperPhase: 0,
    redrawAccumSec: 0,
    mistAlpha: 0,
    initializedForMode: 'clear',
  };
}

function updateWindshieldState(
  state: IOverlayState, snapshot: ISimulationSnapshot, dtSec: number, mesh: THREE.Mesh,
  ctx: CanvasRenderingContext2D, tex: THREE.CanvasTexture,
): void {
  const safeDt = Math.max(0.004, Math.min(dtSec, 0.05));
  const rain = snapshot.weather.rainIntensity;
  const precip = Math.max(rain, snapshot.weather.snowIntensity ?? 0);
  const isSnowMode = snapshot.weather.mode === 'snow';
  seedAndSpawnDrops(state, snapshot, precip, isSnowMode, safeDt);
  const aliveCount = advanceDropPhysics(state.drops, rain, precip, snapshot.kinematics.speedKmh, safeDt);
  if (Math.abs(snapshot.weather.wiperPhaseRad - state.prevWiperPhase) > 0.001) {
    clearDropsAlongSweep(state.drops, snapshot.trainModel.visual.theme, state.prevWiperPhase, snapshot.weather.wiperPhaseRad);
  }
  state.prevWiperPhase = snapshot.weather.wiperPhaseRad;
  const frost = snapshot.weather.frostIntensity ?? 0;
  const hasWetness = aliveCount > 0 || state.mistAlpha > 0.01 || frost > 0.02;
  mesh.visible = hasWetness;
  if (!hasWetness) return;
  state.redrawAccumSec += safeDt;
  if (state.redrawAccumSec < 0.038) return;
  state.redrawAccumSec = 0;
  paintWindshieldOverlayCanvas(ctx, state.drops, state.mistAlpha, frost, isSnowMode);
  tex.needsUpdate = true;
}

function seedAndSpawnDrops(state: IOverlayState, snapshot: ISimulationSnapshot, precip: number, isSnowMode: boolean, safeDt: number): void {
  if (precip > 0.05 && state.initializedForMode !== snapshot.weather.mode) {
    state.initializedForMode = snapshot.weather.mode;
    for (let i = 0; i < 85; i += 1) spawnGlassDrop(state.drops[i], true, isSnowMode);
    state.mistAlpha = isSnowMode ? 0.16 : 0.22;
    state.redrawAccumSec = 0.05;
  } else if (precip <= 0.01 && snapshot.weather.mode === 'clear') {
    state.initializedForMode = 'clear';
  }
  if (precip <= 0.04) { state.mistAlpha = Math.max(0, state.mistAlpha - safeDt * 0.09); return; }
  const budget = Math.ceil(precip * (1.2 + snapshot.kinematics.speedKmh * 0.03));
  for (let i = 0, spawned = 0; i < state.drops.length && spawned < budget; i += 1) {
    if (!state.drops[i].alive && Math.random() < 0.35) { spawnGlassDrop(state.drops[i], false, isSnowMode); spawned += 1; }
  }
  const targetMist = snapshot.weather.wipersOn ? 0.03 : Math.min(0.24, 0.07 + precip * 0.18);
  state.mistAlpha += (targetMist - state.mistAlpha) * Math.min(1, safeDt * 1.4);
}

function advanceDropPhysics(drops: IGlassDrop[], rain: number, precip: number, speedKmh: number, safeDt: number): number {
  let aliveCount = 0;
  const speedPush = 1 + speedKmh * 0.015;
  for (let i = 0; i < drops.length; i += 1) {
    const d = drops[i];
    if (!d.alive) continue;
    if (d.isSnowflake) {
      d.y += d.dripSpeed * 0.25 * safeDt;
      d.alpha -= safeDt * (precip <= 0.02 ? 0.18 : 0.045);
    } else {
      d.y += d.dripSpeed * speedPush * safeDt;
      d.streak = Math.min(22, d.streak + d.dripSpeed * 0.4 * safeDt);
      if (rain <= 0.02) d.alpha -= safeDt * 0.16;
    }
    if (d.y > WINDSHIELD_CANVAS_H + 14 || d.alpha <= 0.02) d.alive = false;
    else aliveCount += 1;
  }
  return aliveCount;
}
