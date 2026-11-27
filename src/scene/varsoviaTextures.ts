import * as THREE from 'three';
import { formatClockTime } from '../domain/scheduleSystem';
import type { ISimulationSnapshot, MetroLineId } from '../domain/types';

export interface IVarsoviaLedDisplay {
  readonly texture: THREE.CanvasTexture;
  setLine(lineId: MetroLineId, destinationLed: string): void;
  dispose(): void;
}

export interface IVarsoviaCabScreens {
  readonly leftScreenTexture: THREE.CanvasTexture;
  readonly centerScreenTexture: THREE.CanvasTexture;
  readonly rightScreenTexture: THREE.CanvasTexture;
  update(snapshot: ISimulationSnapshot, dtSec: number): void;
  dispose(): void;
}

export function createVarsoviaLedDisplay(maxAnisotropy: number): IVarsoviaLedDisplay {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;

  const draw = (lineId: MetroLineId, destination: string): void => {
    ctx.fillStyle = '#04070c';
    ctx.fillRect(0, 0, 512, 96);

    const badgeColor = lineId === 'M2' ? '#dc2626' : lineId === 'M1' ? '#2563eb' : '#0891b2';
    ctx.fillStyle = badgeColor;
    ctx.fillRect(10, 12, 86, 72);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lineId.slice(0, 3), 53, 49);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 34px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(destination.toUpperCase().slice(0, 18), 112, 49);

    // Subtle LED matrix grid lines
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (let y = 0; y < 96; y += 4) {
      ctx.fillRect(0, y, 512, 1);
    }
    texture.needsUpdate = true;
  };

  draw('M1', 'KABATY');
  return {
    texture,
    setLine: draw,
    dispose: () => texture.dispose(),
  };
}

export function createVarsoviaCabScreens(maxAnisotropy: number): IVarsoviaCabScreens {
  const left = makeScreenCanvas(512, 300, maxAnisotropy);
  const center = makeScreenCanvas(512, 300, maxAnisotropy);
  const right = makeScreenCanvas(512, 300, maxAnisotropy);
  let accumSec = 1;

  drawRightSideCamerasScreen(right.ctx, null);
  right.texture.needsUpdate = true;

  return {
    leftScreenTexture: left.texture,
    centerScreenTexture: center.texture,
    rightScreenTexture: right.texture,
    update: (snapshot: ISimulationSnapshot, dtSec: number): void => {
      accumSec += Math.max(dtSec, 0.016);
      if (accumSec < 0.085) {
        return;
      }
      accumSec = 0;
      drawLeftSpeedScreen(left.ctx, snapshot);
      drawCenterDiagnosticsScreen(center.ctx, snapshot);
      drawRightSideCamerasScreen(right.ctx, snapshot.openDoorSide);
      left.texture.needsUpdate = true;
      center.texture.needsUpdate = true;
      right.texture.needsUpdate = true;
    },
    dispose: (): void => {
      left.texture.dispose();
      center.texture.dispose();
      right.texture.dispose();
    },
  };
}

function makeScreenCanvas(
  width: number,
  height: number,
  maxAnisotropy: number,
): { ctx: CanvasRenderingContext2D; texture: THREE.CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return { ctx, texture };
}

function drawLeftSpeedScreen(ctx: CanvasRenderingContext2D, s: ISimulationSnapshot): void {
  ctx.fillStyle = '#050a12';
  ctx.fillRect(0, 0, 512, 300);

  // Header strip
  ctx.fillStyle = '#0c1828';
  ctx.fillRect(0, 0, 512, 36);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 16px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('ŠKODA VARSOVIA · ETCS / ATP', 16, 23);

  ctx.fillStyle = s.atpActive || s.isOverspeeding ? '#ef4444' : '#22d3ee';
  ctx.textAlign = 'right';
  ctx.fillText(s.atpActive ? 'ATP HAMOWANIE' : 'ATP AKTYWNE', 496, 23);

  // Futuristic circular speed arc
  const cx = 170;
  const cy = 182;
  const r = 98;
  const startA = Math.PI * 0.78;
  const endA = Math.PI * 2.22;
  const speedRatio = Math.min(1, s.kinematics.speedKmh / 100);
  const limitRatio = Math.min(1, s.speedLimitKmh / 100);

  ctx.lineWidth = 14;
  ctx.strokeStyle = '#162438';
  ctx.beginPath();
  ctx.arc(cx, cy, r, startA, endA);
  ctx.stroke();

  // Limit marker arc
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#f59e0b';
  const limAngle = startA + (endA - startA) * limitRatio;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 11, startA, limAngle);
  ctx.stroke();

  // Live speed fill arc
  ctx.lineWidth = 14;
  ctx.strokeStyle = s.isOverspeeding ? '#ef4444' : '#22d3ee';
  ctx.beginPath();
  ctx.arc(cx, cy, r, startA, startA + (endA - startA) * speedRatio);
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 62px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(Math.round(s.kinematics.speedKmh).toString(), cx, cy + 12);
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 16px "JetBrains Mono", monospace';
  ctx.fillText('KM/H', cx, cy + 40);

  // Right telemetry column
  const rx = 315;
  drawMetricBox(ctx, rx, 52, 180, 54, 'V MAX', `${s.speedLimitKmh} km/h`, '#38bdf8');
  const gradeVal = `${s.trackProfile.gradePercent >= 0 ? '+' : ''}${s.trackProfile.gradePercent.toFixed(1)}%`;
  drawMetricBox(ctx, rx, 118, 180, 54, 'NACHYLENIE', gradeVal, '#e2e8f0');

  const aspect = s.nextSignal?.signal.aspect ?? 'green';
  const sigColor =
    aspect === 'red' ? '#ef4444' : aspect === 'yellow' ? '#f59e0b' : '#10b981';
  const sigLabel =
    aspect === 'red' ? 'S1 STÓJ' : aspect === 'yellow' ? 'S5 ZWOLNIJ' : 'S2 WOLNA';
  drawMetricBox(ctx, rx, 184, 180, 54, 'SEMAFOR', sigLabel, sigColor);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 14px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`WYCIERACZKI: ${s.weather.wipersOn ? 'ON' : 'OFF'}`, rx, 266);
  ctx.fillText(`ŚWIATŁA: ${s.headlightsOn ? 'LED' : 'OFF'}`, rx, 286);
}

function drawCenterDiagnosticsScreen(ctx: CanvasRenderingContext2D, s: ISimulationSnapshot): void {
  ctx.fillStyle = '#050a12';
  ctx.fillRect(0, 0, 512, 300);

  ctx.fillStyle = '#0c1828';
  ctx.fillRect(0, 0, 512, 36);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 16px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('DIAGNOSTYKA SKŁADU · 750V DC', 16, 23);
  ctx.fillStyle = '#e2e8f0';
  ctx.textAlign = 'right';
  ctx.fillText(formatClockTime(s.schedule.currentClockSec), 496, 23);

  // 4-car articulated train graphic
  for (let i = 0; i < 4; i += 1) {
    const x = 22 + i * 118;
    const y = 58;
    ctx.fillStyle = '#0f2036';
    ctx.fillRect(x, y, 108, 48);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 108, 48);

    // Door strips top (left) & bottom (right)
    const leftColor = s.openDoorSide === 'left' ? '#10b981' : '#334155';
    const rightColor = s.openDoorSide === 'right' ? '#10b981' : '#334155';
    ctx.fillStyle = leftColor;
    ctx.fillRect(x + 12, y - 5, 84, 5);
    ctx.fillStyle = rightColor;
    ctx.fillRect(x + 12, y + 48, 84, 5);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`W${i + 1}`, x + 54, y + 29);
  }

  // Regenerative power / traction bar
  const lever = s.leverTarget;
  const kw = Math.round(Math.abs(lever) * (lever >= 0 ? 1850 : 1420));
  const modeText =
    lever > 0.05
      ? `NAPĘD: +${kw} kW`
      : lever < -0.05
        ? `REKUPERACJA: -${kw} kW`
        : 'WYBIEG: 0 kW';
  ctx.fillStyle = '#0d192b';
  ctx.fillRect(22, 128, 468, 48);
  ctx.fillStyle = lever < -0.05 ? '#22d3ee' : lever > 0.05 ? '#10b981' : '#64748b';
  const fillW = Math.min(220, Math.abs(lever) * 220);
  if (lever >= 0) {
    ctx.fillRect(256, 158, fillW, 10);
  } else {
    ctx.fillRect(256 - fillW, 158, fillW, 10);
  }
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 16px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(modeText, 34, 150);

  // Station & door status panel
  ctx.fillStyle = '#0d192b';
  ctx.fillRect(22, 190, 468, 92);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 14px "JetBrains Mono", monospace';
  ctx.fillText(`LINIA ${s.line.badgeCode ?? s.line.id} · NASTĘPNA STACJA`, 34, 214);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px "JetBrains Mono", monospace';
  ctx.fillText(s.currentStation.station.name.toUpperCase().slice(0, 22), 34, 245);
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 15px "JetBrains Mono", monospace';
  const platSide = s.currentStation.station.platformSide === 'left' ? 'LEWY [Q]' : 'PRAWY [E]';
  ctx.fillText(`PERON: ${platSide} · ${Math.round(s.currentStation.distanceToTargetM)} m`, 34, 270);
}

function drawRightSideCamerasScreen(
  ctx: CanvasRenderingContext2D,
  openDoorSide: 'left' | 'right' | null,
): void {
  // 100% transparent canvas background so 3D RenderTarget planes behind CAM L / CAM P show through
  ctx.clearRect(0, 0, 512, 300);

  // Header strip
  ctx.fillStyle = 'rgba(12, 24, 40, 0.94)';
  ctx.fillRect(0, 0, 512, 36);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 16px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('KAMERY BOCZNE • CCTV PERON', 16, 23);
  ctx.fillStyle = '#10b981';
  ctx.textAlign = 'right';
  ctx.fillText('● LIVE HD', 496, 23);

  drawSingleCameraFeedOverlay(
    ctx,
    14,
    48,
    236,
    236,
    'CAM L',
    openDoorSide === 'left',
  );
  drawSingleCameraFeedOverlay(
    ctx,
    262,
    48,
    236,
    236,
    'CAM P',
    openDoorSide === 'right',
  );
}

function drawSingleCameraFeedOverlay(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  doorsOpen: boolean,
): void {
  // Ensure interior of camera window is 100% transparent
  ctx.clearRect(x, y, w, h);

  // Thin frame around the transparent camera viewport
  ctx.strokeStyle = doorsOpen ? '#10b981' : '#38bdf8';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  // Compact top-left label badge
  ctx.fillStyle = 'rgba(2, 6, 14, 0.76)';
  ctx.fillRect(x + 6, y + 6, 116, 22);
  ctx.fillStyle = doorsOpen ? '#34d399' : '#38bdf8';
  ctx.font = 'bold 13px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`${label} • ${doorsOpen ? 'OTWARTE' : 'LIVE'}`, x + 11, y + 21);
}

function drawMetricBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  valueColor: string,
): void {
  ctx.fillStyle = '#0d192b';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#1e3a5f';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 12px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 10, y + 17);

  ctx.fillStyle = valueColor;
  ctx.font = 'bold 22px "JetBrains Mono", monospace';
  ctx.fillText(value, x + 10, y + 43);
}
