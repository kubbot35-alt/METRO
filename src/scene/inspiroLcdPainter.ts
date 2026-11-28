import { formatClockTime } from '../domain/scheduleSystem';
import type { ISimulationSnapshot } from '../domain/types';

function drawSpeedArc(ctx: CanvasRenderingContext2D, speedKmh: number, limitKmh: number): void {
  const cx = 165;
  const cy = 168;
  const r = 108;
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 0.78, Math.PI * 2.22);
  ctx.stroke();
  const ratio = Math.min(1, speedKmh / 100);
  const overspeed = speedKmh > limitKmh + 1;
  ctx.strokeStyle = overspeed ? '#ef4444' : '#38bdf8';
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 0.78, Math.PI * (0.78 + ratio * 1.44));
  ctx.stroke();
  ctx.fillStyle = overspeed ? '#fca5a5' : '#f8fafc';
  ctx.font = 'bold 74px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(Math.round(speedKmh)), cx, cy - 6);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 20px "JetBrains Mono", monospace';
  ctx.fillText('km/h', cx, cy + 42);
}

function drawLeftLcdBadges(ctx: CanvasRenderingContext2D, snapshot: ISimulationSnapshot): void {
  const { sop2 } = snapshot;
  const bg = sop2.status === 'intervention' ? '#450a0a' : sop2.status === 'warning' ? '#431407' : '#0f172a';
  const accent = sop2.status === 'intervention' ? '#ef4444' : sop2.status === 'warning' ? '#f97316' : '#facc15';
  ctx.fillStyle = bg;
  ctx.fillRect(306, 22, 188, 96);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(306, 22, 188, 96);
  ctx.textAlign = 'left';
  ctx.fillStyle = accent;
  ctx.font = 'bold 16px "JetBrains Mono", monospace';
  ctx.fillText(sop2.interventionActive ? 'SOP-2 INTERWENCJA' : 'SOP-2 · VMAX', 316, 42);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 38px "JetBrains Mono", monospace';
  ctx.fillText(`${sop2.currentLimitKmh}`, 316, 80);
  ctx.fillStyle = sop2.targetLimitKmh !== null ? '#38bdf8' : '#64748b';
  ctx.font = 'bold 16px "JetBrains Mono", monospace';
  const targetStr = sop2.targetLimitKmh !== null ? `→ ${sop2.targetLimitKmh} (${sop2.targetDistanceM ?? 0}m)` : 'CEL: —';
  ctx.fillText(targetStr, 316, 108);
  drawInspiroSignalCard(ctx, snapshot);
}

function drawInspiroSignalCard(ctx: CanvasRenderingContext2D, snapshot: ISimulationSnapshot): void {
  const aspect = snapshot.nextSignal?.signal.aspect ?? 'green';
  const sigColor = aspect === 'red' ? '#ef4444' : aspect === 'yellow' ? '#f59e0b' : '#10b981';
  const sigLabel = aspect === 'red' ? 'STÓJ (ATP)' : aspect === 'yellow' ? 'UWAGA 30' : 'WOLNA DROGA';
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(306, 128, 188, 68);
  ctx.fillStyle = sigColor;
  ctx.beginPath();
  ctx.arc(328, 162, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 18px "JetBrains Mono", monospace';
  ctx.fillText(sigLabel, 350, 164);
}

function drawTractionStrip(
  ctx: CanvasRenderingContext2D,
  throttle: number,
  brake: number,
  emergency: boolean,
): void {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(24, 266, 464, 30);
  const mid = 256;
  if (emergency || brake > 0.02) {
    const w = (emergency ? 1 : brake) * 224;
    ctx.fillStyle = emergency ? '#ef4444' : '#f59e0b';
    ctx.fillRect(mid - w, 270, w, 22);
  }
  if (throttle > 0.02) {
    ctx.fillStyle = '#10b981';
    ctx.fillRect(mid, 270, throttle * 224, 22);
  }
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(mid - 2, 266, 4, 30);
}

export function drawInspiroLeftLcd(ctx: CanvasRenderingContext2D, snapshot: ISimulationSnapshot): void {
  ctx.fillStyle = '#07101d';
  ctx.fillRect(0, 0, 512, 320);
  ctx.strokeStyle = '#1e3a5f';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 504, 312);
  drawSpeedArc(ctx, snapshot.kinematics.speedKmh, snapshot.speedLimitKmh);
  drawLeftLcdBadges(ctx, snapshot);
  drawTractionStrip(
    ctx,
    snapshot.kinematics.throttle,
    snapshot.kinematics.serviceBrake,
    snapshot.kinematics.emergencyBrake,
  );
}

function drawVoltageCard(ctx: CanvasRenderingContext2D, throttle: number, brake: number): void {
  const voltage = Math.round(750 - throttle * 22 + brake * 12);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(22, 54, 220, 88);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 16px "JetBrains Mono", monospace';
  ctx.fillText('ZASILANIE 3. SZYNA', 34, 78);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 42px "JetBrains Mono", monospace';
  ctx.fillText(`${voltage} V`, 34, 122);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(256, 54, 234, 88);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 16px "JetBrains Mono", monospace';
  ctx.fillText('FALOWNIK IGBT', 268, 78);
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 26px "JetBrains Mono", monospace';
  ctx.fillText('OK · AKTYWNY', 268, 118);
}

function drawDoorSchematic(ctx: CanvasRenderingContext2D, doorsOpen: boolean, fault: boolean): void {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(22, 156, 468, 86);
  ctx.textAlign = 'left';
  ctx.fillStyle = fault ? '#f59e0b' : doorsOpen ? '#10b981' : '#94a3b8';
  ctx.font = 'bold 17px "JetBrains Mono", monospace';
  const label = fault ? 'DRZWI: AWARIA OBWODU' : doorsOpen ? 'DRZWI: OTWARTE (PERON)' : 'DRZWI: ZAMKNIĘTE · RYGIEL OK';
  ctx.fillText(label, 34, 180);
  for (let car = 0; car < 4; car += 1) {
    const x = 36 + car * 112;
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, 194, 102, 34);
    ctx.fillStyle = fault ? '#f59e0b' : doorsOpen ? '#22c55e' : '#334155';
    for (let d = 0; d < 4; d += 1) {
      ctx.fillRect(x + 8 + d * 23, 200, 15, 22);
    }
  }
}

export function drawInspiroRightLcd(ctx: CanvasRenderingContext2D, snapshot: ISimulationSnapshot): void {
  ctx.fillStyle = '#07101d';
  ctx.fillRect(0, 0, 512, 320);
  ctx.strokeStyle = '#1e3a5f';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 504, 312);
  const lineBadge = snapshot.line.badgeCode ?? snapshot.line.id;
  ctx.fillStyle = snapshot.line.id === 'M1' ? '#38bdf8' : snapshot.line.cssColor;
  ctx.font = 'bold 20px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`INSPIRO DIAG · ${lineBadge}`, 22, 34);
  ctx.fillStyle = '#cbd5e1';
  ctx.textAlign = 'right';
  ctx.fillText(formatClockTime(snapshot.schedule.currentClockSec), 488, 34);
  drawVoltageCard(ctx, snapshot.kinematics.throttle, snapshot.kinematics.serviceBrake);
  drawDoorSchematic(ctx, snapshot.doorState === 'open', snapshot.doorFault.phase !== 'none');
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 24px "Chakra Petch", sans-serif';
  ctx.fillText(snapshot.currentStation.station.name.toUpperCase(), 24, 286);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 22px "JetBrains Mono", monospace';
  ctx.fillText(`${Math.max(0, Math.round(snapshot.currentStation.distanceToTargetM))} m`, 488, 286);
}
