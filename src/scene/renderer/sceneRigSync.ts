import { DEFAULT_SCENE_CULL_RANGE_M } from '../../domain/routeVariant';
import type { ISimulationSnapshot } from '../../domain/types';
import type { ISceneRendererContext } from './rendererContext';
import type { ISceneAtmosphereController } from './sceneAtmosphereController';
import { updateOncomingTrainPose } from './sceneScreenshotAndCctv';

type AlignmentSample = ReturnType<ISceneRendererContext['alignment']['sample']>;

export function syncTrainAndWorldRigs(
  ctx: ISceneRendererContext,
  atmosphere: ISceneAtmosphereController,
  snapshot: ISimulationSnapshot,
  frame: AlignmentSample,
  rollRad: number,
  leverAngleRad: number,
  dtSec: number,
): void {
  syncPlayerTrainAndInterior(ctx, snapshot, frame, rollRad, dtSec);
  updateOncomingTrainPose(ctx, snapshot, dtSec);
  ctx.cabRig?.setLeverAngle(leverAngleRad);
  ctx.cabRig?.update(snapshot, dtSec);
  syncTracksideEnvironmentRigs(ctx, atmosphere, snapshot, dtSec);
}

function syncPlayerTrainAndInterior(
  ctx: ISceneRendererContext,
  snapshot: ISimulationSnapshot,
  frame: AlignmentSample,
  rollRad: number,
  dtSec: number,
): void {
  if (ctx.playerTrainRig) {
    ctx.playerTrainRig.group.rotation.order = 'YXZ';
    ctx.playerTrainRig.group.position.set(frame.x, frame.y, frame.z);
    ctx.playerTrainRig.group.rotation.set(frame.pitch, frame.yaw, rollRad * 0.85);
    ctx.playerTrainRig.setDoorsOpen(snapshot.openDoorSide, dtSec);
    ctx.playerTrainRig.setHeadlights(snapshot.headlightsOn);
    ctx.playerTrainRig.updateMotion?.(snapshot.kinematics.speedMs, dtSec);
  }
  if (ctx.passengerInteriorRig) {
    ctx.passengerInteriorRig.group.position.set(frame.x, frame.y, frame.z);
    ctx.passengerInteriorRig.group.rotation.set(frame.pitch, frame.yaw, rollRad * 0.85);
    if (snapshot.cameraMode === 'interior') ctx.passengerInteriorRig.update(snapshot, dtSec, ctx.settings.language);
  }
}

function syncTracksideEnvironmentRigs(
  ctx: ISceneRendererContext,
  atmosphere: ISceneAtmosphereController,
  snapshot: ISimulationSnapshot,
  dtSec: number,
): void {
  const posM = snapshot.kinematics.positionM;
  const isNight = snapshot.timeOfDay.id === 'night_service';
  ctx.tunnelRig?.updateCulling(posM, DEFAULT_SCENE_CULL_RANGE_M);
  ctx.stationsRig?.updateCulling(posM, DEFAULT_SCENE_CULL_RANGE_M);
  ctx.stationsRig?.setNightServiceMode(isNight, dtSec);
  ctx.stationsRig?.updateClock(snapshot.schedule.currentClockSec);
  ctx.adTexturePool?.update(snapshot.elapsedTimeSec, isNight, ctx.settings.language);
  ctx.passengerRig?.sync(snapshot, dtSec, ctx.passengerDensity);
  ctx.trackworkRig?.sync(snapshot.trackworkZones, ctx.alignment, dtSec);
  ctx.tunnelEffectsRig?.update(snapshot, ctx.alignment, dtSec);
  ctx.nightCrewRig?.sync(snapshot, ctx.alignment, dtSec);
  ctx.turnaroundSidingRig?.update(snapshot.elapsedTimeSec, snapshot.turnaround.phase !== 'inactive');
  atmosphere.updateStationLights(ctx, snapshot.currentStation.station);
  atmosphere.updateSemaphoreVisuals(ctx, snapshot);
}
