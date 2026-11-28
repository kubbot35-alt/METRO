import * as THREE from 'three';
import { getPhotoFilterSpec } from '../../domain/photoMode';
import { getOppositeTrackX, getOppositeTrackYaw } from '../../domain/trackGeometry';
import type { ISimulationSnapshot, PhotoFilterId } from '../../domain/types';
import type { ISceneRendererContext } from './rendererContext';

function applyVhsOverlay(ctx2d: CanvasRenderingContext2D, width: number, height: number): void {
  ctx2d.fillStyle = 'rgba(255, 224, 175, 0.06)';
  ctx2d.fillRect(0, 0, width, height);
  ctx2d.fillStyle = 'rgba(0, 0, 0, 0.14)';
  for (let y = 0; y < height; y += 4) ctx2d.fillRect(0, y, width, 1);
  ctx2d.fillStyle = 'rgba(254, 240, 138, 0.85)';
  ctx2d.font = `bold ${Math.max(16, Math.round(height * 0.028))}px "JetBrains Mono", monospace`;
  ctx2d.fillText('REC ● METRO WAW', Math.round(width * 0.03), Math.round(height * 0.06));
}

function applyVignetteOverlay(ctx2d: CanvasRenderingContext2D, width: number, height: number, isNoir: boolean): void {
  const grad = ctx2d.createRadialGradient(width * 0.5, height * 0.5, Math.min(width, height) * 0.34, width * 0.5, height * 0.5, Math.max(width, height) * 0.68);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, isNoir ? 'rgba(0,0,0,0.48)' : 'rgba(0,0,0,0.34)');
  ctx2d.fillStyle = grad;
  ctx2d.fillRect(0, 0, width, height);
}

export function captureFilteredScreenshotPng(
  ctx: ISceneRendererContext,
  filterId: PhotoFilterId,
  renderNow: () => void,
): string | null {
  if (!ctx.renderer || !ctx.scene || !ctx.camera) return null;
  renderNow();
  const glCanvas = ctx.renderer.domElement;
  const width = Math.max(glCanvas.width, 1);
  const height = Math.max(glCanvas.height, 1);
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx2d = out.getContext('2d');
  if (!ctx2d) return null;
  ctx2d.filter = getPhotoFilterSpec(filterId).cssFilter;
  ctx2d.drawImage(glCanvas, 0, 0, width, height);
  ctx2d.filter = 'none';
  if (filterId === 'cinematic' || filterId === 'noir') applyVignetteOverlay(ctx2d, width, height, filterId === 'noir');
  else if (filterId === 'vhs') applyVhsOverlay(ctx2d, width, height);
  return out.toDataURL('image/png');
}

export function pickCctvMonitorAtPointer(
  ctx: ISceneRendererContext,
  event: PointerEvent,
  raycaster: THREE.Raycaster,
  pointerNdc: THREE.Vector2,
): void {
  if (!ctx.renderer || !ctx.camera || !ctx.cabRig || !ctx.onCctvMonitorClick) return;
  if (ctx.lastSnapshot?.cameraMode !== 'cab' || ctx.lastSnapshot.phase !== 'playing') return;
  const targets = ctx.cabRig.getActiveInteractiveMonitorMeshes?.() ?? [];
  if (targets.length === 0) return;
  const rect = ctx.renderer.domElement.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointerNdc, ctx.camera);
  const hits = raycaster.intersectObjects([...targets], false);
  const ch = hits[0]?.object.userData.cctvChannel;
  if (ch === 'left' || ch === 'right') ctx.onCctvMonitorClick(ch);
}

export function updateOncomingTrainPose(
  ctx: ISceneRendererContext,
  snapshot: ISimulationSnapshot,
  dtSec: number,
): void {
  if (!ctx.oncomingTrainRig || !ctx.oncomingLight) return;
  const oncoming = snapshot.oncomingTrain;
  ctx.oncomingTrainRig.group.visible = oncoming.active;
  if (!oncoming.active) { ctx.oncomingLight.intensity = 0; return; }
  const oppFrame = ctx.alignment.sample(oncoming.positionM);
  const oncomingX = getOppositeTrackX(oncoming.positionM, snapshot.stations);
  const oncomingYaw = getOppositeTrackYaw(oncoming.positionM, snapshot.stations);
  const oppPos = ctx.alignment.toWorldPoint(oncoming.positionM, oncomingX, 0, false);
  ctx.oncomingTrainRig.group.rotation.order = 'YXZ';
  ctx.oncomingTrainRig.group.position.set(oppPos.x, oppPos.y, oppPos.z);
  ctx.oncomingTrainRig.group.rotation.set(-oppFrame.pitch, oppFrame.yaw + Math.PI + oncomingYaw, -oppFrame.cantRollRad * 0.7);
  ctx.oncomingTrainRig.setDoorsOpen(oncoming.doorsOpen ? oncoming.doorSide : null, dtSec);
  ctx.oncomingTrainRig.setHeadlights(oncoming.headlightsOn);
  ctx.oncomingTrainRig.updateMotion?.(oncoming.speedMs, dtSec);
  ctx.oncomingLight.intensity = oncoming.headlightsOn ? 56 : 10;
  const lampPt = ctx.alignment.toWorldPoint(oncoming.positionM - 1.8, oncomingX, 1.65, false);
  ctx.oncomingLight.position.set(lampPt.x, lampPt.y, lampPt.z);
}

export function updateLeadingTrainPose(
  ctx: ISceneRendererContext,
  snapshot: ISimulationSnapshot,
  dtSec: number,
): void {
  if (!ctx.leadingTrainRig) return;
  const lead = snapshot.leadingTrain;
  const distAhead = lead.positionM - snapshot.kinematics.positionM;
  const visible = lead.active && distAhead > -140 && distAhead < 680;
  ctx.leadingTrainRig.group.visible = visible;
  if (!visible) return;
  const frame = ctx.alignment.sample(lead.positionM);
  ctx.leadingTrainRig.group.rotation.order = 'YXZ';
  ctx.leadingTrainRig.group.position.set(frame.x, frame.y, frame.z);
  ctx.leadingTrainRig.group.rotation.set(frame.pitch, frame.yaw, frame.cantRollRad * 0.7);
  ctx.leadingTrainRig.setDoorsOpen(lead.doorsOpen ? lead.doorSide : null, dtSec);
  ctx.leadingTrainRig.setHeadlights(lead.headlightsOn);
  ctx.leadingTrainRig.updateMotion?.(lead.speedMs, dtSec);
}
