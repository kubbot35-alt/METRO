import type { DoorSide } from '../../domain/types';

function drawCameraFeedFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  doorsOpen: boolean,
): void {
  ctx.clearRect(x, y, w, h);
  ctx.strokeStyle = doorsOpen ? '#10b981' : '#38bdf8';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = 'rgba(2, 6, 14, 0.76)';
  ctx.fillRect(x + 6, y + 6, 116, 22);
  ctx.fillStyle = doorsOpen ? '#34d399' : '#38bdf8';
  ctx.font = 'bold 13px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`${label} • ${doorsOpen ? 'OTWARTE' : 'LIVE'}`, x + 11, y + 21);
}

export function drawCctvDualCameraOverlay(
  ctx: CanvasRenderingContext2D,
  openDoorSide: DoorSide | null,
): void {
  ctx.clearRect(0, 0, 512, 300);
  ctx.fillStyle = 'rgba(12, 24, 40, 0.94)';
  ctx.fillRect(0, 0, 512, 36);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 16px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('KAMERY BOCZNE • CCTV PERON', 16, 23);
  ctx.fillStyle = '#10b981';
  ctx.textAlign = 'right';
  ctx.fillText('● LIVE HD', 496, 23);

  drawCameraFeedFrame(ctx, 14, 48, 236, 236, 'CAM L', openDoorSide === 'left');
  drawCameraFeedFrame(ctx, 262, 48, 236, 236, 'CAM P', openDoorSide === 'right');
}
