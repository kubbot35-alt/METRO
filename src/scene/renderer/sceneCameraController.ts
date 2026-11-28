import * as THREE from 'three';
import { resolveStationCameraMode } from '../../domain/mirrorCctvSystem';
import { resolvePassengerCameraAnchor } from '../../domain/passengerViewModel';
import { getStationPlatformSide } from '../../domain/trackGeometry';
import { M1_SURFACE_ELEVATION_M, type TrackAlignment } from '../../domain/trackAlignment';
import type { IPhotoCameraState, ISimulationSnapshot } from '../../domain/types';
import type { ICabMotionController } from '../cabMotionController';
import type { IPhotoAnchorPose } from '../types';
import type { ISceneRendererContext } from './rendererContext';

export interface ISceneCameraController {
  updateCameraView(ctx: ISceneRendererContext, snapshot: ISimulationSnapshot, posM: number, frame: ReturnType<TrackAlignment['sample']>, state: ReturnType<ICabMotionController['step']>, dtSec: number): void;
  getPhotoAnchorPose(ctx: ISceneRendererContext, snapshot: ISimulationSnapshot): IPhotoAnchorPose | null;
  setPhotoModePose(ctx: ISceneRendererContext, pose: IPhotoCameraState | null, snapshot: ISimulationSnapshot, keepInteriorVisible?: boolean): void;
}

export class SceneCameraController implements ISceneCameraController {
  public updateCameraView(
    ctx: ISceneRendererContext, snapshot: ISimulationSnapshot, posM: number,
    frame: ReturnType<TrackAlignment['sample']>, state: ReturnType<ICabMotionController['step']>, dtSec: number,
  ): void {
    if (!ctx.camera || !ctx.cabRig || !ctx.playerTrainRig) return;
    if (snapshot.gameMode === 'trainspotting') { this.applyTrainspottingCamera(ctx, snapshot, dtSec); return; }
    if (snapshot.cameraMode === 'cab') { this.applyCabCamera(ctx, snapshot, posM, frame, state, dtSec); return; }
    ctx.cabRig.group.visible = false;
    if (snapshot.cameraMode === 'interior') { this.applyInteriorCamera(ctx, snapshot, posM, frame, state, dtSec); return; }
    if (ctx.passengerInteriorRig) ctx.passengerInteriorRig.group.visible = false;
    ctx.playerTrainRig.group.visible = true;
    if (ctx.cabFillLight) { ctx.cabFillLight.intensity = 28; ctx.cabFillLight.distance = 32; }
    if (snapshot.cameraMode === 'mirror') this.applyMirrorCamera(ctx, snapshot, posM, dtSec);
    else if (snapshot.cameraMode === 'bogie') this.applyBogieCamera(ctx, snapshot, posM, dtSec);
    else if (snapshot.cameraMode === 'station') this.applyStationCamera(ctx, snapshot, posM, dtSec);
    else this.applyExteriorCamera(ctx, snapshot, posM, dtSec);
  }

  public getPhotoAnchorPose(ctx: ISceneRendererContext, snapshot: ISimulationSnapshot): IPhotoAnchorPose | null {
    if (!ctx.camera) return null;
    if (snapshot.cameraMode === 'cab') {
      const posM = snapshot.kinematics.positionM;
      const outdoor = snapshot.trackProfile.outdoorBlend > 0.35;
      const inStation = Math.abs(snapshot.currentStation.distanceToTargetM) < 70;
      const lateral = outdoor ? 4.4 : inStation ? (getStationPlatformSide(snapshot.currentStation.station) === 'left' ? -3.4 : 3.4) : 1.65;
      const camPt = ctx.alignment.toWorldPoint(posM + (outdoor ? 10.4 : inStation ? 9.4 : 8.6), lateral, outdoor ? 2.9 : inStation ? 2.65 : 2.3, false);
      const targetPt = ctx.alignment.toWorldPoint(posM - 3.6, 0, 1.9, false);
      const dx = targetPt.x - camPt.x;
      const dy = targetPt.y - camPt.y;
      const dz = targetPt.z - camPt.z;
      return {
        x: camPt.x, y: camPt.y, z: camPt.z,
        yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.max(0.001, Math.hypot(dx, dz))),
        fovDeg: 58, keepInteriorVisible: false,
      };
    }
    const e = new THREE.Euler().setFromQuaternion(ctx.camera.quaternion, 'YXZ');
    return {
      x: ctx.camera.position.x, y: ctx.camera.position.y, z: ctx.camera.position.z,
      yaw: e.y, pitch: e.x, fovDeg: ctx.camera.fov, keepInteriorVisible: snapshot.cameraMode === 'interior',
    };
  }

  public setPhotoModePose(
    ctx: ISceneRendererContext,
    pose: IPhotoCameraState | null,
    snapshot: ISimulationSnapshot,
    keepInteriorVisible = false,
  ): void {
    if (!ctx.camera || !ctx.cabRig || !ctx.playerTrainRig || !pose) return;
    ctx.cabRig.group.visible = false;
    const showInterior = keepInteriorVisible && Boolean(ctx.passengerInteriorRig);
    if (ctx.passengerInteriorRig) ctx.passengerInteriorRig.group.visible = showInterior;
    ctx.playerTrainRig.group.visible = !showInterior && snapshot.gameMode !== 'trainspotting';
    if (ctx.cabFillLight) {
      ctx.cabFillLight.intensity = showInterior ? 0 : snapshot.trackProfile.outdoorBlend > 0.35 ? 12 : 34;
      if (!showInterior) ctx.cabFillLight.distance = 38;
    }
    ctx.camera.rotation.order = 'YXZ';
    ctx.camera.position.set(pose.x, pose.y, pose.z);
    ctx.camera.rotation.set(pose.pitch, pose.yaw, THREE.MathUtils.degToRad(pose.rollDeg));
    if (Math.abs(ctx.camera.fov - pose.fovDeg) > 0.05) {
      ctx.camera.fov = pose.fovDeg;
      ctx.camera.updateProjectionMatrix();
    }
    ctx.surfaceDepotRig?.sync(snapshot.trackProfile.outdoorBlend, snapshot.timeOfDay.id, snapshot.weather.mode, ctx.camera.position);
  }

  private applyCabCamera(
    ctx: ISceneRendererContext, snapshot: ISimulationSnapshot, posM: number,
    frame: ReturnType<TrackAlignment['sample']>, state: ReturnType<ICabMotionController['step']>, dtSec: number,
  ): void {
    ctx.cabRig!.group.visible = true;
    ctx.playerTrainRig!.group.visible = false;
    if (ctx.passengerInteriorRig) ctx.passengerInteriorRig.group.visible = false;
    if (ctx.cabFillLight) {
      ctx.cabFillLight.intensity = state.cabDomeIntensity;
      ctx.cabFillLight.distance = snapshot.cabLightOn ? 4.2 : 2.0;
      ctx.cabFillLight.color.setHex(snapshot.cabLightOn ? 0xfff0d4 : 0xcbd5e1);
      ctx.cabFillLight.position.set(snapshot.cabLightOn ? 0 : -0.22, snapshot.cabLightOn ? 0.34 : 0.12, snapshot.cabLightOn ? -0.54 : -0.58);
    }
    const camPt = ctx.alignment.toWorldPoint(posM - state.offsetZ, state.offsetX, 2.15 + state.offsetY, true);
    ctx.camera!.rotation.order = 'YXZ';
    ctx.camera!.position.set(camPt.x, camPt.y, camPt.z);
    ctx.camera!.rotation.set(frame.pitch + state.pitchRad, frame.yaw, state.rollRad);
    const desiredFov = Math.max(60, Math.min(98, ctx.settings.cabFovDeg + Math.max(0, state.targetFov - 64)));
    this.updateCameraFov(ctx, desiredFov, dtSec);
  }

  private applyTrainspottingCamera(ctx: ISceneRendererContext, snapshot: ISimulationSnapshot, dtSec: number): void {
    ctx.cabRig!.group.visible = false;
    ctx.playerTrainRig!.group.visible = false;
    if (ctx.passengerInteriorRig) ctx.passengerInteriorRig.group.visible = false;
    if (ctx.cabFillLight) ctx.cabFillLight.intensity = 0;
    const sp = snapshot.trainspotting;
    const cam = ctx.camera!;
    cam.rotation.order = 'YXZ';
    if (sp.isDepot) {
      cam.position.set(2.4, M1_SURFACE_ELEVATION_M + 3.4, 34 - sp.walkOffsetM * 0.65);
      cam.rotation.set(-0.08 + ctx.freeLookPitchRad, 0.36 + ctx.freeLookYawRad, 0);
      this.updateCameraFov(ctx, 62, dtSec);
      return;
    }
    const sideSign = sp.platformSide === 'left' ? -1 : 1;
    const obsDist = sp.baseDistanceM + sp.walkOffsetM;
    const obsFrame = ctx.alignment.sample(obsDist);
    const pt = ctx.alignment.toWorldPoint(obsDist, sideSign * 3.15, 2.55, false);
    cam.position.set(pt.x, pt.y, pt.z);
    cam.rotation.set(obsFrame.pitch - 0.04 + ctx.freeLookPitchRad, obsFrame.yaw + (sideSign > 0 ? 0.24 : -0.24) + ctx.freeLookYawRad, 0);
    this.updateCameraFov(ctx, 64, dtSec);
  }

  private applyInteriorCamera(
    ctx: ISceneRendererContext, snapshot: ISimulationSnapshot, posM: number,
    frame: ReturnType<TrackAlignment['sample']>, state: ReturnType<ICabMotionController['step']>, dtSec: number,
  ): void {
    ctx.playerTrainRig!.group.visible = false;
    const anchor = resolvePassengerCameraAnchor(snapshot.passengerView);
    if (ctx.passengerInteriorRig) ctx.passengerInteriorRig.group.visible = snapshot.passengerView.seatId !== 'behind_cab';
    if (ctx.cabFillLight) ctx.cabFillLight.intensity = 0;
    const eyePt = ctx.alignment.toWorldPoint(posM - anchor.eyeBackFromLeadM, anchor.eyeLateralM + state.offsetX * 0.35, anchor.eyeHeightM + state.offsetY * 0.4, true);
    const camFrame = anchor.carShiftBackM > 0.1 ? ctx.alignment.sample(posM - anchor.carShiftBackM) : frame;
    ctx.camera!.rotation.order = 'YXZ';
    ctx.camera!.position.set(eyePt.x, eyePt.y, eyePt.z);
    ctx.camera!.rotation.set(camFrame.pitch + anchor.basePitchRad + ctx.freeLookPitchRad, camFrame.yaw + anchor.baseYawRad + ctx.freeLookYawRad, state.rollRad * 0.45);
    this.updateCameraFov(ctx, anchor.fovDeg, dtSec);
  }

  private applyMirrorCamera(ctx: ISceneRendererContext, snapshot: ISimulationSnapshot, posM: number, dtSec: number): void {
    const sideSign = getStationPlatformSide(snapshot.currentStation.station) === 'left' ? -1 : 1;
    const eyePt = ctx.alignment.toWorldPoint(posM + 0.9, sideSign * 1.92, 2.48, false);
    const lookPt = ctx.alignment.toWorldPoint(posM - 26, sideSign * 1.82, 1.85, false);
    ctx.camera!.position.set(eyePt.x, eyePt.y, eyePt.z);
    ctx.camera!.lookAt(lookPt.x, lookPt.y, lookPt.z);
    this.updateCameraFov(ctx, 64, dtSec);
  }

  private applyBogieCamera(ctx: ISceneRendererContext, snapshot: ISimulationSnapshot, posM: number, dtSec: number): void {
    const safeSign = getStationPlatformSide(snapshot.currentStation.station) === 'right' ? -1 : 1;
    const eyePt = ctx.alignment.toWorldPoint(posM + 0.35, safeSign * 1.82, 0.72, false);
    const lookPt = ctx.alignment.toWorldPoint(posM - 7.5, safeSign * 0.45, 0.58, false);
    ctx.camera!.position.set(eyePt.x, eyePt.y, eyePt.z);
    ctx.camera!.lookAt(lookPt.x, lookPt.y, lookPt.z);
    this.updateCameraFov(ctx, 66, dtSec);
  }

  private applyStationCamera(ctx: ISceneRendererContext, snapshot: ISimulationSnapshot, posM: number, dtSec: number): void {
    const res = resolveStationCameraMode(snapshot.stations, posM);
    if (res.mode === 'station-ceiling' && res.station) {
      const sideSign = getStationPlatformSide(res.station) === 'left' ? -1 : 1;
      const camPos = ctx.alignment.toWorldPoint(res.station.distanceM - 22, sideSign * 3.7, 4.35, false);
      const look = ctx.alignment.toWorldPoint(posM - 6.5, 0, 1.85, false);
      ctx.camera!.position.set(camPos.x, camPos.y, camPos.z);
      ctx.camera!.lookAt(look.x, look.y, look.z);
      this.updateCameraFov(ctx, 56, dtSec);
      return;
    }
    const roofEye = ctx.alignment.toWorldPoint(posM + 1.1, 0, 4.12, false);
    const roofLook = ctx.alignment.toWorldPoint(posM + 48, 0, 1.6, false);
    ctx.camera!.position.set(roofEye.x, roofEye.y, roofEye.z);
    ctx.camera!.lookAt(roofLook.x, roofLook.y, roofLook.z);
    this.updateCameraFov(ctx, 64, dtSec);
  }

  private applyExteriorCamera(ctx: ISceneRendererContext, snapshot: ISimulationSnapshot, posM: number, dtSec: number): void {
    const isVarsovia = snapshot.trainModel.id === 'varsovia';
    const eye = ctx.alignment.toWorldPoint(posM + (isVarsovia ? 11.8 : -78.0), isVarsovia ? -1.62 : -1.58, isVarsovia ? 2.75 : 3.45, false);
    const look = ctx.alignment.toWorldPoint(posM + (isVarsovia ? -14.0 : -61.0), 0, isVarsovia ? 1.85 : 1.75, false);
    ctx.camera!.position.set(eye.x, eye.y, eye.z);
    ctx.camera!.lookAt(look.x, look.y, look.z);
    this.updateCameraFov(ctx, 62, dtSec);
  }

  private updateCameraFov(ctx: ISceneRendererContext, targetFov: number, dtSec: number): void {
    if (!ctx.camera || Math.abs(ctx.camera.fov - targetFov) <= 0.05) return;
    ctx.camera.fov = THREE.MathUtils.damp(ctx.camera.fov, targetFov, 5, Math.max(dtSec, 0.016));
    ctx.camera.updateProjectionMatrix();
  }
}
