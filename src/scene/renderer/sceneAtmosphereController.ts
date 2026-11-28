import * as THREE from 'three';
import { getStationPlatformLayout } from '../../domain/trackGeometry';
import type { ISimulationSnapshot, IStationSpec, SignalAspect, TimeOfDayId, WeatherModeId } from '../../domain/types';
import type { ICabMotionController } from '../cabMotionController';
import type { ISceneRendererContext } from './rendererContext';

const _bgColor = new THREE.Color();
const _tunnelBg = new THREE.Color(0x06080d);
const _dayBg = new THREE.Color(0xc5ddf5);
const _rainDayBg = new THREE.Color(0x8897a8);
const _snowDayBg = new THREE.Color(0xdbe7f4);
const _nightBg = new THREE.Color(0x111d38);
const _rainNightBg = new THREE.Color(0x1b2432);
const _hemiTunnelSky = new THREE.Color(0x6c88ab);
const _hemiDaySky = new THREE.Color(0xcde6ff);
const _hemiRainDaySky = new THREE.Color(0x8ea0b5);
const _hemiSnowDaySky = new THREE.Color(0xe2ecf8);
const _hemiNightSky = new THREE.Color(0x3a5284);
const _hemiTunnelGround = new THREE.Color(0x1e1812);
const _hemiDayGround = new THREE.Color(0x4a5a44);
const _hemiSnowGround = new THREE.Color(0xcbd5e1);
const _hemiNightGround = new THREE.Color(0x141b2b);

export interface ISceneAtmosphereController {
  applyAtmosphere(
    ctx: ISceneRendererContext,
    outdoorBlend: number,
    timeOfDayId: TimeOfDayId,
    weatherMode: WeatherModeId,
    tunnelAmbientIntensity: number,
    tunnelFogDensity: number,
  ): void;
  syncTimeOfDayLighting(ctx: ISceneRendererContext, snapshot: ISimulationSnapshot): void;
  updateStationLights(ctx: ISceneRendererContext, station: IStationSpec): void;
  updateSemaphoreVisuals(ctx: ISceneRendererContext, snapshot: ISimulationSnapshot): void;
  updateHeadlightPose(ctx: ISceneRendererContext, snapshot: ISimulationSnapshot, motionState: ReturnType<ICabMotionController['step']>): void;
}

function getAspectHex(aspect: SignalAspect): number {
  return aspect === 'red' ? 0xef4444 : aspect === 'yellow' ? 0xf59e0b : 0x10b981;
}

function resolveOutdoorFogAndBg(isEvening: boolean, isNightService: boolean, isRain: boolean, isSnow: boolean) {
  const isPrecip = isRain || isSnow;
  const bg = isEvening
    ? (isPrecip ? _rainNightBg : _nightBg)
    : isSnow ? _snowDayBg : isRain ? _rainDayBg : _dayBg;
  const fog = isEvening
    ? (isPrecip ? 0.0048 : isNightService ? 0.0032 : 0.0024)
    : isSnow ? 0.0046 : isRain ? 0.0044 : 0.0016;
  const ambient = isNightService
    ? (isPrecip ? 0.38 : 0.42)
    : isEvening ? (isPrecip ? 0.52 : 0.62) : isSnow ? 1.32 : isRain ? 1.05 : 1.45;
  const sun = isNightService
    ? (isPrecip ? 0.08 : 0.22)
    : isEvening ? (isPrecip ? 0.14 : 0.42) : isSnow ? 0.85 : isRain ? 0.62 : 2.35;
  return { bg, fog, ambient, sun };
}

export class SceneAtmosphereController implements ISceneAtmosphereController {
  public applyAtmosphere(
    ctx: ISceneRendererContext,
    outdoorBlend: number,
    timeOfDayId: TimeOfDayId,
    weatherMode: WeatherModeId,
    tunnelAmbientIntensity: number,
    tunnelFogDensity: number,
  ): void {
    if (!ctx.scene || !ctx.hemiLight || !ctx.sunLight) return;
    const b = Math.max(0, Math.min(1, outdoorBlend));
    const isEvening = timeOfDayId === 'evening' || timeOfDayId === 'night_service';
    const isNightService = timeOfDayId === 'night_service';
    const isRain = weatherMode === 'rain';
    const isSnow = weatherMode === 'snow';
    const params = resolveOutdoorFogAndBg(isEvening, isNightService, isRain, isSnow);
    _bgColor.copy(_tunnelBg).lerp(params.bg, b);
    if (ctx.scene.background instanceof THREE.Color) ctx.scene.background.copy(_bgColor);
    if (ctx.scene.fog instanceof THREE.FogExp2) {
      ctx.scene.fog.color.copy(_bgColor);
      ctx.scene.fog.density = THREE.MathUtils.lerp(tunnelFogDensity * ctx.fogDensityScale, params.fog, b);
    }
    this.applyHemiAndSunLights(ctx, b, isEvening, isNightService, isRain, isSnow, tunnelAmbientIntensity, params.ambient, params.sun);
  }

  public syncTimeOfDayLighting(ctx: ISceneRendererContext, snapshot: ISimulationSnapshot): void {
    if (ctx.appliedTimeOfDayId === snapshot.timeOfDay.id) return;
    ctx.appliedTimeOfDayId = snapshot.timeOfDay.id;
    const tod = snapshot.timeOfDay;
    if (ctx.stationLightA) {
      ctx.stationLightA.intensity = tod.stationLightIntensityA;
      ctx.stationLightA.color.setHex(tod.stationLightColorHex);
    }
    if (ctx.stationLightB) {
      ctx.stationLightB.intensity = tod.stationLightIntensityB;
      ctx.stationLightB.color.setHex(tod.stationLightColorHex);
    }
  }

  public updateStationLights(ctx: ISceneRendererContext, station: IStationSpec): void {
    if (!ctx.stationLightA || !ctx.stationLightB) return;
    const centerX = getStationPlatformLayout(station) === 'island' ? -4.4 : -1.6;
    const posA = ctx.alignment.toWorldPoint(station.distanceM - 48, centerX, 4.5, false);
    const posB = ctx.alignment.toWorldPoint(station.distanceM - 8, centerX, 4.2, false);
    ctx.stationLightA.position.set(posA.x, posA.y, posA.z);
    ctx.stationLightB.position.set(posB.x, posB.y, posB.z);
  }

  public updateSemaphoreVisuals(ctx: ISceneRendererContext, snapshot: ISimulationSnapshot): void {
    ctx.semaphoreRig?.sync(snapshot.signals, snapshot.kinematics.positionM);
    if (!ctx.signalLight) return;
    const next = snapshot.nextSignal;
    if (!next) { ctx.signalLight.intensity = 0; return; }
    ctx.signalLight.intensity = 16;
    ctx.signalLight.color.setHex(getAspectHex(next.signal.aspect));
    const sigPt = ctx.alignment.toWorldPoint(next.signal.distanceM - 0.7, 2.15, 2.85, false);
    ctx.signalLight.position.set(sigPt.x, sigPt.y, sigPt.z);
  }

  public updateHeadlightPose(
    ctx: ISceneRendererContext,
    snapshot: ISimulationSnapshot,
    motionState: ReturnType<ICabMotionController['step']>,
  ): void {
    if (!ctx.headlight || !ctx.headlightTarget) return;
    const posM = snapshot.kinematics.positionM;
    const isHighBeam = snapshot.headlightMode === 'high';
    const headPos = ctx.alignment.toWorldPoint(posM + 1.45, 0, 1.48, false);
    const headTgt = ctx.alignment.toWorldPoint(posM + (isHighBeam ? 96 : 56), 0, isHighBeam ? 1.1 : 0.65, false);
    ctx.headlight.intensity = motionState.headlightIntensity;
    ctx.headlight.distance = isHighBeam ? 235 : 132;
    ctx.headlight.angle = isHighBeam ? Math.PI / 2.9 : Math.PI / 3.8;
    ctx.headlight.position.set(headPos.x, headPos.y, headPos.z);
    ctx.headlightTarget.position.set(headTgt.x, headTgt.y, headTgt.z);
    ctx.headlightTarget.updateMatrixWorld();
  }

  private applyHemiAndSunLights(
    ctx: ISceneRendererContext, b: number, isEvening: boolean, isNightService: boolean,
    isRain: boolean, isSnow: boolean, tunnelAmbient: number, outdoorAmbient: number, sunTarget: number,
  ): void {
    if (!ctx.scene || !ctx.hemiLight || !ctx.sunLight) return;
    const sky = isEvening ? _hemiNightSky : isSnow ? _hemiSnowDaySky : isRain ? _hemiRainDaySky : _hemiDaySky;
    const ground = isEvening ? _hemiNightGround : isSnow ? _hemiSnowGround : _hemiDayGround;
    ctx.hemiLight.color.copy(_hemiTunnelSky).lerp(sky, b);
    ctx.hemiLight.groundColor.copy(_hemiTunnelGround).lerp(ground, b);
    ctx.hemiLight.intensity = THREE.MathUtils.lerp(tunnelAmbient, outdoorAmbient, b);
    ctx.sunLight.intensity = sunTarget * b;
    ctx.sunLight.color.setHex(isEvening ? 0x93c5fd : isSnow ? 0xe2e8f0 : isRain ? 0xcbd5e1 : 0xfff0d1);
    const baseEnv = isNightService ? 0.09 : isEvening ? 0.16 : 0.34;
    const outEnv = isNightService ? 0.14 : isEvening ? 0.22 : (isRain || isSnow) ? 0.48 : 0.65;
    ctx.scene.environmentIntensity = THREE.MathUtils.lerp(baseEnv, outEnv, b);
  }
}
