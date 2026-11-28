import { formatClockTime } from '../domain/scheduleSystem';
import type { ISimulationSnapshot } from '../domain/types';

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

function drawVarsoviaScreenHeader(ctx: CanvasRenderingContext2D, title: string, rightText: string, rightColor: string): void {
  ctx.fillStyle = '#050a12';
  ctx.fillRect(0, 0, 512, 300);
  ctx.fillStyle = '#0c1828';
  ctx.fillRect(0, 0, 512, 36);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 16px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(title, 16, 23);
  ctx.fillStyle = rightColor;
  ctx.textAlign = 'right';
  ctx.fillText(rightText, 496, 23);
}

function drawVarsoviaSpeedDial(ctx: CanvasRenderingContext2D, s: ISimulationSnapshot): void {
  const cx = 170;
  const cy = 182;
  const r = 98;
  const startA = Math.PI * 0.78;
  const endA = Math.PI * 2.22;
  drawDialArc(ctx, cx, cy, r, startA, endA, '#162438', 14);
  drawDialArc(ctx, cx, cy, r + 11, startA, startA + (endA - startA) * Math.min(1, s.speedLimitKmh / 100), '#f59e0b', 5);
  drawDialArc(ctx, cx, cy, r, startA, startA + (endA - startA) * Math.min(1, s.kinematics.speedKmh / 100), s.isOverspeeding ? '#ef4444' : '#22d3ee', 14);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 62px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(Math.round(s.kinematics.speedKmh).toString(), cx, cy + 12);
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 16px "JetBrains Mono", monospace';
  ctx.fillText('KM/H', cx, cy + 40);
}

function drawDialArc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, a0: number, a1: number, color: string, lineWidth: number): void {
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, a0, a1);
  ctx.stroke();
}

export function drawVarsoviaLeftScreen(ctx: CanvasRenderingContext2D, s: ISimulationSnapshot): void {
  const { sop2 } = s;
  const headerStatus = sop2.interventionActive ? 'SOP-2 INTERWENCJA'
    : sop2.status === 'warning' ? 'SOP-2 OSTRZEŻENIE'
    : s.atpActive ? 'ATP HAMOWANIE'
    : sop2.interventionEnabled ? 'SOP-2 AKTYWNE' : 'SOP-2 MONITOR';
  const headerColor = sop2.interventionActive || s.atpActive ? '#ef4444' : sop2.status === 'warning' ? '#f97316' : '#22d3ee';
  drawVarsoviaScreenHeader(ctx, 'ŠKODA VARSOVIA · SOP-2 / ATP', headerStatus, headerColor);
  drawVarsoviaSpeedDial(ctx, s);
  const rx = 315;
  const limitColor = sop2.status === 'intervention' ? '#ef4444' : sop2.status === 'warning' ? '#f97316' : '#38bdf8';
  drawMetricBox(ctx, rx, 52, 180, 54, 'SOP-2 LIMIT', `${sop2.currentLimitKmh} km/h`, limitColor);
  const targetVal = sop2.targetLimitKmh !== null ? `${sop2.targetLimitKmh} (${sop2.targetDistanceM ?? 0}m)` : '—';
  drawMetricBox(ctx, rx, 118, 180, 54, 'SOP-2 CEL', targetVal, sop2.targetLimitKmh !== null ? '#fbbf24' : '#64748b');
  const aspect = s.nextSignal?.signal.aspect ?? 'green';
  drawMetricBox(ctx, rx, 184, 180, 54, 'SEMAFOR', aspect === 'red' ? 'S1 STÓJ' : aspect === 'yellow' ? 'S5 ZWOLNIJ' : 'S2 WOLNA', aspect === 'red' ? '#ef4444' : aspect === 'yellow' ? '#f59e0b' : '#10b981');
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 14px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`WYCIERACZKI: ${s.weather.wipersOn ? 'ON' : 'OFF'}`, rx, 266);
  ctx.fillText(`ŚWIATŁA: ${s.headlightsOn ? 'LED' : 'OFF'}`, rx, 286);
}

function drawVarsoviaConsistCards(ctx: CanvasRenderingContext2D, s: ISimulationSnapshot): void {
  const leftColor = s.openDoorSide === 'left' ? '#10b981' : '#334155';
  const rightColor = s.openDoorSide === 'right' ? '#10b981' : '#334155';
  for (let i = 0; i < 4; i += 1) {
    const x = 22 + i * 118;
    const y = 58;
    ctx.fillStyle = '#0f2036';
    ctx.fillRect(x, y, 108, 48);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 108, 48);
    ctx.fillStyle = leftColor;
    ctx.fillRect(x + 12, y - 5, 84, 5);
    ctx.fillStyle = rightColor;
    ctx.fillRect(x + 12, y + 48, 84, 5);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`W${i + 1}`, x + 54, y + 29);
  }
}

export function drawVarsoviaCenterScreen(ctx: CanvasRenderingContext2D, s: ISimulationSnapshot): void {
  drawVarsoviaScreenHeader(ctx, 'DIAGNOSTYKA SKŁADU · 750V DC', formatClockTime(s.schedule.currentClockSec), '#e2e8f0');
  drawVarsoviaConsistCards(ctx, s);
  drawVarsoviaPowerBar(ctx, s.leverTarget);
  drawVarsoviaStationPanel(ctx, s);
}

function drawVarsoviaPowerBar(ctx: CanvasRenderingContext2D, lever: number): void {
  const kw = Math.round(Math.abs(lever) * (lever >= 0 ? 1850 : 1420));
  const modeText = lever > 0.05 ? `NAPĘD: +${kw} kW` : lever < -0.05 ? `REKUPERACJA: -${kw} kW` : 'WYBIEG: 0 kW';
  ctx.fillStyle = '#0d192b';
  ctx.fillRect(22, 128, 468, 48);
  ctx.fillStyle = lever < -0.05 ? '#22d3ee' : lever > 0.05 ? '#10b981' : '#64748b';
  const fillW = Math.min(220, Math.abs(lever) * 220);
  ctx.fillRect(lever >= 0 ? 256 : 256 - fillW, 158, fillW, 10);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 16px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(modeText, 34, 150);
}

function drawVarsoviaStationPanel(ctx: CanvasRenderingContext2D, s: ISimulationSnapshot): void {
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
