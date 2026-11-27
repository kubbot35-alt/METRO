import * as THREE from 'three';
import { getStationAdAssignment } from '../domain/metroAdsCatalog';
import type { IStationSpec } from '../domain/types';
import type { IAdTexturePool } from './adTexturePool';
import {
  ISLAND_PLATFORM_CENTER_X,
  SIDE_LEFT_PLATFORM_CENTER_X,
  SIDE_RIGHT_PLATFORM_CENTER_X,
} from './stationHallBuilder';

export interface IStationAdsSharedResources {
  readonly geometries: readonly THREE.BufferGeometry[];
  readonly materials: readonly THREE.Material[];
}

interface IStationAdsBuildContext {
  readonly frameMat: THREE.MeshStandardMaterial;
  readonly bezelMat: THREE.MeshStandardMaterial;
  readonly ledDotMat: THREE.MeshBasicMaterial;
  readonly bannerFrameGeo: THREE.BoxGeometry;
  readonly bannerAdGeo: THREE.PlaneGeometry;
  readonly bannerLightBarGeo: THREE.BoxGeometry;
  readonly cityBaseGeo: THREE.BoxGeometry;
  readonly cityCabinetGeo: THREE.BoxGeometry;
  readonly cityPosterGeo: THREE.PlaneGeometry;
  readonly doohHousingGeo: THREE.BoxGeometry;
  readonly doohScreenGeo: THREE.PlaneGeometry;
  readonly doohStrutGeo: THREE.CylinderGeometry;
  readonly doohDotGeo: THREE.BoxGeometry;
}

export function createStationAdsContext(): {
  readonly ctx: IStationAdsBuildContext;
  readonly resources: IStationAdsSharedResources;
} {
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x18202c, roughness: 0.35, metalness: 0.78 });
  const bezelMat = new THREE.MeshStandardMaterial({ color: 0x090c12, roughness: 0.25, metalness: 0.85 });
  const ledDotMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });

  const bannerFrameGeo = new THREE.BoxGeometry(0.14, 2.52, 6.14);
  const bannerAdGeo = new THREE.PlaneGeometry(5.88, 2.28);
  const bannerLightBarGeo = new THREE.BoxGeometry(0.24, 0.1, 6.2);
  const cityBaseGeo = new THREE.BoxGeometry(1.08, 0.28, 0.28);
  const cityCabinetGeo = new THREE.BoxGeometry(1.28, 1.86, 0.16);
  const cityPosterGeo = new THREE.PlaneGeometry(1.16, 1.72);
  const doohHousingGeo = new THREE.BoxGeometry(2.96, 1.68, 0.16);
  const doohScreenGeo = new THREE.PlaneGeometry(2.78, 1.5);
  const doohStrutGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.85, 8);
  const doohDotGeo = new THREE.BoxGeometry(0.12, 0.05, 0.18);

  const ctx: IStationAdsBuildContext = {
    frameMat,
    bezelMat,
    ledDotMat,
    bannerFrameGeo,
    bannerAdGeo,
    bannerLightBarGeo,
    cityBaseGeo,
    cityCabinetGeo,
    cityPosterGeo,
    doohHousingGeo,
    doohScreenGeo,
    doohStrutGeo,
    doohDotGeo,
  };
  return {
    ctx,
    resources: {
      geometries: [
        bannerFrameGeo,
        bannerAdGeo,
        bannerLightBarGeo,
        cityBaseGeo,
        cityCabinetGeo,
        cityPosterGeo,
        doohHousingGeo,
        doohScreenGeo,
        doohStrutGeo,
        doohDotGeo,
      ],
      materials: [frameMat, bezelMat, ledDotMat],
    },
  };
}

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
  if (assign.hasDoohScreens) {
    addDoohScreens(group, layout, assign.doohSlotIndex, adPool, ctx);
  }
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
  const zOffsets = [-18, 14, 46, 72];
  zOffsets.forEach((zOff, i) => {
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
  const zOffsets = [-13, 18, 49];
  if (layout === 'island') {
    const xPos = ISLAND_PLATFORM_CENTER_X + 1.25;
    zOffsets.forEach((zOff, i) => {
      const matA = adPool.getCitylightMaterial(indices[i % indices.length]);
      const matB = adPool.getCitylightMaterial(indices[(i + 1) % indices.length]);
      group.add(buildCitylightUnit(xPos, zOff, 0.24, matA, matB, ctx));
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
  x: number,
  z: number,
  yawRad: number,
  frontMat: THREE.MeshStandardMaterial,
  backMat: THREE.MeshStandardMaterial,
  ctx: IStationAdsBuildContext,
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

function addDoohScreens(
  group: THREE.Group,
  layout: 'island' | 'side',
  doohSlotIndex: number,
  adPool: IAdTexturePool,
  ctx: IStationAdsBuildContext,
): void {
  const xPos = layout === 'island' ? -3.35 : SIDE_RIGHT_PLATFORM_CENTER_X - 0.65;
  const yawRad = layout === 'island' ? 0.28 : -0.28;
  const zPositions = [-7.5, 41.5];
  zPositions.forEach((zOff, idx) => {
    const mat = adPool.getDoohMaterial(doohSlotIndex + idx);
    group.add(buildDoohUnit(xPos, zOff, yawRad, mat, ctx));
  });
}

function buildDoohUnit(
  x: number,
  z: number,
  yawRad: number,
  screenMat: THREE.MeshStandardMaterial,
  ctx: IStationAdsBuildContext,
): THREE.Group {
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
