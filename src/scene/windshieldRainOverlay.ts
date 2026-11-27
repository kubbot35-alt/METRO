import * as THREE from 'three';
import type { ISimulationSnapshot, TrainVisualTheme } from '../domain/types';

export interface IWindshieldRainOverlay {
  readonly mesh: THREE.Mesh;
  update(snapshot: ISimulationSnapshot, dtSec: number): void;
  dispose(): void;
}

interface IGlassDrop {
  x: number;
  y: number;
  r: number;
  alpha: number;
  streak: number;
  dripSpeed: number;
  isSnowflake: boolean;
  alive: boolean;
}

const CANVAS_W = 512;
const CANVAS_H = 256;
const MAX_GLASS_DROPS = 165;

export function buildWindshieldRainOverlay(): IWindshieldRainOverlay {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d')!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const geo = new THREE.PlaneGeometry(1.88, 0.92);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    depthTest: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'WindshieldRaindropsOverlay';
  mesh.position.set(0, 0.14, -1.015);
  mesh.renderOrder = 2;
  mesh.visible = false;

  const drops: IGlassDrop[] = Array.from({ length: MAX_GLASS_DROPS }, () => ({
    x: 0,
    y: 0,
    r: 3,
    alpha: 0,
    streak: 0,
    dripSpeed: 10,
    isSnowflake: false,
    alive: false,
  }));

  let prevWiperPhase = 0;
  let redrawAccumSec = 0;
  let mistAlpha = 0;
  let initializedForMode: 'clear' | 'rain' | 'snow' = 'clear';

  const clearDropsAlongSweep = (
    theme: TrainVisualTheme,
    phaseA: number,
    phaseB: number,
  ): void => {
    const minP = Math.min(phaseA, phaseB);
    const maxP = Math.max(phaseA, phaseB);
    if (maxP - minP < 0.002) {
      return;
    }

    if (theme !== 'retro') {
      // Single wide Inspiro / Varsovia wiper pivoting near bottom-center-right
      const px = CANVAS_W * 0.56;
      const py = CANVAS_H * 1.02;
      const maxRad = CANVAS_H * 0.84;
      const angMin = THREE.MathUtils.lerp(1.28, -1.12, maxP);
      const angMax = THREE.MathUtils.lerp(1.28, -1.12, minP);
      wipeSector(drops, px, py, maxRad, angMin - 0.09, angMax + 0.09);
    } else {
      // Dual Seria 81 retro wipers across left & right split panes
      const maxRad = CANVAS_H * 0.88;
      const py = CANVAS_H * 1.0;
      const angLMin = THREE.MathUtils.lerp(-1.22, 0.88, minP);
      const angLMax = THREE.MathUtils.lerp(-1.22, 0.88, maxP);
      wipeSector(drops, CANVAS_W * 0.25, py, maxRad, angLMin - 0.1, angLMax + 0.1);

      const angRMin = THREE.MathUtils.lerp(1.22, -0.88, maxP);
      const angRMax = THREE.MathUtils.lerp(1.22, -0.88, minP);
      wipeSector(drops, CANVAS_W * 0.75, py, maxRad, angRMin - 0.1, angRMax + 0.1);
    }
  };

  return {
    mesh,
    update: (snapshot: ISimulationSnapshot, dtSec: number): void => {
      const safeDt = Math.max(0.004, Math.min(dtSec, 0.05));
      const rain = snapshot.weather.rainIntensity;
      const snow = snapshot.weather.snowIntensity ?? 0;
      const frost = snapshot.weather.frostIntensity ?? 0;
      const precip = Math.max(rain, snow);
      const isSnowMode = snapshot.weather.mode === 'snow';
      const wipersOn = snapshot.weather.wipersOn;
      const phase = snapshot.weather.wiperPhaseRad;
      const theme = snapshot.trainModel.visual.theme;

      if (precip > 0.05 && initializedForMode !== snapshot.weather.mode) {
        initializedForMode = snapshot.weather.mode;
        for (let i = 0; i < 85; i += 1) {
          spawnDrop(drops[i], true, isSnowMode);
        }
        mistAlpha = isSnowMode ? 0.16 : 0.22;
        redrawAccumSec = 0.05;
      } else if (precip <= 0.01 && snapshot.weather.mode === 'clear') {
        initializedForMode = 'clear';
      }

      // Spawn new drops or snowflakes while in outdoor precipitation
      if (precip > 0.04) {
        const spawnBudget = Math.ceil(precip * (1.2 + snapshot.kinematics.speedKmh * 0.03));
        let spawned = 0;
        for (let i = 0; i < drops.length && spawned < spawnBudget; i += 1) {
          if (!drops[i].alive && Math.random() < 0.35) {
            spawnDrop(drops[i], false, isSnowMode);
            spawned += 1;
          }
        }
        const targetMist = wipersOn ? 0.03 : Math.min(0.24, 0.07 + precip * 0.18);
        mistAlpha += (targetMist - mistAlpha) * Math.min(1, safeDt * 1.4);
      } else {
        mistAlpha = Math.max(0, mistAlpha - safeDt * 0.09);
      }

      // Update drop gravity / snowflake melting
      let aliveCount = 0;
      const speedPush = 1 + snapshot.kinematics.speedKmh * 0.015;
      for (let i = 0; i < drops.length; i += 1) {
        const d = drops[i];
        if (!d.alive) {
          continue;
        }
        if (d.isSnowflake) {
          d.y += d.dripSpeed * 0.25 * safeDt;
          d.alpha -= safeDt * (precip <= 0.02 ? 0.18 : 0.045);
        } else {
          d.y += d.dripSpeed * speedPush * safeDt;
          d.streak = Math.min(22, d.streak + d.dripSpeed * 0.4 * safeDt);
          if (rain <= 0.02) {
            d.alpha -= safeDt * 0.16;
          }
        }
        if (d.y > CANVAS_H + 14 || d.alpha <= 0.02) {
          d.alive = false;
        } else {
          aliveCount += 1;
        }
      }

      // Physically wipe drops & snowflakes inside the moving wiper blade arc
      if (Math.abs(phase - prevWiperPhase) > 0.001) {
        clearDropsAlongSweep(theme, prevWiperPhase, phase);
      }
      prevWiperPhase = phase;

      const hasVisibleWetness = aliveCount > 0 || mistAlpha > 0.01 || frost > 0.02;
      mesh.visible = hasVisibleWetness;
      if (!hasVisibleWetness) {
        return;
      }

      redrawAccumSec += safeDt;
      if (redrawAccumSec < 0.038) {
        return;
      }
      redrawAccumSec = 0;

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      if (mistAlpha > 0.01) {
        ctx.fillStyle = isSnowMode
          ? `rgba(219, 234, 254, ${(mistAlpha * 0.75).toFixed(3)})`
          : `rgba(182, 204, 224, ${mistAlpha.toFixed(3)})`;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }

      // Winter edge frost vignette around windshield borders (reduced when wipers [X] are active)
      if (frost > 0.02) {
        const frostAlpha = Math.min(0.65, frost * 0.72);
        const radGrad = ctx.createRadialGradient(
          CANVAS_W * 0.5,
          CANVAS_H * 0.54,
          CANVAS_H * 0.34,
          CANVAS_W * 0.5,
          CANVAS_H * 0.5,
          CANVAS_W * 0.58,
        );
        radGrad.addColorStop(0, 'rgba(241, 245, 249, 0)');
        radGrad.addColorStop(0.68, `rgba(226, 238, 252, ${(frostAlpha * 0.25).toFixed(3)})`);
        radGrad.addColorStop(1, `rgba(241, 248, 255, ${frostAlpha.toFixed(3)})`);
        ctx.fillStyle = radGrad;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }

      for (let i = 0; i < drops.length; i += 1) {
        const d = drops[i];
        if (!d.alive) {
          continue;
        }
        if (d.isSnowflake) {
          // Crystalline white snowflake spec on cab glass
          ctx.fillStyle = `rgba(248, 250, 252, ${(d.alpha * 0.9).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = `rgba(224, 242, 254, ${(d.alpha * 0.75).toFixed(3)})`;
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(d.x - d.r * 1.45, d.y);
          ctx.lineTo(d.x + d.r * 1.45, d.y);
          ctx.moveTo(d.x, d.y - d.r * 1.45);
          ctx.lineTo(d.x, d.y + d.r * 1.45);
          ctx.stroke();
          continue;
        }

        // Translucent wet streak trail
        if (d.streak > 3) {
          ctx.strokeStyle = `rgba(205, 226, 245, ${(d.alpha * 0.34).toFixed(3)})`;
          ctx.lineWidth = Math.max(1.2, d.r * 0.65);
          ctx.beginPath();
          ctx.moveTo(d.x, d.y - d.streak);
          ctx.lineTo(d.x, d.y);
          ctx.stroke();
        }
        // Refractive raindrop bead with crisp rim and highlight
        ctx.fillStyle = `rgba(218, 236, 252, ${(d.alpha * 0.56).toFixed(3)})`;
        ctx.beginPath();
        ctx.ellipse(d.x, d.y, d.r * 0.85, d.r * 1.15, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(248, 252, 255, ${(d.alpha * 0.72).toFixed(3)})`;
        ctx.lineWidth = 0.9;
        ctx.stroke();

        ctx.fillStyle = `rgba(255, 255, 255, ${(d.alpha * 0.85).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(d.x - d.r * 0.25, d.y - d.r * 0.3, Math.max(0.8, d.r * 0.28), 0, Math.PI * 2);
        ctx.fill();
      }

      tex.needsUpdate = true;
    },
    dispose: (): void => {
      geo.dispose();
      mat.dispose();
      tex.dispose();
    },
  };
}

function spawnDrop(target: IGlassDrop, preSeed: boolean, isSnowflake: boolean): void {
  target.x = 18 + Math.random() * (CANVAS_W - 36);
  target.y = preSeed ? Math.random() * (CANVAS_H - 16) : Math.random() * (CANVAS_H * 0.85);
  target.r = isSnowflake ? 2.0 + Math.random() * 2.8 : 2.6 + Math.random() * 4.2;
  target.alpha = 0.6 + Math.random() * 0.36;
  target.streak = !isSnowflake && preSeed ? Math.random() * 14 : 0;
  target.dripSpeed = isSnowflake ? 3 + Math.random() * 6 : 6 + Math.random() * 16;
  target.isSnowflake = isSnowflake;
  target.alive = true;
}

function wipeSector(
  drops: IGlassDrop[],
  pivotX: number,
  pivotY: number,
  maxRadius: number,
  minAngRad: number,
  maxAngRad: number,
): void {
  const maxR2 = maxRadius * maxRadius;
  for (let i = 0; i < drops.length; i += 1) {
    const d = drops[i];
    if (!d.alive) {
      continue;
    }
    const dx = d.x - pivotX;
    const dy = pivotY - d.y; // +up
    const r2 = dx * dx + dy * dy;
    if (r2 > maxR2 || dy < 0) {
      continue;
    }
    const ang = Math.atan2(dx, dy);
    if (ang >= minAngRad && ang <= maxAngRad) {
      d.alive = false;
    }
  }
}
