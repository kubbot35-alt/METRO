import * as THREE from 'three';
import { getStationAdAssignment } from '../domain/metroAdsCatalog';
import type { IStationSpec } from '../domain/types';
import type { IAdTexturePool } from './adTexturePool';
import { createStationAdsContext, type IStationAdsBuildContext, type IStationAdsSharedResources } from './stationAdsContext';
import { ISLAND_PLATFORM_CENTER_X, SIDE_LEFT_PLATFORM_CENTER_X, SIDE_RIGHT_PLATFORM_CENTER_X } from './stationHallBuilder';

export { createStationAdsContext, type IStationAdsSharedResources };

export function addStationAdvertisements(
  group: THREE.Group,
  station: IStationSpec,
  stationIndex: number,
  adPool: IAdTexturePool,
  ctx: IStationAdsBuildContext,
): void {
  const layout = station.platformLayout ?? 'island';
  const assign = getStationAdAssignment(station, stationIndex, adPool.campaignCount);
  addTrackWallBanners(group, layout, assign.bannerIndices, adPool, ctx);
  addPlatformCitylights(group, layout, assign.citylightIndices, adPool, ctx);
  if (assign.hasDoohScreens) addDoohScreens(group, layout, assign.doohSlotIndex, adPool, ctx);
}

function addTrackWallBanners(
  group: THREE.Group,
  layout: 'island' | 'side',
  indices: readonly number[],
  adPool: IAdTexturePool,
  ctx: IStationAdsBuildContext,
): void {
  const rightWallX = layout === 'side' ? 6.62 : 4.32;
  const leftWallX = layout === 'side' ? -11.02 : -9.22;
  [4, 26, 48, 70, 92, 114].forEach((zOff, i) => {
    const rightMat = adPool.getBannerMaterial(indices[i % indices.length]);
    const leftMat = adPool.getBannerMaterial(indices[(i + 1) % indices.length]);
    group.add(buildWallBannerUnit(rightWallX, 2.45, zOff, -1, rightMat, ctx));
    group.add(buildWallBannerUnit(leftWallX, 2.45, zOff, 1, leftMat, ctx));
  });
}

function buildWallBannerUnit(
  x: number,
  y: number,
  z: number,
  normalSignX: 1 | -1,
  adMat: THREE.MeshStandardMaterial,
  ctx: IStationAdsBuildContext,
): THREE.Group {
  const unit = new THREE.Group();
  unit.position.set(x, y, z);
  unit.add(new THREE.Mesh(ctx.bannerFrameGeo, ctx.frameMat));
  const topBar = new THREE.Mesh(ctx.bannerLightBarGeo, ctx.bezelMat);
  topBar.position.set(normalSignX * 0.06, 1.28, 0);
  unit.add(topBar);
  const poster = new THREE.Mesh(ctx.bannerAdGeo, adMat);
  poster.position.set(normalSignX * 0.08, 0, 0);
  poster.rotation.y = normalSignX > 0 ? Math.PI / 2 : -Math.PI / 2;
  unit.add(poster);
  return unit;
}

function addPlatformCitylights(
  group: THREE.Group,
  layout: 'island' | 'side',
  indices: readonly number[],
  adPool: IAdTexturePool,
  ctx: IStationAdsBuildContext,
): void {
  const zOffsets = [16, 37, 58, 79, 100];
  if (layout === 'island') {
    const xPos = ISLAND_PLATFORM_CENTER_X + 1.25;
    zOffsets.forEach((zOff, i) => {
      group.add(buildCitylightUnit(xPos, zOff, 0.24, adPool.getCitylightMaterial(indices[i % indices.length]), adPool.getCitylightMaterial(indices[(i + 1) % indices.length]), ctx));
    });
    return;
  }
  zOffsets.forEach((zOff, i) => {
    const matA = adPool.getCitylightMaterial(indices[i % indices.length]);
    const matB = adPool.getCitylightMaterial(indices[(i + 1) % indices.length]);
    group.add(buildCitylightUnit(SIDE_RIGHT_PLATFORM_CENTER_X - 0.55, zOff, -0.24, matA, matB, ctx));
    group.add(buildCitylightUnit(SIDE_LEFT_PLATFORM_CENTER_X + 0.55, zOff, 0.24, matB, matA, ctx));
  });
}

function buildCitylightUnit(
  x: number, z: number, yawRad: number, frontMat: THREE.MeshStandardMaterial, backMat: THREE.MeshStandardMaterial, ctx: IStationAdsBuildContext,
): THREE.Group {
  const unit = new THREE.Group();
  unit.position.set(x, 1.08, z);
  unit.rotation.y = yawRad;
  const base = new THREE.Mesh(ctx.cityBaseGeo, ctx.bezelMat);
  base.position.y = 0.14;
  const cabinet = new THREE.Mesh(ctx.cityCabinetGeo, ctx.frameMat);
  cabinet.position.y = 1.2;
  const frontPoster = new THREE.Mesh(ctx.cityPosterGeo, frontMat);
  frontPoster.position.set(0, 1.2, 0.088);
  const backPoster = new THREE.Mesh(ctx.cityPosterGeo, backMat);
  backPoster.position.set(0, 1.2, -0.088);
  backPoster.rotation.y = Math.PI;
  unit.add(base, cabinet, frontPoster, backPoster);
  return unit;
}

function addDoohScreens(group: THREE.Group, layout: 'island' | 'side', doohSlotIndex: number, adPool: IAdTexturePool, ctx: IStationAdsBuildContext): void {
  const xPos = layout === 'island' ? -3.35 : SIDE_RIGHT_PLATFORM_CENTER_X - 0.65;
  const yawRad = layout === 'island' ? 0.28 : -0.28;
  [22, 58, 94].forEach((zOff, idx) => {
    group.add(buildDoohUnit(xPos, zOff, yawRad, adPool.getDoohMaterial(doohSlotIndex + idx), ctx));
  });
}

function buildDoohUnit(x: number, z: number, yawRad: number, screenMat: THREE.MeshStandardMaterial, ctx: IStationAdsBuildContext): THREE.Group {
  const unit = new THREE.Group();
  unit.position.set(x, 2.95, z);
  unit.rotation.y = yawRad;
  const housing = new THREE.Mesh(ctx.doohHousingGeo, ctx.bezelMat);
  const frontScreen = new THREE.Mesh(ctx.doohScreenGeo, screenMat);
  frontScreen.position.z = 0.088;
  const backScreen = new THREE.Mesh(ctx.doohScreenGeo, screenMat);
  backScreen.position.z = -0.088;
  backScreen.rotation.y = Math.PI;
  const leftStrut = new THREE.Mesh(ctx.doohStrutGeo, ctx.frameMat);
  leftStrut.position.set(-1.1, 1.35, 0);
  const rightStrut = new THREE.Mesh(ctx.doohStrutGeo, ctx.frameMat);
  rightStrut.position.set(1.1, 1.35, 0);
  const statusDot = new THREE.Mesh(ctx.doohDotGeo, ctx.ledDotMat);
  statusDot.position.set(1.32, -0.76, 0);
  unit.add(housing, frontScreen, backScreen, leftStrut, rightStrut, statusDot);
  return unit;
}
